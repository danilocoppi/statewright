# Airport operations

An international airport of four terminals: who works with whom, every flight from slot to on-block, each bag from the drop to the hold, 120 stands, the turnaround at each of them, security, borders, de-icing and the desk that handles what goes wrong.

## Catalog

### Types

| Type | Kind | Description |
| --- | --- | --- |
| BoardingVars | object |  |
| Flight | object |  |

### Events

| Event | Payload | Source | Description |
| --- | --- | --- | --- |
| aircraft.accident |  |  |  |
| aircraft.airborne |  |  |  |
| aircraft.landed |  |  |  |
| aircraft.landedSafely |  |  |  |
| aircraft.offBlock |  |  |  |
| aircraft.onBlock |  |  |  |
| aircraft.returning |  |  |  |
| bag.cleared |  |  |  |
| bag.dropped |  |  |  |
| bag.early |  |  |  |
| bag.encoded |  |  |  |
| bag.inducted |  |  |  |
| bag.jam |  |  |  |
| bag.loaded |  |  |  |
| bag.moved |  |  |  |
| bag.noRead |  |  |  |
| bag.processed |  |  |  |
| bag.reflighted |  |  |  |
| bag.rejected |  |  |  |
| bag.released |  |  |  |
| bag.rush |  |  |  |
| bag.screened |  |  |  |
| bag.sorted |  |  |  |
| bag.sourceMessage |  |  |  |
| bag.transferMessage |  |  |  |
| bag.transferred |  |  |  |
| bags.offloaded |  |  |  |
| boarding.denied |  |  |  |
| boarding.finalCall |  |  |  |
| boarding.general |  |  |  |
| boarding.resumed |  |  |  |
| boarding.started |  |  |  |
| boarding.suspended |  |  |  |
| border.cleared |  |  |  |
| cabin.ready |  |  |  |
| catering.completed |  |  |  |
| charge.failed |  |  |  |
| charge.succeeded |  |  |  |
| cleaning.completed |  |  |  |
| ctot.issued |  |  |  |
| ctot.revised |  |  |  |
| deboarding.completed |  |  |  |
| deicing.completed |  |  |  |
| deicing.padAssigned |  |  |  |
| deicing.requested |  |  |  |
| disruption.local |  |  |  |
| disruption.major |  |  |  |
| disruption.reported |  |  |  |
| disruption.resolved |  |  |  |
| doors.closed |  |  |  |
| dpi.sent |  |  |  |
| emergency.closed |  |  |  |
| emergency.declared |  |  |  |
| emergency.escalated |  |  |  |
| flight.cancelled |  |  |  |
| flight.delayed |  |  |  |
| flight.diverted |  |  |  |
| flight.updated |  |  |  |
| flow.measure |  |  |  |
| fuel.completed |  |  |  |
| fuel.ordered |  |  |  |
| fuel.started |  |  |  |
| fuel.truckAssigned |  |  |  |
| gate.changed |  |  |  |
| gate.closed |  |  |  |
| gpu.disconnected |  |  |  |
| handoff.accepted |  |  |  |
| hold.instructed |  |  |  |
| hold.released |  |  |  |
| holds.closed |  |  |  |
| item.collected |  |  |  |
| item.matched |  |  |  |
| lane.break |  |  |  |
| lane.closed |  |  |  |
| lane.selfTested |  |  |  |
| lane.staffed |  |  |  |
| loading.started |  |  |  |
| loadsheet.accepted |  |  |  |
| offload.completed |  |  |  |
| passenger.atGate |  |  |  |
| passenger.boarded |  |  |  |
| passenger.checkedIn |  |  |  |
| passenger.notified |  |  |  |
| passenger.screened |  |  |  |
| queue.long |  |  |  |
| queue.normal |  |  |  |
| route.joined |  |  |  |
| screening.alarm |  |  |  |
| search.clear |  |  |  |
| search.started |  |  |  |
| search.suspicious |  |  |  |
| stand.allocated |  |  |  |
| stand.deallocated |  |  |  |
| stand.inspected |  |  |  |
| stand.outOfService |  |  |  |
| stand.returned |  |  |  |
| stay.exited |  |  |  |
| stay.paid |  |  |  |
| taxi.started |  |  |  |
| trace.negative |  |  |  |
| trace.positive |  |  |  |
| turnaround.completed |  |  |  |
| water.completed |  |  |  |
| weather.observation |  |  |  |
| weather.warning |  |  |  |
| work.completed |  |  |  |
| work.partsArrived |  |  |  |
| work.partsNeeded |  |  |  |
| work.rejected |  |  |  |
| work.started |  |  |  |
| work.triaged |  |  |  |

### Actions

| Action | Input | Output | Description |
| --- | --- | --- | --- |
| Charge the movement |  |  |  |
| Notify passengers |  |  | Push, SMS and e-mail to everyone booked on the flight. |
| Publish to displays |  |  | Pushes the flight to every screen. |
| Release the stand |  |  |  |
| Request de-icing |  |  |  |
| Run the turnaround |  |  | Everything that happens to an aircraft between on-block and off-block. |

### Guards

| Guard | Expression | Description |
| --- | --- | --- |
| Cleared |  | The machine or an operator cleared the bag. |
| Icing conditions |  | Frost, snow or freezing rain at the airport, or ice on the wings. |

### Endpoints

| Endpoint | Request | Auth | Description |
| --- | --- | --- | --- |
| Accept a bag | POST /bags |  |  |
| Alert the hospitals | POST /emergency/hospitals |  |  |
| Allocate a stand | PUT /flights/{id}/stand |  |  |
| Announce | POST /announcements |  |  |
| Boarding list | GET /dcs/flights/{id}/passengers |  |  |
| Charge an operator | POST /charges |  |  |
| Check a passenger in | POST /dcs/checkin |  |  |
| Check a traveller | POST /border/checks |  |  |
| Directions | POST /wayfinding/directions |  |  |
| Find bags | GET /bags?flight={id}&pax={pax} |  |  |
| Fuel receipt | POST /fuel/receipts |  |  |
| Movements | GET /movements?month={m} |  |  |
| Publish a schedule | POST /flights |  |  |
| Read a flight | GET /flights/{id} |  |  |
| Record a boarding | POST /dcs/boarded |  |  |
| Record a milestone | PUT /flights/{id}/milestones |  |  |
| Send a push | POST /push |  |  |
| Visa record | GET /visas/{number} |  |  |
| Weather | GET /metar/{airport} |  |  |

### Webhooks

| Webhook | Direction | Party | Description |
| --- | --- | --- | --- |
| Catering events | in | Caterer |  |
| Fuel truck events | in | Fuel supplier |  |
| Payment events | in | Payment provider |  |

### Timers

| Timer | When | Calendar | Description |
| --- | --- | --- | --- |
| break | PT15M |  |  |
| check-in closes | PT2H20M |  |  |
| check-in opens | PT3H |  | Three hours before the scheduled off-block. |
| fuelling limit | PT45M |  |  |
| grace to leave | PT20M |  |  |
| keep for | P90D |  |  |
| paging interval | PT3M |  |  |
| payment terms | P30D |  |  |
| rush window | PT2H |  |  |
| taxi-out limit | PT40M |  |  |

### Parties

| Party | Kind | Description |
| --- | --- | --- |
| Airline | external |  |
| Operations database | system |  |
| Airport operations centre | operator |  |
| Air traffic control | external |  |
| Baggage operations | operator |  |
| Baggage handling system | system |  |
| Border police | external |  |
| Caterer | external |  |
| Cabin cleaning | operator |  |
| Cabin crew | human |  |
| Customs | external |  |
| Airline departure control | external |  |
| Fire and rescue | operator |  |
| Fuel supplier | external |  |
| Ground handler | operator |  |
| Airport maintenance | operator |  |
| Weather service | external |  |
| Network manager | external |  |
| Passenger | human |  |
| Payment provider | external |  |
| Pilot in command | human |  |
| Security screening | operator |  |
| Slot coordinator | external |  |

## Airport operations

*system*

**Airport operations**

Four terminals, two runways, 120 stands. The operations database is the source of truth for every flight; everything else listens to it or feeds it.

| Element | Kind | Notes |
| --- | --- | --- |
| Air traffic control | external | tower · ground · approach |
| Airfield guidance | service | A-SMGCS · 2 runways · 64 taxiways |
| Airline agent | actor |  |
| Airline DCS | external | check-in · boarding lists · load |
| Airline ops control | external |  |
| Alerts | queue | priority ordered |
| Operations database | service | AODB · the flight of record |
| Duty manager | actor | APOC · 24/7 |
| Bag messages | queue | BSM · BPM · BTM (IATA RP 1745) |
| Baggage handling | service | 68 km of belts · 4 sorters · 48 EDS |
| Bags | store | ≈95,000 a day at peak |
| Aeronautical billing | service | landing · parking · passenger fees |
| Boarding | service |  |
| Border control | service | e-gates · officers |
| Border police | external |  |
| Catering company | external |  |
| Check-in and bag drop | service |  |
| Cabin cleaning | service |  |
| Customs | external |  |
| De-icing | service | 6 remote pads |
| Emergency response | service |  |
| Flight information displays | service | 1,400 screens · 9 languages |
| Flight events | queue | Kafka · flight.* · 30 days |
| Flights | store | ≈1,300 movements a day |
| Into-plane fuelling | service |  |
| Fuel supplier | external |  |
| Ground crew | actor | ramp · pushback · loading |
| Irregular operations desk | service |  |
| Lost and found | service | replaces the paper log · proposed |
| Maintenance | service |  |
| Network manager | external | CTOT · flow measures |
| Notifications | service | push · SMS · e-mail |
| Car parks | service | 11,000 spaces |
| Passenger | actor |  |
| Passenger app | service | iOS · Android · web |
| Passengers | store | journeys, not identities |
| Payment provider | external |  |
| Pilot | actor |  |
| Stands and gates | service | 120 stands · 64 gates |
| Security screening | service | 38 lanes · CT scanners |
| Slot coordination | external |  |
| Turnaround coordination | service | A-CDM milestones |
| Wayfinding | service | static signs only · legacy |
| Weather service | external | METAR · TAF · warnings |
| Work orders | store |  |

| From | To | What |
| --- | --- | --- |
| Airline ops control | Operations database | POST /flights |
| Baggage handling | Alerts | bag.rush · bag.jam |
| Security screening | Passengers | data |
| Security screening | Alerts | screening.alarm |
| Border control | Passengers | data |
| Border control | Border police | POST /border/checks |
| Border control | Customs | declarations |
| Boarding | Airline DCS | POST /dcs/boarded |
| Boarding | Passengers | data |
| Ground crew | Turnaround coordination | milestones |
| Ground crew | Boarding | door closed |
| Pilot | Turnaround coordination | ready |
| Pilot | Air traffic control | start-up · pushback |
| De-icing | Turnaround coordination | deicing.completed |
| Into-plane fuelling | Turnaround coordination | fuel.completed |
| Airfield guidance | Air traffic control | surface picture |
| Air traffic control | Airfield guidance | stop bars · routes |
| Fuel supplier | Into-plane fuelling | Fuel truck events |
| Catering company | Turnaround coordination | Catering events |
| Cabin cleaning | Turnaround coordination | cleaning.completed |
| Aeronautical billing | Payment provider | POST /charges |
| Payment provider | Aeronautical billing | Payment events |
| Car parks | Payment provider | card at exit |
| Alerts | Irregular operations desk | stream |
| Alerts | Emergency response | stream |
| Alerts | Duty manager | stream |
| Duty manager | Irregular operations desk | command |
| Duty manager | Emergency response | declare |
| Irregular operations desk | Operations database | cancel · divert · combine |
| Irregular operations desk | Notifications | command |
| Notifications | Passenger app | passenger.notified |
| Emergency response | Air traffic control | runway closed |
| Emergency response | Alerts | emergency.declared · emergency.closed |
| Maintenance | Work orders | data |
| Stands and gates | Maintenance | stand out of service |
| Maintenance | Stands and gates | stand.returned |
| Flight information displays | Wayfinding | data |
| Lost and found | Bags | unclaimed bags |
| Passenger app | Lost and found | command |
| Slot coordination | Operations database | season slots |
| Network manager | Operations database | ctot.issued · ctot.revised · flow.measure |
| Air traffic control | Operations database | aircraft.landed · aircraft.airborne · aircraft.onBlock · aircraft.offBlock |
| Weather service | Operations database | weather.warning · weather.observation |
| Operations database | Flights | data |
| Operations database | Flight events | flight.updated · flight.delayed · flight.cancelled · gate.changed |
| Flight events | Flight information displays | stream |
| Flight events | Passenger app | stream |
| Flight events | Stands and gates | stream |
| Flight events | Turnaround coordination | stream |
| Flight events | Aeronautical billing | movements |
| Flight events | Baggage handling | make-up times |
| Flight events | Boarding | stream |
| Flight events | De-icing | stream |
| Flight events | Irregular operations desk | stream |
| Stands and gates | Operations database | PUT /flights/{id}/stand |
| Turnaround coordination | Operations database | PUT /flights/{id}/milestones |
| Turnaround coordination | Network manager | departure planning info |
| Passenger | Passenger app | track · board pass |
| Passenger | Check-in and bag drop | command |
| Passenger | Security screening | command |
| Passenger | Border control | command |
| Passenger | Boarding | command |
| Passenger | Car parks | command |
| Passenger | Lost and found | report a lost item |
| Airline agent | Check-in and bag drop | command |
| Airline agent | Boarding | command |
| Check-in and bag drop | Airline DCS | POST /dcs/checkin |
| Check-in and bag drop | Baggage handling | tagged bags |
| Check-in and bag drop | Bag messages | bag.sourceMessage |
| Airline DCS | Bag messages | bag.transferMessage |
| Bag messages | Baggage handling | stream |
| Baggage handling | Bags | data |
| Baggage handling | Bag messages | bag.processed |

## Airport operations › Airfield surface

*system*

Every taxiway segment, holding point and stop bar the guidance system routes aircraft through.

| Element | Kind | Notes |
| --- | --- | --- |
| Crossing 11 | service |  |
| Crossing 15 | service |  |
| Crossing 3 | service |  |
| Crossing 7 | service |  |
| Ground controller | actor |  |
| Holding point A1 | queue | CAT I |
| Holding point A10 | queue | CAT I |
| Holding point A11 | queue | CAT I |
| Holding point A12 | queue | CAT III |
| Holding point A13 | queue | CAT I |
| Holding point A14 | queue | CAT I |
| Holding point A15 | queue | CAT I |
| Holding point A16 | queue | CAT III |
| Holding point A2 | queue | CAT I |
| Holding point A3 | queue | CAT I |
| Holding point A4 | queue | CAT III |
| Holding point A5 | queue | CAT I |
| Holding point A6 | queue | CAT I |
| Holding point A7 | queue | CAT I |
| Holding point A8 | queue | CAT III |
| Holding point A9 | queue | CAT I |
| Holding point B1 | queue | CAT I |
| Holding point B10 | queue | CAT I |
| Holding point B11 | queue | CAT I |
| Holding point B12 | queue | CAT III |
| Holding point B13 | queue | CAT I |
| Holding point B14 | queue | CAT I |
| Holding point B15 | queue | CAT I |
| Holding point B16 | queue | CAT III |
| Holding point B2 | queue | CAT I |
| Holding point B3 | queue | CAT I |
| Holding point B4 | queue | CAT III |
| Holding point B5 | queue | CAT I |
| Holding point B6 | queue | CAT I |
| Holding point B7 | queue | CAT I |
| Holding point B8 | queue | CAT III |
| Holding point B9 | queue | CAT I |
| Link A1 | service | to the apron |
| Link A11 | service | to the apron |
| Link A13 | service | to the apron |
| Link A15 | service | to the apron |
| Link A3 | service | to the apron |
| Link A5 | service | to the apron |
| Link A7 | service | to the apron |
| Link A9 | service | to the apron |
| Link B1 | service | to the apron |
| Link B11 | service | to the apron |
| Link B13 | service | to the apron |
| Link B15 | service | to the apron |
| Link B3 | service | to the apron |
| Link B5 | service | to the apron |
| Link B7 | service | to the apron |
| Link B9 | service | to the apron |
| Routing | service | conflict-free routes |
| Runway 07L/25R | store | 3900 m · CAT III |
| Runway 07R/25L | store | 3500 m · CAT III |
| Stop bar A1 | service |  |
| Stop bar A10 | service |  |
| Stop bar A11 | service |  |
| Stop bar A12 | service |  |
| Stop bar A13 | service |  |
| Stop bar A14 | service |  |
| Stop bar A15 | service |  |
| Stop bar A16 | service |  |
| Stop bar A2 | service |  |
| Stop bar A3 | service |  |
| Stop bar A4 | service |  |
| Stop bar A5 | service |  |
| Stop bar A6 | service |  |
| Stop bar A7 | service |  |
| Stop bar A8 | service |  |
| Stop bar A9 | service |  |
| Stop bar B1 | service |  |
| Stop bar B10 | service |  |
| Stop bar B11 | service |  |
| Stop bar B12 | service |  |
| Stop bar B13 | service |  |
| Stop bar B14 | service |  |
| Stop bar B15 | service |  |
| Stop bar B16 | service |  |
| Stop bar B2 | service |  |
| Stop bar B3 | service |  |
| Stop bar B4 | service |  |
| Stop bar B5 | service |  |
| Stop bar B6 | service |  |
| Stop bar B7 | service |  |
| Stop bar B8 | service |  |
| Stop bar B9 | service | fails to clear · NOTAM · defect |
| Taxiway A1 | service | parallel |
| Taxiway A10 | service | parallel |
| Taxiway A11 | service | parallel |
| Taxiway A12 | service | rapid exit |
| Taxiway A13 | service | parallel |
| Taxiway A14 | service | parallel |
| Taxiway A15 | service | parallel |
| Taxiway A16 | service | rapid exit |
| Taxiway A2 | service | parallel |
| Taxiway A3 | service | parallel |
| Taxiway A4 | service | rapid exit |
| Taxiway A5 | service | parallel |
| Taxiway A6 | service | parallel |
| Taxiway A7 | service | parallel |
| Taxiway A8 | service | rapid exit |
| Taxiway A9 | service | parallel |
| Taxiway B1 | service | parallel |
| Taxiway B10 | service | parallel |
| Taxiway B11 | service | parallel |
| Taxiway B12 | service | rapid exit |
| Taxiway B13 | service | parallel |
| Taxiway B14 | service | parallel |
| Taxiway B15 | service | parallel |
| Taxiway B16 | service | rapid exit |
| Taxiway B2 | service | parallel |
| Taxiway B3 | service | parallel |
| Taxiway B4 | service | rapid exit |
| Taxiway B5 | service | parallel |
| Taxiway B6 | service | parallel |
| Taxiway B7 | service | parallel |
| Taxiway B8 | service | rapid exit |
| Taxiway B9 | service | parallel |

