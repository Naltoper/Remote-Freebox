import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_AUTOMATION,
  DEFAULT_CONFIG,
  STORAGE_KEYS,
} from '../config/defaults';
import type { AutomationSettings, FreeboxConfig } from '../types/remote';
import {
  clampIntervalMinutes,
  formatHm,
  isInTimeWindow,
  parseHmToMinutes,
} from '../utils/timeWindow';
import { runSmartStart, type SmartStartProgress } from './freeboxRemote';

let automationRunLock = false;

export async function loadFreeboxConfig(): Promise<FreeboxConfig> {
  try {
    const [host, code, timeoutRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.host),
      AsyncStorage.getItem(STORAGE_KEYS.code),
      AsyncStorage.getItem(STORAGE_KEYS.timeoutMs),
    ]);
    const timeoutMs = timeoutRaw ? Number(timeoutRaw) : DEFAULT_CONFIG.timeoutMs;
    return {
      host: host?.trim() || DEFAULT_CONFIG.host,
      code: code?.trim() || DEFAULT_CONFIG.code,
      timeoutMs:
        Number.isFinite(timeoutMs) && timeoutMs > 0
          ? timeoutMs
          : DEFAULT_CONFIG.timeoutMs,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function loadAutomationSettings(): Promise<AutomationSettings> {
  try {
    const [enabledRaw, windowStart, windowEnd, intervalRaw] = await Promise.all(
      [
        AsyncStorage.getItem(STORAGE_KEYS.autoEnabled),
        AsyncStorage.getItem(STORAGE_KEYS.autoWindowStart),
        AsyncStorage.getItem(STORAGE_KEYS.autoWindowEnd),
        AsyncStorage.getItem(STORAGE_KEYS.autoIntervalMinutes),
      ],
    );

    const intervalMinutes = intervalRaw
      ? Number(intervalRaw)
      : DEFAULT_AUTOMATION.intervalMinutes;

    const start = windowStart?.trim() || DEFAULT_AUTOMATION.windowStart;
    const end = windowEnd?.trim() || DEFAULT_AUTOMATION.windowEnd;

    return {
      enabled: enabledRaw === '1' || enabledRaw === 'true',
      windowStart:
        parseHmToMinutes(start) != null
          ? formatHm(start)
          : DEFAULT_AUTOMATION.windowStart,
      windowEnd:
        parseHmToMinutes(end) != null
          ? formatHm(end)
          : DEFAULT_AUTOMATION.windowEnd,
      intervalMinutes: clampIntervalMinutes(
        intervalMinutes,
        DEFAULT_AUTOMATION.intervalMinutes,
      ),
    };
  } catch {
    return { ...DEFAULT_AUTOMATION };
  }
}

export async function persistAutomationSettings(
  settings: AutomationSettings,
): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(
        STORAGE_KEYS.autoEnabled,
        settings.enabled ? '1' : '0',
      ),
      AsyncStorage.setItem(STORAGE_KEYS.autoWindowStart, settings.windowStart),
      AsyncStorage.setItem(STORAGE_KEYS.autoWindowEnd, settings.windowEnd),
      AsyncStorage.setItem(
        STORAGE_KEYS.autoIntervalMinutes,
        String(settings.intervalMinutes),
      ),
    ]);
  } catch (error) {
    console.warn('[Automation] persist failed', error);
  }
}

export async function writeAutomationStatus(message: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.autoLastRunAt, String(Date.now())),
      AsyncStorage.setItem(STORAGE_KEYS.autoLastStatus, message),
    ]);
  } catch {
    // ignore
  }
}

export type ScheduledCheckResult = {
  ranMacro: boolean;
  inWindow: boolean;
  message: string;
};

/**
 * IN window → full smart-start at configured interval.
 * OUT of window → no HTTP, passive wait only.
 */
export async function runScheduledAutomation(
  onProgress?: (p: SmartStartProgress) => void,
): Promise<ScheduledCheckResult> {
  if (automationRunLock) {
    return {
      ranMacro: false,
      inWindow: false,
      message: 'Automatisation déjà en cours',
    };
  }
  automationRunLock = true;

  try {
    const config = await loadFreeboxConfig();
    const automation = await loadAutomationSettings();

    if (!automation.enabled) {
      const message = 'Automatisation désactivée';
      await writeAutomationStatus(message);
      return { ranMacro: false, inWindow: false, message };
    }

    const now = new Date();
    const inWindow = isInTimeWindow(
      now,
      automation.windowStart,
      automation.windowEnd,
    );

    if (!inWindow) {
      const message = 'Hors plage — attente passive (aucune requête HTTP)';
      onProgress?.({ message, tone: 'info', countdown: null });
      await writeAutomationStatus(message);
      return { ranMacro: false, inWindow: false, message };
    }

    const progress =
      onProgress ??
      ((p: SmartStartProgress) => {
        void writeAutomationStatus(p.message);
      });

    const result = await runSmartStart(config, progress);
    const message = result.ok
      ? 'Plage active — démarrage intelligent terminé'
      : `Plage active — échec: ${'error' in result ? result.error : 'inconnu'}`;
    await writeAutomationStatus(message);
    return { ranMacro: true, inWindow: true, message };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur automatisation';
    await writeAutomationStatus(message);
    return { ranMacro: false, inWindow: false, message };
  } finally {
    automationRunLock = false;
  }
}
