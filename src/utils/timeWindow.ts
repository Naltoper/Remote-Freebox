/** Parse "HH:mm" into minutes since midnight. Returns null if invalid. */
export function parseHmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

export function formatHm(value: string): string {
  const mins = parseHmToMinutes(value);
  if (mins == null) return value;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** French display like "14h44". */
export function formatFrenchTime(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}h${m}`;
}

/**
 * Active window helper that supports overnight ranges (e.g. 19:00 → 10:00).
 * Inclusive of start, exclusive of end at the minute boundary.
 */
export function isInTimeWindow(
  now: Date,
  windowStart: string,
  windowEnd: string,
): boolean {
  const start = parseHmToMinutes(windowStart);
  const end = parseHmToMinutes(windowEnd);
  if (start == null || end == null) return false;

  const current = now.getHours() * 60 + now.getMinutes();

  if (start === end) {
    // Same start/end → treat as always active.
    return true;
  }

  if (start < end) {
    // Same-day window, e.g. 09:00 → 17:00
    return current >= start && current < end;
  }

  // Overnight window, e.g. 19:00 → 10:00
  return current >= start || current < end;
}

export function clampIntervalMinutes(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), 24 * 60);
}

/** Next local Date when clock hits HH:mm (today if still ahead, else tomorrow). */
export function nextDateAtHm(now: Date, hm: string): Date | null {
  const target = parseHmToMinutes(hm);
  if (target == null) return null;

  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(Math.floor(target / 60), target % 60, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Delay until the next scheduler wake (battery-friendly, inexact).
 * - Inside window → configured interval (already coarse, e.g. 15 min)
 * - Outside window → sleep until window start, capped by passiveWaitMs
 *   so we do not poll every minute overnight
 */
export function msUntilNextAutomationWake(
  now: Date,
  windowStart: string,
  windowEnd: string,
  intervalMinutes: number,
  passiveWaitMs = 10 * 60 * 1000,
): number {
  if (isInTimeWindow(now, windowStart, windowEnd)) {
    return Math.max(intervalMinutes, 1) * 60 * 1000;
  }

  const start = parseHmToMinutes(windowStart);
  if (start == null) return passiveWaitMs;

  const current = now.getHours() * 60 + now.getMinutes();
  let minutesUntilStart = start - current;
  if (minutesUntilStart <= 0) {
    minutesUntilStart += 24 * 60;
  }
  const untilStartMs = minutesUntilStart * 60 * 1000;
  // Prefer sleeping until the window opens; only re-check periodically for
  // clock / DST drift (default every 10 minutes — Automate-style slack).
  return Math.min(untilStartMs, Math.max(passiveWaitMs, 5 * 60 * 1000));
}

export type NextAutomationInfo = {
  at: Date | null;
  label: string;
};

/**
 * Human-readable next smart-start fire time for Settings.
 */
export function getNextAutomationInfo(
  now: Date,
  enabled: boolean,
  windowStart: string,
  windowEnd: string,
  intervalMinutes: number,
  lastRunAtMs: number | null,
): NextAutomationInfo {
  if (!enabled) {
    return { at: null, label: 'Automatisation désactivée' };
  }

  if (!isInTimeWindow(now, windowStart, windowEnd)) {
    const at = nextDateAtHm(now, windowStart);
    if (!at) {
      return { at: null, label: 'Prochain démarrage : —' };
    }
    return {
      at,
      label: `Prochain démarrage : ${formatFrenchTime(at)}`,
    };
  }

  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;
  if (lastRunAtMs != null) {
    const candidate = new Date(lastRunAtMs + intervalMs);
    if (candidate.getTime() > now.getTime() + 30_000) {
      if (isInTimeWindow(candidate, windowStart, windowEnd)) {
        return {
          at: candidate,
          label: `Prochain démarrage : ${formatFrenchTime(candidate)}`,
        };
      }
      const nextWindow = nextDateAtHm(candidate, windowStart);
      if (nextWindow) {
        return {
          at: nextWindow,
          label: `Prochain démarrage : ${formatFrenchTime(nextWindow)}`,
        };
      }
    }
  }

  // Overdue / first run in window — scheduler fires on next loop tick.
  return { at: now, label: 'Prochain démarrage : bientôt' };
}
