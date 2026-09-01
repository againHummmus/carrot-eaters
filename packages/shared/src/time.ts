/** Returns the [start, end) UTC instants for a given calendar day in an IANA timezone. */
export function zonedDayRangeUtc(timeZone: string, localDate: Date): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(localDate);

  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;

  const naiveLocalMidnight = new Date(`${y}-${m}-${d}T00:00:00Z`);

  // Offset between "midnight as if it were UTC" and the real UTC instant of
  // midnight in `timeZone`, derived by re-rendering that same instant in both
  // zones and diffing. Accurate to the minute, which is all meal logging needs.
  const asZoned = new Date(naiveLocalMidnight.toLocaleString('en-US', { timeZone }));
  const asUtc = new Date(naiveLocalMidnight.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = asUtc.getTime() - asZoned.getTime();

  const start = new Date(naiveLocalMidnight.getTime() + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function todayRangeUtc(timeZone: string): { start: Date; end: Date } {
  return zonedDayRangeUtc(timeZone, new Date());
}

/** Inclusive [from, to] calendar-day range (in `timeZone`) as a UTC instant range. */
export function zonedPeriodRangeUtc(timeZone: string, fromDate: string, toDate: string): { start: Date; end: Date } {
  const start = zonedDayRangeUtc(timeZone, new Date(`${fromDate}T12:00:00Z`)).start;
  const end = zonedDayRangeUtc(timeZone, new Date(`${toDate}T12:00:00Z`)).end;
  return { start, end };
}

/** YYYY-MM-DD of an instant, as seen in `timeZone`. Used to bucket rows by local day. */
export function zonedDateKey(timeZone: string, instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}