| From | To | What |
| --- | --- | --- |
| Ground controller | Routing | command |
| Routing | Runway 07L/25R | command |
| Taxiway A1 | Holding point A1 | data |
| Holding point A1 | Stop bar A1 | data |
| Stop bar A1 | Runway 07L/25R | data |
| Routing | Stop bar A1 | command |
| Link A1 | Taxiway A1 | data |
| Taxiway A1 | Taxiway A2 | data |
| Taxiway A2 | Holding point A2 | data |
| Holding point A2 | Stop bar A2 | data |
| Stop bar A2 | Runway 07L/25R | data |
| Routing | Stop bar A2 | command |
| Taxiway A2 | Taxiway A3 | data |
| Taxiway A3 | Holding point A3 | data |
| Holding point A3 | Stop bar A3 | data |
| Stop bar A3 | Runway 07L/25R | data |
| Routing | Stop bar A3 | command |
| Link A3 | Taxiway A3 | data |
| Taxiway A3 | Taxiway A4 | data |
| Taxiway A4 | Holding point A4 | data |
| Holding point A4 | Stop bar A4 | data |
| Stop bar A4 | Runway 07L/25R | data |
| Routing | Stop bar A4 | command |
| Taxiway A4 | Taxiway A5 | data |
| Taxiway A5 | Holding point A5 | data |
| Holding point A5 | Stop bar A5 | data |
| Stop bar A5 | Runway 07L/25R | data |
| Routing | Stop bar A5 | command |
| Link A5 | Taxiway A5 | data |
| Taxiway A5 | Taxiway A6 | data |
| Taxiway A6 | Holding point A6 | data |
| Holding point A6 | Stop bar A6 | data |
| Stop bar A6 | Runway 07L/25R | data |
| Routing | Stop bar A6 | command |
| Taxiway A6 | Taxiway A7 | data |
| Taxiway A7 | Holding point A7 | data |
| Holding point A7 | Stop bar A7 | data |
| Stop bar A7 | Runway 07L/25R | data |
| Routing | Stop bar A7 | command |
| Link A7 | Taxiway A7 | data |
| Taxiway A7 | Taxiway A8 | data |
| Taxiway A8 | Holding point A8 | data |
| Holding point A8 | Stop bar A8 | data |
| Stop bar A8 | Runway 07L/25R | data |
| Routing | Stop bar A8 | command |
| Taxiway A8 | Taxiway A9 | data |
| Taxiway A9 | Holding point A9 | data |
| Holding point A9 | Stop bar A9 | data |
| Stop bar A9 | Runway 07L/25R | data |
| Routing | Stop bar A9 | command |
| Link A9 | Taxiway A9 | data |
| Taxiway A9 | Taxiway A10 | data |
| Taxiway A10 | Holding point A10 | data |
| Holding point A10 | Stop bar A10 | data |
| Stop bar A10 | Runway 07L/25R | data |
| Routing | Stop bar A10 | command |
| Taxiway A10 | Taxiway A11 | data |
| Taxiway A11 | Holding point A11 | data |
| Holding point A11 | Stop bar A11 | data |
| Stop bar A11 | Runway 07L/25R | data |
| Routing | Stop bar A11 | command |
| Link A11 | Taxiway A11 | data |
| Taxiway A11 | Taxiway A12 | data |
| Taxiway A12 | Holding point A12 | data |
| Holding point A12 | Stop bar A12 | data |
| Stop bar A12 | Runway 07L/25R | data |
| Routing | Stop bar A12 | command |
| Taxiway A12 | Taxiway A13 | data |
| Taxiway A13 | Holding point A13 | data |
| Holding point A13 | Stop bar A13 | data |
| Stop bar A13 | Runway 07L/25R | data |
| Routing | Stop bar A13 | command |
| Link A13 | Taxiway A13 | data |
| Taxiway A13 | Taxiway A14 | data |
| Taxiway A14 | Holding point A14 | data |
| Holding point A14 | Stop bar A14 | data |
| Stop bar A14 | Runway 07L/25R | data |
| Routing | Stop bar A14 | command |
| Taxiway A14 | Taxiway A15 | data |
| Taxiway A15 | Holding point A15 | data |
| Holding point A15 | Stop bar A15 | data |
| Stop bar A15 | Runway 07L/25R | data |
| Routing | Stop bar A15 | command |
| Link A15 | Taxiway A15 | data |
| Taxiway A15 | Taxiway A16 | data |
| Taxiway A16 | Holding point A16 | data |
| Holding point A16 | Stop bar A16 | data |
| Stop bar A16 | Runway 07L/25R | data |
| Routing | Stop bar A16 | command |
| Routing | Runway 07R/25L | command |
| Taxiway B1 | Holding point B1 | data |
| Holding point B1 | Stop bar B1 | data |
| Stop bar B1 | Runway 07R/25L | data |
| Routing | Stop bar B1 | command |
| Link B1 | Taxiway B1 | data |
| Taxiway B1 | Taxiway B2 | data |
| Taxiway B2 | Holding point B2 | data |
| Holding point B2 | Stop bar B2 | data |
| Stop bar B2 | Runway 07R/25L | data |
| Routing | Stop bar B2 | command |
| Taxiway B2 | Taxiway B3 | data |
| Taxiway B3 | Holding point B3 | data |
| Holding point B3 | Stop bar B3 | data |
| Stop bar B3 | Runway 07R/25L | data |
| Routing | Stop bar B3 | command |
| Link B3 | Taxiway B3 | data |
| Taxiway B3 | Taxiway B4 | data |
| Taxiway B4 | Holding point B4 | data |
| Holding point B4 | Stop bar B4 | data |
| Stop bar B4 | Runway 07R/25L | data |
| Routing | Stop bar B4 | command |
| Taxiway B4 | Taxiway B5 | data |
| Taxiway B5 | Holding point B5 | data |
| Holding point B5 | Stop bar B5 | data |
| Stop bar B5 | Runway 07R/25L | data |
| Routing | Stop bar B5 | command |
| Link B5 | Taxiway B5 | data |
| Taxiway B5 | Taxiway B6 | data |
| Taxiway B6 | Holding point B6 | data |
| Holding point B6 | Stop bar B6 | data |
| Stop bar B6 | Runway 07R/25L | data |
| Routing | Stop bar B6 | command |
| Taxiway B6 | Taxiway B7 | data |
| Taxiway B7 | Holding point B7 | data |
| Holding point B7 | Stop bar B7 | data |
| Stop bar B7 | Runway 07R/25L | data |
| Routing | Stop bar B7 | command |
| Link B7 | Taxiway B7 | data |
| Taxiway B7 | Taxiway B8 | data |
| Taxiway B8 | Holding point B8 | data |
| Holding point B8 | Stop bar B8 | data |
| Stop bar B8 | Runway 07R/25L | data |
| Routing | Stop bar B8 | command |
| Taxiway B8 | Taxiway B9 | data |
| Taxiway B9 | Holding point B9 | data |
| Holding point B9 | Stop bar B9 | data |
| Stop bar B9 | Runway 07R/25L | data |
| Routing | Stop bar B9 | command |
| Link B9 | Taxiway B9 | data |
| Taxiway B9 | Taxiway B10 | data |
| Taxiway B10 | Holding point B10 | data |
| Holding point B10 | Stop bar B10 | data |
| Stop bar B10 | Runway 07R/25L | data |
| Routing | Stop bar B10 | command |
| Taxiway B10 | Taxiway B11 | data |
| Taxiway B11 | Holding point B11 | data |
| Holding point B11 | Stop bar B11 | data |
| Stop bar B11 | Runway 07R/25L | data |
| Routing | Stop bar B11 | command |
| Link B11 | Taxiway B11 | data |
| Taxiway B11 | Taxiway B12 | data |
| Taxiway B12 | Holding point B12 | data |
| Holding point B12 | Stop bar B12 | data |
| Stop bar B12 | Runway 07R/25L | data |
| Routing | Stop bar B12 | command |
| Taxiway B12 | Taxiway B13 | data |
| Taxiway B13 | Holding point B13 | data |
| Holding point B13 | Stop bar B13 | data |
| Stop bar B13 | Runway 07R/25L | data |
| Routing | Stop bar B13 | command |
| Link B13 | Taxiway B13 | data |
| Taxiway B13 | Taxiway B14 | data |
| Taxiway B14 | Holding point B14 | data |
| Holding point B14 | Stop bar B14 | data |
| Stop bar B14 | Runway 07R/25L | data |
| Routing | Stop bar B14 | command |
| Taxiway B14 | Taxiway B15 | data |
| Taxiway B15 | Holding point B15 | data |
| Holding point B15 | Stop bar B15 | data |
| Stop bar B15 | Runway 07R/25L | data |
| Routing | Stop bar B15 | command |
| Link B15 | Taxiway B15 | data |
| Taxiway B15 | Taxiway B16 | data |
| Taxiway B16 | Holding point B16 | data |
| Holding point B16 | Stop bar B16 | data |
| Stop bar B16 | Runway 07R/25L | data |
| Routing | Stop bar B16 | command |
| Taxiway A3 | Crossing 3 | data |
| Crossing 3 | Taxiway B3 | data |
| Taxiway A7 | Crossing 7 | data |
| Crossing 7 | Taxiway B7 | data |
| Taxiway A11 | Crossing 11 | data |
| Crossing 11 | Taxiway B11 | data |
| Taxiway A15 | Crossing 15 | data |
| Crossing 15 | Taxiway B15 | data |

## Airport operations › Operations database

*system*

One record per flight; adapters translate each partner's messages into it.

| Element | Kind | Notes |
| --- | --- | --- |
| A-CDM adapter | service | DPI · to the network manager |
| Integration bus | queue | AMQP |
| Billing export | service | monthly |
| Displays feed | service | pushed · 2 s |
| Flight record | store | PostgreSQL · 7 years |
| Old displays feed | service | FTP · polled every 60 s · legacy |
| Weather adapter | service | METAR · TAF |
| Movement adapter | service | IATA MVT · LDM |
| Surveillance adapter | service | ADS-B · A-SMGCS |
| Schedule adapter | service | SSIM · seasonal |

| From | To | What |
| --- | --- | --- |
| Integration bus | Flight record | data |
| Schedule adapter | Integration bus | event |
| Movement adapter | Integration bus | event |
| A-CDM adapter | Integration bus | event |
| Surveillance adapter | Integration bus | event |
| Weather adapter | Integration bus | event |
| Billing export | Integration bus | data |
| Displays feed | Integration bus | data |
| Old displays feed | Integration bus | data |

## Airport operations › Belt network

*system*

Every belt of the four terminals. Bags flow left to right: drop, merge, screen, sort, make up.

| Element | Kind | Notes |
| --- | --- | --- |
| Arrivals crew | actor |  |
| Collector A1-1 | service |  |
| Collector A1-10 | service |  |
| Collector A1-11 | service |  |
| Collector A1-12 | service | out-of-gauge chute |
| Collector A1-2 | service |  |
| Collector A1-3 | service |  |
| Collector A1-4 | service |  |
| Collector A1-5 | service |  |
| Collector A1-6 | service |  |
| Collector A1-7 | service |  |
| Collector A1-8 | service |  |
| Collector A1-9 | service |  |
| Collector A2-1 | service |  |
| Collector A2-10 | service |  |
| Collector A2-11 | service |  |
| Collector A2-12 | service | out-of-gauge chute |
| Collector A2-2 | service |  |
| Collector A2-3 | service |  |
| Collector A2-4 | service |  |
| Collector A2-5 | service |  |
| Collector A2-6 | service |  |
| Collector A2-7 | service |  |
| Collector A2-8 | service |  |
| Collector A2-9 | service |  |
| Collector A3-1 | service |  |
| Collector A3-10 | service |  |
| Collector A3-11 | service |  |
| Collector A3-12 | service | out-of-gauge chute |
| Collector A3-2 | service |  |
| Collector A3-3 | service |  |
| Collector A3-4 | service |  |
| Collector A3-5 | service |  |
| Collector A3-6 | service |  |
| Collector A3-7 | service |  |
| Collector A3-8 | service |  |
| Collector A3-9 | service |  |
| Collector A4-1 | service |  |
| Collector A4-10 | service |  |
| Collector A4-11 | service |  |
| Collector A4-12 | service | out-of-gauge chute |
| Collector A4-2 | service |  |
| Collector A4-3 | service |  |
| Collector A4-4 | service |  |
| Collector A4-5 | service |  |
| Collector A4-6 | service |  |
| Collector A4-7 | service |  |
| Collector A4-8 | service |  |
| Collector A4-9 | service |  |
| Collector A5-1 | service |  |
| Collector A5-10 | service |  |
| Collector A5-11 | service |  |
| Collector A5-12 | service | out-of-gauge chute |
| Collector A5-2 | service |  |
| Collector A5-3 | service |  |
| Collector A5-4 | service |  |
| Collector A5-5 | service |  |
| Collector A5-6 | service |  |
| Collector A5-7 | service |  |
| Collector A5-8 | service |  |
| Collector A5-9 | service |  |
| Collector A6-1 | service |  |
| Collector A6-10 | service |  |
| Collector A6-11 | service |  |
| Collector A6-12 | service | out-of-gauge chute |
| Collector A6-2 | service |  |
| Collector A6-3 | service |  |
| Collector A6-4 | service |  |
| Collector A6-5 | service |  |
| Collector A6-6 | service |  |
| Collector A6-7 | service |  |
| Collector A6-8 | service |  |
| Collector A6-9 | service |  |
| Collector B1-1 | service |  |
| Collector B1-10 | service |  |
| Collector B1-11 | service |  |
| Collector B1-12 | service | out-of-gauge chute |
| Collector B1-2 | service |  |
| Collector B1-3 | service |  |
| Collector B1-4 | service |  |
| Collector B1-5 | service |  |
| Collector B1-6 | service |  |
| Collector B1-7 | service |  |
| Collector B1-8 | service |  |
| Collector B1-9 | service |  |
| Collector B2-1 | service |  |
| Collector B2-10 | service |  |
| Collector B2-11 | service |  |
| Collector B2-12 | service | out-of-gauge chute |
| Collector B2-2 | service |  |
| Collector B2-3 | service |  |
| Collector B2-4 | service |  |
| Collector B2-5 | service |  |
| Collector B2-6 | service |  |
| Collector B2-7 | service |  |
| Collector B2-8 | service |  |
| Collector B2-9 | service |  |
| Collector B3-1 | service |  |
| Collector B3-10 | service |  |
| Collector B3-11 | service |  |
| Collector B3-12 | service | out-of-gauge chute |
| Collector B3-2 | service |  |
| Collector B3-3 | service |  |
| Collector B3-4 | service |  |
| Collector B3-5 | service |  |
| Collector B3-6 | service |  |
| Collector B3-7 | service |  |
| Collector B3-8 | service |  |
| Collector B3-9 | service |  |
| Collector B4-1 | service |  |
| Collector B4-10 | service |  |
| Collector B4-11 | service |  |
| Collector B4-12 | service | out-of-gauge chute |
| Collector B4-2 | service |  |
| Collector B4-3 | service |  |
| Collector B4-4 | service |  |
| Collector B4-5 | service |  |
| Collector B4-6 | service |  |
| Collector B4-7 | service |  |
| Collector B4-8 | service |  |
| Collector B4-9 | service |  |
| Collector B5-1 | service |  |
| Collector B5-10 | service |  |
| Collector B5-11 | service |  |
| Collector B5-12 | service | out-of-gauge chute |
| Collector B5-2 | service |  |
| Collector B5-3 | service |  |
| Collector B5-4 | service |  |
| Collector B5-5 | service |  |
| Collector B5-6 | service |  |
| Collector B5-7 | service |  |
| Collector B5-8 | service |  |
| Collector B5-9 | service |  |
| Collector B6-1 | service |  |
| Collector B6-10 | service |  |
| Collector B6-11 | service |  |
| Collector B6-12 | service | out-of-gauge chute |
| Collector B6-2 | service |  |
| Collector B6-3 | service |  |
| Collector B6-4 | service |  |
| Collector B6-5 | service |  |
| Collector B6-6 | service |  |
| Collector B6-7 | service |  |
| Collector B6-8 | service |  |
| Collector B6-9 | service |  |
| Collector C1-1 | service |  |
| Collector C1-10 | service |  |
| Collector C1-11 | service |  |
| Collector C1-12 | service | out-of-gauge chute |
| Collector C1-2 | service |  |
| Collector C1-3 | service |  |
| Collector C1-4 | service |  |
| Collector C1-5 | service |  |
| Collector C1-6 | service |  |
| Collector C1-7 | service |  |
| Collector C1-8 | service |  |
| Collector C1-9 | service |  |
| Collector C2-1 | service |  |
| Collector C2-10 | service |  |
| Collector C2-11 | service |  |
| Collector C2-12 | service | out-of-gauge chute |
| Collector C2-2 | service |  |
| Collector C2-3 | service |  |
| Collector C2-4 | service |  |
| Collector C2-5 | service |  |
| Collector C2-6 | service |  |
| Collector C2-7 | service |  |
| Collector C2-8 | service |  |
| Collector C2-9 | service |  |
| Collector C3-1 | service |  |
| Collector C3-10 | service |  |
| Collector C3-11 | service |  |
| Collector C3-12 | service | out-of-gauge chute |
| Collector C3-2 | service |  |
| Collector C3-3 | service |  |
| Collector C3-4 | service |  |
| Collector C3-5 | service |  |
| Collector C3-6 | service |  |
| Collector C3-7 | service |  |
| Collector C3-8 | service |  |
| Collector C3-9 | service |  |
| Collector C4-1 | service |  |
| Collector C4-10 | service |  |
| Collector C4-11 | service |  |
| Collector C4-12 | service | out-of-gauge chute |
| Collector C4-2 | service |  |
| Collector C4-3 | service |  |
| Collector C4-4 | service |  |
| Collector C4-5 | service |  |
| Collector C4-6 | service |  |
| Collector C4-7 | service |  |
| Collector C4-8 | service |  |
| Collector C4-9 | service |  |
| Collector C5-1 | service |  |
| Collector C5-10 | service |  |
| Collector C5-11 | service |  |
| Collector C5-12 | service | out-of-gauge chute |
| Collector C5-2 | service |  |
| Collector C5-3 | service |  |
| Collector C5-4 | service |  |
| Collector C5-5 | service |  |
| Collector C5-6 | service |  |
| Collector C5-7 | service |  |
| Collector C5-8 | service |  |
| Collector C5-9 | service |  |
| Collector C6-1 | service |  |
| Collector C6-10 | service |  |
| Collector C6-11 | service |  |
| Collector C6-12 | service | out-of-gauge chute |
| Collector C6-2 | service |  |
| Collector C6-3 | service |  |
| Collector C6-4 | service |  |
| Collector C6-5 | service |  |
| Collector C6-6 | service |  |
| Collector C6-7 | service |  |
| Collector C6-8 | service |  |
| Collector C6-9 | service |  |
| Collector D1-1 | service |  |
| Collector D1-10 | service |  |
| Collector D1-11 | service |  |
| Collector D1-12 | service | out-of-gauge chute |
| Collector D1-2 | service |  |
| Collector D1-3 | service |  |
| Collector D1-4 | service |  |
| Collector D1-5 | service |  |
| Collector D1-6 | service |  |
| Collector D1-7 | service |  |
| Collector D1-8 | service |  |
| Collector D1-9 | service |  |
| Collector D2-1 | service |  |
| Collector D2-10 | service |  |
| Collector D2-11 | service |  |
| Collector D2-12 | service | out-of-gauge chute |
| Collector D2-2 | service |  |
| Collector D2-3 | service |  |
| Collector D2-4 | service |  |
| Collector D2-5 | service |  |
| Collector D2-6 | service |  |
| Collector D2-7 | service |  |
| Collector D2-8 | service |  |
| Collector D2-9 | service |  |
| Collector D3-1 | service |  |
| Collector D3-10 | service |  |
| Collector D3-11 | service |  |
| Collector D3-12 | service | out-of-gauge chute |
| Collector D3-2 | service |  |
| Collector D3-3 | service |  |
| Collector D3-4 | service |  |
| Collector D3-5 | service |  |
| Collector D3-6 | service |  |
| Collector D3-7 | service |  |
| Collector D3-8 | service |  |
| Collector D3-9 | service |  |
| Collector D4-1 | service |  |
| Collector D4-10 | service |  |
| Collector D4-11 | service |  |
| Collector D4-12 | service | out-of-gauge chute |
| Collector D4-2 | service |  |
| Collector D4-3 | service |  |
| Collector D4-4 | service |  |
| Collector D4-5 | service |  |
| Collector D4-6 | service |  |
| Collector D4-7 | service |  |
| Collector D4-8 | service |  |
| Collector D4-9 | service |  |
| Collector D5-1 | service |  |
| Collector D5-10 | service |  |
| Collector D5-11 | service |  |
| Collector D5-12 | service | out-of-gauge chute |
| Collector D5-2 | service |  |
| Collector D5-3 | service |  |
| Collector D5-4 | service |  |
| Collector D5-5 | service |  |
| Collector D5-6 | service |  |
| Collector D5-7 | service |  |
| Collector D5-8 | service |  |
| Collector D5-9 | service |  |
| Collector D6-1 | service |  |
| Collector D6-10 | service |  |
| Collector D6-11 | service |  |
| Collector D6-12 | service | out-of-gauge chute |
| Collector D6-2 | service |  |
| Collector D6-3 | service |  |
| Collector D6-4 | service |  |
| Collector D6-5 | service |  |
| Collector D6-6 | service |  |
| Collector D6-7 | service |  |
| Collector D6-8 | service |  |
| Collector D6-9 | service |  |
| Diverter A1 | service |  |
| Diverter A10 | service |  |
| Diverter A11 | service |  |
| Diverter A12 | service |  |
| Diverter A13 | service |  |
| Diverter A14 | service |  |
| Diverter A15 | service |  |
| Diverter A16 | service |  |
| Diverter A2 | service |  |
| Diverter A3 | service |  |
| Diverter A4 | service |  |
| Diverter A5 | service |  |
| Diverter A6 | service |  |
| Diverter A7 | service |  |
| Diverter A8 | service |  |
| Diverter A9 | service |  |
| Diverter B1 | service |  |
| Diverter B10 | service |  |
| Diverter B11 | service |  |
| Diverter B12 | service |  |
| Diverter B13 | service |  |
| Diverter B14 | service |  |
| Diverter B15 | service |  |
| Diverter B16 | service |  |
| Diverter B2 | service |  |
| Diverter B3 | service |  |
| Diverter B4 | service |  |
| Diverter B5 | service |  |
| Diverter B6 | service |  |
| Diverter B7 | service |  |
| Diverter B8 | service |  |
| Diverter B9 | service |  |
| Diverter C1 | service |  |
| Diverter C10 | service |  |
| Diverter C11 | service |  |
| Diverter C12 | service |  |
| Diverter C13 | service |  |
| Diverter C14 | service |  |
| Diverter C15 | service |  |
| Diverter C16 | service |  |
| Diverter C2 | service |  |
| Diverter C3 | service |  |
| Diverter C4 | service |  |
| Diverter C5 | service |  |
| Diverter C6 | service |  |
| Diverter C7 | service |  |
| Diverter C8 | service |  |
| Diverter C9 | service |  |
| Diverter D1 | service |  |
| Diverter D10 | service |  |
| Diverter D11 | service |  |
| Diverter D12 | service |  |
| Diverter D13 | service |  |
| Diverter D14 | service |  |
| Diverter D15 | service |  |
| Diverter D16 | service |  |
| Diverter D2 | service |  |
| Diverter D3 | service |  |
| Diverter D4 | service |  |
| Diverter D5 | service |  |
| Diverter D6 | service |  |
| Diverter D7 | service |  |
| Diverter D8 | service |  |
| Diverter D9 | service |  |
| Early bag store | store | 2,400 positions · bags more than 3 h early |
| EDS A1 | service | standard 3 · CT 1,800 bags/h |
| EDS A2 | service | standard 3 · CT 1,800 bags/h |
| EDS A3 | service | standard 3 · CT |
| EDS A4 | service | standard 3 · CT 1,800 bags/h |
| EDS A5 | service | standard 3 · CT 1,800 bags/h |
| EDS A6 | service | standard 3 · CT |
| EDS B1 | service | standard 3 · CT 1,800 bags/h |
| EDS B2 | service | standard 3 · CT 1,800 bags/h |
| EDS B3 | service | standard 3 · CT |
| EDS B4 | service | standard 3 · CT 1,800 bags/h |
| EDS B5 | service | standard 3 · CT 1,800 bags/h |
| EDS B6 | service | standard 3 · CT |
| EDS C1 | service | standard 3 · CT 1,800 bags/h |
| EDS C2 | service | standard 3 · CT 1,800 bags/h |
| EDS C3 | service | standard 3 · CT |
| EDS C4 | service | standard 3 · CT 1,800 bags/h |
| EDS C5 | service | standard 3 · CT 1,800 bags/h |
| EDS C6 | service | standard 3 · CT |
| EDS D1 | service | standard 3 · CT 1,800 bags/h |
| EDS D2 | service | standard 3 · CT 1,800 bags/h |
| EDS D3 | service | standard 3 · CT |
| EDS D4 | service | standard 3 · CT 1,800 bags/h |
| EDS D5 | service | standard 3 · CT 1,800 bags/h · proposed |
| EDS D6 | service | standard 3 · CT · proposed |
| Make-up A1 | store | wide-body · 6 ULDs |
| Make-up A10 | store | narrow-body · carts |
| Make-up A11 | store | narrow-body · carts |
| Make-up A12 | store | narrow-body · carts |
| Make-up A13 | store | narrow-body · carts |
| Make-up A14 | store | narrow-body · carts |
| Make-up A15 | store | narrow-body · carts |
| Make-up A16 | store | narrow-body · carts |
| Make-up A2 | store | wide-body · 6 ULDs |
| Make-up A3 | store | wide-body · 6 ULDs |
| Make-up A4 | store | wide-body · 6 ULDs |
| Make-up A5 | store | narrow-body · carts |
| Make-up A6 | store | narrow-body · carts |
| Make-up A7 | store | narrow-body · carts |
| Make-up A8 | store | narrow-body · carts |
| Make-up A9 | store | narrow-body · carts |
| Make-up B1 | store | wide-body · 6 ULDs |
| Make-up B10 | store | narrow-body · carts |
| Make-up B11 | store | narrow-body · carts |
| Make-up B12 | store | narrow-body · carts |
| Make-up B13 | store | narrow-body · carts |
| Make-up B14 | store | narrow-body · carts |
| Make-up B15 | store | narrow-body · carts |
| Make-up B16 | store | narrow-body · carts |
| Make-up B2 | store | wide-body · 6 ULDs |
| Make-up B3 | store | wide-body · 6 ULDs |
| Make-up B4 | store | wide-body · 6 ULDs |
| Make-up B5 | store | narrow-body · carts |
| Make-up B6 | store | narrow-body · carts |
| Make-up B7 | store | narrow-body · carts |
| Make-up B8 | store | narrow-body · carts |
| Make-up B9 | store | narrow-body · carts |
| Make-up C1 | store | wide-body · 6 ULDs |
| Make-up C10 | store | narrow-body · carts |
| Make-up C11 | store | narrow-body · carts |
| Make-up C12 | store | narrow-body · carts |
| Make-up C13 | store | narrow-body · carts |
| Make-up C14 | store | narrow-body · carts |
| Make-up C15 | store | narrow-body · carts |
| Make-up C16 | store | narrow-body · carts |
| Make-up C2 | store | wide-body · 6 ULDs |
| Make-up C3 | store | wide-body · 6 ULDs |
| Make-up C4 | store | wide-body · 6 ULDs |
| Make-up C5 | store | narrow-body · carts |
| Make-up C6 | store | narrow-body · carts |
| Make-up C7 | store | narrow-body · carts |
| Make-up C8 | store | narrow-body · carts |
| Make-up C9 | store | narrow-body · carts |
| Make-up D1 | store | wide-body · 6 ULDs |
| Make-up D10 | store | narrow-body · carts |
| Make-up D11 | store | narrow-body · carts |
| Make-up D12 | store | narrow-body · carts |
| Make-up D13 | store | narrow-body · carts |
| Make-up D14 | store | narrow-body · carts |
| Make-up D15 | store | narrow-body · carts |
| Make-up D16 | store | narrow-body · carts |
| Make-up D2 | store | wide-body · 6 ULDs |
| Make-up D3 | store | wide-body · 6 ULDs |
| Make-up D4 | store | wide-body · 6 ULDs |
| Make-up D5 | store | narrow-body · carts |
| Make-up D6 | store | narrow-body · carts |
| Make-up D7 | store | narrow-body · carts |
| Make-up D8 | store | narrow-body · carts |
| Make-up D9 | store | narrow-body · carts |
| Level 3 screening A | service | operator review · CT |
| Level 3 screening B | service | operator review · CT |
| Level 3 screening C | service | operator review · CT |
| Level 3 screening D | service | operator review · CT |
| Main line A1 | service | 195 m |
| Main line A2 | service | 210 m |
| Main line A3 | service | 225 m |
| Main line A4 | service | 240 m |
| Main line A5 | service | 255 m |
| Main line A6 | service | 270 m |
| Main line B1 | service | 195 m |
| Main line B2 | service | 210 m |
| Main line B3 | service | 225 m |
| Main line B4 | service | 240 m |
| Main line B5 | service | 255 m |
| Main line B6 | service | 270 m |
| Main line C1 | service | 195 m |
| Main line C2 | service | 210 m |
| Main line C3 | service | 225 m |
| Main line C4 | service | 240 m |
| Main line C5 | service | 255 m |
| Main line C6 | service | 270 m |
| Main line D1 | service | 195 m |
| Main line D2 | service | 210 m |
| Main line D3 | service | 225 m |
| Main line D4 | service | 240 m |
| Main line D5 | service | 255 m |
| Main line D6 | service | 270 m |
| Manual encoding | service | unread tags |
| Merge A1 | queue | accumulation · 40 bags |
| Merge A2 | queue | accumulation · 40 bags |
| Merge A3 | queue | accumulation · 40 bags |
| Merge A4 | queue | accumulation · 40 bags |
| Merge A5 | queue | accumulation · 40 bags |
| Merge A6 | queue | accumulation · 40 bags |
| Merge B1 | queue | accumulation · 40 bags |
| Merge B2 | queue | accumulation · 40 bags |
| Merge B3 | queue | accumulation · 40 bags |
| Merge B4 | queue | accumulation · 40 bags |
| Merge B5 | queue | accumulation · 40 bags |
| Merge B6 | queue | accumulation · 40 bags |
| Merge C1 | queue | accumulation · 40 bags |
| Merge C2 | queue | accumulation · 40 bags |
| Merge C3 | queue | accumulation · 40 bags |
| Merge C4 | queue | accumulation · 40 bags |
| Merge C5 | queue | accumulation · 40 bags |
| Merge C6 | queue | accumulation · 40 bags |
| Merge D1 | queue | accumulation · 40 bags |
| Merge D2 | queue | accumulation · 40 bags |
| Merge D3 | queue | accumulation · 40 bags |
| Merge D4 | queue | accumulation · 40 bags |
| Merge D5 | queue | accumulation · 40 bags |
| Merge D6 | queue | accumulation · 40 bags |
| Problem bags | store |  |
| Reclaim 1 | service | carousel |
| Reclaim 10 | service | carousel |
| Reclaim 11 | service | oversize |
| Reclaim 12 | service | oversize |
| Reclaim 2 | service | carousel |
| Reclaim 3 | service | carousel |
| Reclaim 4 | service | carousel |
| Reclaim 5 | service | carousel |
| Reclaim 6 | service | carousel |
| Reclaim 7 | service | carousel |
| Reclaim 8 | service | carousel |
| Reclaim 9 | service | carousel |
| Reconciliation A | store | bags held for a decision |
| Reconciliation B | store | bags held for a decision |
| Reconciliation C | store | bags held for a decision |
| Reconciliation D | store | bags held for a decision |
| Sorter A | service | tilt-tray · 12,000 bags/h |
| Sorter B | service | tilt-tray · 12,000 bags/h |
| Sorter C | service | tilt-tray · 12,000 bags/h |
| Sorter D | service | tilt-tray · 12,000 bags/h |
| Transfer input A1 | service | from the apron |
| Transfer input A2 | service | from the apron |
| Transfer input B1 | service | from the apron |
| Transfer input B2 | service | from the apron |
| Transfer input C1 | service | from the apron |
| Transfer input C2 | service | from the apron |
| Transfer input D1 | service | from the apron |
| Transfer input D2 | service | from the apron |

