// What a step asks the system to do (source-of-truth spec §7): the actions to run, by name, with the transition or
// the state they belong to, in order; the events the machine emitted; the timers to schedule and to cancel.
import { namePath } from "../contract/vectors.js";

/** A catalog item's name, or its ID. */
const nameOf = (doc, collection, id) => doc.catalog[collection]?.[id]?.name ?? id;

/**
 * The effects of a step's trace.
 * @param {any} doc
 * @param {string} canvasId The machine's level.
 * @param {object[]} trace
 * @returns {{ actions: object[], events: object[], timers: { schedule: object[], cancel: object[] } }} `timers`: the
 *   `after` timers to schedule and to cancel.
 */
export function effectsOf(doc, canvasId, trace) {
  const state = path => namePath(doc, canvasId, path);
  const actions = [];
  const events = [];
  let schedule = [];
  const cancel = [];
  // The last thing that happened: a transition taken, or a state entered or left; actions belong to it.
  let last = null;
  for (const entry of trace) {
    if (entry.type === "transition" || entry.type === "entered" || entry.type === "exited") last = entry;
    if (entry.type === "action") {
      const owner =
        last?.type === "transition" && last.from === entry.at ?
          { transition: last.edge }
        : { state: state(entry.at), on: last?.type === "exited" ? "exit" : "entry" };
      actions.push({ action: nameOf(doc, "actions", entry.action), args: entry.args, ...owner });
    }
    if (entry.type === "emitted") events.push({ event: nameOf(doc, "events", entry.event), payload: entry.payload });
    // Only `after` timers move the machine, so only they are the system's to schedule; an SLA warns in the Simulator.
    // A timer is the system's to schedule once per state, however many of its transitions it drives.
    const same = (item, timer) => item.timer === timer.timer && item.state === timer.state;
    if (entry.type === "timerArmed" && entry.kind === "after") {
      const timer = {
        timer: nameOf(doc, "timers", entry.timer),
        kind: entry.kind,
        state: state(entry.state),
        due: entry.due
      };
      if (!schedule.some(item => same(item, timer) && item.due === timer.due)) schedule.push(timer);
    }
    if (entry.type === "timerCancelled" && entry.kind === "after") {
      const timer = { timer: nameOf(doc, "timers", entry.timer), kind: entry.kind, state: state(entry.state) };
      // A timer armed and cancelled in one step was never the system's to schedule.
      if (schedule.some(item => same(item, timer))) schedule = schedule.filter(item => !same(item, timer));
      else if (!cancel.some(item => same(item, timer))) cancel.push(timer);
    }
  }
  return { actions, events, timers: { schedule, cancel } };
}
