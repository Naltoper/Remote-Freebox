import { Platform } from 'react-native';

import type { CommandResult, FreeboxConfig, FreeboxKey } from '../types/remote';
import { appendHttpLog, labelForKind } from './httpLog';

/**
 * Builds the Freebox remote-control URL.
 * Bare hosts (e.g. `192.168.1.49`) always use plain `http://`.
 * A full origin is only kept when the user explicitly sets `http://` or `https://`.
 */
function buildOrigin(config: FreeboxConfig): string {
  const raw = config.host.trim().replace(/\/$/, '');
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}

function buildUrl(config: FreeboxConfig, key: FreeboxKey): string {
  const params = new URLSearchParams({
    code: config.code,
    key,
  });
  return `${buildOrigin(config)}/pub/remote_control?${params.toString()}`;
}

function logKeyResult(
  key: FreeboxKey,
  url: string,
  result: CommandResult,
): void {
  const label = labelForKind(key);
  void appendHttpLog({
    kind: key,
    url,
    ok: result.ok,
    label,
    detail: result.ok
      ? `Commande ${label} envoyée`
      : `ÉCHEC / FAIL — ${result.error}`,
  });
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
      const result: CommandResult = { ok: true, opaque: true };
      logKeyResult(key, url, result);
      return result;
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const result: CommandResult = {
        ok: false,
        error: `HTTP ${response.status}`,
      };
      logKeyResult(key, url, result);
      return result;
    }

    const body = (await response.text()).trim();
    if (body && body !== 'OK') {
      const result: CommandResult = {
        ok: false,
        error: `Unexpected response: ${body}`,
      };
      logKeyResult(key, url, result);
      return result;
    }

    const result: CommandResult = { ok: true };
    logKeyResult(key, url, result);
    return result;
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === 'AbortError' || /aborted|timeout/i.test(err.message));

    const result: CommandResult = timedOut
      ? {
          ok: false,
          timedOut: true,
          error: 'Timeout — check VPN / Freebox Player power',
        }
      : {
          ok: false,
          error: err instanceof Error ? err.message : 'Network error',
        };
    logKeyResult(key, url, result);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Heuristic: Player is "on" (or network-awake) if the host answers HTTP quickly.
 * Fully powered-off boxes usually do not respond → treated as off.
 */
export async function isPlayerReachable(
  config: FreeboxConfig,
  timeoutMs = 2500,
): Promise<boolean> {
  const origin = buildOrigin(config);
  const url = `${origin}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const init: RequestInit = {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    };
    if (Platform.OS === 'web') {
      init.mode = 'no-cors';
    }
    await fetch(url, init);
    void appendHttpLog({
      kind: 'ping',
      url,
      ok: true,
      detail: 'Player allumé / joignable',
      label: 'Ping / Status',
    });
    return true;
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === 'AbortError' || /aborted|timeout/i.test(err.message));
    // Timeout on status probe usually means the box is powered off — treat as
    // a successful diagnostic outcome (green "Player éteint"), not a network bug.
    if (timedOut) {
      void appendHttpLog({
        kind: 'ping',
        url,
        ok: true,
        detail: 'Player éteint (pas de réponse HTTP)',
        label: 'Ping / Status',
      });
      return false;
    }
    void appendHttpLog({
      kind: 'ping',
      url,
      ok: false,
      detail: `ÉCHEC / FAIL — ${err instanceof Error ? err.message : 'réseau'}`,
      label: 'Ping / Status',
    });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type SmartStartProgress = {
  message: string;
  tone: 'info' | 'success' | 'error';
  countdown: number | null;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new Error('Aborted'));
      },
      { once: true },
    );
  });
}

async function countdownWait(
  seconds: number,
  messageFor: (left: number) => string,
  onProgress: (p: SmartStartProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  for (let left = seconds; left >= 1; left -= 1) {
    if (signal?.aborted) throw new Error('Aborted');
    onProgress({
      message: messageFor(left),
      tone: 'info',
      countdown: left,
    });
    await sleep(1000, signal);
  }
}

/**
 * Smart-start macro:
 * - Off → power → 20s → ok
 * - On → home → 3s → ok
 */
export async function runSmartStart(
  config: FreeboxConfig,
  onProgress: (p: SmartStartProgress) => void,
  signal?: AbortSignal,
): Promise<CommandResult> {
  onProgress({
    message: 'Vérification de l’état du Player…',
    tone: 'info',
    countdown: null,
  });

  const reachable = await isPlayerReachable(config);

  if (!reachable) {
    onProgress({
      message: 'Player éteint. Allumage en cours...',
      tone: 'info',
      countdown: null,
    });
    const powerResult = await sendRemoteKey(config, 'power');
    if (!powerResult.ok) {
      onProgress({
        message: powerResult.error,
        tone: 'error',
        countdown: null,
      });
      return powerResult;
    }

    await countdownWait(
      20,
      (left) => `Attente du démarrage du Player : ${left} s...`,
      onProgress,
      signal,
    );

    onProgress({
      message: 'Lancement de la TV...',
      tone: 'info',
      countdown: null,
    });
    const okResult = await sendRemoteKey(config, 'ok');
    if (!okResult.ok) {
      onProgress({ message: okResult.error, tone: 'error', countdown: null });
      return okResult;
    }

    onProgress({
      message: 'Démarrage terminé',
      tone: 'success',
      countdown: null,
    });
    return { ok: true };
  }

  onProgress({
    message: 'Player déjà allumé. Alignement sur le menu...',
    tone: 'info',
    countdown: null,
  });
  const homeResult = await sendRemoteKey(config, 'home');
  if (!homeResult.ok) {
    onProgress({ message: homeResult.error, tone: 'error', countdown: null });
    return homeResult;
  }

  await countdownWait(
    3,
    (left) => `Alignement menu : ${left} s...`,
    onProgress,
    signal,
  );

  onProgress({
    message: 'Lancement de la TV...',
    tone: 'info',
    countdown: null,
  });
  const okResult = await sendRemoteKey(config, 'ok');
  if (!okResult.ok) {
    onProgress({ message: okResult.error, tone: 'error', countdown: null });
    return okResult;
  }

  onProgress({
    message: 'Menu prêt',
    tone: 'success',
    countdown: null,
  });
  return { ok: true };
}

export { buildUrl };
