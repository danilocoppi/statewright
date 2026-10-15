import { current, isDraft } from "immer";
import { buildIndex } from "../query/build-index.js";
import { collectRefs } from "../query/refs.js";
import { tidy } from "./context.js";
import { fail } from "./errors.js";

/** The value at `path`, or undefined when any step is missing. */
function getAt(doc, path) {
  let value = doc;
  for (const key of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = value[key];
  }
  return value;
}

/** Delete the key (or array item) at `path`; silently does nothing when the parent is already gone. */
function deleteAt(doc, path) {
  const parent = getAt(doc, path.slice(0, -1));
  if (parent === null || typeof parent !== "object") return;
  const key = path.at(-1);
  if (Array.isArray(parent)) parent.splice(key, 1);
  else delete parent[key];
}

/**
 * References that never block a removal: annotations and layout entries, the edges of a removed node
 * (`from`/`to`), and an owner's `inner.canvas` when its interior is removed (the owner stays, without interior).
 */
function isImplicit(ref) {
  return ref.section !== "content" || ref.field === "from" || ref.field === "to" || ref.field === "inner.canvas";
}

/**
 * Remove elements and everything that cannot exist without them (spec §21).
 *
 * Always removed together: the regions, nodes and edges of a removed canvas; a removed node's edges and own
 * interior; a definition's body; a catalog item's own implementation flow; annotations and layout entries that
 * point at removed elements. Any other reference blocks the removal with IN_USE unless `cascade` is true, in which
 * case it follows its `onRemove` rule (unset the field, drop the list item, or remove the referencing element).
 *
 * @param {any} doc Immer draft of the document.
 * @param {string[]} ids Elements to remove (must exist).
 * @param {{ cascade?: boolean }} [options]
 * @returns {string[]} Every removed ID.
 */
export function removeElements(doc, ids, { cascade = false } = {}) {
  // Read from a plain snapshot of the draft (performance spec §3 P1); removals are written to the draft.
  const plain = isDraft(doc) ? current(doc) : doc;
  const index = buildIndex(plain);
  const refsByTarget = new Map();
  for (const ref of collectRefs(plain)) {
    if (!refsByTarget.has(ref.target)) refsByTarget.set(ref.target, []);
    refsByTarget.get(ref.target).push(ref);
  }

  // Phase 1: everything that goes.
  const removed = new Set();
  const queue = [...ids];
  while (queue.length) {
    const id = queue.pop();
    if (removed.has(id)) continue;
    const entry = index.get(id);
    if (!entry) continue;
    if (id === doc.root) fail("NOT_ALLOWED", "The root canvas cannot be removed", { id });
    removed.add(id);
    const value = entry.value;
    if (entry.type === "canvas") {
      queue.push(...Object.keys(value.regions ?? {}), ...Object.keys(value.nodes), ...Object.keys(value.edges));
    }
    if ((entry.type === "node" || entry.type === "catalog") && value.inner?.canvas) queue.push(value.inner.canvas);
    if (entry.type === "definition") queue.push(value.canvas);
    for (const ref of refsByTarget.get(id) ?? []) {
      if (ref.onRemove === "element" && ref.source && (cascade || isImplicit(ref))) queue.push(ref.source);
    }
  }

  // Phase 2: what happens to references held by surviving elements.
  const edits = [];
  const blocking = [];
  for (const id of removed) {
    for (const ref of refsByTarget.get(id) ?? []) {
      if (ref.source && removed.has(ref.source)) continue;
      if (ref.section === "layout" && ref.path.length > 3 && removed.has(ref.path[2])) continue;
      if (!cascade && !isImplicit(ref)) blocking.push(ref);
      else if (ref.onRemove !== "element") edits.push(ref);
    }
  }
  if (blocking.length) {
    const usages = blocking.map(({ source, field, target }) => ({ source, field, target }));
    const described = usages.map(usage => `${usage.source ?? "the document"} (${usage.field} → ${usage.target})`);
    fail("IN_USE", `Still referenced by ${described.join(", ")}; pass cascade: true to remove those references`, {
      usages
    });
  }

  // Phase 3: apply. List items first, highest index first, so indices stay valid; then keys; then elements.
  const splices = edits
    .filter(ref => ref.onRemove === "splice")
    .sort((a, b) => b.removePath.at(-1) - a.removePath.at(-1));
  for (const ref of splices) deleteAt(doc, ref.removePath);
  const unsets = edits
    .filter(ref => ref.onRemove === "unset")
    .sort((a, b) => b.removePath.length - a.removePath.length);
  for (const ref of unsets) deleteAt(doc, ref.removePath);
  const paths = [...removed].map(id => index.get(id).path).sort((a, b) => b.length - a.length);
  for (const path of paths) deleteAt(doc, path);

  // Findings need at least one target.
  const findings = doc.annotations?.findings ?? {};
  for (const [id, finding] of Object.entries(findings)) {
    if (finding.targets.length === 0) delete findings[id];
  }
  tidy(doc);
  return [...removed];
}
