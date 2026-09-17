import { Platform } from 'react-native';

import type { CommandResult, FreeboxConfig, FreeboxKey } from '../types/remote';

/**
 * Builds the Freebox remote URL.
 * `host` may be an IP (`192.168.1.49`) or a full origin (`https://freebox.lan:8443`).
 */
function buildUrl(config: FreeboxConfig, key: FreeboxKey): string {
  const raw = config.host.trim();
  const hasScheme = /^https?:\/\//i.test(raw);
  const origin = hasScheme
    ? raw.replace(/\/$/, '')
    : `http://${raw.replace(/\/$/, '')}`;

  const params = new URLSearchParams({
    code: config.code,
    key,
  });
  return `${origin}/pub/remote_control?${params.toString()}`;
}

/**
 * Sends a Freebox remote key via HTTP(S) GET.
 *
 * Intended for HTTP-hosted UI (LAN server or GitHub Pages without HTTPS) so the
 * browser can call `http://192.168.x.x` without Mixed Content. On web, Freebox
 * typically has no CORS headers, so we use `no-cors` (opaque response). On
 * native / TWA, standard fetch expects HTTP 200 + body `"OK"`.
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
