// What changed between two contracts (source-of-truth spec §5, What changed): compared by ID, since IDs are permanent
// and names are not — a renamed state is a change the code must follow, because the code holds the name.
import { canonicalize } from "../serialize/canonical.js";

const same = (a, b) => canonicalize(a ?? null) === canonicalize(b ?? null);

/** The keys whose values differ between two objects, in sorted order. */
const fieldsOf = (before, after) =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter(key => !same(before[key], after[key]));

/** Added, removed and changed elements of two lists, by ID. */
function compareLists(kind, before = [], after = [], where = {}) {
  const old = new Map(before.map(item => [item.id, item]));
  const now = new Map(after.map(item => [item.id, item]));
  const changes = [];
  for (const [id, item] of now) {
    if (!old.has(id)) changes.push({ change: "added", kind, ...where, id, ...(item.name ? { name: item.name } : {}) });
    else if (!same(old.get(id), item)) {
      const fields = fieldsOf(old.get(id), item);
      changes.push({
        change: "changed",
        kind,
        ...where,
        id,
        ...(item.name ? { name: item.name } : {}),
        fields,
        before: Object.fromEntries(fields.map(field => [field, old.get(id)[field]])),
        after: Object.fromEntries(fields.map(field => [field, item[field]]))
      });
    }
  }
  for (const [id, item] of old) {
    if (!now.has(id))
      changes.push({ change: "removed", kind, ...where, id, ...(item.name ? { name: item.name } : {}) });
  }
  return changes;
}

/** Changes inside levels both contracts have; a level added or removed is one change. */
function compareLevels(kind, before = [], after = [], parts) {
  const changes = [];
  const old = new Map(before.map(level => [level.id, level]));
  const now = new Map(after.map(level => [level.id, level]));
  for (const change of compareLists(kind, before, after)) {
    if (change.change !== "changed") {
      changes.push(change);
      continue;
    }
    const [a, b] = [old.get(change.id), now.get(change.id)];
    const own = change.fields.filter(field => !parts.some(([key]) => key === field));
    if (own.length) {
      changes.push({
        ...change,
        fields: own,
        before: Object.fromEntries(own.map(field => [field, a[field]])),
        after: Object.fromEntries(own.map(field => [field, b[field]]))
      });
    }
    for (const [key, partKind] of parts) changes.push(...compareLists(partKind, a[key], b[key], { level: change.id }));
  }
  return changes;
}

/**
 * What changed from one contract to the next.
 * @param {object} before The contract the code was aligned with.
 * @param {object} after The design's contract now.
 * @returns {{ same: boolean, changes: object[] }} Each change: `{ change: "added" | "removed" | "changed", kind,
 *   level?, id, name?, fields?, before?, after? }`.
 */
export function diffContracts(before, after) {
  const changes = [
    ...compareLevels("machine", before.machines, after.machines, [
      ["states", "state"],
      ["starts", "start"],
      ["nodes", "node"],
      ["transitions", "transition"]
    ]),
    ...compareLevels("flow", before.flows, after.flows, [
      ["steps", "step"],
      ["edges", "edge"]
    ]),
    ...compareLists("vector", before.vectors, after.vectors),
    ...compareLists("stale", before.stale, after.stale)
  ];
  const identical = same(before, after);
  // The design changed outside its machines, flows and scenarios (a system level, the project's name, a version).
  if (!identical && !changes.length) {
    const fields = fieldsOf(before.source ?? {}, after.source ?? {});
    changes.push({ change: "changed", kind: "source", fields: fields.length ? fields : ["contract"] });
  }
  return { same: identical, changes };
}

const KINDS = {
  machine: "machine",
  state: "state",
  start: "start",
  node: "node",
  transition: "transition",
  flow: "flow",
  step: "step",
  edge: "edge",
  vector: "scenario",
  stale: "stale scenario",
  source: "design"
};

/** One change as a line of Markdown. */
function lineOf(change) {
  const what = `${KINDS[change.kind]} \`${change.name ?? change.id}\`${change.name ? ` (\`${change.id}\`)` : ""}`;
  const where = change.level ? ` in \`${change.level}\`` : "";
  if (change.change === "added") return `- **Added** ${what}${where}`;
  if (change.change === "removed") return `- **Removed** ${what}${where}`;
  if (change.kind === "source") return "- **Changed** the design outside its machines, flows and scenarios";
  if (change.fields.includes("name")) {
    const rest = change.fields.filter(field => field !== "name");
    const also = rest.length ? `; also ${rest.map(field => `\`${field}\``).join(", ")}` : "";
    const { name: before } = change.before;
    const { name: after } = change.after;
    // An element that had no name, or has none now, was named or unnamed: there is no old or new name to follow.
    const renamed =
      before === undefined ? `**Named** ${KINDS[change.kind]} \`${after}\``
      : after === undefined ? `**Unnamed** ${KINDS[change.kind]} \`${before}\``
      : `**Renamed** ${KINDS[change.kind]} \`${before}\` → \`${after}\``;
    return `- ${renamed} (\`${change.id}\`)${where}${also}`;
  }
  return `- **Changed** ${what}${where}: ${change.fields.map(field => `\`${field}\``).join(", ")}`;
}

/**
 * The changes in Markdown, for a person or an agent to act on.
 * @param {{ same: boolean, changes: object[] }} diff
 * @returns {string}
 */
export function toChangesMarkdown(diff) {
  if (diff.same) return "No changes: the contract is the design's.\n";
  return `# What changed in the design\n\n${diff.changes.map(lineOf).join("\n")}\n`;
}
