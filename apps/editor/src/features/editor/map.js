// The project's map (spec §6.3, `hierarchy`): every level with its elements — from the top level down, the flows that
// implement catalog items, the bodies of definitions with where each is used, and the levels nothing reaches.
import { collectRefs, hierarchy } from "statewright";

import { nodeName } from "@/inspector/describe";
import { indexOf } from "@/lib/derived";

/**
 * @typedef {{ key: string, canvas: string, name: string, kind: string, cycle: boolean, count: number,
 *   definition: string | null, item?: { id: string, name: string }, uses?: Use[], elements: Element[],
 *   open?: boolean }} Level `item`: the catalog item a flow implements. `uses`: a definition's instances and references.
 *   `open`: found by a search inside it, so shown open.
 * @typedef {{ id: string, name: string, kind: string, level?: Level }} Element `level`: the level inside it.
 * @typedef {{ id: string, name: string, canvas: string, level: string }} Use
 * @typedef {{ key: "levels" | "implementations" | "definitions" | "unattached", levels: Level[] }} Section
 */

/** Nodes with nothing to say on their own: an initial node is the arrow into the first state. */
const QUIET = new Set(["initial"]);

/**
 * @param {(key: string, values?: object) => string} t
 * @param {any} doc
 * @returns {Section[]} The sections with levels, in that order.
 */
export function projectMap(t, doc) {
  const index = indexOf(doc);
  const trees = hierarchy(doc);
  const level = (tree, key) => {
    const canvas = doc.canvases[tree.canvas];
    const inside = new Map(tree.children.map(child => [child.via, child]));
    const elements =
      tree.cycle ?
        []
      : Object.entries(canvas.nodes)
          .filter(([, node]) => !QUIET.has(node.kind))
          .map(([id, node]) => {
            const child = inside.get(id);
            return {
              id,
              name: nodeName(t, node, doc),
              kind: node.kind,
              ...(child ? { level: level(child, `${key}/${id}`) } : {})
            };
          });
    return {
      key,
      canvas: tree.canvas,
      name: canvas.name ?? tree.canvas,
      kind: canvas.kind,
      cycle: tree.cycle,
      count: elements.length,
      definition: tree.definition,
      elements
    };
  };
  const uses = definition =>
    collectRefs(doc)
      .filter(ref => ref.section === "content" && ref.target === definition && ref.source !== definition)
      .flatMap(ref => {
        const entry = index.get(ref.source);
        if (entry?.type !== "node") return [];
        return [
          {
            id: ref.source,
            name: nodeName(t, entry.value, doc),
            canvas: entry.canvas,
            level: doc.canvases[entry.canvas].name
          }
        ];
      });
  const live = tree => doc.canvases[tree.canvas];
  const sections = [
    { key: "levels", levels: [trees.root].filter(live).map(tree => level(tree, "levels")) },
    {
      key: "implementations",
      levels: trees.catalog.map(tree => ({
        ...level(tree, `implementations/${tree.via}`),
        item: { id: tree.via, name: index.get(tree.via)?.value.name ?? tree.via }
      }))
    },
    {
      key: "definitions",
      levels: trees.definitions.map(tree => ({
        ...level(tree, `definitions/${tree.definition}`),
        uses: uses(tree.definition)
      }))
    },
    { key: "unattached", levels: trees.unattached.map(tree => level(tree, `unattached/${tree.canvas}`)) }
  ];
  return sections.filter(section => section.levels.length);
}

/**
 * The map kept to what is typed: the elements and levels whose names have it, and the way down to them. A level found
 * inside is `open`; one found by its own name keeps its elements, closed.
 * @param {Section[]} sections
 * @param {string} query
 * @returns {Section[]}
 */
export function filterMap(sections, query) {
  const text = query.trim().toLowerCase();
  if (!text) return sections;
  const has = name => name.toLowerCase().includes(text);
  const prune = level => {
    const elements = level.elements.flatMap(element => {
      const below = element.level && prune(element.level);
      if (below) return [{ ...element, level: below }];
      if (!has(element.name)) return [];
      // Found by its own name: the level inside it has nothing that matches.
      return [{ id: element.id, name: element.name, kind: element.kind }];
    });
    if (elements.length) return { ...level, elements, open: true };
    return has(level.name) ? { ...level, open: false } : null;
  };
  return sections
    .map(section => ({ ...section, levels: section.levels.map(prune).filter(Boolean) }))
    .filter(section => section.levels.length);
}
