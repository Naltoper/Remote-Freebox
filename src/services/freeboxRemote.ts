import { Platform } from 'react-native';

import type { CommandResult, FreeboxConfig, FreeboxKey } from '../types/remote';

const MIXED_CONTENT_ERROR =
  'Blocked: this HTTPS page cannot call the Freebox over plain HTTP. Use a native/TWA build, host the app on local HTTP, or point Host to an HTTPS LAN proxy.';

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

/** True when a secure (HTTPS) web page would request an insecure (HTTP) URL. */
export function isMixedContentRisk(config: FreeboxConfig): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'https:') return false;

  const url = buildUrl(config, 'ok');
  return url.startsWith('http:');
}

/**
 * Sends a Freebox remote key via HTTP(S) GET.
 *
 * Important (Vercel / any HTTPS host):
 * Browsers block active Mixed Content — an HTTPS PWA cannot `fetch` `http://192.168.x.x`.
 * Service workers cannot bypass this. Workarounds: native/TWA, local HTTP hosting, or an
 * HTTPS reverse proxy on the LAN/VPN (then set Host to `https://…` in Settings).
 *
 * On web, Freebox typically has no CORS headers, so we use `no-cors` (opaque response).
 * On native / TWA, standard fetch expects HTTP 200 + body `"OK"`.
 */
export async function sendRemoteKey(
  config: FreeboxConfig,
  key: FreeboxKey,
): Promise<CommandResult> {
  if (isMixedContentRisk(config)) {
    return { ok: false, error: MIXED_CONTENT_ERROR };
  }

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
    if (/mixed content|insecure|blocked/i.test(message)) {
      return { ok: false, error: MIXED_CONTENT_ERROR };
    }

    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export { buildUrl, MIXED_CONTENT_ERROR };
