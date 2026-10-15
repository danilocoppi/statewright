# Bookings

## Catalog

### Events

| Event | Payload | Source | Description |
| --- | --- | --- | --- |
| booking.confirmed |  |  |  |
| booking.declined |  |  |  |
| guest.arrived |  |  |  |

### Endpoints

| Endpoint | Request | Auth | Description |
| --- | --- | --- | --- |
| Answer a booking | POST /bookings/{id}/answer |  |  |
| Book a table | POST /bookings |  |  |
| Send an SMS | POST /messages |  |  |

### Timers

| Timer | When | Calendar | Description |
| --- | --- | --- | --- |
| grace period | PT30M |  |  |

### Parties

| Party | Kind | Description |
| --- | --- | --- |
| Guest | human |  |
| SMS provider | external |  |
| Restaurant staff | operator |  |

## Bookings

*system*

| Element | Kind | Notes |
| --- | --- | --- |
| Booking API | service |  |
| Guest | actor |  |
| Notifier | service |  |
| SMS provider | external |  |
| Restaurant staff | actor |  |

| From | To | What |
| --- | --- | --- |
| Booking API | Notifier | booking.confirmed · booking.declined |
| Guest | Booking API | POST /bookings |
| Notifier | SMS provider | POST /messages |
| Restaurant staff | Booking API | POST /bookings/{id}/answer |

## Bookings › Booking lifecycle

*machine · target · subject `booking.status` · transitions complete*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| confirmed |  |  |  |
| declined |  | failure, terminal |  |
| no-show |  | stopped, terminal |  |
| requested |  |  |  |
| seated |  | success, terminal |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| confirmed | no-show | grace period |  |  |
| confirmed | seated | guest.arrived |  |  |
| POST /bookings | requested |  |  |  |
| requested | confirmed | booking.confirmed |  |  |
| requested | declined | booking.declined |  |  |

### Scenario: A booking is declined

The restaurant has no table: it declines the booking.

Starts 2026-01-09T19:00:00Z at POST /bookings.

1. booking.declined

### Scenario: A confirmed guest is seated

The restaurant confirms the booking, and the guest arrives.

Starts 2026-01-09T19:00:00Z at POST /bookings.

1. booking.confirmed
2. guest.arrived

### Scenario: A guest does not come

The booking is confirmed, and the guest has not come when the grace period ends.

Starts 2026-01-09T19:00:00Z at POST /bookings.

1. booking.confirmed
2. wait for the next timer

## Bookings › Text the guest

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| guest told | end |  |
| send an apology | call |  |
| nod_start | start |  |
| send the confirmation | call |  |
| confirmed? | if |  |

| From | To | What |
| --- | --- | --- |
| confirmed? | send an apology | false |
| confirmed? | send the confirmation | true |
| send an apology | guest told |  |
| send the confirmation | guest told |  |
| start | confirmed? |  |

### Scenario: The guest is told it is confirmed

The Notifier hears booking.confirmed and sends the confirmation.

Starts 2026-01-09T19:00:00Z.

### Scenario: The guest is told it is declined

The Notifier hears booking.declined and sends an apology.

Starts 2026-01-09T19:00:00Z.
