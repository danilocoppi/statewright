// The lines of the Problems panel (spec §8.1): one per Problem, in severity order, with where it is — except catalog
// items with the same finding, which share one line ("8 events do not specify payload").
import { indexOf, levelPathOf } from "@/lib/derived";

import { SEVERITIES } from "./store";

/** Findings on catalog items that read well as one line per collection. */
export const GROUPED_CODES = new Set(["spec.unspecified", "catalog.unused"]);

/** Core writes messages for the command line ("state … cannot be reached"); the panel shows them as sentences. */
export const sentence = text => (text ? text[0].toUpperCase() + text.slice(1) : text);

/**
 * Where a Problem is: the path of levels to its canvas, a catalog collection, a definition, or the project.
 * @returns {{ kind: "level", canvas: string, path: string[] } | { kind: "catalog", collection: string }
 *   | { kind: "definitions" } | { kind: "project" }}
 */
function locate(doc, index, problem) {
  const canvas = problem.canvas ?? (index.get(problem.target)?.type === "canvas" ? problem.target : null);
  if (canvas && doc.canvases[canvas]) {
    const path = (levelPathOf(doc, canvas) ?? [{ canvas }]).map(step => doc.canvases[step.canvas]?.name ?? step.canvas);
    return { kind: "level", canvas, path };
  }
  const entry = index.get(problem.target);
  if (entry?.type === "catalog") return { kind: "catalog", collection: entry.collection };
  if (entry?.type === "definition") return { kind: "definitions" };
  return { kind: "project" };
}

/**
 * @typedef {{ kind: "one", key: string, severity: string, code: string, message: string, target: string,
 *   location: ReturnType<typeof locate>, data?: object }} OneRow `data`: the rule's facts (a diverged scenario's step).
 * @typedef {{ kind: "group", key: string, severity: string, code: string, collection: string, fields: string[],
 *   names: string[] }} GroupRow
 */

/**
 * @param {any} doc
 * @param {Array<{ code: string, severity: string, target: string, canvas?: string, message: string,
 *   data?: { fields?: string[] } }>} problems Core's Problems, in Core's order.
 * @returns {Array<OneRow | GroupRow>} Errors first, then warnings, then incomplete; Core's order within each.
 */
export function problemRows(doc, problems) {
  const index = indexOf(doc);
  const one = (problem, location) => ({
    kind: "one",
    key: `${problem.code}|${problem.target}|${problem.message}`,
    severity: problem.severity,
    code: problem.code,
    message: sentence(problem.message),
    target: problem.target,
    location,
    ...(problem.data ? { data: problem.data } : {})
  });
  const rows = [];
  const groups = new Map();
  for (const problem of problems) {
    const location = locate(doc, index, problem);
    if (location.kind !== "catalog" || !GROUPED_CODES.has(problem.code)) {
      rows.push(one(problem, location));
      continue;
    }
    const fields = problem.data?.fields ?? [];
    const key = [problem.severity, problem.code, location.collection, ...fields].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        severity: problem.severity,
        code: problem.code,
        collection: location.collection,
        fields,
        members: []
      });
      rows.push(groups.get(key));
    }
    groups.get(key).members.push({ problem, location });
  }
  const lines = rows.map(row => {
    if (!row.members) return row;
    const { members, ...group } = row;
    if (members.length === 1) return one(members[0].problem, members[0].location);
    return {
      kind: "group",
      ...group,
      names: members.map(({ problem }) => index.get(problem.target)?.value.name ?? problem.target)
    };
  });
  return SEVERITIES.flatMap(severity => lines.filter(row => row.severity === severity));
}
