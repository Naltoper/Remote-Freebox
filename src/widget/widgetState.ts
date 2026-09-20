import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../config/defaults';
import {
  loadAutomationSettings,
} from '../services/automation';
import type { AutomationSettings } from '../types/remote';
import {
  formatFrenchTime,
  getNextAutomationInfo,
  parseHmToMinutes,
} from '../utils/timeWindow';

export type WidgetViewState = {
  automation: AutomationSettings;
  statusLine: string;
  rangeLine: string;
  intervalLine: string;
  nextLine: string;
  actionStatus: string;
  busy: boolean;
};

function formatHmFrench(hm: string): string {
  const mins = parseHmToMinutes(hm);
  if (mins == null) return hm;
  const h = Math.floor(mins / 60);
  const m = String(mins % 60).padStart(2, '0');
  return `${h}h${m}`;
}

export async function setWidgetActionStatus(message: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.widgetStatus, message);
  } catch {
    // ignore
  }
}

export async function loadWidgetViewState(
  busy = false,
): Promise<WidgetViewState> {
  const automation = await loadAutomationSettings();
  let lastRunAtMs: number | null = null;
  let actionStatus = 'Prêt';

  try {
    const [lastRunRaw, statusRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.autoLastRunAt),
      AsyncStorage.getItem(STORAGE_KEYS.widgetStatus),
    ]);
    if (lastRunRaw) {
      const n = Number(lastRunRaw);
      lastRunAtMs = Number.isFinite(n) ? n : null;
    }
    if (statusRaw?.trim()) {
      actionStatus = statusRaw.trim();
    }
  } catch {
    // keep defaults
  }

  const next = getNextAutomationInfo(
    new Date(),
    automation.enabled,
    automation.windowStart,
    automation.windowEnd,
    automation.intervalMinutes,
    lastRunAtMs,
  );

  return {
    automation,
    statusLine: `Statut : ${automation.enabled ? 'Actif' : 'Inactif'}`,
    rangeLine: `Plage : ${formatHmFrench(automation.windowStart)}-${formatHmFrench(automation.windowEnd)}`,
    intervalLine: `Intervalle : ${automation.intervalMinutes} min`,
    nextLine: next.label.replace(/^Prochain démarrage :\s*/i, 'Prochain : '),
    actionStatus: busy ? 'En cours…' : actionStatus,
    busy,
  };
}
