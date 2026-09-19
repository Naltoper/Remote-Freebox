/** Freebox Player remote key names accepted by `/pub/remote_control`. */
export type FreeboxKey =
  | 'power'
  | 'ok'
  | 'home'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'vol_inc'
  | 'vol_dec'
  | 'mute'
  | 'prgm_inc'
  | 'prgm_dec'
  | 'back'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '0';

export type CommandResult =
  | { ok: true; opaque?: boolean }
  | { ok: false; error: string; timedOut?: boolean };

export type FreeboxConfig = {
  host: string;
  code: string;
  timeoutMs: number;
};

/** Active daytime window for smart-start automation. */
export type AutomationSettings = {
  enabled: boolean;
  /** HH:mm local — start of active window (default 10:00). */
  windowStart: string;
  /** HH:mm local — end of active window (default 19:00). */
  windowEnd: string;
  /** Minutes between smart-start runs while inside the active window. */
  intervalMinutes: number;
};

export type HttpLogKind = 'ping' | FreeboxKey | 'other';

export type HttpLogEntry = {
  id: string;
  timestamp: number;
  kind: HttpLogKind;
  label: string;
  url: string;
  ok: boolean;
  detail: string;
};
