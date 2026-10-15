// The structure a run reads (simulator spec §4.3, §5.1): machines inside machines, or flows inside flows, reached by
// path. A path is the `/`-joined node IDs from the top canvas down — the states, or the `while`, `forEach` and
// `subflow` nodes whose bodies hold a token — so two instances of one definition are told apart.
import { compareText, isLink, sorted } from "../rules/facts.js";

/** A run that cannot go on: the step is not applied (simulator spec §5.10). */
export class EngineError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {object} [details]
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.details = details;
  }
}

/** The last segment of a path: the node's ID. */
export const lastOf = path => path.slice(path.lastIndexOf("/") + 1);

/** The path of the state that owns a path's canvas ("" at the top). */
export const parentOf = path => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

/** A node's path under an owner path ("" at the top). */
export const childPath = (owner, id) => (owner ? `${owner}/${id}` : id);

/** Is `path` the state `ancestor` or inside it? */
export const within = (path, ancestor) => path === ancestor || path.startsWith(`${ancestor}/`);

/**
 * Read access to the machines of one run, computed on demand.
 * @param {any} doc A schema-valid document.
 * @param {string} top The run's top canvas.
 */
export function createModel(doc, top) {
  const outgoing = new Map();
  const canvases = new Map();

  const model = {
    doc,
    top,

    /**
     * The canvas an element's interior is — its own canvas or its definition's body — when it is of the run's kind: a
     * machine inside a state, a flow inside a `while`, `forEach` or `subflow`.
     */
    interiorOf(node) {
      const inner = node?.inner;
      if (!inner) return null;
      const canvasId = inner.canvas ?? doc.definitions[inner.definition]?.canvas;
      if (!canvasId || !doc.canvases[canvasId]) {
        throw new EngineError("dangling", `The interior of ${node.name ?? node.kind} does not exist`);
      }
      return doc.canvases[canvasId].kind === doc.canvases[top].kind ? canvasId : null;
    },

    /** The canvas holding the last node of a path. */
    canvasAt(path) {
      if (!canvases.has(path)) {
        const owner = parentOf(path);
        let canvasId = top;
        if (owner) {
          canvasId = model.interiorOf(model.nodeAt(owner));
          if (!canvasId) {
            const what = doc.canvases[top].kind === "flow" ? "flow" : "states";
            throw new EngineError("dangling", `${model.nameAt(owner)} has no ${what} inside`, { path });
          }
          const chain = owner.split("/").map((_, index, parts) => model.canvasAt(parts.slice(0, index + 1).join("/")));
          if (chain.includes(canvasId)) {
            throw new EngineError("cycle", `${model.nameAt(owner)} contains itself`, { path: owner });
          }
        }
        canvases.set(path, canvasId);
      }
      return canvases.get(path);
    },

    /** The node at the end of a path. */
    nodeAt(path) {
      const node = doc.canvases[model.canvasAt(path)]?.nodes[lastOf(path)];
      if (!node) throw new EngineError("dangling", `There is no node ${lastOf(path)} here`, { path });
      return node;
    },

    /** The name of the node at the end of a path, for messages and questions. */
    nameAt(path) {
      const node = model.nodeAt(path);
      return node.label ?? node.name ?? node.kind;
    },

    /** Regions of a machine canvas in ID order; a canvas without regions has one, keyed "". */
    regions(canvasId) {
      const canvas = doc.canvases[canvasId];
      const declared = sorted(canvas.regions);
      if (declared.length === 0) return [{ key: "", name: canvas.name }];
      return declared.map(([id, region]) => ({ key: id, name: region.name }));
    },

    /** The region key of a node ("" on a canvas without regions). */
    regionOf(canvasId, nodeId) {
      const canvas = doc.canvases[canvasId];
      return Object.keys(canvas.regions ?? {}).length ? (canvas.nodes[nodeId]?.region ?? "") : "";
    },

    /** The nodes of one region of a canvas, in ID order. */
    nodesIn(canvasId, key) {
      return sorted(doc.canvases[canvasId].nodes).filter(([id]) => model.regionOf(canvasId, id) === key);
    },

    /** A node's outgoing transitions (links left out), in edge ID order. */
    out(canvasId, nodeId) {
      if (!outgoing.has(canvasId)) {
        const map = new Map();
        for (const [edgeId, edge] of sorted(doc.canvases[canvasId].edges)) {
          if (isLink(edge)) continue;
          if (!map.has(edge.from)) map.set(edge.from, []);
          map.get(edge.from).push([edgeId, edge]);
        }
        outgoing.set(canvasId, map);
      }
      return outgoing.get(canvasId).get(nodeId) ?? [];
    },

    /** The edges that come into a node (links left out), in ID order. */
    into(canvasId, nodeId) {
      return sorted(doc.canvases[canvasId].edges).filter(([, edge]) => !isLink(edge) && edge.to === nodeId);
    },

    /**
     * The transitions that leave a state: its own and those of the `any` nodes of its region that apply to it
     * (spec §16.4: every non-terminal state of the region but the excepted ones), in edge ID order.
     */
    leaving(path) {
      const canvasId = model.canvasAt(path);
      const nodeId = lastOf(path);
      const node = model.nodeAt(path);
      const own = model.out(canvasId, nodeId);
      if (node.terminal) return own;
      const key = model.regionOf(canvasId, nodeId);
      const anys = model
        .nodesIn(canvasId, key)
        .filter(([, other]) => other.kind === "any" && !other.except?.includes(nodeId))
        .flatMap(([id]) => model.out(canvasId, id));
      return [...own, ...anys].sort(([a], [b]) => compareText(a, b));
    },

    /** Paths in reading order: by region, then node ID, level by level (spec §16.5's "region ID order"). */
    compare(a, b) {
      const ka = orderKey(a);
      const kb = orderKey(b);
      for (let index = 0; index < Math.min(ka.length, kb.length); index++) {
        const order = compareText(ka[index], kb[index]);
        if (order) return order;
      }
      return ka.length - kb.length;
    }
  };

  function orderKey(path) {
    return path.split("/").map((id, index, parts) => {
      const here = parts.slice(0, index + 1).join("/");
      return `${model.regionOf(model.canvasAt(here), id)}\u0000${id}`;
    });
  }

  return model;
}
