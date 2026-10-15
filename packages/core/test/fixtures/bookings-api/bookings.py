"""A small booking service: the Python twin of bookings.js, whose vectors the guide's reference loop runs."""

from datetime import datetime, timedelta

# The grace period: a confirmed guest who has not come 30 minutes later is a no-show.
GRACE_PERIOD = timedelta(minutes=30)


def instant(text):
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


class FakeClock:
    """A clock tests move by hand."""

    def __init__(self, at):
        self.now = instant(at)

    def set(self, at):
        self.now = instant(at)


class Bookings:
    """The service: bookings by ID, each with its status."""

    def __init__(self, clock):
        self.clock = clock
        self.bookings = {}

    def book(self, guests):
        """POST /bookings: a guest asks for a table."""
        booking_id = f"bk_{len(self.bookings) + 1}"
        self.bookings[booking_id] = {"guests": guests, "status": "requested", "since": self.clock.now}
        return booking_id

    def _move(self, booking_id, before, after):
        booking = self.bookings[booking_id]
        if booking["status"] != before:
            raise ValueError(f"Booking {booking_id} is {booking['status']}, not {before}")
        booking["status"] = after
        booking["since"] = self.clock.now

    def confirm(self, booking_id):
        self._move(booking_id, "requested", "confirmed")

    def decline(self, booking_id):
        self._move(booking_id, "requested", "declined")

    def arrive(self, booking_id):
        self._move(booking_id, "confirmed", "seated")

    def sweep(self):
        """Run every minute: confirmed bookings past the grace period become no-shows."""
        for booking in self.bookings.values():
            if booking["status"] == "confirmed" and self.clock.now - booking["since"] >= GRACE_PERIOD:
                booking["status"] = "no-show"
                booking["since"] = self.clock.now

    def status(self, booking_id):
        return self.bookings[booking_id]["status"]
