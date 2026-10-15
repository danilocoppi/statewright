import { z } from "zod";
import { createRefCollector } from "../query/refs.js";
import { Definition } from "../schema/document.js";
import { allocateId, applyChange, changeArgs, changed, clone, ensure, requireEntry, validate } from "./context.js";
import { fail } from "./errors.js";
import { checkInner } from "./inner.js";
import { removeElements } from "./remove.js";

/** The part of an ID after its prefix ("nod_running" → "running"), used to name copies. */
const stem = id => id.slice(id.indexOf("_") + 1);

/**
 * Deep-copy a definition body (and the own interiors nested in it) under fresh IDs, rewriting every reference
 * that points inside the copy. References to the catalog and to other definitions stay as they are.
 * @returns {string} ID of the copied body canvas.
 */
function copyBody(ctx, bodyId) {
  const map = new Map();
  const copies = [];
  const copyCanvas = sourceId => {
    if (map.has(sourceId)) return map.get(sourceId);
    const canvasId = allocateId(ctx, "cnv", stem(sourceId));
    map.set(sourceId, canvasId);
    copies.push(canvasId);
    const source = clone(ctx.doc.canvases[sourceId]);
    const copy = { ...source, nodes: {}, edges: {} };
    if (source.regions) {
      copy.regions = {};
      for (const [id, region] of Object.entries(source.regions)) {
        const regionId = allocateId(ctx, "rgn", stem(id));
        map.set(id, regionId);
        copy.regions[regionId] = region;
      }
    }
    for (const [id, node] of Object.entries(source.nodes)) {
      const nodeId = allocateId(ctx, "nod", stem(id));
      map.set(id, nodeId);
      copy.nodes[nodeId] = node;
    }
    for (const [id, edge] of Object.entries(source.edges)) {
      const edgeId = allocateId(ctx, "edg", stem(id));
      map.set(id, edgeId);
      copy.edges[edgeId] = edge;
    }
    ctx.doc.canvases[canvasId] = copy;
    for (const node of Object.values(source.nodes)) if (node.inner?.canvas) copyCanvas(node.inner.canvas);
    const layout = ctx.doc.layout?.canvases?.[sourceId];
    if (layout) {
      const copied = {};
      for (const section of ["nodes", "edges"]) {
        if (!layout[section]) continue;
        copied[section] = {};
        for (const [id, entry] of Object.entries(layout[section])) copied[section][map.get(id) ?? id] = clone(entry);
      }
      if (Object.keys(copied).length) ensure(ctx.doc.layout, "canvases")[canvasId] = copied;
    }
    return canvasId;
  };
  const rootCopy = copyCanvas(bodyId);

  for (const canvasId of copies) {
    const canvas = ctx.doc.canvases[canvasId];
    const collect = createRefCollector();
    for (const [id, node] of Object.entries(canvas.nodes)) collect.node(canvas.kind, canvasId, id, node);
    for (const [id, edge] of Object.entries(canvas.edges)) collect.edge(canvas.kind, canvasId, id, edge);
    for (const ref of collect.refs) {
      if (!map.has(ref.target)) continue;
      const holder = ref.path.slice(0, -1).reduce((value, key) => value[key], ctx.doc);
      holder[ref.path.at(-1)] = map.get(ref.target);
    }
  }
  return rootCopy;
}

/** The node or catalog item whose interior is changed. */
const ownerEntry = (ctx, id) => requireEntry(ctx, id, ["node", "catalog"]);

/** Definition commands (spec §11, §21). */
export default [
  {
    type: "definition.create",
    description: "Create a reusable definition with an empty body canvas of the given kind.",
    args: z.strictObject({
      name: z.string().min(1),
      kind: z.enum(["system", "machine", "flow", "mixed"]),
      description: z.string().optional(),
      id: z.string().optional()
    }),
    run(ctx, { name, kind, description, id }) {
      const definitionId = allocateId(ctx, "def", name, id);
      const canvasId = allocateId(ctx, "cnv", name);
      const definition = { kind, name, canvas: canvasId };
      if (description !== undefined) definition.description = description;
      validate(Definition, definition, ["definitions", definitionId]);
      ctx.doc.canvases[canvasId] = { kind, name, nodes: {}, edges: {} };
      ctx.doc.definitions[definitionId] = definition;
    }
  },
  {
    type: "definition.extract",
    description: "Turn an element's own interior into a reusable definition; the element becomes its first instance.",
    args: z.strictObject({ owner: z.string(), name: z.string().min(1), id: z.string().optional() }),
    run(ctx, { owner, name, id }) {
      const entry = ownerEntry(ctx, owner);
      const canvasId = entry.value.inner?.canvas;
      if (!canvasId) fail("NOT_ALLOWED", `"${owner}" has no own interior to extract`, { id: owner });
      const definitionId = allocateId(ctx, "def", name, id);
      const definition = { kind: ctx.doc.canvases[canvasId].kind, name, canvas: canvasId };
      validate(Definition, definition, ["definitions", definitionId]);
      ctx.doc.definitions[definitionId] = definition;
      entry.value.inner = { definition: definitionId };
    }
  },
  {
    type: "definition.instantiate",
    description: "Make an element an instance of a definition (replacing a previous instance, not an own interior).",
    args: z.strictObject({ owner: z.string(), definition: z.string() }),
    run(ctx, { owner, definition }) {
      const entry = ownerEntry(ctx, owner);
      requireEntry(ctx, definition, ["definition"]);
      if (entry.value.inner?.canvas) {
        fail("NOT_ALLOWED", `"${owner}" has its own interior; remove it or extract it first`, { id: owner });
      }
      checkInner(ctx, entry, { definition });
      entry.value.inner = { definition };
    }
  },
  {
    type: "definition.detach",
    description: "Replace an instance with an independent copy of the definition body (new IDs, same content).",
    args: z.strictObject({ owner: z.string() }),
    run(ctx, { owner }) {
      const entry = ownerEntry(ctx, owner);
      const definitionId = entry.value.inner?.definition;
      if (!definitionId) fail("NOT_ALLOWED", `"${owner}" is not an instance of a definition`, { id: owner });
      const body = ctx.doc.definitions[definitionId].canvas;
      entry.value.inner = { canvas: copyBody(ctx, body) };
    }
  },
  {
    type: "definition.update",
    description: "Rename a definition or change its description (not its kind or body).",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["definition"]);
      validate(Definition, changed(entry.value, change, ["kind", "canvas"]), entry.path);
      applyChange(entry.value, change);
    }
  },
  {
    type: "definition.remove",
    description: "Remove a definition and its body. Instances block it unless cascade (they lose their interior).",
    args: z.strictObject({ id: z.string(), cascade: z.boolean().optional() }),
    run(ctx, { id, cascade }) {
      requireEntry(ctx, id, ["definition"]);
      removeElements(ctx.doc, [id], { cascade, index: ctx.index });
    }
  }
];
