// statewright/runtime (source-of-truth spec §7): a design's state machines run by a system — pure, with no I/O and no
// clock. The system keeps each record's snapshot, runs the actions it is given and schedules the timers; the runtime is
// the Simulator's engine, so the Editor's simulation, the contract's vectors and production behave alike.
import { check } from "../rules/index.js";
import { executableOf } from "../simulate/executable.js";
import { computeHashes } from "../signature.js";
import { RuntimeError } from "./errors.js";
import { machineOf } from "./machine.js";
import { typedView } from "../roles/typed.js";

export { RuntimeError } from "./errors.js";

/** The conditions of a design's machines: each transition's guard, and each entry's. */
function conditionsOf(doc) {
  return Object.values(doc.canvases)
    .filter(canvas => canvas.kind === "machine")
    .flatMap(canvas => [...Object.values(canvas.edges), ...Object.values(canvas.nodes)])
    .map(element => element.guard)
    .filter(Boolean);
}

/**
 * The guard functions by guard ID, or the problems: a named guard without an expression and without a function, or a
 * function for a guard the design does not name.
 */
function bindGuards(doc, guards) {
  const problems = [];
  const bound = {};
  for (const [name, decide] of Object.entries(guards)) {
    const id = Object.entries(doc.catalog.guards ?? {}).find(([, guard]) => guard.name === name)?.[0];
    if (!id) problems.push({ guard: name, problem: "unknown", message: `The design has no guard ${name}` });
    else if (typeof decide !== "function")
      problems.push({ guard: name, problem: "notFunction", message: `${name} is not a function` });
    else {
      // An asynchronous function is bound all the same, so it is reported once, as what it is.
      if (decide.constructor?.name === "AsyncFunction")
        problems.push({ guard: name, problem: "async", message: `${name} is asynchronous: guards are synchronous` });
      bound[id] = decide;
    }
  }
  for (const condition of conditionsOf(doc)) {
    if (condition.expr !== undefined) continue;
    const guard = condition.guard ? doc.catalog.guards[condition.guard] : undefined;
    if (guard?.expr !== undefined) continue;
    if (guard && bound[condition.guard]) continue;
    // A condition only in words has nothing to bind: `send` refuses with `needs` where it is reached.
    if (guard && !problems.some(item => item.guard === guard.name && item.problem === "unbound")) {
      problems.push({
        guard: guard.name,
        problem: "unbound",
        message: `The guard ${guard.name} has no expression: bind a function to it`
      });
    }
  }
  return { bound, problems };
}

/**
 * A runtime for a design's machines (source-of-truth spec §7). Throws a RuntimeError when the design has errors, when
 * a guard cannot be decided, or when `expect` is not the design's content hash; asynchronous, since the hash is
 * computed with Web Crypto.
 * @param {any} doc A schema-valid document.
 * @param {{ guards?: Record<string, (context: object, input: object | null) => unknown>, expect?: string }} [options]
 *   `guards`: functions for the named guards without an expression, by the guard's name; `expect`: the content hash
 *   the system was built and checked against.
 * @returns {Promise<{ content: string, machine: (key: string) => ReturnType<typeof machineOf> }>}
 */
export async function createRuntime(doc, { guards = {}, expect } = {}) {
  doc = typedView(doc);
  const errors = check(doc).filter(problem => problem.severity === "error");
  if (errors.length) {
    throw new RuntimeError(
      "design",
      `The design has ${errors.length} error(s), the first: ${errors[0].message}`,
      errors
    );
  }
  const { content } = await computeHashes(doc);
  if (expect !== undefined && expect !== content) {
    throw new RuntimeError(
      "expect",
      `The design is not the one expected: its content hash is ${content.slice(0, 12)}, not ${String(expect).slice(0, 12)}`,
      [{ expected: expect, found: content }]
    );
  }
  const { bound, problems } = bindGuards(doc, guards);
  if (problems.length) throw new RuntimeError("guards", problems.map(problem => problem.message).join("; "), problems);
  const machines = new Map();
  return {
    content,
    /**
     * A machine that runs on its own, by its subject (`booking.status`) or its level's ID.
     * @param {string} key
     */
    machine(key) {
      const canvasId = Object.keys(doc.canvases)
        .sort()
        .find(id => doc.canvases[id].kind === "machine" && (id === key || doc.canvases[id].subject === key));
      if (!canvasId || executableOf(doc, canvasId).canvas !== canvasId) {
        throw new RuntimeError("machine", `No machine of the design runs on its own as ${key}`, [{ machine: key }]);
      }
      if (!machines.has(canvasId)) machines.set(canvasId, machineOf(doc, canvasId, { content, guards: bound }));
      return machines.get(canvasId);
    }
  };
}
