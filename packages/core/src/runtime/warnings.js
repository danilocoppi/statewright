// What a step went past without refusing it (source-of-truth spec §7): the warnings of its trace, with states by name.
// A timer that could not be armed is `timerNotArmed`, named by the state that tried to arm it; every other warning
// comes as the run gave it, those of a flow an action ran within the step among them.
import { namePath } from "../contract/vectors.js";

/** A trace entry as a warning: without its `type`. */
function bare(entry) {
  const warning = { ...entry };
  delete warning.type;
  return warning;
}

/**
 * The warnings of a step's trace, in order.
 * @param {any} doc
 * @param {string} canvasId The machine's level.
 * @param {object[]} trace
 * @returns {Array<{ code: string, message: string, [key: string]: unknown }>} `state`: a path of names; `edges`: edge
 *   IDs; `timer`: the timer's name; `path`: a node of a flow an action ran within the step, as the flow keeps it.
 */
export function warningsOf(doc, canvasId, trace) {
  const warnings = [];
  // A state's timers are armed right after it is entered (and its onEntry run): the last state entered armed them.
  let entered = null;
  for (const entry of trace) {
    if (entry.type === "entered") entered = entry.state;
    // A flow an action ran within the step keeps its entries under the action's (`steps`); a flow that runs there
    // never waits, so it arms no timer, and its warnings come as it gave them.
    for (const step of entry.steps ?? []) if (step.type === "warning") warnings.push(bare(step));
    if (entry.type !== "warning") continue;
    const warning = bare(entry);
    if (warning.code === "unevaluated" && warning.timer !== undefined) {
      const state = entered === null ? {} : { state: namePath(doc, canvasId, entered) };
      warnings.push({ code: "timerNotArmed", timer: warning.timer, message: warning.message, ...state });
    } else if (typeof warning.state === "string") {
      warnings.push({ ...warning, state: namePath(doc, canvasId, warning.state) });
    } else warnings.push(warning);
  }
  return warnings;
}
