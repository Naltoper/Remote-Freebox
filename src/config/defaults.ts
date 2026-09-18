import type { AutomationSettings, FreeboxConfig } from '../types/remote';

/** Defaults for the Freebox Player on the local LAN / WireGuard VPN. */
export const DEFAULT_CONFIG: FreeboxConfig = {
  host: '192.168.1.49',
  code: '97773511',
  timeoutMs: 4000,
};

/** Overnight window 19:00 → 10:00 with periodic smart-start checks. */
export const DEFAULT_AUTOMATION: AutomationSettings = {
  enabled: false,
  windowStart: '19:00',
  windowEnd: '10:00',
  intervalMinutes: 15,
  offWindowIntervalMinutes: 60,
};

export const STORAGE_KEYS = {
  host: '@remotetvmamie/host',
  code: '@remotetvmamie/code',
  timeoutMs: '@remotetvmamie/timeoutMs',
  autoEnabled: '@remotetvmamie/autoEnabled',
  autoWindowStart: '@remotetvmamie/autoWindowStart',
  autoWindowEnd: '@remotetvmamie/autoWindowEnd',
  autoIntervalMinutes: '@remotetvmamie/autoIntervalMinutes',
  autoOffWindowIntervalMinutes: '@remotetvmamie/autoOffWindowIntervalMinutes',
  autoLastRunAt: '@remotetvmamie/autoLastRunAt',
  autoLastStatus: '@remotetvmamie/autoLastStatus',
} as const;

export const SMART_START_BACKGROUND_TASK = 'SMART_START_BACKGROUND_TASK';
