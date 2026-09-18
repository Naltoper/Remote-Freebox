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

/** Scheduled smart-start automation (overnight window crosses midnight). */
export type AutomationSettings = {
  enabled: boolean;
  /** HH:mm local time — start of active window (e.g. 19:00). */
  windowStart: string;
  /** HH:mm local time — end of active window (e.g. 10:00 next day). */
  windowEnd: string;
  /** Minutes between checks while inside the active window. */
  intervalMinutes: number;
  /** Minutes between light checks outside the active window (no wake). */
  offWindowIntervalMinutes: number;
};
