// The booking service again, now running the design itself through statewright/runtime: it keeps each booking's
// snapshot, schedules the timers the runtime asks for and sends them when they are due. A trigger the design does not
// allow is refused, and the service says why.
import { createRuntime } from "../../../src/runtime/index.js";

/** The service over a design (`doc`), with a clock it is given. */
export async function createBookingsOnRuntime({ doc, clock }) {
  const booking = (await createRuntime(doc)).machine("booking.status");
  const records = new Map();
  let timers = [];
  const now = () => new Date(clock.now()).toISOString().replace(".000Z", "Z");
  /** Keep what the runtime answered: the snapshot and the state, and the timers to schedule and to cancel. */
  const keep = (id, result) => {
    if (result.refused) throw new Error(`Booking ${id}: ${result.refused.message}`);
    records.set(id, { snapshot: result.snapshot, state: result.state });
    const { schedule, cancel } = result.effects.timers;
    timers = timers.filter(item => item.id !== id || !cancel.some(timer => timer.timer === item.timer));
    timers.push(...schedule.map(timer => ({ id, timer: timer.timer, due: timer.due })));
  };
  const send = (id, input) => keep(id, booking.send(records.get(id)?.snapshot, { ...input, at: now() }));
  return {
    /** POST /bookings: a guest asks for a table. */
    book({ guests }) {
      const id = `bk_${records.size + 1}`;
      keep(id, booking.start({ entry: "POST /bookings", at: now(), context: { guests } }));
      return id;
    },
    confirm: id => send(id, { event: "booking.confirmed" }),
    decline: id => send(id, { event: "booking.declined" }),
    arrive: id => send(id, { event: "guest.arrived" }),
    /** Run every minute: the timers due by now are sent. */
    sweep() {
      const due = timers.filter(item => Date.parse(item.due) <= clock.now());
      timers = timers.filter(item => !due.includes(item));
      for (const item of due) send(item.id, { timer: item.timer });
    },
    status: id => records.get(id).state
  };
}
