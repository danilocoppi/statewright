// Where a change of a proposal is seen (collaboration spec §7): the level to go to and what rings there. A box, an
// arrow or a note is seen itself; a level, as itself; a scenario, on the level where its run goes most, by the states
// and transitions it takes there; a catalog item, by the elements that use it, on the level that has most of them —
// or in the catalog, when nothing uses it.
import { usagesOf } from "statewright";
import { storyOf } from "statewright/simulate";

import { indexOf } from "@/lib/derived";

/**
 * @typedef {{ level: string | null, ids: string[], catalog?: { collection: string, item: string } }} Where
 */

/** The level with most of these elements, the first reached on a tie, and those of them that are on it. */
function busiest(placed) {
  const counts = new Map();
  for (const { level } of placed) counts.set(level, (counts.get(level) ?? 0) + 1);
  const level = [...counts].reduce((best, entry) => (entry[1] > best[1] ? entry : best), [null, 0])[0];
  return { level, ids: [...new Set(placed.filter(item => item.level === level).map(item => item.id))] };
}

/** The states and transitions a scenario's run takes, each with its level; nothing when it cannot be told. */
function runOf(doc, scenario) {
  let story;
  try {
    story = storyOf(doc, scenario);
  } catch {
    return [];
  }
  return story.frames.flatMap(frame =>
    frame.taken.flatMap(({ edge, canvas }) => {
      const arrow = doc.canvases[canvas]?.edges[edge];
      if (!arrow) return [];
      return [edge, arrow.from, arrow.to].map(id => ({ id, level: canvas }));
    })
  );
}

/**
 * @param {any} doc The document the element is in: as it is, or as the proposal would leave it.
 * @param {string} id
 * @returns {Where}
 */
export function whereIs(doc, id) {
  const index = indexOf(doc);
  const entry = index.get(id);
  if (!entry) return { level: null, ids: [] };
  if (entry.type === "canvas") return { level: id, ids: [] };
  if (entry.type === "scenario") {
    const run = runOf(doc, entry.value);
    return run.length ? busiest(run) : { level: entry.value.canvas ?? null, ids: [] };
  }
  if (entry.type === "catalog") {
    const users = usagesOf(doc, id)
      .map(ref => index.get(ref.source))
      .filter(user => user?.canvas)
      .map(user => ({ id: user.id ?? user.path.at(-1), level: user.canvas }));
    return users.length ? busiest(users) : { level: null, ids: [], catalog: { collection: entry.path[1], item: id } };
  }
  if (entry.type === "definition") return { level: entry.value.canvas ?? null, ids: [] };
  return { level: entry.canvas ?? null, ids: entry.canvas ? [id] : [] };
}