| From | To | What |
| --- | --- | --- |
| Collector A1-1 | Merge A1 | bag.moved |
| Collector A1-2 | Merge A1 | data |
| Collector A1-3 | Merge A1 | data |
| Collector A1-4 | Merge A1 | data |
| Collector A1-5 | Merge A1 | data |
| Collector A1-6 | Merge A1 | data |
| Collector A1-7 | Merge A1 | data |
| Collector A1-8 | Merge A1 | data |
| Collector A1-9 | Merge A1 | data |
| Collector A1-10 | Merge A1 | data |
| Collector A1-11 | Merge A1 | data |
| Collector A1-12 | Merge A1 | data |
| Merge A1 | Main line A1 | data |
| Collector A2-1 | Merge A2 | bag.moved |
| Collector A2-2 | Merge A2 | data |
| Collector A2-3 | Merge A2 | data |
| Collector A2-4 | Merge A2 | data |
| Collector A2-5 | Merge A2 | data |
| Collector A2-6 | Merge A2 | data |
| Collector A2-7 | Merge A2 | data |
| Collector A2-8 | Merge A2 | data |
| Collector A2-9 | Merge A2 | data |
| Collector A2-10 | Merge A2 | data |
| Collector A2-11 | Merge A2 | data |
| Collector A2-12 | Merge A2 | data |
| Merge A2 | Main line A2 | data |
| Collector A3-1 | Merge A3 | bag.moved |
| Collector A3-2 | Merge A3 | data |
| Collector A3-3 | Merge A3 | data |
| Collector A3-4 | Merge A3 | data |
| Collector A3-5 | Merge A3 | data |
| Collector A3-6 | Merge A3 | data |
| Collector A3-7 | Merge A3 | data |
| Collector A3-8 | Merge A3 | data |
| Collector A3-9 | Merge A3 | data |
| Collector A3-10 | Merge A3 | data |
| Collector A3-11 | Merge A3 | data |
| Collector A3-12 | Merge A3 | data |
| Merge A3 | Main line A3 | data |
| Collector A4-1 | Merge A4 | bag.moved |
| Collector A4-2 | Merge A4 | data |
| Collector A4-3 | Merge A4 | data |
| Collector A4-4 | Merge A4 | data |
| Collector A4-5 | Merge A4 | data |
| Collector A4-6 | Merge A4 | data |
| Collector A4-7 | Merge A4 | data |
| Collector A4-8 | Merge A4 | data |
| Collector A4-9 | Merge A4 | data |
| Collector A4-10 | Merge A4 | data |
| Collector A4-11 | Merge A4 | data |
| Collector A4-12 | Merge A4 | data |
| Merge A4 | Main line A4 | data |
| Collector A5-1 | Merge A5 | bag.moved |
| Collector A5-2 | Merge A5 | data |
| Collector A5-3 | Merge A5 | data |
| Collector A5-4 | Merge A5 | data |
| Collector A5-5 | Merge A5 | data |
| Collector A5-6 | Merge A5 | data |
| Collector A5-7 | Merge A5 | data |
| Collector A5-8 | Merge A5 | data |
| Collector A5-9 | Merge A5 | data |
| Collector A5-10 | Merge A5 | data |
| Collector A5-11 | Merge A5 | data |
| Collector A5-12 | Merge A5 | data |
| Merge A5 | Main line A5 | data |
| Collector A6-1 | Merge A6 | bag.moved |
| Collector A6-2 | Merge A6 | data |
| Collector A6-3 | Merge A6 | data |
| Collector A6-4 | Merge A6 | data |
| Collector A6-5 | Merge A6 | data |
| Collector A6-6 | Merge A6 | data |
| Collector A6-7 | Merge A6 | data |
| Collector A6-8 | Merge A6 | data |
| Collector A6-9 | Merge A6 | data |
| Collector A6-10 | Merge A6 | data |
| Collector A6-11 | Merge A6 | data |
| Collector A6-12 | Merge A6 | data |
| Merge A6 | Main line A6 | data |
| Main line A1 | Main line A2 | bypass |
| Main line A2 | Main line A3 | bypass |
| Main line A3 | Main line A4 | bypass |
| Main line A4 | Main line A5 | bypass |
| Main line A5 | Main line A6 | bypass |
| Main line A1 | EDS A1 | data |
| Main line A2 | EDS A1 | alternate |
| EDS A1 | Sorter A | cleared |
| EDS A1 | Level 3 screening A | alarm |
| Main line A2 | EDS A2 | data |
| Main line A3 | EDS A2 | alternate |
| EDS A2 | Sorter A | cleared |
| EDS A2 | Level 3 screening A | alarm |
| Main line A3 | EDS A3 | data |
| Main line A4 | EDS A3 | alternate |
| EDS A3 | Sorter A | cleared |
| EDS A3 | Level 3 screening A | alarm |
| Main line A4 | EDS A4 | data |
| Main line A5 | EDS A4 | alternate |
| EDS A4 | Sorter A | cleared |
| EDS A4 | Level 3 screening A | alarm |
| Main line A5 | EDS A5 | data |
| Main line A6 | EDS A5 | alternate |
| EDS A5 | Sorter A | cleared |
| EDS A5 | Level 3 screening A | alarm |
| Main line A6 | EDS A6 | data |
| Main line A1 | EDS A6 | alternate |
| EDS A6 | Sorter A | cleared |
| EDS A6 | Level 3 screening A | alarm |
| Level 3 screening A | Sorter A | cleared |
| Level 3 screening A | Reconciliation A | rejected |
| Sorter A | Diverter A1 | data |
| Diverter A1 | Make-up A1 | bag.sorted |
| Sorter A | Diverter A2 | data |
| Diverter A2 | Make-up A2 | data |
| Sorter A | Diverter A3 | data |
| Diverter A3 | Make-up A3 | data |
| Sorter A | Diverter A4 | data |
| Diverter A4 | Make-up A4 | data |
| Sorter A | Diverter A5 | data |
| Diverter A5 | Make-up A5 | data |
| Sorter A | Diverter A6 | data |
| Diverter A6 | Make-up A6 | data |
| Sorter A | Diverter A7 | data |
| Diverter A7 | Make-up A7 | data |
| Sorter A | Diverter A8 | data |
| Diverter A8 | Make-up A8 | data |
| Sorter A | Diverter A9 | data |
| Diverter A9 | Make-up A9 | data |
| Sorter A | Diverter A10 | data |
| Diverter A10 | Make-up A10 | data |
| Sorter A | Diverter A11 | data |
| Diverter A11 | Make-up A11 | data |
| Sorter A | Diverter A12 | data |
| Diverter A12 | Make-up A12 | data |
| Sorter A | Diverter A13 | data |
| Diverter A13 | Make-up A13 | data |
| Sorter A | Diverter A14 | data |
| Diverter A14 | Make-up A14 | data |
| Sorter A | Diverter A15 | data |
| Diverter A15 | Make-up A15 | data |
| Sorter A | Diverter A16 | data |
| Diverter A16 | Make-up A16 | data |
| Collector B1-1 | Merge B1 | bag.moved |
| Collector B1-2 | Merge B1 | data |
| Collector B1-3 | Merge B1 | data |
| Collector B1-4 | Merge B1 | data |
| Collector B1-5 | Merge B1 | data |
| Collector B1-6 | Merge B1 | data |
| Collector B1-7 | Merge B1 | data |
| Collector B1-8 | Merge B1 | data |
| Collector B1-9 | Merge B1 | data |
| Collector B1-10 | Merge B1 | data |
| Collector B1-11 | Merge B1 | data |
| Collector B1-12 | Merge B1 | data |
| Merge B1 | Main line B1 | data |
| Collector B2-1 | Merge B2 | bag.moved |
| Collector B2-2 | Merge B2 | data |
| Collector B2-3 | Merge B2 | data |
| Collector B2-4 | Merge B2 | data |
| Collector B2-5 | Merge B2 | data |
| Collector B2-6 | Merge B2 | data |
| Collector B2-7 | Merge B2 | data |
| Collector B2-8 | Merge B2 | data |
| Collector B2-9 | Merge B2 | data |
| Collector B2-10 | Merge B2 | data |
| Collector B2-11 | Merge B2 | data |
| Collector B2-12 | Merge B2 | data |
| Merge B2 | Main line B2 | data |
| Collector B3-1 | Merge B3 | bag.moved |
| Collector B3-2 | Merge B3 | data |
| Collector B3-3 | Merge B3 | data |
| Collector B3-4 | Merge B3 | data |
| Collector B3-5 | Merge B3 | data |
| Collector B3-6 | Merge B3 | data |
| Collector B3-7 | Merge B3 | data |
| Collector B3-8 | Merge B3 | data |
| Collector B3-9 | Merge B3 | data |
| Collector B3-10 | Merge B3 | data |
| Collector B3-11 | Merge B3 | data |
| Collector B3-12 | Merge B3 | data |
| Merge B3 | Main line B3 | data |
| Collector B4-1 | Merge B4 | bag.moved |
| Collector B4-2 | Merge B4 | data |
| Collector B4-3 | Merge B4 | data |
| Collector B4-4 | Merge B4 | data |
| Collector B4-5 | Merge B4 | data |
| Collector B4-6 | Merge B4 | data |
| Collector B4-7 | Merge B4 | data |
| Collector B4-8 | Merge B4 | data |
| Collector B4-9 | Merge B4 | data |
| Collector B4-10 | Merge B4 | data |
| Collector B4-11 | Merge B4 | data |
| Collector B4-12 | Merge B4 | data |
| Merge B4 | Main line B4 | data |
| Collector B5-1 | Merge B5 | bag.moved |
| Collector B5-2 | Merge B5 | data |
| Collector B5-3 | Merge B5 | data |
| Collector B5-4 | Merge B5 | data |
| Collector B5-5 | Merge B5 | data |
| Collector B5-6 | Merge B5 | data |
| Collector B5-7 | Merge B5 | data |
| Collector B5-8 | Merge B5 | data |
| Collector B5-9 | Merge B5 | data |
| Collector B5-10 | Merge B5 | data |
| Collector B5-11 | Merge B5 | data |
| Collector B5-12 | Merge B5 | data |
| Merge B5 | Main line B5 | data |
| Collector B6-1 | Merge B6 | bag.moved |
| Collector B6-2 | Merge B6 | data |
| Collector B6-3 | Merge B6 | data |
| Collector B6-4 | Merge B6 | data |
| Collector B6-5 | Merge B6 | data |
| Collector B6-6 | Merge B6 | data |
| Collector B6-7 | Merge B6 | data |
| Collector B6-8 | Merge B6 | data |
| Collector B6-9 | Merge B6 | data |
| Collector B6-10 | Merge B6 | data |
| Collector B6-11 | Merge B6 | data |
| Collector B6-12 | Merge B6 | data |
| Merge B6 | Main line B6 | data |
| Main line B1 | Main line B2 | bypass |
| Main line B2 | Main line B3 | bypass |
| Main line B3 | Main line B4 | bypass |
| Main line B4 | Main line B5 | bypass |
| Main line B5 | Main line B6 | bypass |
| Main line B1 | EDS B1 | data |
| Main line B2 | EDS B1 | alternate |
| EDS B1 | Sorter B | cleared |
| EDS B1 | Level 3 screening B | alarm |
| Main line B2 | EDS B2 | data |
| Main line B3 | EDS B2 | alternate |
| EDS B2 | Sorter B | cleared |
| EDS B2 | Level 3 screening B | alarm |
| Main line B3 | EDS B3 | data |
| Main line B4 | EDS B3 | alternate |
| EDS B3 | Sorter B | cleared |
| EDS B3 | Level 3 screening B | alarm |
| Main line B4 | EDS B4 | data |
| Main line B5 | EDS B4 | alternate |
| EDS B4 | Sorter B | cleared |
| EDS B4 | Level 3 screening B | alarm |
| Main line B5 | EDS B5 | data |
| Main line B6 | EDS B5 | alternate |
| EDS B5 | Sorter B | cleared |
| EDS B5 | Level 3 screening B | alarm |
| Main line B6 | EDS B6 | data |
| Main line B1 | EDS B6 | alternate |
| EDS B6 | Sorter B | cleared |
| EDS B6 | Level 3 screening B | alarm |
| Level 3 screening B | Sorter B | cleared |
| Level 3 screening B | Reconciliation B | rejected |
| Sorter B | Diverter B1 | data |
| Diverter B1 | Make-up B1 | bag.sorted |
| Sorter B | Diverter B2 | data |
| Diverter B2 | Make-up B2 | data |
| Sorter B | Diverter B3 | data |
| Diverter B3 | Make-up B3 | data |
| Sorter B | Diverter B4 | data |
| Diverter B4 | Make-up B4 | data |
| Sorter B | Diverter B5 | data |
| Diverter B5 | Make-up B5 | data |
| Sorter B | Diverter B6 | data |
| Diverter B6 | Make-up B6 | data |
| Sorter B | Diverter B7 | data |
| Diverter B7 | Make-up B7 | data |
| Sorter B | Diverter B8 | data |
| Diverter B8 | Make-up B8 | data |
| Sorter B | Diverter B9 | data |
| Diverter B9 | Make-up B9 | data |
| Sorter B | Diverter B10 | data |
| Diverter B10 | Make-up B10 | data |
| Sorter B | Diverter B11 | data |
| Diverter B11 | Make-up B11 | data |
| Sorter B | Diverter B12 | data |
| Diverter B12 | Make-up B12 | data |
| Sorter B | Diverter B13 | data |
| Diverter B13 | Make-up B13 | data |
| Sorter B | Diverter B14 | data |
| Diverter B14 | Make-up B14 | data |
| Sorter B | Diverter B15 | data |
| Diverter B15 | Make-up B15 | data |
| Sorter B | Diverter B16 | data |
| Diverter B16 | Make-up B16 | data |
| Collector C1-1 | Merge C1 | bag.moved |
| Collector C1-2 | Merge C1 | data |
| Collector C1-3 | Merge C1 | data |
| Collector C1-4 | Merge C1 | data |
| Collector C1-5 | Merge C1 | data |
| Collector C1-6 | Merge C1 | data |
| Collector C1-7 | Merge C1 | data |
| Collector C1-8 | Merge C1 | data |
| Collector C1-9 | Merge C1 | data |
| Collector C1-10 | Merge C1 | data |
| Collector C1-11 | Merge C1 | data |
| Collector C1-12 | Merge C1 | data |
| Merge C1 | Main line C1 | data |
| Collector C2-1 | Merge C2 | bag.moved |
| Collector C2-2 | Merge C2 | data |
| Collector C2-3 | Merge C2 | data |
| Collector C2-4 | Merge C2 | data |
| Collector C2-5 | Merge C2 | data |
| Collector C2-6 | Merge C2 | data |
| Collector C2-7 | Merge C2 | data |
| Collector C2-8 | Merge C2 | data |
| Collector C2-9 | Merge C2 | data |
| Collector C2-10 | Merge C2 | data |
| Collector C2-11 | Merge C2 | data |
| Collector C2-12 | Merge C2 | data |
| Merge C2 | Main line C2 | data |
| Collector C3-1 | Merge C3 | bag.moved |
| Collector C3-2 | Merge C3 | data |
| Collector C3-3 | Merge C3 | data |
| Collector C3-4 | Merge C3 | data |
| Collector C3-5 | Merge C3 | data |
| Collector C3-6 | Merge C3 | data |
| Collector C3-7 | Merge C3 | data |
| Collector C3-8 | Merge C3 | data |
| Collector C3-9 | Merge C3 | data |
| Collector C3-10 | Merge C3 | data |
| Collector C3-11 | Merge C3 | data |
| Collector C3-12 | Merge C3 | data |
| Merge C3 | Main line C3 | data |
| Collector C4-1 | Merge C4 | bag.moved |
| Collector C4-2 | Merge C4 | data |
| Collector C4-3 | Merge C4 | data |
| Collector C4-4 | Merge C4 | data |
| Collector C4-5 | Merge C4 | data |
| Collector C4-6 | Merge C4 | data |
| Collector C4-7 | Merge C4 | data |
| Collector C4-8 | Merge C4 | data |
| Collector C4-9 | Merge C4 | data |
| Collector C4-10 | Merge C4 | data |
| Collector C4-11 | Merge C4 | data |
| Collector C4-12 | Merge C4 | data |
| Merge C4 | Main line C4 | data |
| Collector C5-1 | Merge C5 | bag.moved |
| Collector C5-2 | Merge C5 | data |
| Collector C5-3 | Merge C5 | data |
| Collector C5-4 | Merge C5 | data |
| Collector C5-5 | Merge C5 | data |
| Collector C5-6 | Merge C5 | data |
| Collector C5-7 | Merge C5 | data |
| Collector C5-8 | Merge C5 | data |
| Collector C5-9 | Merge C5 | data |
| Collector C5-10 | Merge C5 | data |
| Collector C5-11 | Merge C5 | data |
| Collector C5-12 | Merge C5 | data |
| Merge C5 | Main line C5 | data |
| Collector C6-1 | Merge C6 | bag.moved |
| Collector C6-2 | Merge C6 | data |
| Collector C6-3 | Merge C6 | data |
| Collector C6-4 | Merge C6 | data |
| Collector C6-5 | Merge C6 | data |
| Collector C6-6 | Merge C6 | data |
| Collector C6-7 | Merge C6 | data |
| Collector C6-8 | Merge C6 | data |
| Collector C6-9 | Merge C6 | data |
| Collector C6-10 | Merge C6 | data |
| Collector C6-11 | Merge C6 | data |
| Collector C6-12 | Merge C6 | data |
| Merge C6 | Main line C6 | data |
| Main line C1 | Main line C2 | bypass |
| Main line C2 | Main line C3 | bypass |
| Main line C3 | Main line C4 | bypass |
| Main line C4 | Main line C5 | bypass |
| Main line C5 | Main line C6 | bypass |
| Main line C1 | EDS C1 | data |
| Main line C2 | EDS C1 | alternate |
| EDS C1 | Sorter C | cleared |
| EDS C1 | Level 3 screening C | alarm |
| Main line C2 | EDS C2 | data |
| Main line C3 | EDS C2 | alternate |
| EDS C2 | Sorter C | cleared |
| EDS C2 | Level 3 screening C | alarm |
| Main line C3 | EDS C3 | data |
| Main line C4 | EDS C3 | alternate |
| EDS C3 | Sorter C | cleared |
| EDS C3 | Level 3 screening C | alarm |
| Main line C4 | EDS C4 | data |
| Main line C5 | EDS C4 | alternate |
| EDS C4 | Sorter C | cleared |
| EDS C4 | Level 3 screening C | alarm |
| Main line C5 | EDS C5 | data |
| Main line C6 | EDS C5 | alternate |
| EDS C5 | Sorter C | cleared |
| EDS C5 | Level 3 screening C | alarm |
| Main line C6 | EDS C6 | data |
| Main line C1 | EDS C6 | alternate |
| EDS C6 | Sorter C | cleared |
| EDS C6 | Level 3 screening C | alarm |
| Level 3 screening C | Sorter C | cleared |
| Level 3 screening C | Reconciliation C | rejected |
| Sorter C | Diverter C1 | data |
| Diverter C1 | Make-up C1 | bag.sorted |
| Sorter C | Diverter C2 | data |
| Diverter C2 | Make-up C2 | data |
| Sorter C | Diverter C3 | data |
| Diverter C3 | Make-up C3 | data |
| Sorter C | Diverter C4 | data |
| Diverter C4 | Make-up C4 | data |
| Sorter C | Diverter C5 | data |
| Diverter C5 | Make-up C5 | data |
| Sorter C | Diverter C6 | data |
| Diverter C6 | Make-up C6 | data |
| Sorter C | Diverter C7 | data |
| Diverter C7 | Make-up C7 | data |
| Sorter C | Diverter C8 | data |
| Diverter C8 | Make-up C8 | data |
| Sorter C | Diverter C9 | data |
| Diverter C9 | Make-up C9 | data |
| Sorter C | Diverter C10 | data |
| Diverter C10 | Make-up C10 | data |
| Sorter C | Diverter C11 | data |
| Diverter C11 | Make-up C11 | data |
| Sorter C | Diverter C12 | data |
| Diverter C12 | Make-up C12 | data |
| Sorter C | Diverter C13 | data |
| Diverter C13 | Make-up C13 | data |
| Sorter C | Diverter C14 | data |
| Diverter C14 | Make-up C14 | data |
| Sorter C | Diverter C15 | data |
| Diverter C15 | Make-up C15 | data |
| Sorter C | Diverter C16 | data |
| Diverter C16 | Make-up C16 | data |
| Collector D1-1 | Merge D1 | bag.moved |
| Collector D1-2 | Merge D1 | data |
| Collector D1-3 | Merge D1 | data |
| Collector D1-4 | Merge D1 | data |
| Collector D1-5 | Merge D1 | data |
| Collector D1-6 | Merge D1 | data |
| Collector D1-7 | Merge D1 | data |
| Collector D1-8 | Merge D1 | data |
| Collector D1-9 | Merge D1 | data |
| Collector D1-10 | Merge D1 | data |
| Collector D1-11 | Merge D1 | data |
| Collector D1-12 | Merge D1 | data |
| Merge D1 | Main line D1 | data |
| Collector D2-1 | Merge D2 | bag.moved |
| Collector D2-2 | Merge D2 | data |
| Collector D2-3 | Merge D2 | data |
| Collector D2-4 | Merge D2 | data |
| Collector D2-5 | Merge D2 | data |
| Collector D2-6 | Merge D2 | data |
| Collector D2-7 | Merge D2 | data |
| Collector D2-8 | Merge D2 | data |
| Collector D2-9 | Merge D2 | data |
| Collector D2-10 | Merge D2 | data |
| Collector D2-11 | Merge D2 | data |
| Collector D2-12 | Merge D2 | data |
| Merge D2 | Main line D2 | data |
| Collector D3-1 | Merge D3 | bag.moved |
| Collector D3-2 | Merge D3 | data |
| Collector D3-3 | Merge D3 | data |
| Collector D3-4 | Merge D3 | data |
| Collector D3-5 | Merge D3 | data |
| Collector D3-6 | Merge D3 | data |
| Collector D3-7 | Merge D3 | data |
| Collector D3-8 | Merge D3 | data |
| Collector D3-9 | Merge D3 | data |
| Collector D3-10 | Merge D3 | data |
| Collector D3-11 | Merge D3 | data |
| Collector D3-12 | Merge D3 | data |
| Merge D3 | Main line D3 | data |
| Collector D4-1 | Merge D4 | bag.moved |
| Collector D4-2 | Merge D4 | data |
| Collector D4-3 | Merge D4 | data |
| Collector D4-4 | Merge D4 | data |
| Collector D4-5 | Merge D4 | data |
| Collector D4-6 | Merge D4 | data |
| Collector D4-7 | Merge D4 | data |
| Collector D4-8 | Merge D4 | data |
| Collector D4-9 | Merge D4 | data |
| Collector D4-10 | Merge D4 | data |
| Collector D4-11 | Merge D4 | data |
| Collector D4-12 | Merge D4 | data |
| Merge D4 | Main line D4 | data |
| Collector D5-1 | Merge D5 | bag.moved |
| Collector D5-2 | Merge D5 | data |
| Collector D5-3 | Merge D5 | data |
| Collector D5-4 | Merge D5 | data |
| Collector D5-5 | Merge D5 | data |
| Collector D5-6 | Merge D5 | data |
| Collector D5-7 | Merge D5 | data |
| Collector D5-8 | Merge D5 | data |
| Collector D5-9 | Merge D5 | data |
| Collector D5-10 | Merge D5 | data |
| Collector D5-11 | Merge D5 | data |
| Collector D5-12 | Merge D5 | data |
| Merge D5 | Main line D5 | data |
| Collector D6-1 | Merge D6 | bag.moved |
| Collector D6-2 | Merge D6 | data |
| Collector D6-3 | Merge D6 | data |
| Collector D6-4 | Merge D6 | data |
| Collector D6-5 | Merge D6 | data |
| Collector D6-6 | Merge D6 | data |
| Collector D6-7 | Merge D6 | data |
| Collector D6-8 | Merge D6 | data |
| Collector D6-9 | Merge D6 | data |
| Collector D6-10 | Merge D6 | data |
| Collector D6-11 | Merge D6 | data |
| Collector D6-12 | Merge D6 | data |
| Merge D6 | Main line D6 | data |
| Main line D1 | Main line D2 | bypass |
| Main line D2 | Main line D3 | bypass |
| Main line D3 | Main line D4 | bypass |
| Main line D4 | Main line D5 | bypass |
| Main line D5 | Main line D6 | bypass |
| Main line D1 | EDS D1 | data |
| Main line D2 | EDS D1 | alternate |
| EDS D1 | Sorter D | cleared |
| EDS D1 | Level 3 screening D | alarm |
| Main line D2 | EDS D2 | data |
| Main line D3 | EDS D2 | alternate |
| EDS D2 | Sorter D | cleared |
| EDS D2 | Level 3 screening D | alarm |
| Main line D3 | EDS D3 | data |
| Main line D4 | EDS D3 | alternate |
| EDS D3 | Sorter D | cleared |
| EDS D3 | Level 3 screening D | alarm |
| Main line D4 | EDS D4 | data |
| Main line D5 | EDS D4 | alternate |
| EDS D4 | Sorter D | cleared |
| EDS D4 | Level 3 screening D | alarm |
| Main line D5 | EDS D5 | data |
| Main line D6 | EDS D5 | alternate |
| EDS D5 | Sorter D | cleared |
| EDS D5 | Level 3 screening D | alarm |
| Main line D6 | EDS D6 | data |
| Main line D1 | EDS D6 | alternate |
| EDS D6 | Sorter D | cleared |
| EDS D6 | Level 3 screening D | alarm |
| Level 3 screening D | Sorter D | cleared |
| Level 3 screening D | Reconciliation D | rejected |
| Sorter D | Diverter D1 | data |
| Diverter D1 | Make-up D1 | bag.sorted |
| Sorter D | Diverter D2 | data |
| Diverter D2 | Make-up D2 | data |
| Sorter D | Diverter D3 | data |
| Diverter D3 | Make-up D3 | data |
| Sorter D | Diverter D4 | data |
| Diverter D4 | Make-up D4 | data |
| Sorter D | Diverter D5 | data |
| Diverter D5 | Make-up D5 | data |
| Sorter D | Diverter D6 | data |
| Diverter D6 | Make-up D6 | data |
| Sorter D | Diverter D7 | data |
| Diverter D7 | Make-up D7 | data |
| Sorter D | Diverter D8 | data |
| Diverter D8 | Make-up D8 | data |
| Sorter D | Diverter D9 | data |
| Diverter D9 | Make-up D9 | data |
| Sorter D | Diverter D10 | data |
| Diverter D10 | Make-up D10 | data |
| Sorter D | Diverter D11 | data |
| Diverter D11 | Make-up D11 | data |
| Sorter D | Diverter D12 | data |
| Diverter D12 | Make-up D12 | data |
| Sorter D | Diverter D13 | data |
| Diverter D13 | Make-up D13 | data |
| Sorter D | Diverter D14 | data |
| Diverter D14 | Make-up D14 | data |
| Sorter D | Diverter D15 | data |
| Diverter D15 | Make-up D15 | data |
| Sorter D | Diverter D16 | data |
| Diverter D16 | Make-up D16 | data |
| Sorter A | Early bag store | early |
| Early bag store | Sorter A | released |
| Sorter A | Manual encoding | no read |
| Manual encoding | Sorter A | data |
| Sorter A | Problem bags | no flight |
| Transfer input A1 | Sorter A | bag.transferred |
| Transfer input A2 | Sorter A | bag.transferred |
| Sorter B | Early bag store | early |
| Early bag store | Sorter B | released |
| Sorter B | Manual encoding | no read |
| Manual encoding | Sorter B | data |
| Sorter B | Problem bags | no flight |
| Transfer input B1 | Sorter B | bag.transferred |
| Transfer input B2 | Sorter B | bag.transferred |
| Sorter C | Early bag store | early |
| Early bag store | Sorter C | released |
| Sorter C | Manual encoding | no read |
| Manual encoding | Sorter C | data |
| Sorter C | Problem bags | no flight |
| Transfer input C1 | Sorter C | bag.transferred |
| Transfer input C2 | Sorter C | bag.transferred |
| Sorter D | Early bag store | early |
| Early bag store | Sorter D | released |
| Sorter D | Manual encoding | no read |
| Manual encoding | Sorter D | data |
| Sorter D | Problem bags | no flight |
| Transfer input D1 | Sorter D | bag.transferred |
| Transfer input D2 | Sorter D | bag.transferred |
| Sorter A | Sorter B | tunnel |
| Sorter B | Sorter C | tunnel |
| Sorter C | Sorter D | tunnel |
| Sorter D | Sorter A | tunnel |
| Arrivals crew | Reclaim 1 | data |
| Arrivals crew | Reclaim 2 | data |
| Arrivals crew | Reclaim 3 | data |
| Arrivals crew | Reclaim 4 | data |
| Arrivals crew | Reclaim 5 | data |
| Arrivals crew | Reclaim 6 | data |
| Arrivals crew | Reclaim 7 | data |
| Arrivals crew | Reclaim 8 | data |
| Arrivals crew | Reclaim 9 | data |
| Arrivals crew | Reclaim 10 | data |
| Arrivals crew | Reclaim 11 | data |
| Arrivals crew | Reclaim 12 | data |

