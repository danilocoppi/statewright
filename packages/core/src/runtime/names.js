// The names a system speaks in, as the design's IDs (source-of-truth spec §7): events, calls (an endpoint as
// `POST /path`, or a webhook's name), timers, entries and guards by name, and the names of the states it reaches.
import { namePath } from "../contract/vectors.js";
import { reachedOf } from "../simulate/index.js";

/** The ID of the catalog item of `collection` named `name`, or undefined. */
export const idByName = (doc, collection, name) =>
  Object.entries(doc.catalog[collection] ?? {}).find(([, item]) => item.name === name)?.[0];

/** An endpoint's name as code calls it. */
export const endpointName = endpoint => `${endpoint.method} ${endpoint.path}`;

/** The ID of the endpoint (`POST /bookings`) or webhook named `name`, or undefined. */
export function callId(doc, name) {
  const endpoint = Object.entries(doc.catalog.endpoints ?? {}).find(([, item]) => endpointName(item) === name);
  return endpoint?.[0] ?? idByName(doc, "webhooks", name);
}

/** The entry of a machine level named `name`, or reached by the call named `name`. */
export function entryId(doc, canvasId, name) {
  const via = callId(doc, name);
  return Object.entries(doc.canvases[canvasId].nodes).find(
    ([, node]) => node.kind === "entry" && (node.name === name || (via !== undefined && node.via === via))
  )?.[0];
}

/** Does every node of a path of node IDs still exist, level by level (`nod_open/nod_created`)? */
export function pathExists(doc, canvasId, path) {
  let canvas = doc.canvases[canvasId];
  for (const id of path.split("/")) {
    const node = canvas?.nodes[id];
    if (!node) return false;
    const inner = node.inner?.canvas ?? doc.definitions?.[node.inner?.definition]?.canvas;
    canvas = inner ? doc.canvases[inner] : undefined;
  }
  return true;
}

/** The active state of a session by name (`open/created`), or a list of them when regions hold several. */
export function stateOf(doc, session) {
  const names = reachedOf(session).active.map(path => namePath(doc, session.canvas, path));
  return names.length === 1 ? names[0] : names;
}
