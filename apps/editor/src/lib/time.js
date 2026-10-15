const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * When something happened, for people: "just now", "2 minutes ago", "yesterday", then a short date ("8 Oct").
 * @param {number} timestamp
 * @param {number} now
 * @param {string} locale
 */
export function describeTime(timestamp, now, locale) {
  const elapsed = Math.max(0, now - timestamp);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (elapsed < MINUTE) return relative.format(0, "second");
  if (elapsed < HOUR) return relative.format(-Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return relative.format(-Math.floor(elapsed / HOUR), "hour");
  if (elapsed < 7 * DAY) return relative.format(-Math.floor(elapsed / DAY), "day");
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(!sameYear && { year: "numeric" })
  }).format(timestamp);
}
