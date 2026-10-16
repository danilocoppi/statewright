# Bookings — Statewright AI pack

This is a generated summary of the Statewright document `prj_bookings` (format 1.4). Read the Statewright guide (`npx statewright guide`) before changing it, change it only through commands (`statewright apply`), and reference elements by the IDs below.

## Glossary

| ID | Kind | Name | Where |
| --- | --- | --- | --- |
| `cnv_booking` | canvas | Booking lifecycle |  |
| `cnv_bookings` | canvas | Bookings |  |
| `cnv_textGuest` | canvas | Text the guest |  |
| `ept_answer` | endpoint | Answer a booking |  |
| `ept_book` | endpoint | Book a table |  |
| `ept_sendSms` | endpoint | Send an SMS |  |
| `evt_bookingConfirmed` | event | booking.confirmed |  |
| `evt_bookingDeclined` | event | booking.declined |  |
| `evt_guestArrived` | event | guest.arrived |  |
| `nod_book` | entry node | POST /bookings | `cnv_booking` |
| `nod_bookingApi` | service node | Booking API | `cnv_bookings` |
| `nod_confirmed` | state node | confirmed | `cnv_booking` |
| `nod_declined` | state node | declined | `cnv_booking` |
| `nod_guest` | actor node | Guest | `cnv_bookings` |
| `nod_noShow` | state node | no-show | `cnv_booking` |
| `nod_notifier` | service node | Notifier | `cnv_bookings` |
| `nod_requested` | state node | requested | `cnv_booking` |
| `nod_seated` | state node | seated | `cnv_booking` |
| `nod_sent` | end node | guest told | `cnv_textGuest` |
| `nod_sms` | external node | SMS provider | `cnv_bookings` |
| `nod_sorry` | call node | send an apology | `cnv_textGuest` |
| `nod_staff` | actor node | Restaurant staff | `cnv_bookings` |
| `nod_start` | start node | nod_start | `cnv_textGuest` |
| `nod_welcome` | call node | send the confirmation | `cnv_textGuest` |
| `nod_which` | if node | confirmed? | `cnv_textGuest` |
| `prj_bookings` | project | Bookings |  |
| `pty_guest` | party | Guest |  |
| `pty_sms` | party | SMS provider |  |
| `pty_staff` | party | Restaurant staff |  |
| `scn_aBookingIsDeclined` | scenario | A booking is declined |  |
| `scn_aConfirmedGuestIsSeated` | scenario | A confirmed guest is seated |  |
| `scn_aGuestDoesNotCome` | scenario | A guest does not come |  |
| `scn_theGuestIsToldItIsConfirmed` | scenario | The guest is told it is confirmed |  |
| `scn_theGuestIsToldItIsDeclined` | scenario | The guest is told it is declined |  |
| `tmr_grace` | timer | grace period |  |

## Levels

- `cnv_bookings` "Bookings" [system]
  - `nod_bookingApi` → `cnv_booking` "Booking lifecycle" [machine]
  - `nod_notifier` → `cnv_textGuest` "Text the guest" [flow]

## Canvases

### `cnv_booking` "Booking lifecycle"

machine · stage target · transitions complete · subject booking.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_confirmedNoShow` | `nod_confirmed` | `nod_noShow` | after:tmr_grace |  |  |
| `edg_confirmedSeated` | `nod_confirmed` | `nod_seated` | on:evt_guestArrived |  |  |
| `edg_postBookingsRequested` | `nod_book` | `nod_requested` | (none) |  |  |
| `edg_requestedConfirmed` | `nod_requested` | `nod_confirmed` | on:evt_bookingConfirmed |  |  |
| `edg_requestedDeclined` | `nod_requested` | `nod_declined` | on:evt_bookingDeclined |  |  |

### `cnv_bookings` "Bookings"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_bookingApiNotifier` | `nod_bookingApi` | `nod_notifier` | event | evt_bookingConfirmed evt_bookingDeclined |
| `edg_guestBookingApi` | `nod_guest` | `nod_bookingApi` | command | ept_book |
| `edg_notifierSmsProvider` | `nod_notifier` | `nod_sms` | command | ept_sendSms |
| `edg_restaurantStaffBookingApi` | `nod_staff` | `nod_bookingApi` | command | ept_answer |

### `cnv_textGuest` "Text the guest"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_confirmedSendAnApology` | `nod_which` | `nod_sorry` | false |  |
| `edg_confirmedSendTheConfirmation` | `nod_which` | `nod_welcome` | true |  |
| `edg_sendAnApologyGuestTold` | `nod_sorry` | `nod_sent` |  |  |
| `edg_sendTheConfirmationGuestTold` | `nod_welcome` | `nod_sent` |  |  |
| `edg_startConfirmed` | `nod_start` | `nod_which` |  |  |

## Findings

None.

## Scenarios

### `scn_aBookingIsDeclined` "A booking is declined" on `cnv_booking`

start 2026-01-09T19:00:00Z · entry `nod_book`

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_bookingDeclined` |  | `nod_declined` ended done |

### `scn_aConfirmedGuestIsSeated` "A confirmed guest is seated" on `cnv_booking`

start 2026-01-09T19:00:00Z · entry `nod_book`

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_bookingConfirmed` |  | `nod_confirmed` |
| 2 | `event:evt_guestArrived` |  | `nod_seated` ended done |

### `scn_aGuestDoesNotCome` "A guest does not come" on `cnv_booking`

start 2026-01-09T19:00:00Z · entry `nod_book`

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_bookingConfirmed` |  | `nod_confirmed` |
| 2 | `wait:next` |  | `nod_noShow` ended done |

### `scn_theGuestIsToldItIsConfirmed` "The guest is told it is confirmed" on `cnv_textGuest`

start 2026-01-09T19:00:00Z · input `{"event":"booking.confirmed"}`

### `scn_theGuestIsToldItIsDeclined` "The guest is told it is declined" on `cnv_textGuest`

start 2026-01-09T19:00:00Z · input `{"event":"booking.declined"}`

## Problems

| Severity | Code | Target | Message |
| --- | --- | --- | --- |
| incomplete | `spec.unspecified` | `ept_answer` | endpoint "Answer a booking" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_book` | endpoint "Book a table" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_sendSms` | endpoint "Send an SMS" does not specify request, responses |
| incomplete | `spec.unspecified` | `evt_bookingConfirmed` | event "booking.confirmed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bookingDeclined` | event "booking.declined" does not specify payload |
| incomplete | `spec.unspecified` | `evt_guestArrived` | event "guest.arrived" does not specify payload |
