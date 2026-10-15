# Audit of Bookings

0 errors, 0 warnings and 6 incomplete. 5 scenarios, none going elsewhere. The scenarios cover 100 % of the states, nodes and transitions.

## Problems

### Incomplete

| Code | Target | Level | Message |
| --- | --- | --- | --- |
| `spec.unspecified` | `ept_answer` |  | endpoint "Answer a booking" does not specify request, responses |
| `spec.unspecified` | `ept_book` |  | endpoint "Book a table" does not specify request, responses |
| `spec.unspecified` | `ept_sendSms` |  | endpoint "Send an SMS" does not specify request, responses |
| `spec.unspecified` | `evt_bookingConfirmed` |  | event "booking.confirmed" does not specify payload |
| `spec.unspecified` | `evt_bookingDeclined` |  | event "booking.declined" does not specify payload |
| `spec.unspecified` | `evt_guestArrived` |  | event "guest.arrived" does not specify payload |

## Scenarios

| Scenario | Name | Level | Result |
| --- | --- | --- | --- |
| `scn_aBookingIsDeclined` | A booking is declined | `cnv_booking` | same as recorded |
| `scn_aConfirmedGuestIsSeated` | A confirmed guest is seated | `cnv_booking` | same as recorded |
| `scn_aGuestDoesNotCome` | A guest does not come | `cnv_booking` | same as recorded |
| `scn_theGuestIsToldItIsConfirmed` | The guest is told it is confirmed | `cnv_textGuest` | same as recorded |
| `scn_theGuestIsToldItIsDeclined` | The guest is told it is declined | `cnv_textGuest` | same as recorded |

## Coverage

| Level | Kind | States or nodes | Transitions | Covered | Not reached |
| --- | --- | --- | --- | --- | --- |
| Booking lifecycle (`cnv_booking`) | machine | 5 / 5 | 5 / 5 | 100 % |  |
| Text the guest (`cnv_textGuest`) | flow | 5 / 5 | 5 / 5 | 100 % |  |
