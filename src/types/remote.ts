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