## Airport operations › Bag lifecycle

*machine · subject `bag.status` · transitions complete*

IATA Resolution 753: every bag is tracked at acceptance, loading, transfer and arrival.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| accepted |  |  |  |
| flown |  | success, terminal |  |
| in the system |  |  |  |
| level 3 review |  |  |  |
| loaded |  |  |  |
| in a container |  |  |  |
| mishandled |  | failure, terminal |  |
| offloaded |  |  |  |
| rejected |  | failure, terminal |  |
| screening |  |  |  |
| sorting |  |  |  |
| in the early bag store |  |  |  |
| manual encoding |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | accepted |  |  |  |
| POST /bags | accepted |  |  | emit bag.sourceMessage |
| accepted | in the system | bag.inducted |  |  |
| in the system | screening | bag.screened |  |  |
| screening | cleared? | always |  |  |
| cleared? | sorting | [Cleared] | Cleared |  |
| cleared? | level 3 review | else |  |  |
| level 3 review | sorting | bag.cleared |  |  |
| level 3 review | rejected | bag.rejected |  |  |
| sorting | in a container | bag.sorted |  |  |
| sorting | in the early bag store | bag.early |  |  |
| in the early bag store | sorting | bag.released |  |  |
| sorting | manual encoding | bag.noRead |  |  |
| manual encoding | sorting | bag.encoded |  |  |
| in a container | loaded | bag.loaded |  |  |
| loaded | flown | aircraft.airborne |  |  |
| loaded | offloaded | bags.offloaded |  |  |
| offloaded | sorting | bag.reflighted |  |  |
| offloaded | mishandled | rush window |  |  |

| From | Role | To | About |
| --- | --- | --- | --- |
| Ground handler | sends | bag.loaded |  |
| Ground handler | sends | bags.offloaded |  |
| Passenger | sends | POST /bags |  |

### Scenario: A bag from the drop to the hold

Cleared by the machine, sorted, built into a container, flown.

Starts 2026-10-01T06:00:00Z.

1. bag.inducted
2. bag.screened
3. bag.sorted
4. bag.loaded
5. aircraft.airborne

## Airport operations › Monthly billing

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| nod_billEnd | end |  |
| nod_billStart | start |  |
| each operator | forEach |  |
| the month's movements | call |  |

| From | To | What |
| --- | --- | --- |
| start | the month's movements |  |
| the month's movements | each operator |  |
| each operator | end |  |

## Airport operations › Monthly billing › Bill one operator

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| charge the operator | call |  |
| the fees | parallel |  |
| nod_feesDone | join |  |
| landing fee | assign |  |
| nod_opEnd | end |  |
| nod_opStart | start |  |
| paid | wait |  |
| parking fee | assign |  |
| passenger fee | assign |  |
| security fee | assign |  |

| From | To | What |
| --- | --- | --- |
| start | the fees |  |
| the fees | landing fee |  |
| landing fee | join |  |
| the fees | parking fee |  |
| parking fee | join |  |
| the fees | passenger fee |  |
| passenger fee | join |  |
| the fees | security fee |  |
| security fee | join |  |
| join | charge the operator |  |
| charge the operator | paid |  |
| paid | end |  |

## Airport operations › Boarding procedure

*flow*

From the boarding list to doors closed.

| Element | Kind | Notes |
| --- | --- | --- |
| announce boarding | call |  |
| while someone is missing | while |  |
| boarded | end |  |
| flight held | end |  |
| nod_boardStart | start |  |
| doors closed | emit |  |
| each passenger at the gate | forEach |  |
| Ground handler | participant |  |
| gate open | join |  |
| get the boarding list | call |  |
| load status? | switch |  |
| offload their bags | subflow |  |
| open the gate | parallel |  |
| desk ready | assign |  |
| the captain accepts the load | wait |  |

| From | To | What |
| --- | --- | --- |
| start | get the boarding list |  |
| get the boarding list | open the gate |  |
| open the gate | announce boarding |  |
| open the gate | desk ready |  |
| announce boarding | gate open |  |
| desk ready | gate open |  |
| gate open | each passenger at the gate |  |
| each passenger at the gate | while someone is missing |  |
| while someone is missing | load status? |  |
| load status? | doors closed | complete |
| load status? | offload their bags | noShows |
| load status? | flight held | default |
| offload their bags | doors closed |  |
| doors closed | the captain accepts the load |  |
| the captain accepts the load | boarded |  |
| get the boarding list | flight held | error |

## Airport operations › Boarding procedure › Find the missing

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| count again | assign |  |
| nod_findEnd | end |  |
| nod_findStart | start |  |
| page the passenger | call |  |
| three minutes | wait |  |

| From | To | What |
| --- | --- | --- |
| start | page the passenger |  |
| page the passenger | three minutes |  |
| three minutes | count again |  |
| count again | end |  |

## Airport operations › Boarding procedure › Board one passenger

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| boarded | emit |  |
| check them in at the gate | call |  |
| nod_oneEnd | end |  |
| nod_oneStart | start |  |
| valid for this flight? | if |  |
| scan the boarding pass | call |  |
| why not? | switch |  |
| send them to the right gate | call |  |

| From | To | What |
| --- | --- | --- |
| start | scan the boarding pass |  |
| scan the boarding pass | valid for this flight? |  |
| valid for this flight? | boarded | true |
| valid for this flight? | why not? | false |
| why not? | send them to the right gate | wrongGate |
| why not? | check them in at the gate | notCheckedIn |
| why not? | end | default |
| boarded | end |  |
| send them to the right gate | end |  |
| check them in at the gate | end |  |

## Airport operations › Boarding procedure › Offload the no-shows' bags

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| each bag | forEach |  |
| find their bags | call |  |
| nod_offloadEnd | end |  |
| nod_offloadStart | start |  |
| bags offloaded | emit |  |

| From | To | What |
| --- | --- | --- |
| start | find their bags |  |
| find their bags | each bag |  |
| each bag | bags offloaded |  |
| bags offloaded | end |  |

## Airport operations › Boarding procedure › Offload the no-shows' bags › Offload one bag

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| nod_bagOutEnd | end |  |
| nod_bagOutStart | start |  |
| find it in the hold | call |  |

| From | To | What |
| --- | --- | --- |
| start | find it in the hold |  |
| find it in the hold | end |  |

## Airport operations › Border check

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| nod_borderEnd | end |  |
| nod_borderStart | start |  |
| check the visa | call |  |
| e-gate | call |  |
| an officer checks | call |  |
| refused entry | end |  |
| secondary inspection | subflow |  |
| cleared | emit |  |
| which document? | switch |  |
| visa needed? | if |  |
| on a watch list? | if |  |

| From | To | What |
| --- | --- | --- |
| start | which document? |  |
| which document? | e-gate | biometricPassport |
| which document? | an officer checks | default |
| e-gate | an officer checks | error |
| e-gate | on a watch list? |  |
| an officer checks | visa needed? |  |
| visa needed? | check the visa | true |
| visa needed? | on a watch list? | false |
| check the visa | on a watch list? |  |
| on a watch list? | secondary inspection | true |
| on a watch list? | cleared | false |
| secondary inspection | cleared |  |
| secondary inspection | refused entry | error |
| cleared | end |  |

## Airport operations › Border check › Secondary inspection

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| customs check | call |  |
| interview | call |  |
| nod_secondEnd | end |  |
| nod_secondStart | start |  |

| From | To | What |
| --- | --- | --- |
| start | interview |  |
| interview | customs check |  |
| customs check | end |  |

## Airport operations › Check-in halls

*system*

Common-use check-in: any airline at any desk, through the CUPPS platform.

| Element | Kind | Notes |
| --- | --- | --- |
| Common-use platform | service | CUPPS · IATA RP 1797 |
| Terminal A hall | service | 72 desks · 24 kiosks · 12 drops |
| Terminal B hall | service | 72 desks · 24 kiosks · 12 drops |
| Terminal C hall | service | 72 desks · 24 kiosks · 12 drops |
| Terminal D hall | service | opens 2027 · 60 desks · proposed |
| Belt network | ref |  |
| Airline DCS | ref |  |

| From | To | What |
| --- | --- | --- |
| Terminal D hall | Common-use platform | command |
| Terminal D hall | Belt network |  |
| Common-use platform | Airline DCS |  |
| Terminal A hall | Common-use platform | command |
| Terminal A hall | Belt network |  |
| Terminal B hall | Common-use platform | command |
| Terminal B hall | Belt network |  |
| Terminal C hall | Common-use platform | command |
| Terminal C hall | Belt network |  |

## Airport operations › Check-in halls › Terminal A hall

*system*

