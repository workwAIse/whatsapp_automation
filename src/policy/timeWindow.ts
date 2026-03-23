export type TimeWindow = {
  timezone: string; // IANA TZ name
  startHourInclusive: number; // 0-23
  endHourExclusive: number; // 0-24 (we'll treat 21 as exclusive end)
};

/**
 * Returns true if now is within allowed window in the given timezone.
 * Handles windows that don't wrap midnight (e.g., 09-21).
 */
export function isWithinWindow(now: Date, window: TimeWindow): boolean {
  // Use Intl.DateTimeFormat to get hour in target timezone without extra deps.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: window.timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hourStr = parts.find((p) => p.type === "hour")?.value;
  const hour = hourStr ? Number(hourStr) : NaN;
  if (!Number.isFinite(hour)) return false;

  const start = window.startHourInclusive;
  const end = window.endHourExclusive;

  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // wrap-around window (not used initially, but supported)
  return hour >= start || hour < end;
}

