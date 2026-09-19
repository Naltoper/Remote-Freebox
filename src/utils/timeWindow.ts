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

/**
 * Delay until the next scheduler wake.
 * - Inside window → configured interval
 * - Outside window → short passive wait (no HTTP), or ms until window start
 */
export function msUntilNextAutomationWake(
  now: Date,
  windowStart: string,
  windowEnd: string,
  intervalMinutes: number,
  passiveWaitMs = 60_000,
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
  // Wake at most every passiveWaitMs so clock drift / DST are handled.
  return Math.min(minutesUntilStart * 60 * 1000, passiveWaitMs);
}
