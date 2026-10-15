"""driver.py: runs the vectors of the bookings design through the Python booking service."""

from bookings import Bookings, FakeClock


def start(vector):
    clock = FakeClock(vector["start"]["at"])
    service = Bookings(clock)
    return {"clock": clock, "service": service, "id": service.book(guests=2)}


def apply(handle, step):
    service, booking_id = handle["service"], handle["id"]
    if step.get("event") == "booking.confirmed":
        service.confirm(booking_id)
    elif step.get("event") == "booking.declined":
        service.decline(booking_id)
    elif step.get("event") == "guest.arrived":
        service.arrive(booking_id)
    elif "wait" in step:
        handle["clock"].set(step["until"])
        service.sweep()
    else:
        raise ValueError(f"The driver cannot do {step}")


def state(handle):
    return [handle["service"].status(handle["id"])]
