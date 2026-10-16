import { CATALOG_COLLECTIONS } from "../constants.js";
import { OPERATORS } from "../logic/index.js";
import { EVENT_NAME_PATTERN } from "../schema/helpers.js";
import { toPointer } from "../serialize/parse.js";
import { sorted } from "./facts.js";

/** Operators of standard JSON Logic (jsonlogic.com). */
const STANDARD_OPERATORS = new Set(OPERATORS);

/** Behavioural fields whose absence leaves an item unspecified (spec §22 spec.unspecified). */
const UNSPECIFIED = {
  events: item => (item.payload === undefined ? ["payload"] : []),
  endpoints: item => ["request", "responses"].filter(key => item[key] === undefined),
  webhooks: item => (item.payload === undefined ? ["payload"] : []),
  timers: item => (item.duration === undefined && item.at === undefined ? ["duration or at"] : []),
  guards: item => (item.expr === undefined && item.description === undefined ? ["expr or description"] : [])
};

/** Every catalog item as [collection, id, item], in collection then ID order. */
const items = doc =>
  Object.keys(CATALOG_COLLECTIONS).flatMap(collection =>
    sorted(doc.catalog[collection]).map(([id, item]) => [collection, id, item])
  );

/** Operators used in a JSON Logic value: an object with exactly one key is an operation (as in json-logic-js). */
function operatorsIn(value, path, found) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => operatorsIn(item, [...path, index], found));
  } else if (value !== null && typeof value === "object" && Object.keys(value).length === 1) {
    const [operator] = Object.keys(value);
    found.push({ operator, path });
    operatorsIn(value[operator], [...path, operator], found);
  }
}

/** JSON Logic expressions of a document: [owner ID, path, expression]. */
function expressions(doc) {
  const found = [];
  const values = (owner, path, map) => {
    for (const [key, value] of Object.entries(map ?? {})) found.push([owner, [...path, key], value]);
  };
  const effects = (owner, path, list) =>
    (list ?? []).forEach((effect, index) => {
      const at = [...path, index];
      values(owner, [...at, "args"], effect.args);
      values(owner, [...at, "payload"], effect.payload);
      values(owner, [...at, "assign"], effect.assign);
    });
  const condition = (owner, path, value) => {
    if (value?.expr !== undefined) found.push([owner, [...path, "expr"], value.expr]);
  };

  for (const [id, guard] of sorted(doc.catalog.guards)) {
    if (guard.expr !== undefined) found.push([id, ["catalog", "guards", id, "expr"], guard.expr]);
  }
  for (const [canvasId, canvas] of sorted(doc.canvases)) {
    for (const [id, node] of sorted(canvas.nodes)) {
      const base = ["canvases", canvasId, "nodes", id];
      condition(id, [...base, "guard"], node.guard);
      condition(id, [...base, "condition"], node.condition);
      effects(id, [...base, "onEntry"], node.onEntry);
      effects(id, [...base, "onExit"], node.onExit);
      if (canvas.kind !== "flow") continue;
      values(id, [...base, "args"], node.args);
      values(id, [...base, "payload"], node.payload);
      values(id, [...base, "set"], node.set);
      if (node.kind === "switch" && node.on !== undefined) found.push([id, [...base, "on"], node.on]);
      if (node.items !== undefined) found.push([id, [...base, "items"], node.items]);
    }
    for (const [id, edge] of sorted(canvas.edges)) {
      const base = ["canvases", canvasId, "edges", id];
      condition(id, [...base, "guard"], edge.guard);
      effects(id, [...base, "actions"], edge.actions);
    }
  }
  return found;
}

/** Catalog and specification-quality rules (spec §22). */
export default [
  {
    code: "event.name",
    severity: "error",
    description: "An event name is invalid or used by another event.",
    check(facts, report) {
      const byName = new Map();
      for (const [id, event] of sorted(facts.doc.catalog.events)) {
        if (!EVENT_NAME_PATTERN.test(event.name)) {
          report({ target: id, message: `${facts.describe(id)} is not a valid event name (e.g. payin.confirmed)` });
        }
        if (!byName.has(event.name)) byName.set(event.name, []);
        byName.get(event.name).push(id);
      }
      for (const [name, events] of byName) {
        if (events.length < 2) continue;
        for (const id of events) {
          report({
            target: id,
            message: `The event name "${name}" is used by ${events.length} events (${events.join(", ")})`,
            data: { name, events }
          });
        }
      }
    }
  },
  {
    code: "catalog.unused",
    severity: "warning",
    description: "A catalog item is never referenced.",
    check(facts, report) {
      const used = new Set(
        facts.refs.filter(ref => ref.section === "content" && ref.source !== ref.target).map(ref => ref.target)
      );
      // A project may keep highlights ready before it uses them (highlights spec §5).
      for (const [collection, id] of items(facts.doc)) {
        if (collection === "highlights") continue;
        if (!used.has(id)) report({ target: id, message: `${facts.describe(id)} is not used anywhere` });
      }
    }
  },
  {
    code: "spec.unspecified",
    severity: "incomplete",
    description:
      "Key behavioural fields are unspecified: event payload, endpoint request/responses, webhook payload, timer " +
      "duration/at, guard without expr and description.",
    check(facts, report) {
      for (const [collection, id, item] of items(facts.doc)) {
        const fields = UNSPECIFIED[collection]?.(item) ?? [];
        if (!fields.length) continue;
        report({
          target: id,
          message: `${facts.describe(id)} does not specify ${fields.join(", ")}`,
          data: { fields }
        });
      }
    }
  },
  {
    code: "confidence.low",
    severity: "incomplete",
    description: "An element has confidence: low and needs verification.",
    check(facts, report) {
      for (const entry of facts.index.entries.values()) {
        if (entry.value.confidence !== "low") continue;
        report({
          target: entry.id,
          canvas: facts.canvasOf(entry.id),
          message: `${facts.describe(entry.id)} has low confidence; verify it`
        });
      }
    }
  },
  {
    code: "expr.operator",
    severity: "warning",
    description: "A JSON Logic expression uses an operator outside the standard set.",
    check(facts, report) {
      for (const [owner, path, expression] of expressions(facts.doc)) {
        const found = [];
        operatorsIn(expression, path, found);
        const reported = new Set();
        for (const { operator, path: at } of found) {
          if (STANDARD_OPERATORS.has(operator) || reported.has(operator)) continue;
          reported.add(operator);
          report({
            target: owner,
            canvas: facts.canvasOf(owner),
            message: `${facts.describe(owner)} uses "${operator}", which is not a standard JSON Logic operator`,
            data: { operator, path: toPointer(at) }
          });
        }
      }
    }
  }
];
