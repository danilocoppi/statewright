// A small vocabulary over Core's commands for building a large document by hand: catalog items made once by name and
// referenced by ID, levels, boxes, arrows, regions, lanes and notes, each with a readable, stable ID.

/** "flight.cancelled", "Gate A12" → "flightCancelled", "gateA12". */
export function camel(text) {
  const words = String(text)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  return words
    .map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
}

export function createBuilder(doc) {
  const commands = [];
  const placed = new Set();
  const used = new Set();
  const catalog = new Map();
  let edges = 0;

  const unique = id => {
    if (used.has(id)) throw new Error(`The ID ${id} is used twice`);
    used.add(id);
    return id;
  };

  /** A catalog item, made the first time its key is asked for. */
  const item = (collection, prefix, key, made) => {
    const id = `${prefix}_${camel(key)}`;
    if (!catalog.has(id)) {
      catalog.set(id, true);
      commands.push({ type: "catalog.add", args: { collection, id: unique(id), item: made() } });
    }
    return id;
  };

  const build = {
    commands,
    placed,
    root: doc.root,

    party: (key, kind, name, extra = {}) => item("parties", "pty", key, () => ({ kind, name, ...extra })),
    event: (name, extra = {}) => item("events", "evt", name, () => ({ name, ...extra })),
    events: (...names) => names.map(name => build.event(name)),
    timer: (name, duration, extra = {}) => item("timers", "tmr", name, () => ({ name, duration, ...extra })),
    guard: (name, description) => item("guards", "grd", name, () => ({ name, description })),
    action: (name, extra = {}) => item("actions", "act", name, () => ({ name, ...extra })),
    endpoint: (method, path, name, extra = {}) =>
      item("endpoints", "ept", name, () => ({ name, method, path, ...extra })),
    webhook: (name, direction, extra = {}) => item("webhooks", "whk", name, () => ({ name, direction, ...extra })),
    status: (name, tone) => item("statuses", "sts", name, () => ({ name, ...(tone ? { tone } : {}) })),
    type: (name, value) => item("types", "typ", name, () => ({ name, ...value })),

    /** A level; with `owner`, that box's interior. */
    level(key, kind, name, { owner, ...fields } = {}) {
      const id = unique(`cnv_${camel(key)}`);
      commands.push({ type: "canvas.create", args: { id, kind, name, ...(owner ? { owner } : {}), ...fields } });
      return id;
    },

    /** A reusable definition of a level's kind, with its body. */
    definition(key, kind, name, description) {
      const id = unique(`def_${camel(key)}`);
      commands.push({ type: "definition.create", args: { id, kind, name, ...(description ? { description } : {}) } });
      return id;
    },

    node(canvas, key, node) {
      const id = unique(`nod_${camel(key)}`);
      commands.push({ type: "node.add", args: { canvas, id, node } });
      return id;
    },

    /** The arrow out of a region's initial state (see flights.js). */
    firstOf: region => build.firsts[region],

    /** Change a box made earlier (an interior given once its level exists). */
    update(id, set) {
      commands.push({ type: "node.update", args: { id, set } });
    },

    edge(canvas, from, to, fields = {}) {
      edges += 1;
      const id = unique(`edg_e${edges.toString(36)}`);
      commands.push({ type: "edge.add", args: { canvas, id, edge: { from, to, ...fields } } });
      return id;
    },

    region(canvas, key, name, description) {
      const id = unique(`rgn_${camel(key)}`);
      commands.push({
        type: "region.add",
        args: { canvas, id, name, ...(description ? { description } : {}) }
      });
      return id;
    },

    /** Place a box by hand; a level placed by hand is not arranged again. */
    place(canvas, id, x, y, extra = {}) {
      placed.add(canvas);
      commands.push({
        type: "layout.node.set",
        args: { canvas, id, x: Math.round(x), y: Math.round(y), ...extra }
      });
    },

    lane(canvas, key, label, nodes, party) {
      commands.push({
        type: "lane.add",
        args: { id: unique(`lne_${camel(key)}`), lane: { canvas, label, nodes, ...(party ? { party } : {}) } }
      });
    },

    note(canvas, key, text, extra = {}) {
      const id = unique(`nte_${camel(key)}`);
      commands.push({ type: "note.add", args: { id, note: { canvas, text, ...extra } } });
      return id;
    },

    /**
     * A chain of states or steps: each box made from `[key, node]` and joined to the next by an arrow whose fields
     * `link(index)` gives (none: a plain arrow).
     */
    chain(canvas, boxes, link = () => ({})) {
      const ids = boxes.map(([key, node]) => build.node(canvas, key, node));
      ids.slice(1).forEach((id, index) => build.edge(canvas, ids[index], id, link(index)));
      return ids;
    }
  };
  return build;
}