| Element | Kind | Notes |
| --- | --- | --- |
| Desk A1 | service | premium |
| Desk A10 | service |  |
| Desk A11 | service |  |
| Desk A12 | service | special assistance |
| Desk A2 | service |  |
| Desk A3 | service |  |
| Desk A4 | service |  |
| Desk A5 | service |  |
| Desk A6 | service |  |
| Desk A7 | service |  |
| Desk A8 | service |  |
| Desk A9 | service |  |
| Desk A13 | service | premium |
| Desk A22 | service |  |
| Desk A23 | service |  |
| Desk A24 | service | special assistance |
| Desk A14 | service |  |
| Desk A15 | service |  |
| Desk A16 | service |  |
| Desk A17 | service |  |
| Desk A18 | service |  |
| Desk A19 | service |  |
| Desk A20 | service |  |
| Desk A21 | service |  |
| Desk A25 | service | premium |
| Desk A34 | service |  |
| Desk A35 | service |  |
| Desk A36 | service | special assistance |
| Desk A26 | service |  |
| Desk A27 | service |  |
| Desk A28 | service |  |
| Desk A29 | service |  |
| Desk A30 | service |  |
| Desk A31 | service |  |
| Desk A32 | service |  |
| Desk A33 | service |  |
| Desk A37 | service | premium |
| Desk A46 | service |  |
| Desk A47 | service |  |
| Desk A48 | service | special assistance |
| Desk A38 | service |  |
| Desk A39 | service |  |
| Desk A40 | service |  |
| Desk A41 | service |  |
| Desk A42 | service |  |
| Desk A43 | service |  |
| Desk A44 | service |  |
| Desk A45 | service |  |
| Desk A49 | service | premium |
| Desk A58 | service |  |
| Desk A59 | service |  |
| Desk A60 | service | special assistance |
| Desk A50 | service |  |
| Desk A51 | service |  |
| Desk A52 | service |  |
| Desk A53 | service |  |
| Desk A54 | service |  |
| Desk A55 | service |  |
| Desk A56 | service |  |
| Desk A57 | service |  |
| Desk A61 | service | premium |
| Desk A70 | service |  |
| Desk A71 | service |  |
| Desk A72 | service | special assistance |
| Desk A62 | service |  |
| Desk A63 | service |  |
| Desk A64 | service |  |
| Desk A65 | service |  |
| Desk A66 | service |  |
| Desk A67 | service |  |
| Desk A68 | service |  |
| Desk A69 | service |  |
| Desk rows | service | rows 1–6 |
| Bag drop A1 | service | self-service · 3 units |
| Bag drop A2 | service | self-service · 3 units |
| Bag drop A3 | service | self-service · 3 units |
| Bag drop A4 | service | self-service · 3 units |
| Kiosk cluster A1 | service | 4 kiosks |
| Kiosk cluster A2 | service | 4 kiosks |
| Kiosk cluster A3 | service | 4 kiosks |
| Kiosk cluster A4 | service | 4 kiosks |
| Kiosk cluster A5 | service | 4 kiosks |
| Kiosk cluster A6 | service | 4 kiosks |
| Common-use platform | ref |  |
| Row A1 | service | 12 desks |
| Row A2 | service | 12 desks |
| Row A3 | service | 12 desks |
| Row A4 | service | 12 desks |
| Row A5 | service | 12 desks |
| Row A6 | service | 12 desks |
| Passenger | actor |  |

| From | To | What |
| --- | --- | --- |
| Desk rows | Common-use platform |  |
| Desk rows | Row A1 | command |
| Row A1 | Desk A1 | command |
| Row A1 | Desk A2 | command |
| Row A1 | Desk A3 | command |
| Row A1 | Desk A4 | command |
| Row A1 | Desk A5 | command |
| Row A1 | Desk A6 | command |
| Row A1 | Desk A7 | command |
| Row A1 | Desk A8 | command |
| Row A1 | Desk A9 | command |
| Row A1 | Desk A10 | command |
| Row A1 | Desk A11 | command |
| Row A1 | Desk A12 | command |
| Desk rows | Row A2 | command |
| Row A2 | Desk A13 | command |
| Row A2 | Desk A14 | command |
| Row A2 | Desk A15 | command |
| Row A2 | Desk A16 | command |
| Row A2 | Desk A17 | command |
| Row A2 | Desk A18 | command |
| Row A2 | Desk A19 | command |
| Row A2 | Desk A20 | command |
| Row A2 | Desk A21 | command |
| Row A2 | Desk A22 | command |
| Row A2 | Desk A23 | command |
| Row A2 | Desk A24 | command |
| Desk rows | Row A3 | command |
| Row A3 | Desk A25 | command |
| Row A3 | Desk A26 | command |
| Row A3 | Desk A27 | command |
| Row A3 | Desk A28 | command |
| Row A3 | Desk A29 | command |
| Row A3 | Desk A30 | command |
| Row A3 | Desk A31 | command |
| Row A3 | Desk A32 | command |
| Row A3 | Desk A33 | command |
| Row A3 | Desk A34 | command |
| Row A3 | Desk A35 | command |
| Row A3 | Desk A36 | command |
| Desk rows | Row A4 | command |
| Row A4 | Desk A37 | command |
| Row A4 | Desk A38 | command |
| Row A4 | Desk A39 | command |
| Row A4 | Desk A40 | command |
| Row A4 | Desk A41 | command |
| Row A4 | Desk A42 | command |
| Row A4 | Desk A43 | command |
| Row A4 | Desk A44 | command |
| Row A4 | Desk A45 | command |
| Row A4 | Desk A46 | command |
| Row A4 | Desk A47 | command |
| Row A4 | Desk A48 | command |
| Desk rows | Row A5 | command |
| Row A5 | Desk A49 | command |
| Row A5 | Desk A50 | command |
| Row A5 | Desk A51 | command |
| Row A5 | Desk A52 | command |
| Row A5 | Desk A53 | command |
| Row A5 | Desk A54 | command |
| Row A5 | Desk A55 | command |
| Row A5 | Desk A56 | command |
| Row A5 | Desk A57 | command |
| Row A5 | Desk A58 | command |
| Row A5 | Desk A59 | command |
| Row A5 | Desk A60 | command |
| Desk rows | Row A6 | command |
| Row A6 | Desk A61 | command |
| Row A6 | Desk A62 | command |
| Row A6 | Desk A63 | command |
| Row A6 | Desk A64 | command |
| Row A6 | Desk A65 | command |
| Row A6 | Desk A66 | command |
| Row A6 | Desk A67 | command |
| Row A6 | Desk A68 | command |
| Row A6 | Desk A69 | command |
| Row A6 | Desk A70 | command |
| Row A6 | Desk A71 | command |
| Row A6 | Desk A72 | command |
| Kiosk cluster A1 | Common-use platform |  |
| Kiosk cluster A2 | Common-use platform |  |
| Kiosk cluster A3 | Common-use platform |  |
| Kiosk cluster A4 | Common-use platform |  |
| Kiosk cluster A5 | Common-use platform |  |
| Kiosk cluster A6 | Common-use platform |  |
| Bag drop A1 | Common-use platform |  |
| Bag drop A2 | Common-use platform |  |
| Bag drop A3 | Common-use platform |  |
| Bag drop A4 | Common-use platform |  |
| Passenger | Desk rows | command |

## Airport operations › Check-in halls › Terminal B hall

*system*

| Element | Kind | Notes |
| --- | --- | --- |
| Desk B1 | service | premium |
| Desk B10 | service |  |
| Desk B11 | service |  |
| Desk B12 | service | special assistance |
| Desk B2 | service |  |
| Desk B3 | service |  |
| Desk B4 | service |  |
| Desk B5 | service |  |
| Desk B6 | service |  |
| Desk B7 | service |  |
| Desk B8 | service |  |
| Desk B9 | service |  |
| Desk B13 | service | premium |
| Desk B22 | service |  |
| Desk B23 | service |  |
| Desk B24 | service | special assistance |
| Desk B14 | service |  |
| Desk B15 | service |  |
| Desk B16 | service |  |
| Desk B17 | service |  |
| Desk B18 | service |  |
| Desk B19 | service |  |
| Desk B20 | service |  |
| Desk B21 | service |  |
| Desk B25 | service | premium |
| Desk B34 | service |  |
| Desk B35 | service |  |
| Desk B36 | service | special assistance |
| Desk B26 | service |  |
| Desk B27 | service |  |
| Desk B28 | service |  |
| Desk B29 | service |  |
| Desk B30 | service |  |
| Desk B31 | service |  |
| Desk B32 | service |  |
| Desk B33 | service |  |
| Desk B37 | service | premium |
| Desk B46 | service |  |
| Desk B47 | service |  |
| Desk B48 | service | special assistance |
| Desk B38 | service |  |
| Desk B39 | service |  |
| Desk B40 | service |  |
| Desk B41 | service |  |
| Desk B42 | service |  |
| Desk B43 | service |  |
| Desk B44 | service |  |
| Desk B45 | service |  |
| Desk B49 | service | premium |
| Desk B58 | service |  |
| Desk B59 | service |  |
| Desk B60 | service | special assistance |
| Desk B50 | service |  |
| Desk B51 | service |  |
| Desk B52 | service |  |
| Desk B53 | service |  |
| Desk B54 | service |  |
| Desk B55 | service |  |
| Desk B56 | service |  |
| Desk B57 | service |  |
| Desk B61 | service | premium |
| Desk B70 | service |  |
| Desk B71 | service |  |
| Desk B72 | service | special assistance |
| Desk B62 | service |  |
| Desk B63 | service |  |
| Desk B64 | service |  |
| Desk B65 | service |  |
| Desk B66 | service |  |
| Desk B67 | service |  |
| Desk B68 | service |  |
| Desk B69 | service |  |
| Desk rows | service | rows 1–6 |
| Bag drop B1 | service | self-service · 3 units |
| Bag drop B2 | service | self-service · 3 units |
| Bag drop B3 | service | self-service · 3 units |
| Bag drop B4 | service | self-service · 3 units |
| Kiosk cluster B1 | service | 4 kiosks |
| Kiosk cluster B2 | service | 4 kiosks |
| Kiosk cluster B3 | service | 4 kiosks |
| Kiosk cluster B4 | service | 4 kiosks |
| Kiosk cluster B5 | service | 4 kiosks |
| Kiosk cluster B6 | service | 4 kiosks |
| Common-use platform | ref |  |
| Row B1 | service | 12 desks |
| Row B2 | service | 12 desks |
| Row B3 | service | 12 desks |
| Row B4 | service | 12 desks |
| Row B5 | service | 12 desks |
| Row B6 | service | 12 desks |
| Passenger | actor |  |

| From | To | What |
| --- | --- | --- |
| Desk rows | Common-use platform |  |
| Desk rows | Row B1 | command |
| Row B1 | Desk B1 | command |
| Row B1 | Desk B2 | command |
| Row B1 | Desk B3 | command |
| Row B1 | Desk B4 | command |
| Row B1 | Desk B5 | command |
| Row B1 | Desk B6 | command |
| Row B1 | Desk B7 | command |
| Row B1 | Desk B8 | command |
| Row B1 | Desk B9 | command |
| Row B1 | Desk B10 | command |
| Row B1 | Desk B11 | command |
| Row B1 | Desk B12 | command |
| Desk rows | Row B2 | command |
| Row B2 | Desk B13 | command |
| Row B2 | Desk B14 | command |
| Row B2 | Desk B15 | command |
| Row B2 | Desk B16 | command |
| Row B2 | Desk B17 | command |
| Row B2 | Desk B18 | command |
| Row B2 | Desk B19 | command |
| Row B2 | Desk B20 | command |
| Row B2 | Desk B21 | command |
| Row B2 | Desk B22 | command |
| Row B2 | Desk B23 | command |
| Row B2 | Desk B24 | command |
| Desk rows | Row B3 | command |
| Row B3 | Desk B25 | command |
| Row B3 | Desk B26 | command |
| Row B3 | Desk B27 | command |
| Row B3 | Desk B28 | command |
| Row B3 | Desk B29 | command |
| Row B3 | Desk B30 | command |
| Row B3 | Desk B31 | command |
| Row B3 | Desk B32 | command |
| Row B3 | Desk B33 | command |
| Row B3 | Desk B34 | command |
| Row B3 | Desk B35 | command |
| Row B3 | Desk B36 | command |
| Desk rows | Row B4 | command |
| Row B4 | Desk B37 | command |
| Row B4 | Desk B38 | command |
| Row B4 | Desk B39 | command |
| Row B4 | Desk B40 | command |
| Row B4 | Desk B41 | command |
| Row B4 | Desk B42 | command |
| Row B4 | Desk B43 | command |
| Row B4 | Desk B44 | command |
| Row B4 | Desk B45 | command |
| Row B4 | Desk B46 | command |
| Row B4 | Desk B47 | command |
| Row B4 | Desk B48 | command |
| Desk rows | Row B5 | command |
| Row B5 | Desk B49 | command |
| Row B5 | Desk B50 | command |
| Row B5 | Desk B51 | command |
| Row B5 | Desk B52 | command |
| Row B5 | Desk B53 | command |
| Row B5 | Desk B54 | command |
| Row B5 | Desk B55 | command |
| Row B5 | Desk B56 | command |
| Row B5 | Desk B57 | command |
| Row B5 | Desk B58 | command |
| Row B5 | Desk B59 | command |
| Row B5 | Desk B60 | command |
| Desk rows | Row B6 | command |
| Row B6 | Desk B61 | command |
| Row B6 | Desk B62 | command |
| Row B6 | Desk B63 | command |
| Row B6 | Desk B64 | command |
| Row B6 | Desk B65 | command |
| Row B6 | Desk B66 | command |
| Row B6 | Desk B67 | command |
| Row B6 | Desk B68 | command |
| Row B6 | Desk B69 | command |
| Row B6 | Desk B70 | command |
| Row B6 | Desk B71 | command |
| Row B6 | Desk B72 | command |
| Kiosk cluster B1 | Common-use platform |  |
| Kiosk cluster B2 | Common-use platform |  |
| Kiosk cluster B3 | Common-use platform |  |
| Kiosk cluster B4 | Common-use platform |  |
| Kiosk cluster B5 | Common-use platform |  |
| Kiosk cluster B6 | Common-use platform |  |
| Bag drop B1 | Common-use platform |  |
| Bag drop B2 | Common-use platform |  |
| Bag drop B3 | Common-use platform |  |
| Bag drop B4 | Common-use platform |  |
| Passenger | Desk rows | command |

## Airport operations › Check-in halls › Terminal C hall

*system*

| Element | Kind | Notes |
| --- | --- | --- |
| Desk C1 | service | premium |
| Desk C10 | service |  |
| Desk C11 | service |  |
| Desk C12 | service | special assistance |
| Desk C2 | service |  |
| Desk C3 | service |  |
| Desk C4 | service |  |
| Desk C5 | service |  |
| Desk C6 | service |  |
| Desk C7 | service |  |
| Desk C8 | service |  |
| Desk C9 | service |  |
| Desk C13 | service | premium |
| Desk C22 | service |  |
| Desk C23 | service |  |
| Desk C24 | service | special assistance |
| Desk C14 | service |  |
| Desk C15 | service |  |
| Desk C16 | service |  |
| Desk C17 | service |  |
| Desk C18 | service |  |
| Desk C19 | service |  |
| Desk C20 | service |  |
| Desk C21 | service |  |
| Desk C25 | service | premium |
| Desk C34 | service |  |
| Desk C35 | service |  |
| Desk C36 | service | special assistance |
| Desk C26 | service |  |
| Desk C27 | service |  |
| Desk C28 | service |  |
| Desk C29 | service |  |
| Desk C30 | service |  |
| Desk C31 | service |  |
| Desk C32 | service |  |
| Desk C33 | service |  |
| Desk C37 | service | premium |
| Desk C46 | service |  |
| Desk C47 | service |  |
| Desk C48 | service | special assistance |
| Desk C38 | service |  |
| Desk C39 | service |  |
| Desk C40 | service |  |
| Desk C41 | service |  |
| Desk C42 | service |  |
| Desk C43 | service |  |
| Desk C44 | service |  |
| Desk C45 | service |  |
| Desk C49 | service | premium |
| Desk C58 | service |  |
| Desk C59 | service |  |
| Desk C60 | service | special assistance |
| Desk C50 | service |  |
| Desk C51 | service |  |
| Desk C52 | service |  |
| Desk C53 | service |  |
| Desk C54 | service |  |
| Desk C55 | service |  |
| Desk C56 | service |  |
| Desk C57 | service |  |
| Desk C61 | service | premium |
| Desk C70 | service |  |
| Desk C71 | service |  |
| Desk C72 | service | special assistance |
| Desk C62 | service |  |
| Desk C63 | service |  |
| Desk C64 | service |  |
| Desk C65 | service |  |
| Desk C66 | service |  |
| Desk C67 | service |  |
| Desk C68 | service |  |
| Desk C69 | service |  |
| Desk rows | service | rows 1–6 |
| Bag drop C1 | service | self-service · 3 units |
| Bag drop C2 | service | self-service · 3 units |
| Bag drop C3 | service | self-service · 3 units |
| Bag drop C4 | service | self-service · 3 units |
| Kiosk cluster C1 | service | 4 kiosks |
| Kiosk cluster C2 | service | 4 kiosks |
| Kiosk cluster C3 | service | 4 kiosks |
| Kiosk cluster C4 | service | 4 kiosks |
| Kiosk cluster C5 | service | 4 kiosks |
| Kiosk cluster C6 | service | 4 kiosks |
| Common-use platform | ref |  |
| Row C1 | service | 12 desks |
| Row C2 | service | 12 desks |
| Row C3 | service | 12 desks |
| Row C4 | service | 12 desks |
| Row C5 | service | 12 desks |
| Row C6 | service | 12 desks |
| Passenger | actor |  |

| From | To | What |
| --- | --- | --- |
| Row C5 | Desk C52 | command |
| Row C5 | Desk C53 | command |
| Row C5 | Desk C54 | command |
| Row C5 | Desk C55 | command |
| Row C5 | Desk C56 | command |
| Row C5 | Desk C57 | command |
| Row C5 | Desk C58 | command |
| Row C5 | Desk C59 | command |
| Row C5 | Desk C60 | command |
| Desk rows | Row C6 | command |
| Row C6 | Desk C61 | command |
| Row C6 | Desk C62 | command |
| Row C6 | Desk C63 | command |
| Row C6 | Desk C64 | command |
| Row C6 | Desk C65 | command |
| Row C6 | Desk C66 | command |
| Row C6 | Desk C67 | command |
| Row C6 | Desk C68 | command |
| Row C6 | Desk C69 | command |
| Row C6 | Desk C70 | command |
| Row C6 | Desk C71 | command |
| Row C6 | Desk C72 | command |
| Kiosk cluster C1 | Common-use platform |  |
| Kiosk cluster C2 | Common-use platform |  |
| Kiosk cluster C3 | Common-use platform |  |
| Kiosk cluster C4 | Common-use platform |  |
| Kiosk cluster C5 | Common-use platform |  |
| Kiosk cluster C6 | Common-use platform |  |
| Bag drop C1 | Common-use platform |  |
| Bag drop C2 | Common-use platform |  |
| Bag drop C3 | Common-use platform |  |
| Bag drop C4 | Common-use platform |  |
| Passenger | Desk rows | command |
| Desk rows | Common-use platform |  |
| Desk rows | Row C1 | command |
| Row C1 | Desk C1 | command |
| Row C1 | Desk C2 | command |
| Row C1 | Desk C3 | command |
| Row C1 | Desk C4 | command |
| Row C1 | Desk C5 | command |
| Row C1 | Desk C6 | command |
| Row C1 | Desk C7 | command |
| Row C1 | Desk C8 | command |
| Row C1 | Desk C9 | command |
| Row C1 | Desk C10 | command |
| Row C1 | Desk C11 | command |
| Row C1 | Desk C12 | command |
| Desk rows | Row C2 | command |
| Row C2 | Desk C13 | command |
| Row C2 | Desk C14 | command |
| Row C2 | Desk C15 | command |
| Row C2 | Desk C16 | command |
| Row C2 | Desk C17 | command |
| Row C2 | Desk C18 | command |
| Row C2 | Desk C19 | command |
| Row C2 | Desk C20 | command |
| Row C2 | Desk C21 | command |
| Row C2 | Desk C22 | command |
| Row C2 | Desk C23 | command |
| Row C2 | Desk C24 | command |
| Desk rows | Row C3 | command |
| Row C3 | Desk C25 | command |
| Row C3 | Desk C26 | command |
| Row C3 | Desk C27 | command |
| Row C3 | Desk C28 | command |
| Row C3 | Desk C29 | command |
| Row C3 | Desk C30 | command |
| Row C3 | Desk C31 | command |
| Row C3 | Desk C32 | command |
| Row C3 | Desk C33 | command |
| Row C3 | Desk C34 | command |
| Row C3 | Desk C35 | command |
| Row C3 | Desk C36 | command |
| Desk rows | Row C4 | command |
| Row C4 | Desk C37 | command |
| Row C4 | Desk C38 | command |
| Row C4 | Desk C39 | command |
| Row C4 | Desk C40 | command |
| Row C4 | Desk C41 | command |
| Row C4 | Desk C42 | command |
| Row C4 | Desk C43 | command |
| Row C4 | Desk C44 | command |
| Row C4 | Desk C45 | command |
| Row C4 | Desk C46 | command |
| Row C4 | Desk C47 | command |
| Row C4 | Desk C48 | command |
| Desk rows | Row C5 | command |
| Row C5 | Desk C49 | command |
| Row C5 | Desk C50 | command |
| Row C5 | Desk C51 | command |

## Airport operations › Check-in halls › Terminal D hall

*system*

