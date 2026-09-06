// Format a date value against the UTC calendar day rather than the device's local zone.
// Needed both for a plain calendar date (e.g. scheduled_date, which has no time component —
// formatting it locally could shift it a day either way) and for a UTC timestamp whose date
// portion should display as-is rather than sliding a day for users west of UTC.
export function formatUtcDate(
  date: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(date).toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
}
