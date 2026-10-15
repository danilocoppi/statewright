// Values typed in plain words and stored in the format's own form (spec §7.2: "30 min" is PT30M).
import { EVENT_GLOB_PATTERN } from "statewright";

import { parseDuration } from "@/editing/triggers";

import { isEmpty } from "./apply";

export { parseDuration };

/**
 * A signed duration, relative to a moment ("-7 days" before it is -P7D; "+2 hours" or "2 hours" after it is PT2H), or
 * null when the text is not one.
 * @param {string} text
 */
export function parseSigned(text) {
  const match = /^([-+])?\s*(.+)$/.exec(text.trim());
  const duration = match && parseDuration(match[2]);
  return duration ? `${match[1] === "-" ? "-" : ""}${duration}` : null;
}

/** An event-name pattern ("leg.*"), or null when the text is not one. */
export function parseGlob(text) {
  const typed = text.trim();
  return EVENT_GLOB_PATTERN.test(typed) ? typed : null;
}

/**
 * JSON typed in a field: its value, or what is wrong with it.
 * @returns {{ ok: true, value: unknown } | { ok: false, message: string }}
 */
export function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

/**
 * A composite value with its empty parts left out; undefined when nothing is left — a condition, a retry or an
 * effective period that says nothing is no value at all. Parts that are JSON are kept as they are (only the first
 * level is looked at).
 */
export function compact(value) {
  const kept = Object.entries(value).filter(([, part]) => !isEmpty(part));
  return kept.length ? Object.fromEntries(kept) : undefined;
}

/**
 * How a piece of evidence reads in one line: core.js:41 (and its symbol), or a document's title (and its quote).
 * @param {any} item
 * @returns {{ main: string, more?: string }}
 */
export function evidenceSummary(item) {
  if (item.kind === "code") return { main: `${item.path}${item.lines ? `:${item.lines}` : ""}`, more: item.symbol };
  return { main: item.title ?? item.url, more: item.quote && `“${item.quote}”` };
}