| Element | Kind | Notes |
| --- | --- | --- |
| Desk D1 | service | premium |
| Desk D10 | service |  |
| Desk D11 | service |  |
| Desk D12 | service | special assistance |
| Desk D2 | service |  |
| Desk D3 | service |  |
| Desk D4 | service |  |
| Desk D5 | service |  |
| Desk D6 | service |  |
| Desk D7 | service |  |
| Desk D8 | service |  |
| Desk D9 | service |  |
| Desk D13 | service | premium |
| Desk D22 | service |  |
| Desk D23 | service |  |
| Desk D24 | service | special assistance |
| Desk D14 | service |  |
| Desk D15 | service |  |
| Desk D16 | service |  |
| Desk D17 | service |  |
| Desk D18 | service |  |
| Desk D19 | service |  |
| Desk D20 | service |  |
| Desk D21 | service |  |
| Desk D25 | service | premium |
| Desk D34 | service |  |
| Desk D35 | service |  |
| Desk D36 | service | special assistance |
| Desk D26 | service |  |
| Desk D27 | service |  |
| Desk D28 | service |  |
| Desk D29 | service |  |
| Desk D30 | service |  |
| Desk D31 | service |  |
| Desk D32 | service |  |
| Desk D33 | service |  |
| Desk D37 | service | premium |
| Desk D46 | service |  |
| Desk D47 | service |  |
| Desk D48 | service | special assistance |
| Desk D38 | service |  |
| Desk D39 | service |  |
| Desk D40 | service |  |
| Desk D41 | service |  |
| Desk D42 | service |  |
| Desk D43 | service |  |
| Desk D44 | service |  |
| Desk D45 | service |  |
| Desk D49 | service | premium |
| Desk D58 | service |  |
| Desk D59 | service |  |
| Desk D60 | service | special assistance |
| Desk D50 | service |  |
| Desk D51 | service |  |
| Desk D52 | service |  |
| Desk D53 | service |  |
| Desk D54 | service |  |
| Desk D55 | service |  |
| Desk D56 | service |  |
| Desk D57 | service |  |
| Desk D61 | service | premium |
| Desk D70 | service |  |
| Desk D71 | service |  |
| Desk D72 | service | special assistance |
| Desk D62 | service |  |
| Desk D63 | service |  |
| Desk D64 | service |  |
| Desk D65 | service |  |
| Desk D66 | service |  |
| Desk D67 | service |  |
| Desk D68 | service |  |
| Desk D69 | service |  |
| Desk rows | service | rows 1–6 |
| Bag drop D1 | service | self-service · 3 units |
| Bag drop D2 | service | self-service · 3 units |
| Bag drop D3 | service | self-service · 3 units |
| Bag drop D4 | service | self-service · 3 units |
| Kiosk cluster D1 | service | 4 kiosks |
| Kiosk cluster D2 | service | 4 kiosks |
| Kiosk cluster D3 | service | 4 kiosks |
| Kiosk cluster D4 | service | 4 kiosks |
| Kiosk cluster D5 | service | 4 kiosks |
| Kiosk cluster D6 | service | 4 kiosks |
| Common-use platform | ref |  |
| Row D1 | service | 12 desks |
| Row D2 | service | 12 desks |
| Row D3 | service | 12 desks |
| Row D4 | service | 12 desks |
| Row D5 | service | 12 desks |
| Row D6 | service | 12 desks |
| Passenger | actor |  |

| From | To | What |
| --- | --- | --- |
| Desk rows | Common-use platform |  |
| Desk rows | Row D1 | command |
| Row D1 | Desk D1 | command |
| Row D1 | Desk D2 | command |
| Row D1 | Desk D3 | command |
| Row D1 | Desk D4 | command |
| Row D1 | Desk D5 | command |
| Row D1 | Desk D6 | command |
| Row D1 | Desk D7 | command |
| Row D1 | Desk D8 | command |
| Row D1 | Desk D9 | command |
| Row D1 | Desk D10 | command |
| Row D1 | Desk D11 | command |
| Row D1 | Desk D12 | command |
| Desk rows | Row D2 | command |
| Row D2 | Desk D13 | command |
| Row D2 | Desk D14 | command |
| Row D2 | Desk D15 | command |
| Row D2 | Desk D16 | command |
| Row D2 | Desk D17 | command |
| Row D2 | Desk D18 | command |
| Row D2 | Desk D19 | command |
| Row D2 | Desk D20 | command |
| Row D2 | Desk D21 | command |
| Row D2 | Desk D22 | command |
| Row D2 | Desk D23 | command |
| Row D2 | Desk D24 | command |
| Desk rows | Row D3 | command |
| Row D3 | Desk D25 | command |
| Row D3 | Desk D26 | command |
| Row D3 | Desk D27 | command |
| Row D3 | Desk D28 | command |
| Row D3 | Desk D29 | command |
| Row D3 | Desk D30 | command |
| Row D3 | Desk D31 | command |
| Row D3 | Desk D32 | command |
| Row D3 | Desk D33 | command |
| Row D3 | Desk D34 | command |
| Row D3 | Desk D35 | command |
| Row D3 | Desk D36 | command |
| Desk rows | Row D4 | command |
| Row D4 | Desk D37 | command |
| Row D4 | Desk D38 | command |
| Row D4 | Desk D39 | command |
| Row D4 | Desk D40 | command |
| Row D4 | Desk D41 | command |
| Row D4 | Desk D42 | command |
| Row D4 | Desk D43 | command |
| Row D4 | Desk D44 | command |
| Row D4 | Desk D45 | command |
| Row D4 | Desk D46 | command |
| Row D4 | Desk D47 | command |
| Row D4 | Desk D48 | command |
| Desk rows | Row D5 | command |
| Row D5 | Desk D49 | command |
| Row D5 | Desk D50 | command |
| Row D5 | Desk D51 | command |
| Row D5 | Desk D52 | command |
| Row D5 | Desk D53 | command |
| Row D5 | Desk D54 | command |
| Row D5 | Desk D55 | command |
| Row D5 | Desk D56 | command |
| Row D5 | Desk D57 | command |
| Row D5 | Desk D58 | command |
| Row D5 | Desk D59 | command |
| Row D5 | Desk D60 | command |
| Desk rows | Row D6 | command |
| Row D6 | Desk D61 | command |
| Row D6 | Desk D62 | command |
| Row D6 | Desk D63 | command |
| Row D6 | Desk D64 | command |
| Row D6 | Desk D65 | command |
| Row D6 | Desk D66 | command |
| Row D6 | Desk D67 | command |
| Row D6 | Desk D68 | command |
| Row D6 | Desk D69 | command |
| Row D6 | Desk D70 | command |
| Row D6 | Desk D71 | command |
| Row D6 | Desk D72 | command |
| Kiosk cluster D1 | Common-use platform |  |
| Kiosk cluster D2 | Common-use platform |  |
| Kiosk cluster D3 | Common-use platform |  |
| Kiosk cluster D4 | Common-use platform |  |
| Kiosk cluster D5 | Common-use platform |  |
| Kiosk cluster D6 | Common-use platform |  |
| Bag drop D1 | Common-use platform |  |
| Bag drop D2 | Common-use platform |  |
| Bag drop D3 | Common-use platform |  |
| Bag drop D4 | Common-use platform |  |
| Passenger | Desk rows | command |

## Airport operations › Cabin cleaning

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| cabin clean | emit |  |
| nod_cleanEnd | end |  |
| which clean? | switch |  |
| nod_cleanStart | start |  |
| deep clean | call |  |
| full clean | call |  |
| quick clean | call |  |

| From | To | What |
| --- | --- | --- |
| start | which clean? |  |
| which clean? | quick clean | under 35 |
| which clean? | full clean | 35 to 90 |
| which clean? | deep clean | night stop |
| quick clean | cabin clean |  |
| full clean | cabin clean |  |
| deep clean | cabin clean |  |
| which clean? | quick clean | default |
| cabin clean | end |  |

## Airport operations › De-icing

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| conditions? | switch |  |
| holdover time left? | if |  |
| again | end |  |
| de-icing completed | emit |  |
| nod_iceEnd | end |  |
| nod_iceStart | start |  |
| spray the left wing | call |  |
| a pad is free | wait |  |
| read the weather | call |  |
| spray the right wing | call |  |
| both wings | parallel |  |
| nod_sprayed | join |  |
| type I then IV | assign |  |
| type I only | assign |  |

| From | To | What |
| --- | --- | --- |
| start | read the weather |  |
| read the weather | conditions? |  |
| conditions? | type I only | frost |
| conditions? | type I then IV | snow |
| conditions? | type I then IV | freezingRain |
| conditions? | type I only | default |
| type I only | a pad is free |  |
| type I then IV | a pad is free |  |
| a pad is free | both wings |  |
| both wings | spray the left wing |  |
| both wings | spray the right wing |  |
| spray the left wing | join |  |
| spray the right wing | join |  |
| join | holdover time left? |  |
| holdover time left? | de-icing completed | true |
| holdover time left? | again | false |
| de-icing completed | end |  |

## Airport operations › Emergency desk

*mixed*

The airport emergency plan: alert levels, the call-out, and who comes.

| Element | Kind | Notes |
| --- | --- | --- |
| aircraft accident | state |  |
| fire and rescue | emit |  |
| the hospitals | call |  |
| call out | parallel |  |
| nod_callOutEnd | end |  |
| nod_callOutStart | start |  |
| the police | call |  |
| nod_calledOut | join |  |
| Fire station | service |  |
| full emergency | state |  |
| nod_incidentStart | initial |  |
| local standby | state |  |
| stand down | state |  |
| Tower | external |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | local standby |  |  |  |
| local standby | full emergency | emergency.escalated |  |  |
| full emergency | aircraft accident | aircraft.accident |  |  |
| local standby | stand down | aircraft.landedSafely |  |  |
| full emergency | stand down | aircraft.landedSafely |  |  |
| aircraft accident | stand down | emergency.closed |  |  |
| start | call out |  |  |  |
| call out | fire and rescue |  |  |  |
| call out | the hospitals |  |  |  |
| call out | the police |  |  |  |
| fire and rescue | join |  |  |  |
| the hospitals | join |  |  |  |
| the police | join |  |  |  |
| join | end |  |  |  |
| Tower | Fire station | crash alarm |  |  |

| From | Role | To | About |
| --- | --- | --- | --- |
| Tower | sends | emergency.escalated |  |
| Tower | sends | aircraft.accident |  |

## Airport operations › Flight lifecycle

*machine · target · subject `flight.status` · transitions complete*

A departure, from the published schedule to the hand-off to approach control.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| airborne |  |  | enters Climb out |
| boarding |  |  | enters Boarding phases |
| cancelled |  | failure, terminal |  |
| check-in closed |  |  |  |
| check-in open |  |  |  |
| de-icing |  |  |  |
| delayed |  |  |  |
| departed |  | success, terminal |  |
| diverted |  | stopped, terminal |  |
| doors closed |  |  |  |
| pushed back |  |  |  |
| ready for pushback |  |  |  |
| returning to stand |  |  |  |
| scheduled |  |  |  |
| slot confirmed |  |  |  |
| stand allocated |  |  |  |
| taxiing out |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | scheduled |  |  |  |
| POST /flights | scheduled |  |  | action Publish to displays |
| scheduled | slot confirmed | ctot.issued |  |  |
| slot confirmed | slot confirmed | ctot revised |  |  |
| slot confirmed | stand allocated | stand.allocated |  |  |
| stand allocated | check-in open | check-in opens |  | action Publish to displays; assign context.gate |
| check-in open | check-in closed | check-in closes |  |  |
| check-in closed | boarding | boarding.started |  |  |
| boarding | doors closed | doors.closed |  |  |
| doors closed | icing conditions? | always |  |  |
| icing conditions? | de-icing | [Icing conditions] | Icing conditions | action Request de-icing |
| icing conditions? | ready for pushback | else |  |  |
| de-icing | ready for pushback | deicing.completed |  |  |
| ready for pushback | pushed back | aircraft.offBlock |  |  |
| pushed back | taxiing out | taxi.started |  |  |
| taxiing out | airborne | aircraft.airborne |  |  |
| taxiing out | returning to stand | aircraft.returning |  |  |
| taxiing out | delayed | 40 min at the holding point |  |  |
| returning to stand | stand allocated | aircraft.onBlock |  | action Notify passengers |
| airborne | departed | done |  | action Charge the movement |
| airborne | diverted | flight.diverted |  |  |
| scheduled | delayed | flight.delayed |  | action Notify passengers |
| slot confirmed | delayed | flight.delayed |  | action Notify passengers |
| stand allocated | delayed | flight.delayed |  | action Notify passengers |
| check-in open | delayed | flight.delayed |  | action Notify passengers |
| check-in closed | delayed | flight.delayed |  | action Notify passengers |
| delayed | slot confirmed | ctot.revised |  | action Publish to displays |
| any status | cancelled | flight.cancelled |  | action Notify passengers; action Release the stand |

| From | Role | To | About |
| --- | --- | --- | --- |
| [Icing conditions] | is for | Ground handler | Request de-icing |
| aircraft.onBlock | runs | Notify passengers |  |
| flight.delayed | runs | Notify passengers |  |
| flight.delayed | runs | Notify passengers |  |
| flight.delayed | runs | Notify passengers |  |
| flight.delayed | runs | Notify passengers |  |
| flight.delayed | runs | Notify passengers |  |
| flight.cancelled | runs | Notify passengers |  |
| Airline | sends | flight.cancelled |  |
| Airline | sends | POST /flights |  |
| Air traffic control | sends | aircraft.offBlock |  |
| Air traffic control | sends | aircraft.airborne |  |
| Ground handler | sends | boarding.started |  |
| Ground handler | sends | deicing.completed |  |

### Scenario: A delay, then a new slot

A delay while check-in is open; the network manager revises the slot and the flight goes on.

Starts 2026-10-01T06:00:00Z.

1. ctot.issued
2. stand.allocated
3. wait for the next timer
4. flight.delayed
5. ctot.revised

### Scenario: A departure on time

From the schedule to the hand-off, no ice, no delay.

Starts 2026-10-01T06:00:00Z.

1. ctot.issued
2. stand.allocated
3. wait for the next timer
4. wait for the next timer
5. boarding.started
6. doors.closed
7. aircraft.offBlock
8. taxi.started
9. aircraft.airborne

### Scenario: The airline cancels

Cancelled after the stand was allocated: passengers told, stand released.

Starts 2026-10-01T06:00:00Z.

1. ctot.issued
2. stand.allocated
3. flight.cancelled

## Airport operations › Flight lifecycle › Climb out

*machine · subject `flight.climb` · transitions partial*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| on the departure route |  |  |  |
| handed off |  | success, terminal |  |
| holding |  |  |  |
| initial climb |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | initial climb |  |  |  |
| initial climb | on the departure route | route.joined |  |  |
| on the departure route | handed off | handoff.accepted |  |  |
| on the departure route | holding | hold.instructed |  |  |
| holding | on the departure route | hold.released |  |  |

## Airport operations › Flight lifecycle › Boarding phases

*machine · subject `flight.boarding` · transitions complete*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| stopped at the gate |  |  |  |
| final call |  |  |  |
| gate closed |  | success, terminal |  |
| general |  |  |  |
| offloading no-shows |  |  |  |
| priority |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | priority |  |  |  |
| priority | general | boarding.general |  |  |
| general | final call | boarding.finalCall |  |  |
| final call | everyone boarded? | gate.closed |  |  |
| everyone boarded? | offloading no-shows | someone is missing |  |  |
| offloading no-shows | gate closed | bags.offloaded |  |  |
| priority | stopped at the gate | boarding.suspended |  |  |
| general | stopped at the gate | boarding.suspended |  |  |
| final call | stopped at the gate | boarding.suspended |  |  |
| stopped at the gate | the phase it was in | boarding.resumed |  |  |
| the phase it was in | priority | from the start |  |  |
| everyone boarded? | gate closed | [every checked-in passenger has boarded] | every checked-in passenger has boarded |  |

## Airport operations › Into-plane fuelling

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| truck assigned | emit |  |
| fire cover at the aircraft | call |  |
| nod_fuelEnd | end |  |
| the airline's fuel order | wait |  |
| fuel receipt to the captain | call |  |
| nod_fuelStart | start |  |
| passengers on board? | if |  |
| pumped | wait |  |
| pumping | wait |  |

| From | To | What |
| --- | --- | --- |
| start | the airline's fuel order |  |
| the airline's fuel order | passengers on board? |  |
| passengers on board? | fire cover at the aircraft | true |
| passengers on board? | truck assigned | false |
| fire cover at the aircraft | truck assigned |  |
| truck assigned | pumping |  |
| pumping | pumped |  |
| pumped | fuel receipt to the captain |  |
| fuel receipt to the captain | end |  |

## Airport operations › Disruption desk

*mixed*

A mixed level: a disruption's states, the steps the desk takes, and who it works with.

| Element | Kind | Notes |
| --- | --- | --- |
| nod_assessStart | start |  |
| assessing | state |  |
| declare a major disruption | emit |  |
| Notifications | service |  |
| closed | state |  |
| open | state |  |
| nod_disruptionStart | initial |  |
| Duty manager | actor |  |
| handle it at the desk | emit |  |
| nod_howBad | if |  |
| mitigating | state |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | open |  |  |  |
| open | assessing | disruption.reported |  |  |
| assessing | mitigating | disruption.major |  |  |
| assessing | mitigating | disruption.local |  |  |
| mitigating | closed | disruption.resolved |  |  |
| start | if |  |  |  |
| if | declare a major disruption | true |  |  |
| if | handle it at the desk | false |  |  |
| Duty manager | Notifications | command |  |  |

## Airport operations › Lost item

*machine · target · subject `item.status` · transitions partial*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| matched |  |  |  |
| reported |  |  |  |
| returned |  | success, terminal |  |
| unclaimed |  | stopped, terminal |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | reported |  |  |  |
| reported | matched | item.matched |  |  |
| matched | returned | item.collected |  |  |
| reported | unclaimed | keep for |  |  |

## Airport operations › Parking stay

*machine · subject `stay.status` · transitions partial*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| entered |  |  |  |
| exited |  | success, terminal |  |
| overstayed |  |  |  |
| paid |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | entered |  |  |  |
| entered | paid | stay.paid |  |  |
| paid | exited | stay.exited |  |  |
| paid | overstayed | grace to leave |  |  |
| overstayed | paid | stay.paid |  |  |

## Airport operations › Flight alerts

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| boarding has started | call |  |
| your flight is cancelled | call |  |
| your flight is delayed | call |  |
| nod_alertEnd | end |  |
| your gate changed | call |  |
| nod_alertStart | start |  |
| read the flight | call |  |
| what changed? | switch |  |

| From | To | What |
| --- | --- | --- |
| start | read the flight |  |
| read the flight | what changed? |  |
| what changed? | your gate changed | gate |
| your gate changed | end |  |
| what changed? | your flight is delayed | delay |
| your flight is delayed | end |  |
| what changed? | boarding has started | boarding |
| boarding has started | end |  |
| what changed? | your flight is cancelled | cancelled |
| your flight is cancelled | end |  |
| what changed? | end | default |

## Airport operations › Passenger journey

*machine · subject `journey.stage` · transitions partial*

Where a departing passenger is, as the airport knows it — never who they are.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| airside |  |  | shops · lounges · gates |
| at the gate |  |  |  |
| bag dropped |  |  |  |
| booked |  |  |  |
| border passed |  |  |  |
| checked in |  |  |  |
| denied boarding |  | stopped, terminal |  |
| no-show |  | failure, terminal |  |
| on board |  | success, terminal |  |
| screened |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | booked |  |  |  |
| booked | checked in | passenger.checkedIn |  |  |
| checked in | bag dropped | bag.dropped |  |  |
| checked in | screened | hand luggage only |  |  |
| bag dropped | screened | passenger.screened |  |  |
| screened | leaving the Schengen area? | always |  |  |
| leaving the Schengen area? | border passed | [the destination is outside the Schengen area] | the destination is outside the Schengen area |  |
| leaving the Schengen area? | airside | else |  |  |
| border passed | airside | border.cleared |  |  |
| airside | at the gate | passenger.atGate |  |  |
| at the gate | on board | passenger.boarded |  |  |
| at the gate | denied boarding | boarding.denied |  |  |
| airside | no-show | gate.closed |  |  |

## Airport operations › Stands and gates

*system*

120 stands on five aprons. Contact stands are boarded through their gate; remote ones by bus.

