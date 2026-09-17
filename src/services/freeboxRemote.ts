import { Platform } from 'react-native';

import type { CommandResult, FreeboxConfig, FreeboxKey } from '../types/remote';

/**
 * Builds the Freebox remote-control URL.
 * Bare hosts (e.g. `192.168.1.49`) always use plain `http://`.
 * A full origin is only kept when the user explicitly sets `http://` or `https://`.
 */
function buildUrl(config: FreeboxConfig, key: FreeboxKey): string {
  const raw = config.host.trim().replace(/\/$/, '');
  const origin = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;

  const params = new URLSearchParams({
    code: config.code,
    key,
  });
  return `${origin}/pub/remote_control?${params.toString()}`;
}

/**
 * Sends a Freebox remote key via HTTP GET.
 *
 * Native Android/iOS: standard `fetch` (cleartext allowed via app.json).
 * Web only: `no-cors` because Freebox does not send CORS headers.
 */
export async function sendRemoteKey(
  config: FreeboxConfig,
  key: FreeboxKey,
): Promise<CommandResult> {
  const url = buildUrl(config, key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    if (Platform.OS === 'web') {
      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store',
      });
      return { ok: true, opaque: true };
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const body = (await response.text()).trim();
    if (body && body !== 'OK') {
      return { ok: false, error: `Unexpected response: ${body}` };
    }

    return { ok: true };
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === 'AbortError' || /aborted|timeout/i.test(err.message));

    if (timedOut) {
      return {
        ok: false,
        timedOut: true,
        error: 'Timeout — check VPN / Freebox Player power',
      };
    }

    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export { buildUrl };
