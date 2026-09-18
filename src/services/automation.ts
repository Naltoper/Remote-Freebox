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
import {
  isPlayerReachable,
  runSmartStart,
  type SmartStartProgress,
} from './freeboxRemote';

export async function loadFreeboxConfig(): Promise<FreeboxConfig> {
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
}

export async function loadAutomationSettings(): Promise<AutomationSettings> {
  const [
    enabledRaw,
    windowStart,
    windowEnd,
    intervalRaw,
    offIntervalRaw,
  ] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.autoEnabled),
    AsyncStorage.getItem(STORAGE_KEYS.autoWindowStart),
    AsyncStorage.getItem(STORAGE_KEYS.autoWindowEnd),
    AsyncStorage.getItem(STORAGE_KEYS.autoIntervalMinutes),
    AsyncStorage.getItem(STORAGE_KEYS.autoOffWindowIntervalMinutes),
  ]);

  const intervalMinutes = intervalRaw
    ? Number(intervalRaw)
    : DEFAULT_AUTOMATION.intervalMinutes;
  const offWindowIntervalMinutes = offIntervalRaw
    ? Number(offIntervalRaw)
    : DEFAULT_AUTOMATION.offWindowIntervalMinutes;

  const start = windowStart?.trim() || DEFAULT_AUTOMATION.windowStart;
  const end = windowEnd?.trim() || DEFAULT_AUTOMATION.windowEnd;

  return {
    enabled: enabledRaw === '1' || enabledRaw === 'true',
    windowStart:
      parseHmToMinutes(start) != null
        ? formatHm(start)
        : DEFAULT_AUTOMATION.windowStart,
    windowEnd:
      parseHmToMinutes(end) != null ? formatHm(end) : DEFAULT_AUTOMATION.windowEnd,
    intervalMinutes: clampIntervalMinutes(
      intervalMinutes,
      DEFAULT_AUTOMATION.intervalMinutes,
    ),
    offWindowIntervalMinutes: clampIntervalMinutes(
      offWindowIntervalMinutes,
      DEFAULT_AUTOMATION.offWindowIntervalMinutes,
    ),
  };
}

export async function persistAutomationSettings(
  settings: AutomationSettings,
): Promise<void> {
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
    AsyncStorage.setItem(
      STORAGE_KEYS.autoOffWindowIntervalMinutes,
      String(settings.offWindowIntervalMinutes),
    ),
  ]);
}

export async function writeAutomationStatus(message: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.autoLastRunAt, String(Date.now())),
    AsyncStorage.setItem(STORAGE_KEYS.autoLastStatus, message),
  ]);
}

export type ScheduledCheckResult = {
  ranMacro: boolean;
  inWindow: boolean;
  message: string;
};

/**
 * In active window → full smart-start (wake or home+ok).
 * Outside window → light reachability probe only (never send power).
 */
export async function runScheduledAutomation(
  onProgress?: (p: SmartStartProgress) => void,
): Promise<ScheduledCheckResult> {
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
    const reachable = await isPlayerReachable(config, 2000);
    const message = reachable
      ? 'Hors plage — Player joignable (aucune action)'
      : 'Hors plage — Player injoignable (aucune action)';
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
    ? 'Plage active — macro terminée'
    : `Plage active — échec: ${'error' in result ? result.error : 'inconnu'}`;
  await writeAutomationStatus(message);
  return { ranMacro: true, inWindow: true, message };
}