| Element | Kind | Notes |
| --- | --- | --- |
| Apron 1 · terminal A | service | 24 stands |
| Apron 2 · terminal B | service | 24 stands |
| Apron 3 · terminal C | service | 24 stands |
| Apron 4 · terminal D | service | 24 stands |
| Apron 5 · remote | service | 24 stands |
| Apron buses | service | 34 buses |
| Gate A1 | service |  |
| Gate A10 | service |  |
| Gate A11 | service |  |
| Gate A13 | service |  |
| Gate A14 | service |  |
| Gate A16 | service |  |
| Gate A17 | service |  |
| Gate A19 | service |  |
| Gate A2 | service |  |
| Gate A20 | service |  |
| Gate A22 | service |  |
| Gate A23 | service |  |
| Gate A4 | service |  |
| Gate A5 | service |  |
| Gate A7 | service |  |
| Gate A8 | service |  |
| Gate B1 | service |  |
| Gate B10 | service |  |
| Gate B11 | service |  |
| Gate B13 | service |  |
| Gate B14 | service |  |
| Gate B16 | service |  |
| Gate B17 | service |  |
| Gate B19 | service |  |
| Gate B2 | service |  |
| Gate B20 | service |  |
| Gate B22 | service |  |
| Gate B23 | service |  |
| Gate B4 | service |  |
| Gate B5 | service |  |
| Gate B7 | service |  |
| Gate B8 | service |  |
| Gate C1 | service |  |
| Gate C10 | service |  |
| Gate C11 | service |  |
| Gate C13 | service |  |
| Gate C14 | service |  |
| Gate C16 | service |  |
| Gate C17 | service |  |
| Gate C19 | service |  |
| Gate C2 | service |  |
| Gate C20 | service |  |
| Gate C22 | service |  |
| Gate C23 | service |  |
| Gate C4 | service |  |
| Gate C5 | service |  |
| Gate C7 | service |  |
| Gate C8 | service |  |
| Gate D1 | service |  |
| Gate D10 | service |  |
| Gate D11 | service |  |
| Gate D13 | service |  |
| Gate D14 | service |  |
| Gate D16 | service |  |
| Gate D17 | service |  |
| Gate D19 | service |  |
| Gate D2 | service |  |
| Gate D20 | service |  |
| Gate D22 | service |  |
| Gate D23 | service |  |
| Gate D4 | service |  |
| Gate D5 | service |  |
| Gate D7 | service |  |
| Gate D8 | service |  |
| Stand 101 | store | code E · wide-body |
| Stand 102 | store | code E · wide-body |
| Stand 103 | store | code E · wide-body |
| Stand 104 | store | code E · wide-body |
| Stand 105 | store | code E · wide-body |
| Stand 106 | store | code E · wide-body |
| Stand 107 | store | code C |
| Stand 108 | store | code C |
| Stand 109 | store | code C |
| Stand 110 | store | code C |
| Stand 111 | store | code C |
| Stand 112 | store | code C |
| Stand 113 | store | code C |
| Stand 114 | store | code C |
| Stand 115 | store | code C |
| Stand 116 | store | code C |
| Stand 117 | store | code C |
| Stand 118 | store | code C |
| Stand 119 | store | code C |
| Stand 120 | store | code C |
| Stand 121 | store | code C |
| Stand 122 | store | code C |
| Stand 123 | store | code C |
| Stand 124 | store | code C |
| Stand 201 | store | code E · wide-body |
| Stand 202 | store | code E · wide-body |
| Stand 203 | store | code E · wide-body |
| Stand 204 | store | code E · wide-body |
| Stand 205 | store | code E · wide-body |
| Stand 206 | store | code E · wide-body |
| Stand 207 | store | code C |
| Stand 208 | store | code C |
| Stand 209 | store | code C |
| Stand 210 | store | code C |
| Stand 211 | store | code C |
| Stand 212 | store | code C |
| Stand 213 | store | code C |
| Stand 214 | store | code C |
| Stand 215 | store | code C |
| Stand 216 | store | code C |
| Stand 217 | store | code C |
| Stand 218 | store | code C |
| Stand 219 | store | code C |
| Stand 220 | store | code C |
| Stand 221 | store | code C |
| Stand 222 | store | code C |
| Stand 223 | store | code C |
| Stand 224 | store | code C |
| Stand 301 | store | code E · wide-body |
| Stand 302 | store | code E · wide-body |
| Stand 303 | store | code E · wide-body |
| Stand 304 | store | code E · wide-body |
| Stand 305 | store | code E · wide-body |
| Stand 306 | store | code E · wide-body |
| Stand 307 | store | code C |
| Stand 308 | store | code C |
| Stand 309 | store | code C |
| Stand 310 | store | code C |
| Stand 311 | store | code C |
| Stand 312 | store | code C |
| Stand 313 | store | code C |
| Stand 314 | store | code C |
| Stand 315 | store | code C |
| Stand 316 | store | code C |
| Stand 317 | store | code C |
| Stand 318 | store | code C |
| Stand 319 | store | code C |
| Stand 320 | store | code C |
| Stand 321 | store | code C |
| Stand 322 | store | code C |
| Stand 323 | store | code C |
| Stand 324 | store | code C |
| Stand 401 | store | code E · wide-body |
| Stand 402 | store | code E · wide-body |
| Stand 403 | store | code E · wide-body |
| Stand 404 | store | code E · wide-body |
| Stand 405 | store | code E · wide-body |
| Stand 406 | store | code E · wide-body |
| Stand 407 | store | code C |
| Stand 408 | store | code C |
| Stand 409 | store | code C |
| Stand 410 | store | code C |
| Stand 411 | store | code C |
| Stand 412 | store | code C |
| Stand 413 | store | code C |
| Stand 414 | store | code C |
| Stand 415 | store | code C |
| Stand 416 | store | code C |
| Stand 417 | store | code C |
| Stand 418 | store | code C |
| Stand 419 | store | code C |
| Stand 420 | store | code C |
| Stand 421 | store | code C · opens 2027 · proposed |
| Stand 422 | store | code C · opens 2027 · proposed |
| Stand 423 | store | code C · opens 2027 · proposed |
| Stand 424 | store | code C · opens 2027 · proposed |
| Stand 501 | store | code E · wide-body |
| Stand 502 | store | code E · wide-body |
| Stand 503 | store | code E · wide-body |
| Stand 504 | store | code E · wide-body |
| Stand 505 | store | code E · wide-body |
| Stand 506 | store | code E · wide-body |
| Stand 507 | store | code C |
| Stand 508 | store | code C |
| Stand 509 | store | code C |
| Stand 510 | store | code C |
| Stand 511 | store | code C |
| Stand 512 | store | code C |
| Stand 513 | store | code C |
| Stand 514 | store | code C |
| Stand 515 | store | code C |
| Stand 516 | store | code C |
| Stand 517 | store | code C |
| Stand 518 | store | code C |
| Stand 519 | store | code C |
| Stand 520 | store | code C |
| Stand 521 | store | code C |
| Stand 522 | store | code C |
| Stand 523 | store | code C |
| Stand 524 | store | code C |
| Stand allocator | service | rules · constraints · preferences |
| Stand planner | actor |  |

| From | To | What |
| --- | --- | --- |
| Stand planner | Stand allocator | PUT /flights/{id}/stand |
| Stand allocator | Apron 1 · terminal A | command |
| Apron 1 · terminal A | Stand 101 | data |
| Gate A1 | Stand 101 | jet bridge |
| Apron 1 · terminal A | Stand 102 | data |
| Gate A2 | Stand 102 | jet bridge |
| Apron 1 · terminal A | Stand 103 | data |
| Apron 1 · terminal A | Stand 104 | data |
| Gate A4 | Stand 104 | jet bridge |
| Apron 1 · terminal A | Stand 105 | data |
| Gate A5 | Stand 105 | jet bridge |
| Apron 1 · terminal A | Stand 106 | data |
| Apron 1 · terminal A | Stand 107 | data |
| Gate A7 | Stand 107 | jet bridge |
| Apron 1 · terminal A | Stand 108 | data |
| Gate A8 | Stand 108 | jet bridge |
| Apron 1 · terminal A | Stand 109 | data |
| Apron 1 · terminal A | Stand 110 | data |
| Gate A10 | Stand 110 | jet bridge |
| Apron 1 · terminal A | Stand 111 | data |
| Gate A11 | Stand 111 | jet bridge |
| Apron 1 · terminal A | Stand 112 | data |
| Apron 1 · terminal A | Stand 113 | data |
| Gate A13 | Stand 113 | jet bridge |
| Apron 1 · terminal A | Stand 114 | data |
| Gate A14 | Stand 114 | jet bridge |
| Apron 1 · terminal A | Stand 115 | data |
| Apron 1 · terminal A | Stand 116 | data |
| Gate A16 | Stand 116 | jet bridge |
| Apron 1 · terminal A | Stand 117 | data |
| Gate A17 | Stand 117 | jet bridge |
| Apron 1 · terminal A | Stand 118 | data |
| Apron 1 · terminal A | Stand 119 | data |
| Gate A19 | Stand 119 | jet bridge |
| Apron 1 · terminal A | Stand 120 | data |
| Gate A20 | Stand 120 | jet bridge |
| Apron 1 · terminal A | Stand 121 | data |
| Apron 1 · terminal A | Stand 122 | data |
| Gate A22 | Stand 122 | jet bridge |
| Apron 1 · terminal A | Stand 123 | data |
| Gate A23 | Stand 123 | jet bridge |
| Apron 1 · terminal A | Stand 124 | data |
| Stand allocator | Apron 2 · terminal B | command |
| Apron 2 · terminal B | Stand 201 | data |
| Gate B1 | Stand 201 | jet bridge |
| Apron 2 · terminal B | Stand 202 | data |
| Gate B2 | Stand 202 | jet bridge |
| Apron 2 · terminal B | Stand 203 | data |
| Apron 2 · terminal B | Stand 204 | data |
| Gate B4 | Stand 204 | jet bridge |
| Apron 2 · terminal B | Stand 205 | data |
| Gate B5 | Stand 205 | jet bridge |
| Apron 2 · terminal B | Stand 206 | data |
| Apron 2 · terminal B | Stand 207 | data |
| Gate B7 | Stand 207 | jet bridge |
| Apron 2 · terminal B | Stand 208 | data |
| Gate B8 | Stand 208 | jet bridge |
| Apron 2 · terminal B | Stand 209 | data |
| Apron 2 · terminal B | Stand 210 | data |
| Gate B10 | Stand 210 | jet bridge |
| Apron 2 · terminal B | Stand 211 | data |
| Gate B11 | Stand 211 | jet bridge |
| Apron 2 · terminal B | Stand 212 | data |
| Apron 2 · terminal B | Stand 213 | data |
| Gate B13 | Stand 213 | jet bridge |
| Apron 2 · terminal B | Stand 214 | data |
| Gate B14 | Stand 214 | jet bridge |
| Apron 2 · terminal B | Stand 215 | data |
| Apron 2 · terminal B | Stand 216 | data |
| Gate B16 | Stand 216 | jet bridge |
| Apron 2 · terminal B | Stand 217 | data |
| Gate B17 | Stand 217 | jet bridge |
| Apron 2 · terminal B | Stand 218 | data |
| Apron 2 · terminal B | Stand 219 | data |
| Gate B19 | Stand 219 | jet bridge |
| Apron 2 · terminal B | Stand 220 | data |
| Gate B20 | Stand 220 | jet bridge |
| Apron 2 · terminal B | Stand 221 | data |
| Apron 2 · terminal B | Stand 222 | data |
| Gate B22 | Stand 222 | jet bridge |
| Apron 2 · terminal B | Stand 223 | data |
| Gate B23 | Stand 223 | jet bridge |
| Apron 2 · terminal B | Stand 224 | data |
| Stand allocator | Apron 3 · terminal C | command |
| Apron 3 · terminal C | Stand 301 | data |
| Gate C1 | Stand 301 | jet bridge |
| Apron 3 · terminal C | Stand 302 | data |
| Gate C2 | Stand 302 | jet bridge |
| Apron 3 · terminal C | Stand 303 | data |
| Apron 3 · terminal C | Stand 304 | data |
| Gate C4 | Stand 304 | jet bridge |
| Apron 3 · terminal C | Stand 305 | data |
| Gate C5 | Stand 305 | jet bridge |
| Apron 3 · terminal C | Stand 306 | data |
| Apron 3 · terminal C | Stand 307 | data |
| Gate C7 | Stand 307 | jet bridge |
| Apron 3 · terminal C | Stand 308 | data |
| Gate C8 | Stand 308 | jet bridge |
| Apron 3 · terminal C | Stand 309 | data |
| Apron 3 · terminal C | Stand 310 | data |
| Gate C10 | Stand 310 | jet bridge |
| Apron 3 · terminal C | Stand 311 | data |
| Gate C11 | Stand 311 | jet bridge |
| Apron 3 · terminal C | Stand 312 | data |
| Apron 3 · terminal C | Stand 313 | data |
| Gate C13 | Stand 313 | jet bridge |
| Apron 3 · terminal C | Stand 314 | data |
| Gate C14 | Stand 314 | jet bridge |
| Apron 3 · terminal C | Stand 315 | data |
| Apron 3 · terminal C | Stand 316 | data |
| Gate C16 | Stand 316 | jet bridge |
| Apron 3 · terminal C | Stand 317 | data |
| Gate C17 | Stand 317 | jet bridge |
| Apron 3 · terminal C | Stand 318 | data |
| Apron 3 · terminal C | Stand 319 | data |
| Gate C19 | Stand 319 | jet bridge |
| Apron 3 · terminal C | Stand 320 | data |
| Gate C20 | Stand 320 | jet bridge |
| Apron 3 · terminal C | Stand 321 | data |
| Apron 3 · terminal C | Stand 322 | data |
| Gate C22 | Stand 322 | jet bridge |
| Apron 3 · terminal C | Stand 323 | data |
| Gate C23 | Stand 323 | jet bridge |
| Apron 3 · terminal C | Stand 324 | data |
| Stand allocator | Apron 4 · terminal D | command |
| Apron 4 · terminal D | Stand 401 | data |
| Gate D1 | Stand 401 | jet bridge |
| Apron 4 · terminal D | Stand 402 | data |
| Gate D2 | Stand 402 | jet bridge |
| Apron 4 · terminal D | Stand 403 | data |
| Apron 4 · terminal D | Stand 404 | data |
| Gate D4 | Stand 404 | jet bridge |
| Apron 4 · terminal D | Stand 405 | data |
| Gate D5 | Stand 405 | jet bridge |
| Apron 4 · terminal D | Stand 406 | data |
| Apron 4 · terminal D | Stand 407 | data |
| Gate D7 | Stand 407 | jet bridge |
| Apron 4 · terminal D | Stand 408 | data |
| Gate D8 | Stand 408 | jet bridge |
| Apron 4 · terminal D | Stand 409 | data |
| Apron 4 · terminal D | Stand 410 | data |
| Gate D10 | Stand 410 | jet bridge |
| Apron 4 · terminal D | Stand 411 | data |
| Gate D11 | Stand 411 | jet bridge |
| Apron 4 · terminal D | Stand 412 | data |
| Apron 4 · terminal D | Stand 413 | data |
| Gate D13 | Stand 413 | jet bridge |
| Apron 4 · terminal D | Stand 414 | data |
| Gate D14 | Stand 414 | jet bridge |
| Apron 4 · terminal D | Stand 415 | data |
| Apron 4 · terminal D | Stand 416 | data |
| Gate D16 | Stand 416 | jet bridge |
| Apron 4 · terminal D | Stand 417 | data |
| Gate D17 | Stand 417 | jet bridge |
| Apron 4 · terminal D | Stand 418 | data |
| Apron 4 · terminal D | Stand 419 | data |
| Gate D19 | Stand 419 | jet bridge |
| Apron 4 · terminal D | Stand 420 | data |
| Gate D20 | Stand 420 | jet bridge |
| Apron 4 · terminal D | Stand 421 | data |
| Apron 4 · terminal D | Stand 422 | data |
| Gate D22 | Stand 422 | jet bridge |
| Apron 4 · terminal D | Stand 423 | data |
| Gate D23 | Stand 423 | jet bridge |
| Apron 4 · terminal D | Stand 424 | data |
| Stand allocator | Apron 5 · remote | command |
| Apron 5 · remote | Stand 501 | data |
| Apron buses | Stand 501 | command |
| Apron 5 · remote | Stand 502 | data |
| Apron buses | Stand 502 | command |
| Apron 5 · remote | Stand 503 | data |
| Apron buses | Stand 503 | command |
| Apron 5 · remote | Stand 504 | data |
| Apron buses | Stand 504 | command |
| Apron 5 · remote | Stand 505 | data |
| Apron buses | Stand 505 | command |
| Apron 5 · remote | Stand 506 | data |
| Apron buses | Stand 506 | command |
| Apron 5 · remote | Stand 507 | data |
| Apron buses | Stand 507 | command |
| Apron 5 · remote | Stand 508 | data |
| Apron buses | Stand 508 | command |
| Apron 5 · remote | Stand 509 | data |
| Apron buses | Stand 509 | command |
| Apron 5 · remote | Stand 510 | data |
| Apron buses | Stand 510 | command |
| Apron 5 · remote | Stand 511 | data |
| Apron buses | Stand 511 | command |
| Apron 5 · remote | Stand 512 | data |
| Apron buses | Stand 512 | command |
| Apron 5 · remote | Stand 513 | data |
| Apron buses | Stand 513 | command |
| Apron 5 · remote | Stand 514 | data |
| Apron buses | Stand 514 | command |
| Apron 5 · remote | Stand 515 | data |
| Apron buses | Stand 515 | command |
| Apron 5 · remote | Stand 516 | data |
| Apron buses | Stand 516 | command |
| Apron 5 · remote | Stand 517 | data |
| Apron buses | Stand 517 | command |
| Apron 5 · remote | Stand 518 | data |
| Apron buses | Stand 518 | command |
| Apron 5 · remote | Stand 519 | data |
| Apron buses | Stand 519 | command |
| Apron 5 · remote | Stand 520 | data |
| Apron buses | Stand 520 | command |
| Apron 5 · remote | Stand 521 | data |
| Apron buses | Stand 521 | command |
| Apron 5 · remote | Stand 522 | data |
| Apron buses | Stand 522 | command |
| Apron 5 · remote | Stand 523 | data |
| Apron buses | Stand 523 | command |
| Apron 5 · remote | Stand 524 | data |
| Apron buses | Stand 524 | command |

## Airport operations › Stands and gates › Gate boarding

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| load the boarding list | call |  |
| dock the jet bridge | call |  |
| gate closed | emit |  |
| nod_gateEnd | end |  |
| each boarding group | forEach |  |
| retract the bridge | call |  |
| nod_gateStart | start |  |

| From | To | What |
| --- | --- | --- |
| start | dock the jet bridge |  |
| dock the jet bridge | load the boarding list |  |
| load the boarding list | each boarding group |  |
| each boarding group | gate closed |  |
| gate closed | retract the bridge |  |
| retract the bridge | end |  |

## Airport operations › Stands and gates › Gate boarding › Board one group

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| call the group | call |  |
| nod_groupEnd | end |  |
| nod_groupStart | start |  |
| the group has boarded | wait |  |

| From | To | What |
| --- | --- | --- |
| start | call the group |  |
| call the group | the group has boarded |  |
| the group has boarded | end |  |

## Airport operations › Stands and gates › Stand lifecycle

*machine · subject `stand.status` · transitions complete*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| out of service |  |  |  |
| clearing |  |  |  |
| free |  |  |  |
| occupied |  |  |  |
| planned |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | free |  |  |  |
| free | planned | stand.allocated |  |  |
| planned | free | stand.deallocated |  |  |
| planned | occupied | aircraft.onBlock |  |  |
| occupied | clearing | aircraft.offBlock |  |  |
| clearing | free | stand.inspected |  |  |
| any | out of service | stand.outOfService |  |  |
| out of service | free | stand.returned |  |  |

### Scenario: A stand's day

Allocated, occupied, cleared, free again.

Starts 2026-10-01T06:00:00Z.

1. stand.allocated
2. aircraft.onBlock
3. aircraft.offBlock
4. stand.inspected

## Airport operations › Screening halls

*system*

38 lanes in four halls. Each lane: divest, CT scanner, body scanner, recompose, and an alarm table.

