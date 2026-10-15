// Time in a run (simulator spec §5.6): ISO 8601 instants and durations, and the business calendar. Pure arithmetic in
// UTC; nothing here reads the real clock.
import { DURATION_PATTERN } from "../schema/helpers.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** An instant as the format writes it: UTC, without milliseconds when they are zero. */
export const instantOf = date => date.toISOString().replace(/\.000Z$/, "Z");

/** A date or date-time as an instant (a date alone is its midnight, UTC); null when it is not one. */
export function parseInstant(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return null;
  const date = new Date(/T/.test(value) ? value : `${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Is this an ISO 8601 duration, optionally signed (`-P60D`)? */
export const isDuration = text => typeof text === "string" && DURATION_PATTERN.test(text.replace(/^[-+]/, ""));

/** The parts of an ISO 8601 duration, with its sign. */
function partsOf(text) {
  const sign = text.startsWith("-") ? -1 : 1;
  const match =
    /^[-+]?P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(text);
  const [years, months, weeks, days, hours, minutes] = match.slice(1, 7).map(value => Number(value ?? 0));
  return { sign, years, months, weeks, days, hours, minutes, seconds: Number(match[7] ?? 0) };
}

const isWeekend = date => date.getUTCDay() === 0 || date.getUTCDay() === 6;

/** The instants the format can write: years 0000 to 9999. */
const FIRST = Date.parse("0000-01-01T00:00:00Z");
const LAST = Date.parse("9999-12-31T23:59:59.999Z");

/**
 * Move a date by business days, as counting them one at a time would: each day that is not a Saturday or a Sunday
 * counts. From a weekday, five of them are exactly a week, so whole weeks are added at once.
 */
function addBusinessDays(date, count, sign) {
  let left = count;
  const stepDay = () => {
    date.setTime(date.getTime() + sign * DAY);
    if (!isWeekend(date)) left--;
  };
  while (left > 0 && isWeekend(date)) stepDay();
  const weeks = Math.floor(left / 5);
  date.setTime(date.getTime() + sign * weeks * 7 * DAY);
  left -= weeks * 5;
  while (left > 0 && !Number.isNaN(date.getTime())) stepDay();
}

/**
 * The instant a duration after `from` (before it, for a negative duration), or null when it falls outside the years
 * 0000 to 9999. In the business calendar the days and weeks count Monday to Friday only — a week is five business
 * days — and years, months and the time of day count as usual; there are no holidays.
 * @param {Date} from
 * @param {string} duration ISO 8601, optionally signed.
 * @param {"calendar" | "business"} [calendar]
 * @returns {Date | null}
 */
export function addDuration(from, duration, calendar = "calendar") {
  const { sign, years, months, weeks, days, hours, minutes, seconds } = partsOf(duration);
  const date = new Date(from.getTime());
  if (years || months) date.setUTCMonth(date.getUTCMonth() + sign * (years * 12 + months));
  if (calendar === "business") addBusinessDays(date, weeks * 5 + days, sign);
  else date.setTime(date.getTime() + sign * (weeks * 7 + days) * DAY);
  date.setTime(date.getTime() + sign * Math.round(hours * HOUR + minutes * MINUTE + seconds * 1000));
  const time = date.getTime();
  return time >= FIRST && time <= LAST ? date : null;
}

/** The ISO 8601 duration from one instant to a later one, in days, hours, minutes and seconds ("P10DT2H"). */
export function durationBetween(from, to) {
  let left = Math.max(0, to.getTime() - from.getTime());
  const take = unit => {
    const count = Math.floor(left / unit);
    left -= count * unit;
    return count;
  };
  const days = take(DAY);
  const hours = take(HOUR);
  const minutes = take(MINUTE);
  const seconds = left / 1000;
  const time = [hours && `${hours}H`, minutes && `${minutes}M`, seconds && `${seconds}S`].filter(Boolean).join("");
  if (!days && !time) return "PT0S";
  return `P${days ? `${days}D` : ""}${time ? `T${time}` : ""}`;
}
