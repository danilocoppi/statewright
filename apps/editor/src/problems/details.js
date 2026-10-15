// The Problems about one element, as its marker's details show them (ProblemPopover), and why one is only incomplete.
import { listRules } from "statewright";

import { SEVERITIES } from "./store";

/** The rules whose severity follows the level's transitions (Core: "by level"). */
const BY_LEVEL = new Set(listRules().flatMap(rule => (rule.severity === "by level" ? [rule.code] : [])));

/**
 * The Problems about an element: the worst first, in Core's order within each severity.
 * @param {Array<{ code: string, severity: string, target: string, message: string }>} list
 * @param {string} target
 */
export function problemsOn(list, target) {
  const about = list.filter(problem => problem.target === target);
  return SEVERITIES.flatMap(severity => about.filter(problem => problem.severity === severity));
}

/**
 * Why a Problem is incomplete, not an error: its rule follows the level's transitions, and the level shows only some
 * of them (`partial`); or the rule only ever reminds of what is still to be decided or specified.
 * @param {string} code
 * @returns {"level" | "reminder"}
 */
export const incompleteBecause = code => (BY_LEVEL.has(code) ? "level" : "reminder");