| Element | Kind | Notes |
| --- | --- | --- |
| Alarm table A1 | service | hand search · trace |
| Alarm table A10 | service | hand search · trace |
| Alarm table A2 | service | hand search · trace |
| Alarm table A3 | service | hand search · trace |
| Alarm table A4 | service | hand search · trace |
| Alarm table A5 | service | hand search · trace |
| Alarm table A6 | service | hand search · trace |
| Alarm table A7 | service | hand search · trace |
| Alarm table A8 | service | hand search · trace |
| Alarm table A9 | service | hand search · trace |
| Alarm table B1 | service | hand search · trace |
| Alarm table B10 | service | hand search · trace |
| Alarm table B2 | service | hand search · trace |
| Alarm table B3 | service | hand search · trace |
| Alarm table B4 | service | hand search · trace |
| Alarm table B5 | service | hand search · trace |
| Alarm table B6 | service | hand search · trace |
| Alarm table B7 | service | hand search · trace |
| Alarm table B8 | service | hand search · trace |
| Alarm table B9 | service | hand search · trace |
| Alarm table C1 | service | hand search · trace |
| Alarm table C10 | service | hand search · trace |
| Alarm table C2 | service | hand search · trace |
| Alarm table C3 | service | hand search · trace |
| Alarm table C4 | service | hand search · trace |
| Alarm table C5 | service | hand search · trace |
| Alarm table C6 | service | hand search · trace |
| Alarm table C7 | service | hand search · trace |
| Alarm table C8 | service | hand search · trace |
| Alarm table C9 | service | hand search · trace |
| Alarm table D1 | service | hand search · trace |
| Alarm table D2 | service | hand search · trace |
| Alarm table D3 | service | hand search · trace |
| Alarm table D4 | service | hand search · trace |
| Alarm table D5 | service | hand search · trace |
| Alarm table D6 | service | hand search · trace |
| Alarm table D7 | service | hand search · trace |
| Alarm table D8 | service | hand search · trace |
| Body scanner A1 | service | millimetre wave |
| Body scanner A10 | service | millimetre wave |
| Body scanner A2 | service | millimetre wave |
| Body scanner A3 | service | millimetre wave |
| Body scanner A4 | service | millimetre wave |
| Body scanner A5 | service | millimetre wave |
| Body scanner A6 | service | millimetre wave |
| Body scanner A7 | service | millimetre wave |
| Body scanner A8 | service | millimetre wave |
| Body scanner A9 | service | millimetre wave |
| Body scanner B1 | service | millimetre wave |
| Body scanner B10 | service | millimetre wave |
| Body scanner B2 | service | millimetre wave |
| Body scanner B3 | service | millimetre wave |
| Body scanner B4 | service | millimetre wave |
| Body scanner B5 | service | millimetre wave |
| Body scanner B6 | service | millimetre wave |
| Body scanner B7 | service | millimetre wave |
| Body scanner B8 | service | millimetre wave |
| Body scanner B9 | service | millimetre wave |
| Body scanner C1 | service | millimetre wave |
| Body scanner C10 | service | millimetre wave |
| Body scanner C2 | service | millimetre wave |
| Body scanner C3 | service | millimetre wave |
| Body scanner C4 | service | millimetre wave |
| Body scanner C5 | service | millimetre wave |
| Body scanner C6 | service | millimetre wave |
| Body scanner C7 | service | millimetre wave |
| Body scanner C8 | service | millimetre wave |
| Body scanner C9 | service | millimetre wave |
| Body scanner D1 | service | millimetre wave |
| Body scanner D2 | service | millimetre wave |
| Body scanner D3 | service | millimetre wave |
| Body scanner D4 | service | millimetre wave |
| Body scanner D5 | service | millimetre wave |
| Body scanner D6 | service | millimetre wave |
| Body scanner D7 | service | millimetre wave |
| Body scanner D8 | service | millimetre wave |
| CT scanner A1 | service | liquids and laptops stay in |
| CT scanner A10 | service | liquids and laptops stay in |
| CT scanner A2 | service | liquids and laptops stay in |
| CT scanner A3 | service | liquids and laptops stay in |
| CT scanner A4 | service | liquids and laptops stay in |
| CT scanner A5 | service | liquids and laptops stay in |
| CT scanner A6 | service | liquids and laptops stay in |
| CT scanner A7 | service | liquids and laptops stay in |
| CT scanner A8 | service | liquids and laptops stay in |
| CT scanner A9 | service | liquids and laptops stay in |
| CT scanner B1 | service | liquids and laptops stay in |
| CT scanner B10 | service | liquids and laptops stay in |
| CT scanner B2 | service | liquids and laptops stay in |
| CT scanner B3 | service | liquids and laptops stay in |
| CT scanner B4 | service | liquids and laptops stay in |
| CT scanner B5 | service | liquids and laptops stay in |
| CT scanner B6 | service | liquids and laptops stay in |
| CT scanner B7 | service | liquids and laptops stay in |
| CT scanner B8 | service | liquids and laptops stay in |
| CT scanner B9 | service | liquids and laptops stay in |
| CT scanner C1 | service | liquids and laptops stay in |
| CT scanner C10 | service | liquids and laptops stay in |
| CT scanner C2 | service | liquids and laptops stay in |
| CT scanner C3 | service | liquids and laptops stay in |
| CT scanner C4 | service | liquids and laptops stay in |
| CT scanner C5 | service | liquids and laptops stay in |
| CT scanner C6 | service | liquids and laptops stay in |
| CT scanner C7 | service | liquids and laptops stay in |
| CT scanner C8 | service | liquids and laptops stay in |
| CT scanner C9 | service | liquids and laptops stay in |
| CT scanner D1 | service | liquids and laptops stay in |
| CT scanner D2 | service | liquids and laptops stay in |
| CT scanner D3 | service | liquids and laptops stay in |
| CT scanner D4 | service | liquids and laptops stay in |
| CT scanner D5 | service | liquids and laptops stay in |
| CT scanner D6 | service | liquids and laptops stay in |
| CT scanner D7 | service | liquids and laptops stay in |
| CT scanner D8 | service | liquids and laptops stay in |
| Divest A1 | service | 4 positions · trays |
| Divest A10 | service | 4 positions · trays |
| Divest A2 | service | 4 positions · trays |
| Divest A3 | service | 4 positions · trays |
| Divest A4 | service | 4 positions · trays |
| Divest A5 | service | 4 positions · trays |
| Divest A6 | service | 4 positions · trays |
| Divest A7 | service | 4 positions · trays |
| Divest A8 | service | 4 positions · trays |
| Divest A9 | service | 4 positions · trays |
| Divest B1 | service | 4 positions · trays |
| Divest B10 | service | 4 positions · trays |
| Divest B2 | service | 4 positions · trays |
| Divest B3 | service | 4 positions · trays |
| Divest B4 | service | 4 positions · trays |
| Divest B5 | service | 4 positions · trays |
| Divest B6 | service | 4 positions · trays |
| Divest B7 | service | 4 positions · trays |
| Divest B8 | service | 4 positions · trays |
| Divest B9 | service | 4 positions · trays |
| Divest C1 | service | 4 positions · trays |
| Divest C10 | service | 4 positions · trays |
| Divest C2 | service | 4 positions · trays |
| Divest C3 | service | 4 positions · trays |
| Divest C4 | service | 4 positions · trays |
| Divest C5 | service | 4 positions · trays |
| Divest C6 | service | 4 positions · trays |
| Divest C7 | service | 4 positions · trays |
| Divest C8 | service | 4 positions · trays |
| Divest C9 | service | 4 positions · trays |
| Divest D1 | service | 4 positions · trays |
| Divest D2 | service | 4 positions · trays |
| Divest D3 | service | 4 positions · trays |
| Divest D4 | service | 4 positions · trays |
| Divest D5 | service | 4 positions · trays |
| Divest D6 | service | 4 positions · trays |
| Divest D7 | service | 4 positions · trays |
| Divest D8 | service | 4 positions · trays |
| Lanes | store | the status of every lane |
| Recompose A1 | service | automatic tray return |
| Recompose A10 | service | automatic tray return |
| Recompose A2 | service | automatic tray return |
| Recompose A3 | service | automatic tray return |
| Recompose A4 | service | automatic tray return |
| Recompose A5 | service | automatic tray return |
| Recompose A6 | service | automatic tray return |
| Recompose A7 | service | automatic tray return |
| Recompose A8 | service | automatic tray return |
| Recompose A9 | service | automatic tray return |
| Recompose B1 | service | automatic tray return |
| Recompose B10 | service | automatic tray return |
| Recompose B2 | service | automatic tray return |
| Recompose B3 | service | automatic tray return |
| Recompose B4 | service | automatic tray return |
| Recompose B5 | service | automatic tray return |
| Recompose B6 | service | automatic tray return |
| Recompose B7 | service | automatic tray return |
| Recompose B8 | service | automatic tray return |
| Recompose B9 | service | automatic tray return |
| Recompose C1 | service | automatic tray return |
| Recompose C10 | service | automatic tray return |
| Recompose C2 | service | automatic tray return |
| Recompose C3 | service | automatic tray return |
| Recompose C4 | service | automatic tray return |
| Recompose C5 | service | automatic tray return |
| Recompose C6 | service | automatic tray return |
| Recompose C7 | service | automatic tray return |
| Recompose C8 | service | automatic tray return |
| Recompose C9 | service | automatic tray return |
| Recompose D1 | service | automatic tray return |
| Recompose D2 | service | automatic tray return |
| Recompose D3 | service | automatic tray return |
| Recompose D4 | service | automatic tray return |
| Recompose D5 | service | automatic tray return |
| Recompose D6 | service | automatic tray return |
| Recompose D7 | service | automatic tray return |
| Recompose D8 | service | automatic tray return |
| Hall A | service | 10 lanes |
| Hall B | service | 10 lanes |
| Hall C | service | 10 lanes |
| Hall D | service | 8 lanes |
| Supervisor | actor |  |

| From | To | What |
| --- | --- | --- |
| Supervisor | Lanes | command |
| Hall A | Lanes | data |
| Hall A | Divest A1 | command |
| Divest A1 | CT scanner A1 | trays |
| Divest A1 | Body scanner A1 | people |
| CT scanner A1 | Recompose A1 | data |
| CT scanner A1 | Alarm table A1 | alarm |
| Alarm table A1 | Recompose A1 | cleared |
| Hall A | Divest A2 | command |
| Divest A2 | CT scanner A2 | trays |
| Divest A2 | Body scanner A2 | people |
| CT scanner A2 | Recompose A2 | data |
| CT scanner A2 | Alarm table A2 | alarm |
| Alarm table A2 | Recompose A2 | cleared |
| Hall A | Divest A3 | command |
| Divest A3 | CT scanner A3 | trays |
| Divest A3 | Body scanner A3 | people |
| CT scanner A3 | Recompose A3 | data |
| CT scanner A3 | Alarm table A3 | alarm |
| Alarm table A3 | Recompose A3 | cleared |
| Hall A | Divest A4 | command |
| Divest A4 | CT scanner A4 | trays |
| Divest A4 | Body scanner A4 | people |
| CT scanner A4 | Recompose A4 | data |
| CT scanner A4 | Alarm table A4 | alarm |
| Alarm table A4 | Recompose A4 | cleared |
| Hall A | Divest A5 | command |
| Divest A5 | CT scanner A5 | trays |
| Divest A5 | Body scanner A5 | people |
| CT scanner A5 | Recompose A5 | data |
| CT scanner A5 | Alarm table A5 | alarm |
| Alarm table A5 | Recompose A5 | cleared |
| Hall A | Divest A6 | command |
| Divest A6 | CT scanner A6 | trays |
| Divest A6 | Body scanner A6 | people |
| CT scanner A6 | Recompose A6 | data |
| CT scanner A6 | Alarm table A6 | alarm |
| Alarm table A6 | Recompose A6 | cleared |
| Hall A | Divest A7 | command |
| Divest A7 | CT scanner A7 | trays |
| Divest A7 | Body scanner A7 | people |
| CT scanner A7 | Recompose A7 | data |
| CT scanner A7 | Alarm table A7 | alarm |
| Alarm table A7 | Recompose A7 | cleared |
| Hall A | Divest A8 | command |
| Divest A8 | CT scanner A8 | trays |
| Divest A8 | Body scanner A8 | people |
| CT scanner A8 | Recompose A8 | data |
| CT scanner A8 | Alarm table A8 | alarm |
| Alarm table A8 | Recompose A8 | cleared |
| Hall A | Divest A9 | command |
| Divest A9 | CT scanner A9 | trays |
| Divest A9 | Body scanner A9 | people |
| CT scanner A9 | Recompose A9 | data |
| CT scanner A9 | Alarm table A9 | alarm |
| Alarm table A9 | Recompose A9 | cleared |
| Hall A | Divest A10 | command |
| Divest A10 | CT scanner A10 | trays |
| Divest A10 | Body scanner A10 | people |
| CT scanner A10 | Recompose A10 | data |
| CT scanner A10 | Alarm table A10 | alarm |
| Alarm table A10 | Recompose A10 | cleared |
| Hall B | Lanes | data |
| Hall B | Divest B1 | command |
| Divest B1 | CT scanner B1 | trays |
| Divest B1 | Body scanner B1 | people |
| CT scanner B1 | Recompose B1 | data |
| CT scanner B1 | Alarm table B1 | alarm |
| Alarm table B1 | Recompose B1 | cleared |
| Hall B | Divest B2 | command |
| Divest B2 | CT scanner B2 | trays |
| Divest B2 | Body scanner B2 | people |
| CT scanner B2 | Recompose B2 | data |
| CT scanner B2 | Alarm table B2 | alarm |
| Alarm table B2 | Recompose B2 | cleared |
| Hall B | Divest B3 | command |
| Divest B3 | CT scanner B3 | trays |
| Divest B3 | Body scanner B3 | people |
| CT scanner B3 | Recompose B3 | data |
| CT scanner B3 | Alarm table B3 | alarm |
| Alarm table B3 | Recompose B3 | cleared |
| Hall B | Divest B4 | command |
| Divest B4 | CT scanner B4 | trays |
| Divest B4 | Body scanner B4 | people |
| CT scanner B4 | Recompose B4 | data |
| CT scanner B4 | Alarm table B4 | alarm |
| Alarm table B4 | Recompose B4 | cleared |
| Hall B | Divest B5 | command |
| Divest B5 | CT scanner B5 | trays |
| Divest B5 | Body scanner B5 | people |
| CT scanner B5 | Recompose B5 | data |
| CT scanner B5 | Alarm table B5 | alarm |
| Alarm table B5 | Recompose B5 | cleared |
| Hall B | Divest B6 | command |
| Divest B6 | CT scanner B6 | trays |
| Divest B6 | Body scanner B6 | people |
| CT scanner B6 | Recompose B6 | data |
| CT scanner B6 | Alarm table B6 | alarm |
| Alarm table B6 | Recompose B6 | cleared |
| Hall B | Divest B7 | command |
| Divest B7 | CT scanner B7 | trays |
| Divest B7 | Body scanner B7 | people |
| CT scanner B7 | Recompose B7 | data |
| CT scanner B7 | Alarm table B7 | alarm |
| Alarm table B7 | Recompose B7 | cleared |
| Hall B | Divest B8 | command |
| Divest B8 | CT scanner B8 | trays |
| Divest B8 | Body scanner B8 | people |
| CT scanner B8 | Recompose B8 | data |
| CT scanner B8 | Alarm table B8 | alarm |
| Alarm table B8 | Recompose B8 | cleared |
| Hall B | Divest B9 | command |
| Divest B9 | CT scanner B9 | trays |
| Divest B9 | Body scanner B9 | people |
| CT scanner B9 | Recompose B9 | data |
| CT scanner B9 | Alarm table B9 | alarm |
| Alarm table B9 | Recompose B9 | cleared |
| Hall B | Divest B10 | command |
| Divest B10 | CT scanner B10 | trays |
| Divest B10 | Body scanner B10 | people |
| CT scanner B10 | Recompose B10 | data |
| CT scanner B10 | Alarm table B10 | alarm |
| Alarm table B10 | Recompose B10 | cleared |
| Hall C | Lanes | data |
| Hall C | Divest C1 | command |
| Divest C1 | CT scanner C1 | trays |
| Divest C1 | Body scanner C1 | people |
| CT scanner C1 | Recompose C1 | data |
| CT scanner C1 | Alarm table C1 | alarm |
| Alarm table C1 | Recompose C1 | cleared |
| Hall C | Divest C2 | command |
| Divest C2 | CT scanner C2 | trays |
| Divest C2 | Body scanner C2 | people |
| CT scanner C2 | Recompose C2 | data |
| CT scanner C2 | Alarm table C2 | alarm |
| Alarm table C2 | Recompose C2 | cleared |
| Hall C | Divest C3 | command |
| Divest C3 | CT scanner C3 | trays |
| Divest C3 | Body scanner C3 | people |
| CT scanner C3 | Recompose C3 | data |
| CT scanner C3 | Alarm table C3 | alarm |
| Alarm table C3 | Recompose C3 | cleared |
| Hall C | Divest C4 | command |
| Divest C4 | CT scanner C4 | trays |
| Divest C4 | Body scanner C4 | people |
| CT scanner C4 | Recompose C4 | data |
| CT scanner C4 | Alarm table C4 | alarm |
| Alarm table C4 | Recompose C4 | cleared |
| Hall C | Divest C5 | command |
| Divest C5 | CT scanner C5 | trays |
| Divest C5 | Body scanner C5 | people |
| CT scanner C5 | Recompose C5 | data |
| CT scanner C5 | Alarm table C5 | alarm |
| Alarm table C5 | Recompose C5 | cleared |
| Hall C | Divest C6 | command |
| Divest C6 | CT scanner C6 | trays |
| Divest C6 | Body scanner C6 | people |
| CT scanner C6 | Recompose C6 | data |
| CT scanner C6 | Alarm table C6 | alarm |
| Alarm table C6 | Recompose C6 | cleared |
| Hall C | Divest C7 | command |
| Divest C7 | CT scanner C7 | trays |
| Divest C7 | Body scanner C7 | people |
| CT scanner C7 | Recompose C7 | data |
| CT scanner C7 | Alarm table C7 | alarm |
| Alarm table C7 | Recompose C7 | cleared |
| Hall C | Divest C8 | command |
| Divest C8 | CT scanner C8 | trays |
| Divest C8 | Body scanner C8 | people |
| CT scanner C8 | Recompose C8 | data |
| CT scanner C8 | Alarm table C8 | alarm |
| Alarm table C8 | Recompose C8 | cleared |
| Hall C | Divest C9 | command |
| Divest C9 | CT scanner C9 | trays |
| Divest C9 | Body scanner C9 | people |
| CT scanner C9 | Recompose C9 | data |
| CT scanner C9 | Alarm table C9 | alarm |
| Alarm table C9 | Recompose C9 | cleared |
| Hall C | Divest C10 | command |
| Divest C10 | CT scanner C10 | trays |
| Divest C10 | Body scanner C10 | people |
| CT scanner C10 | Recompose C10 | data |
| CT scanner C10 | Alarm table C10 | alarm |
| Alarm table C10 | Recompose C10 | cleared |
| Hall D | Lanes | data |
| Hall D | Divest D1 | command |
| Divest D1 | CT scanner D1 | trays |
| Divest D1 | Body scanner D1 | people |
| CT scanner D1 | Recompose D1 | data |
| CT scanner D1 | Alarm table D1 | alarm |
| Alarm table D1 | Recompose D1 | cleared |
| Hall D | Divest D2 | command |
| Divest D2 | CT scanner D2 | trays |
| Divest D2 | Body scanner D2 | people |
| CT scanner D2 | Recompose D2 | data |
| CT scanner D2 | Alarm table D2 | alarm |
| Alarm table D2 | Recompose D2 | cleared |
| Hall D | Divest D3 | command |
| Divest D3 | CT scanner D3 | trays |
| Divest D3 | Body scanner D3 | people |
| CT scanner D3 | Recompose D3 | data |
| CT scanner D3 | Alarm table D3 | alarm |
| Alarm table D3 | Recompose D3 | cleared |
| Hall D | Divest D4 | command |
| Divest D4 | CT scanner D4 | trays |
| Divest D4 | Body scanner D4 | people |
| CT scanner D4 | Recompose D4 | data |
| CT scanner D4 | Alarm table D4 | alarm |
| Alarm table D4 | Recompose D4 | cleared |
| Hall D | Divest D5 | command |
| Divest D5 | CT scanner D5 | trays |
| Divest D5 | Body scanner D5 | people |
| CT scanner D5 | Recompose D5 | data |
| CT scanner D5 | Alarm table D5 | alarm |
| Alarm table D5 | Recompose D5 | cleared |
| Hall D | Divest D6 | command |
| Divest D6 | CT scanner D6 | trays |
| Divest D6 | Body scanner D6 | people |
| CT scanner D6 | Recompose D6 | data |
| CT scanner D6 | Alarm table D6 | alarm |
| Alarm table D6 | Recompose D6 | cleared |
| Hall D | Divest D7 | command |
| Divest D7 | CT scanner D7 | trays |
| Divest D7 | Body scanner D7 | people |
| CT scanner D7 | Recompose D7 | data |
| CT scanner D7 | Alarm table D7 | alarm |
| Alarm table D7 | Recompose D7 | cleared |
| Hall D | Divest D8 | command |
| Divest D8 | CT scanner D8 | trays |
| Divest D8 | Body scanner D8 | people |
| CT scanner D8 | Recompose D8 | data |
| CT scanner D8 | Alarm table D8 | alarm |
| Alarm table D8 | Recompose D8 | cleared |

## Airport operations › Screening halls › Security lane

*machine · subject `lane.status` · transitions complete*

One of 38 lanes. A lane in alarm stops taking trays until the alarm is resolved.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| alarm |  |  | enters Alarm resolution |
| queue over 10 min |  |  |  |
| closed |  |  |  |
| open |  |  |  |
| opening |  |  |  |
| paused |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | closed |  |  |  |
| closed | opening | lane.staffed |  |  |
| opening | open | lane.selfTested |  |  |
| open | queue over 10 min | queue.long |  |  |
| queue over 10 min | open | queue.normal |  |  |
| open | alarm | screening.alarm |  |  |
| queue over 10 min | alarm | screening.alarm |  |  |
| alarm | open | done |  |  |
| open | paused | lane.break |  |  |
| paused | open | break |  |  |
| open | closed | lane.closed |  |  |

| From | Role | To | About |
| --- | --- | --- | --- |
| Security screening | sends | lane.staffed |  |
| Security screening | sends | lane.break |  |
| Security screening | sends | lane.closed |  |

### Scenario: A lane in alarm

A tray alarms; the hand search clears it.

Starts 2026-10-01T06:00:00Z.

1. lane.staffed
2. lane.selfTested
3. screening.alarm
4. search.started
5. search.clear

## Airport operations › Screening halls › Security lane › Alarm resolution

*machine · subject `lane.alarm` · transitions partial*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| cleared |  | success, terminal |  |
| trace detection |  |  |  |
| police called |  | stopped, terminal |  |
| hand search |  |  |  |
| tray held |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | tray held |  |  |  |
| tray held | hand search | search.started |  |  |
| hand search | cleared | search.clear |  |  |
| hand search | trace detection | search.suspicious |  |  |
| trace detection | cleared | trace.negative |  |  |
| trace detection | police called | trace.positive |  |  |

## Airport operations › Turnaround milestones

*machine · subject `turnaround.milestones` · transitions complete*

Each region is one team's work on the stand; the turnaround ends when all six are done.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| holds closed |  | success, terminal |  |
| holds empty |  |  |  |
| loading |  |  |  |
| offloading |  |  |  |
| catered |  | success, terminal |  |
| truck at the door |  |  |  |
| cleaned |  | success, terminal |  |
| cleaning |  |  |  |
| awaiting the truck |  |  |  |
| fuelled |  | success, terminal |  |
| fuelling |  |  |  |
| power connected |  |  |  |
| power disconnected |  | success, terminal |  |
| water serviced |  |  |  |
| cabin empty |  |  |  |
| cabin ready |  | success, terminal |  |
| deboarding |  |  |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | deboarding |  |  | action Run the turnaround |
| deboarding | cabin empty | deboarding.completed |  |  |
| cabin empty | cabin ready | cabin.ready |  |  |
| initial | offloading |  |  |  |
| offloading | holds empty | offload.completed |  |  |
| holds empty | loading | loading.started |  |  |
| loading | holds closed | holds.closed |  |  |
| initial | awaiting the truck |  |  |  |
| awaiting the truck | fuelling | fuel.started |  |  |
| fuelling | fuelled | fuel.completed |  |  |
| initial | truck at the door |  |  |  |
| truck at the door | catered | catering.completed |  |  |
| initial | cleaning |  |  |  |
| cleaning | cleaned | cleaning.completed |  |  |
| initial | power connected |  |  |  |
| power connected | water serviced | water.completed |  |  |
| water serviced | power disconnected | gpu.disconnected |  |  |

## Airport operations › Work order

*machine · subject `workOrder.status` · transitions complete*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| awaiting parts |  |  |  |
| in progress |  |  |  |
| raised |  |  |  |
| triaged |  |  |  |
| done |  | success, terminal |  |
| rejected |  | stopped, terminal |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | raised |  |  |  |
| raised | triaged | work.triaged |  |  |
| raised | rejected | work.rejected |  |  |
| triaged | in progress | work.started |  |  |
| in progress | awaiting parts | work.partsNeeded |  |  |
| awaiting parts | in progress | work.partsArrived |  |  |
| in progress | done | work.completed |  | emit stand.returned |

## Notify passengers

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| notified | emit |  |
| nod_notifyEnd | end |  |
| nod_notifyStart | start |  |
| push, SMS and e-mail | call |  |
| who is booked | call |  |

| From | To | What |
| --- | --- | --- |
| start | who is booked |  |
| who is booked | push, SMS and e-mail |  |
| push, SMS and e-mail | notified |  |
| notified | end |  |

## Turnaround procedure

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| chocks and cones | assign |  |
| catered | wait |  |
| cleaned | wait |  |
| deboarded | wait |  |
| turnaround completed | emit |  |
| nod_procEnd | end |  |
| fuelled | wait |  |
| Ground handler | participant |  |
| holds closed | wait |  |
| holds empty | wait |  |
| nod_procStart | start |  |
| all teams | parallel |  |
| all done | join |  |

| From | To | What |
| --- | --- | --- |
| start | chocks and cones |  |
| chocks and cones | all teams |  |
| all teams | deboarded |  |
| all teams | catered |  |
| all teams | holds empty |  |
| all teams | fuelled |  |
| deboarded | cleaned |  |
| holds empty | holds closed |  |
| cleaned | all done |  |
| catered | all done |  |
| holds closed | all done |  |
| fuelled | all done |  |
| all done | turnaround completed |  |
| turnaround completed | end |  |

## Findings

| Code | Severity | Finding | On |
| --- | --- | --- | --- |
| L1 | medium | Wayfinding still polls the old displays feed | Old displays feed, Wayfinding |
| B2 | low | No-shows' bags wait two hours before they count as mishandled | offloaded |
