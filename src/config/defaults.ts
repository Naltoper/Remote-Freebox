import type { FreeboxConfig } from '../types/remote';

/** Defaults for the Freebox Player on the local LAN / WireGuard VPN. */
export const DEFAULT_CONFIG: FreeboxConfig = {
  host: '192.168.1.49',
  code: '97773511',
  timeoutMs: 4000,
};

export const STORAGE_KEYS = {
  host: '@remotetvmamie/host',
  code: '@remotetvmamie/code',
  timeoutMs: '@remotetvmamie/timeoutMs',
} as const;
