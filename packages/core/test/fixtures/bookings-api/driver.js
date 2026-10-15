// driver.js: runs the vectors of the bookings design through the booking service. A vector starts a booking, each step
// does what the service does for it, and the booking's status is its state.
import { createBookings, fakeClock } from "./bookings.js";

export function bookingsDriver({ plantedBug = false } = {}) {
  return {
    start(vector) {
      const clock = fakeClock(vector.start.at);
      const service = createBookings({ clock, plantedBug });
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
