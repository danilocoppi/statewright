// runtime-driver.js: runs the vectors of the bookings design through the booking service that runs the design itself.
import { createBookingsOnRuntime } from "./runtime.js";
import { fakeClock } from "./bookings.js";

export function runtimeDriver(doc) {
  return {
    async start(vector) {
      const clock = fakeClock(vector.start.at);
      const service = await createBookingsOnRuntime({ doc, clock });
      return { clock, service, id: service.book({ guests: 2 }) };
    },
    apply({ clock, service, id }, step) {
      if (step.event === "booking.confirmed") return service.confirm(id);
      if (step.event === "booking.declined") return service.decline(id);
      if (step.event === "guest.arrived") return service.arrive(id);
      if (step.wait) {
        clock.set(step.until);
        return service.sweep();
      }
      throw new Error(`The driver cannot do ${JSON.stringify(step)}`);
    },
    state: ({ service, id }) => service.status(id)
  };
}
