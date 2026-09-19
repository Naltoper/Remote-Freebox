import type { AutomationSettings, FreeboxConfig } from '../types/remote';

/** Defaults for the Freebox Player on the local LAN / WireGuard VPN. */
export const DEFAULT_CONFIG: FreeboxConfig = {
  host: '192.168.1.49',
  code: '97773511',
  timeoutMs: 4000,
};

/** Active window 10:00 → 19:00 with periodic smart-start checks. */
export const DEFAULT_AUTOMATION: AutomationSettings = {
  enabled: false,
  windowStart: '10:00',
  windowEnd: '19:00',
  intervalMinutes: 15,
};

export const STORAGE_KEYS = {
  host: '@remotetvmamie/host',
  code: '@remotetvmamie/code',
  timeoutMs: '@remotetvmamie/timeoutMs',
  autoEnabled: '@remotetvmamie/autoEnabled',
  autoWindowStart: '@remotetvmamie/autoWindowStart',
  autoWindowEnd: '@remotetvmamie/autoWindowEnd',
  autoIntervalMinutes: '@remotetvmamie/autoIntervalMinutes',
  autoLastRunAt: '@remotetvmamie/autoLastRunAt',
  autoLastStatus: '@remotetvmamie/autoLastStatus',
  httpLogs: '@remotetvmamie/httpLogs',
} as const;

export const SMART_START_BACKGROUND_TASK = 'SMART_START_BACKGROUND_TASK';
export const SMART_START_FOREGROUND_TASK = 'SMART_START_FOREGROUND_TASK';

export const HTTP_LOG_LIMIT = 100;
/** Passive wake interval outside the active window (no HTTP). */
export const PASSIVE_WAIT_MS = 60_000;
