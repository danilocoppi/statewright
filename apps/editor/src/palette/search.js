// What ⌘K finds (spec §7.8, mockup 11): elements on any level with their path, catalog items, levels and commands —
// grouped, those whose words start with what is typed first.
import { CATALOG_COLLECTIONS, edgeLabel } from "statewright";

import { kindWords, nodeName } from "@/inspector/describe";
import { indexOf, levelPathOf, usageCount } from "@/lib/derived";

/** A level's path from the project: "Get paid / Transaction / Open". */
export function levelPath(doc, canvasId) {
  const levels = levelPathOf(doc, canvasId)?.map(step => doc.canvases[step.canvas].name) ?? [
    doc.canvases[canvasId].name
  ];
  return [doc.project.name, ...levels].join(" / ");
}

/**
 * Everything ⌘K can find in a document, by group: boxes and arrows of every level (with their path, an arrow with what
 * it says), catalog items (with their uses), levels (with their path).
 * @returns {{ elements: Entry[], catalog: Entry[], levels: Entry[] }}
 * @typedef {{ id: string, kind: string, name: string, meta: string, mono?: boolean, canvas?: string,
 *   collection?: string }} Entry
 */
export function entriesOf(t, doc) {
  const index = indexOf(doc);
  const elements = [];
  for (const [canvasId, canvas] of Object.entries(doc.canvases)) {
    const path = levelPath(doc, canvasId);
    for (const [id, node] of Object.entries(canvas.nodes)) {
      elements.push({
        id,
        kind: kindWords(t, doc, index.get(id)),
        name: nodeName(t, node),
        meta: path,
        canvas: canvasId
      });
    }
    for (const [id, edge] of Object.entries(canvas.edges)) {
      const said = edgeLabel(doc, id);
      elements.push({
        id,
        kind: t("inspector:palette.arrow"),
        name: `${nodeName(t, canvas.nodes[edge.from])} → ${nodeName(t, canvas.nodes[edge.to])}`,
        meta: said || path,
        canvas: canvasId
      });
    }
  }
  const catalog = Object.keys(CATALOG_COLLECTIONS).flatMap(collection =>
    Object.entries(doc.catalog[collection]).map(([id, item]) => ({
      id,
      kind: t(`inspector:kinds.catalog.${collection}`),
      name: item.name,
      meta: t("inspector:refs.uses", { count: usageCount(doc, id) }),
      mono: collection === "events",
      collection
    }))
  );
  const levels = Object.entries(doc.canvases).map(([id, canvas]) => ({
    id,
    kind: t("inspector:palette.level"),
    name: canvas.name,
    meta: levelPath(doc, id),
    canvas: id
  }));
  return { elements, catalog, levels };
}

/** How well a name answers what is typed: 0 starts with it, 1 has a word that does, 2 contains it, -1 not at all. */
function rank(name, text) {
  const words = name.toLowerCase();
  if (words.startsWith(text)) return 0;
  if (words.split(/[\s._/→-]+/).some(word => word.startsWith(text))) return 1;
  return words.includes(text) ? 2 : -1;
}

/**
 * The groups that match what is typed, each with its best entries; with nothing typed, the levels and the commands.
 * @param {{ elements: object[], catalog: object[], levels: object[], commands: object[] }} groups
 * @returns {Array<{ group: string, items: object[] }>}
 */
export function search(groups, query, { limit = 6 } = {}) {
  const text = query.trim().toLowerCase();
  const order = ["elements", "catalog", "levels", "commands"];
  if (!text) {
    return [
      { group: "levels", items: groups.levels.slice(0, limit) },
      { group: "commands", items: groups.commands }
    ].filter(entry => entry.items.length);
  }
  return order
    .map(group => ({
      group,
      items: groups[group]
        .map(item => ({ item, rank: rank(item.name, text) }))
        .filter(entry => entry.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
        .slice(0, limit)
        .map(entry => entry.item)
    }))
    .filter(entry => entry.items.length);
}
