// Automatic placement (spec §4.3, §8.2): when a level is shown with nodes that have no position, Core's auto-layout
// (scope "missing", in the layout worker) places them without moving anything the person arranged, and the positions
// are stored — as `statewright layout` would. In a read-only tab nothing is stored: the placed copy is only shown.
import { applyBatch } from "statewright";

/**
 * @param {{ editor: import("zustand/vanilla").StoreApi<any>, client: { request: Function }, canvasId: string }} options
 * @returns {Promise<{ placed: number, doc?: object, stale?: true }>} `doc` is the placed copy, in a read-only tab;
 *   `stale` when the document changed meanwhile (the level asks again). Rejects when the layout fails or the
 *   document refuses the positions.
 */
export async function placeMissing({ editor, client, canvasId }) {
  const { doc } = editor.getState();
  const commands = await client.request("layout", { doc, canvasId, scope: "missing" });
  const state = editor.getState();
  if (state.doc !== doc) return { placed: 0, stale: true };
  const placed = commands.filter(command => command.type === "layout.node.set").length;
  if (!commands.length) return { placed };
  if (state.readOnly) return { placed, doc: applyBatch(structuredClone(doc), commands).doc };
  const result = state.dispatch(commands, { label: "Place elements", record: false });
  if (!result.ok) throw new Error(result.error.message);
  return { placed };
}
