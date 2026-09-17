import { Platform } from 'react-native';

import type { CommandResult, FreeboxConfig, FreeboxKey } from '../types/remote';

function buildUrl(config: FreeboxConfig, key: FreeboxKey): string {
  const base = `http://${config.host.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  const params = new URLSearchParams({
    code: config.code,
    key,
  });
  return `${base}/pub/remote_control?${params.toString()}`;
}

/**
 * Sends a Freebox remote key via HTTP GET.
 *
 * On web, browsers block reading cross-origin responses from local HTTP
 * without CORS headers, so we use `no-cors` (opaque success). On native /
 * TWA, standard CORS-aware fetch is used and we expect HTTP 200 + "OK".
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
      // Opaque response: request was dispatched; body/status are unreadable.
      return { ok: true, opaque: true };
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
      };
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
