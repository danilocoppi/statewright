// A small booking service: the system examples/bookings.statewright.json designs, written as a team would write it,
// with a clock it is given so that tests can move time. `plantedBug` breaks it on purpose: a guest who arrives is not
// seated.

/** The grace period: a confirmed guest who has not come 30 minutes later is a no-show. */
const GRACE_PERIOD = 30 * 60 * 1000;

/** A clock tests move by hand. */
export function fakeClock(at) {
  let now = Date.parse(at);
  return { now: () => now, set: instant => (now = Date.parse(instant)) };
}

/** The service: bookings by ID, each with its status. */
export function createBookings({ clock, plantedBug = false }) {
  const bookings = new Map();
  const find = id => {
    const booking = bookings.get(id);
    if (!booking) throw new Error(`No booking ${id}`);
    return booking;
  };
  const move = (id, from, to) => {
    const booking = find(id);
    if (booking.status !== from) throw new Error(`Booking ${id} is ${booking.status}, not ${from}`);
    booking.status = to;
    booking.since = clock.now();
  };
  return {
    /** POST /bookings: a guest asks for a table. */
    book({ guests }) {
      const id = `bk_${bookings.size + 1}`;
      bookings.set(id, { id, guests, status: "requested", since: clock.now() });
      return id;
    },
    /** The restaurant's answer: booking.confirmed or booking.declined. */
    confirm: id => move(id, "requested", "confirmed"),
    decline: id => move(id, "requested", "declined"),
    /** guest.arrived */
    arrive(id) {
      if (plantedBug) return void find(id);
      move(id, "confirmed", "seated");
    },
    /** Run every minute: confirmed bookings past the grace period become no-shows. */
    sweep() {
      for (const booking of bookings.values()) {
        if (booking.status === "confirmed" && clock.now() - booking.since >= GRACE_PERIOD) {
          booking.status = "no-show";
          booking.since = clock.now();
        }
      }
    },
    status: id => find(id).status
  };
}
