# Airport operations — Statewright AI pack

This is a generated summary of the Statewright document `prj_airportOperations` (format 1.4). Read the Statewright guide (`npx statewright guide`) before changing it, change it only through commands (`statewright apply`), and reference elements by the IDs below.

## Glossary

| ID | Kind | Name | Where |
| --- | --- | --- | --- |
| `act_chargeTheMovement` | action | Charge the movement |  |
| `act_notifyPassengers` | action | Notify passengers |  |
| `act_publishToDisplays` | action | Publish to displays |  |
| `act_releaseTheStand` | action | Release the stand |  |
| `act_requestDeIcing` | action | Request de-icing |  |
| `act_runTheTurnaround` | action | Run the turnaround |  |
| `cmt_holdingLimit` | comment | cmt_holdingLimit |  |
| `cmt_reclaimSizes` | comment | cmt_reclaimSizes |  |
| `cmt_remoteBoarding` | comment | cmt_remoteBoarding |  |
| `cmt_terminalD` | comment | cmt_terminalD |  |
| `cnv_airfieldSurface` | canvas | Airfield surface |  |
| `cnv_airportOperations` | canvas | Airport operations |  |
| `cnv_alarmResolution` | canvas | Alarm resolution |  |
| `cnv_aodbIntegrations` | canvas | Operations database |  |
| `cnv_bagLifecycle` | canvas | Bag lifecycle |  |
| `cnv_beltNetwork` | canvas | Belt network |  |
| `cnv_billOneOperator` | canvas | Bill one operator |  |
| `cnv_boardOneGroup` | canvas | Board one group |  |
| `cnv_boardOnePassenger` | canvas | Board one passenger |  |
| `cnv_boardingPhases` | canvas | Boarding phases |  |
| `cnv_boardingProcedure` | canvas | Boarding procedure |  |
| `cnv_borderCheck` | canvas | Border check |  |
| `cnv_cabinCleaning` | canvas | Cabin cleaning |  |
| `cnv_checkInHalls` | canvas | Check-in halls |  |
| `cnv_climbOut` | canvas | Climb out |  |
| `cnv_deIcingProcedure` | canvas | De-icing |  |
| `cnv_disruptionDesk` | canvas | Disruption desk |  |
| `cnv_emergencyDesk` | canvas | Emergency desk |  |
| `cnv_findMissing` | canvas | Find the missing |  |
| `cnv_flightAlerts` | canvas | Flight alerts |  |
| `cnv_flightLifecycle` | canvas | Flight lifecycle |  |
| `cnv_fuelling` | canvas | Into-plane fuelling |  |
| `cnv_gateBoarding` | canvas | Gate boarding |  |
| `cnv_hallAlevel` | canvas | Terminal A hall |  |
| `cnv_hallBlevel` | canvas | Terminal B hall |  |
| `cnv_hallClevel` | canvas | Terminal C hall |  |
| `cnv_hallDlevel` | canvas | Terminal D hall |  |
| `cnv_lostItem` | canvas | Lost item |  |
| `cnv_monthlyBilling` | canvas | Monthly billing |  |
| `cnv_notifyPassengers` | canvas | Notify passengers |  |
| `cnv_offloadNoShows` | canvas | Offload the no-shows' bags |  |
| `cnv_offloadOneBag` | canvas | Offload one bag |  |
| `cnv_parkingStay` | canvas | Parking stay |  |
| `cnv_passengerJourney` | canvas | Passenger journey |  |
| `cnv_screeningHalls` | canvas | Screening halls |  |
| `cnv_secondaryInspection` | canvas | Secondary inspection |  |
| `cnv_securityLane` | canvas | Security lane |  |
| `cnv_standLifecycle` | canvas | Stand lifecycle |  |
| `cnv_standPlan` | canvas | Stands and gates |  |
| `cnv_turnaroundMilestones` | canvas | Turnaround milestones |  |
| `cnv_turnaroundProcedure` | canvas | Turnaround procedure |  |
| `cnv_workOrder` | canvas | Work order |  |
| `def_gateBoarding` | definition | Gate boarding |  |
| `def_standLifecycle` | definition | Stand lifecycle |  |
| `ept_acceptABag` | endpoint | Accept a bag |  |
| `ept_alertTheHospitals` | endpoint | Alert the hospitals |  |
| `ept_allocateAStand` | endpoint | Allocate a stand |  |
| `ept_announce` | endpoint | Announce |  |
| `ept_boardingList` | endpoint | Boarding list |  |
| `ept_chargeAnOperator` | endpoint | Charge an operator |  |
| `ept_checkAPassengerIn` | endpoint | Check a passenger in |  |
| `ept_checkATraveller` | endpoint | Check a traveller |  |
| `ept_directions` | endpoint | Directions |  |
| `ept_findBags` | endpoint | Find bags |  |
| `ept_fuelReceipt` | endpoint | Fuel receipt |  |
| `ept_movements` | endpoint | Movements |  |
| `ept_publishASchedule` | endpoint | Publish a schedule |  |
| `ept_readAFlight` | endpoint | Read a flight |  |
| `ept_recordABoarding` | endpoint | Record a boarding |  |
| `ept_recordAMilestone` | endpoint | Record a milestone |  |
| `ept_sendAPush` | endpoint | Send a push |  |
| `ept_visaRecord` | endpoint | Visa record |  |
| `ept_weather` | endpoint | Weather |  |
| `evt_aircraftAccident` | event | aircraft.accident |  |
| `evt_aircraftAirborne` | event | aircraft.airborne |  |
| `evt_aircraftLanded` | event | aircraft.landed |  |
| `evt_aircraftLandedSafely` | event | aircraft.landedSafely |  |
| `evt_aircraftOffBlock` | event | aircraft.offBlock |  |
| `evt_aircraftOnBlock` | event | aircraft.onBlock |  |
| `evt_aircraftReturning` | event | aircraft.returning |  |
| `evt_bagCleared` | event | bag.cleared |  |
| `evt_bagDropped` | event | bag.dropped |  |
| `evt_bagEarly` | event | bag.early |  |
| `evt_bagEncoded` | event | bag.encoded |  |
| `evt_bagInducted` | event | bag.inducted |  |
| `evt_bagJam` | event | bag.jam |  |
| `evt_bagLoaded` | event | bag.loaded |  |
| `evt_bagMoved` | event | bag.moved |  |
| `evt_bagNoRead` | event | bag.noRead |  |
| `evt_bagProcessed` | event | bag.processed |  |
| `evt_bagReflighted` | event | bag.reflighted |  |
| `evt_bagRejected` | event | bag.rejected |  |
| `evt_bagReleased` | event | bag.released |  |
| `evt_bagRush` | event | bag.rush |  |
| `evt_bagScreened` | event | bag.screened |  |
| `evt_bagSorted` | event | bag.sorted |  |
| `evt_bagSourceMessage` | event | bag.sourceMessage |  |
| `evt_bagTransferMessage` | event | bag.transferMessage |  |
| `evt_bagTransferred` | event | bag.transferred |  |
| `evt_bagsOffloaded` | event | bags.offloaded |  |
| `evt_boardingDenied` | event | boarding.denied |  |
| `evt_boardingFinalCall` | event | boarding.finalCall |  |
| `evt_boardingGeneral` | event | boarding.general |  |
| `evt_boardingResumed` | event | boarding.resumed |  |
| `evt_boardingStarted` | event | boarding.started |  |
| `evt_boardingSuspended` | event | boarding.suspended |  |
| `evt_borderCleared` | event | border.cleared |  |
| `evt_cabinReady` | event | cabin.ready |  |
| `evt_cateringCompleted` | event | catering.completed |  |
| `evt_chargeFailed` | event | charge.failed |  |
| `evt_chargeSucceeded` | event | charge.succeeded |  |
| `evt_cleaningCompleted` | event | cleaning.completed |  |
| `evt_ctotIssued` | event | ctot.issued |  |
| `evt_ctotRevised` | event | ctot.revised |  |
| `evt_deboardingCompleted` | event | deboarding.completed |  |
| `evt_deicingCompleted` | event | deicing.completed |  |
| `evt_deicingPadAssigned` | event | deicing.padAssigned |  |
| `evt_deicingRequested` | event | deicing.requested |  |
| `evt_disruptionLocal` | event | disruption.local |  |
| `evt_disruptionMajor` | event | disruption.major |  |
| `evt_disruptionReported` | event | disruption.reported |  |
| `evt_disruptionResolved` | event | disruption.resolved |  |
| `evt_doorsClosed` | event | doors.closed |  |
| `evt_dpiSent` | event | dpi.sent |  |
| `evt_emergencyClosed` | event | emergency.closed |  |
| `evt_emergencyDeclared` | event | emergency.declared |  |
| `evt_emergencyEscalated` | event | emergency.escalated |  |
| `evt_flightCancelled` | event | flight.cancelled |  |
| `evt_flightDelayed` | event | flight.delayed |  |
| `evt_flightDiverted` | event | flight.diverted |  |
| `evt_flightUpdated` | event | flight.updated |  |
| `evt_flowMeasure` | event | flow.measure |  |
| `evt_fuelCompleted` | event | fuel.completed |  |
| `evt_fuelOrdered` | event | fuel.ordered |  |
| `evt_fuelStarted` | event | fuel.started |  |
| `evt_fuelTruckAssigned` | event | fuel.truckAssigned |  |
| `evt_gateChanged` | event | gate.changed |  |
| `evt_gateClosed` | event | gate.closed |  |
| `evt_gpuDisconnected` | event | gpu.disconnected |  |
| `evt_handoffAccepted` | event | handoff.accepted |  |
| `evt_holdInstructed` | event | hold.instructed |  |
| `evt_holdReleased` | event | hold.released |  |
| `evt_holdsClosed` | event | holds.closed |  |
| `evt_itemCollected` | event | item.collected |  |
| `evt_itemMatched` | event | item.matched |  |
| `evt_laneBreak` | event | lane.break |  |
| `evt_laneClosed` | event | lane.closed |  |
| `evt_laneSelfTested` | event | lane.selfTested |  |
| `evt_laneStaffed` | event | lane.staffed |  |
| `evt_loadingStarted` | event | loading.started |  |
| `evt_loadsheetAccepted` | event | loadsheet.accepted |  |
| `evt_offloadCompleted` | event | offload.completed |  |
| `evt_passengerAtGate` | event | passenger.atGate |  |
| `evt_passengerBoarded` | event | passenger.boarded |  |
| `evt_passengerCheckedIn` | event | passenger.checkedIn |  |
| `evt_passengerNotified` | event | passenger.notified |  |
| `evt_passengerScreened` | event | passenger.screened |  |
| `evt_queueLong` | event | queue.long |  |
| `evt_queueNormal` | event | queue.normal |  |
| `evt_routeJoined` | event | route.joined |  |
| `evt_screeningAlarm` | event | screening.alarm |  |
| `evt_searchClear` | event | search.clear |  |
| `evt_searchStarted` | event | search.started |  |
| `evt_searchSuspicious` | event | search.suspicious |  |
| `evt_standAllocated` | event | stand.allocated |  |
| `evt_standDeallocated` | event | stand.deallocated |  |
| `evt_standInspected` | event | stand.inspected |  |
| `evt_standOutOfService` | event | stand.outOfService |  |
| `evt_standReturned` | event | stand.returned |  |
| `evt_stayExited` | event | stay.exited |  |
| `evt_stayPaid` | event | stay.paid |  |
| `evt_taxiStarted` | event | taxi.started |  |
| `evt_traceNegative` | event | trace.negative |  |
| `evt_tracePositive` | event | trace.positive |  |
| `evt_turnaroundCompleted` | event | turnaround.completed |  |
| `evt_waterCompleted` | event | water.completed |  |
| `evt_weatherObservation` | event | weather.observation |  |
| `evt_weatherWarning` | event | weather.warning |  |
| `evt_workCompleted` | event | work.completed |  |
| `evt_workPartsArrived` | event | work.partsArrived |  |
| `evt_workPartsNeeded` | event | work.partsNeeded |  |
| `evt_workRejected` | event | work.rejected |  |
| `evt_workStarted` | event | work.started |  |
| `evt_workTriaged` | event | work.triaged |  |
| `fnd_legacyFeed` | finding | L1 |  |
| `fnd_noShowWindow` | finding | B2 |  |
| `grd_cleared` | guard | Cleared |  |
| `grd_icingConditions` | guard | Icing conditions |  |
| `lck_alarmResolution` | lock | lck_alarmResolution |  |
| `lck_flightLifecycle` | lock | lck_flightLifecycle |  |
| `lck_sorterA` | lock | lck_sorterA |  |
| `lne_cabinLane` | lane | Cabin |  |
| `lne_fuelLane` | lane | Fuel supplier |  |
| `lne_gateLane` | lane | Gate agent |  |
| `lne_rampLane` | lane | Ramp |  |
| `nod_accepted` | state node | accepted | `cnv_bagLifecycle` |
| `nod_acdmAdapter` | service node | A-CDM adapter | `cnv_aodbIntegrations` |
| `nod_airTrafficControl` | external node | Air traffic control | `cnv_airportOperations` |
| `nod_airborneFlight` | state node | airborne | `cnv_flightLifecycle` |
| `nod_aircraftAccident` | state node | aircraft accident | `cnv_emergencyDesk` |
| `nod_airfield` | service node | Airfield guidance | `cnv_airportOperations` |
| `nod_airlineAgent` | actor node | Airline agent | `cnv_airportOperations` |
| `nod_airlineDcs` | external node | Airline DCS | `cnv_airportOperations` |
| `nod_airlineOpsControl` | external node | Airline ops control | `cnv_airportOperations` |
| `nod_airside` | state node | airside | `cnv_passengerJourney` |
| `nod_alarmCleared` | state node | cleared | `cnv_alarmResolution` |
| `nod_alarmStart` | initial node | nod_alarmStart | `cnv_alarmResolution` |
| `nod_alarmTableA1` | service node | Alarm table A1 | `cnv_screeningHalls` |
| `nod_alarmTableA10` | service node | Alarm table A10 | `cnv_screeningHalls` |
| `nod_alarmTableA2` | service node | Alarm table A2 | `cnv_screeningHalls` |
| `nod_alarmTableA3` | service node | Alarm table A3 | `cnv_screeningHalls` |
| `nod_alarmTableA4` | service node | Alarm table A4 | `cnv_screeningHalls` |
| `nod_alarmTableA5` | service node | Alarm table A5 | `cnv_screeningHalls` |
| `nod_alarmTableA6` | service node | Alarm table A6 | `cnv_screeningHalls` |
| `nod_alarmTableA7` | service node | Alarm table A7 | `cnv_screeningHalls` |
| `nod_alarmTableA8` | service node | Alarm table A8 | `cnv_screeningHalls` |
| `nod_alarmTableA9` | service node | Alarm table A9 | `cnv_screeningHalls` |
| `nod_alarmTableB1` | service node | Alarm table B1 | `cnv_screeningHalls` |
| `nod_alarmTableB10` | service node | Alarm table B10 | `cnv_screeningHalls` |
| `nod_alarmTableB2` | service node | Alarm table B2 | `cnv_screeningHalls` |
| `nod_alarmTableB3` | service node | Alarm table B3 | `cnv_screeningHalls` |
| `nod_alarmTableB4` | service node | Alarm table B4 | `cnv_screeningHalls` |
| `nod_alarmTableB5` | service node | Alarm table B5 | `cnv_screeningHalls` |
| `nod_alarmTableB6` | service node | Alarm table B6 | `cnv_screeningHalls` |
| `nod_alarmTableB7` | service node | Alarm table B7 | `cnv_screeningHalls` |
| `nod_alarmTableB8` | service node | Alarm table B8 | `cnv_screeningHalls` |
| `nod_alarmTableB9` | service node | Alarm table B9 | `cnv_screeningHalls` |
| `nod_alarmTableC1` | service node | Alarm table C1 | `cnv_screeningHalls` |
| `nod_alarmTableC10` | service node | Alarm table C10 | `cnv_screeningHalls` |
| `nod_alarmTableC2` | service node | Alarm table C2 | `cnv_screeningHalls` |
| `nod_alarmTableC3` | service node | Alarm table C3 | `cnv_screeningHalls` |
| `nod_alarmTableC4` | service node | Alarm table C4 | `cnv_screeningHalls` |
| `nod_alarmTableC5` | service node | Alarm table C5 | `cnv_screeningHalls` |
| `nod_alarmTableC6` | service node | Alarm table C6 | `cnv_screeningHalls` |
| `nod_alarmTableC7` | service node | Alarm table C7 | `cnv_screeningHalls` |
| `nod_alarmTableC8` | service node | Alarm table C8 | `cnv_screeningHalls` |
| `nod_alarmTableC9` | service node | Alarm table C9 | `cnv_screeningHalls` |
| `nod_alarmTableD1` | service node | Alarm table D1 | `cnv_screeningHalls` |
| `nod_alarmTableD2` | service node | Alarm table D2 | `cnv_screeningHalls` |
| `nod_alarmTableD3` | service node | Alarm table D3 | `cnv_screeningHalls` |
| `nod_alarmTableD4` | service node | Alarm table D4 | `cnv_screeningHalls` |
| `nod_alarmTableD5` | service node | Alarm table D5 | `cnv_screeningHalls` |
| `nod_alarmTableD6` | service node | Alarm table D6 | `cnv_screeningHalls` |
| `nod_alarmTableD7` | service node | Alarm table D7 | `cnv_screeningHalls` |
| `nod_alarmTableD8` | service node | Alarm table D8 | `cnv_screeningHalls` |
| `nod_alertBoarding` | call node | boarding has started | `cnv_flightAlerts` |
| `nod_alertCancelled` | call node | your flight is cancelled | `cnv_flightAlerts` |
| `nod_alertDelay` | call node | your flight is delayed | `cnv_flightAlerts` |
| `nod_alertEnd` | end node | nod_alertEnd | `cnv_flightAlerts` |
| `nod_alertGate` | call node | your gate changed | `cnv_flightAlerts` |
| `nod_alertStart` | start node | nod_alertStart | `cnv_flightAlerts` |
| `nod_alertsQueue` | queue node | Alerts | `cnv_airportOperations` |
| `nod_announce` | call node | announce boarding | `cnv_boardingProcedure` |
| `nod_anyCancel` | any node | any status | `cnv_flightLifecycle` |
| `nod_anyoneMissing` | while node | while someone is missing | `cnv_boardingProcedure` |
| `nod_aodb` | service node | Operations database | `cnv_airportOperations` |
| `nod_aodbBus` | queue node | Integration bus | `cnv_aodbIntegrations` |
| `nod_apocDuty` | actor node | Duty manager | `cnv_airportOperations` |
| `nod_apron1` | service node | Apron 1 · terminal A | `cnv_standPlan` |
| `nod_apron2` | service node | Apron 2 · terminal B | `cnv_standPlan` |
| `nod_apron3` | service node | Apron 3 · terminal C | `cnv_standPlan` |
| `nod_apron4` | service node | Apron 4 · terminal D | `cnv_standPlan` |
| `nod_apron5` | service node | Apron 5 · remote | `cnv_standPlan` |
| `nod_apronBuses` | service node | Apron buses | `cnv_standPlan` |
| `nod_arrivalsApron` | actor node | Arrivals crew | `cnv_beltNetwork` |
| `nod_assessStart` | start node | nod_assessStart | `cnv_disruptionDesk` |
| `nod_assessing` | state node | assessing | `cnv_disruptionDesk` |
| `nod_atGate` | state node | at the gate | `cnv_passengerJourney` |
| `nod_awaitingParts` | state node | awaiting parts | `cnv_workOrder` |
| `nod_bagDropped` | state node | bag dropped | `cnv_passengerJourney` |
| `nod_bagHandler` | participant node | Ground handler | `cnv_bagLifecycle` |
| `nod_bagMessages` | queue node | Bag messages | `cnv_airportOperations` |
| `nod_bagOutEnd` | end node | nod_bagOutEnd | `cnv_offloadOneBag` |
| `nod_bagOutStart` | start node | nod_bagOutStart | `cnv_offloadOneBag` |
| `nod_bagPassenger` | participant node | Passenger | `cnv_bagLifecycle` |
| `nod_bagStart` | initial node | nod_bagStart | `cnv_bagLifecycle` |
| `nod_baggageHandling` | service node | Baggage handling | `cnv_airportOperations` |
| `nod_bags` | store node | Bags | `cnv_airportOperations` |
| `nod_bagsRegionHoldsClosed` | state node | holds closed | `cnv_turnaroundMilestones` |
| `nod_bagsRegionHoldsEmpty` | state node | holds empty | `cnv_turnaroundMilestones` |
| `nod_bagsRegionLoadingBags` | state node | loading | `cnv_turnaroundMilestones` |
| `nod_bagsRegionOffloadingBags` | state node | offloading | `cnv_turnaroundMilestones` |
| `nod_bagsRegionStart` | initial node | nod_bagsRegionStart | `cnv_turnaroundMilestones` |
| `nod_billEnd` | end node | nod_billEnd | `cnv_monthlyBilling` |
| `nod_billStart` | start node | nod_billStart | `cnv_monthlyBilling` |
| `nod_billing` | service node | Aeronautical billing | `cnv_airportOperations` |
| `nod_billingAdapter` | service node | Billing export | `cnv_aodbIntegrations` |
| `nod_boardEnd` | end node | boarded | `cnv_boardingProcedure` |
| `nod_boardFail` | end node | flight held | `cnv_boardingProcedure` |
| `nod_boardStart` | start node | nod_boardStart | `cnv_boardingProcedure` |
| `nod_boarded` | emit node | boarded | `cnv_boardOnePassenger` |
| `nod_boarding` | service node | Boarding | `cnv_airportOperations` |
| `nod_boardingFlight` | state node | boarding | `cnv_flightLifecycle` |
| `nod_boardingStopped` | state node | stopped at the gate | `cnv_boardingPhases` |
| `nod_bodyA1` | service node | Body scanner A1 | `cnv_screeningHalls` |
| `nod_bodyA10` | service node | Body scanner A10 | `cnv_screeningHalls` |
| `nod_bodyA2` | service node | Body scanner A2 | `cnv_screeningHalls` |
| `nod_bodyA3` | service node | Body scanner A3 | `cnv_screeningHalls` |
| `nod_bodyA4` | service node | Body scanner A4 | `cnv_screeningHalls` |
| `nod_bodyA5` | service node | Body scanner A5 | `cnv_screeningHalls` |
| `nod_bodyA6` | service node | Body scanner A6 | `cnv_screeningHalls` |
| `nod_bodyA7` | service node | Body scanner A7 | `cnv_screeningHalls` |
| `nod_bodyA8` | service node | Body scanner A8 | `cnv_screeningHalls` |
| `nod_bodyA9` | service node | Body scanner A9 | `cnv_screeningHalls` |
| `nod_bodyB1` | service node | Body scanner B1 | `cnv_screeningHalls` |
| `nod_bodyB10` | service node | Body scanner B10 | `cnv_screeningHalls` |
| `nod_bodyB2` | service node | Body scanner B2 | `cnv_screeningHalls` |
| `nod_bodyB3` | service node | Body scanner B3 | `cnv_screeningHalls` |
| `nod_bodyB4` | service node | Body scanner B4 | `cnv_screeningHalls` |
| `nod_bodyB5` | service node | Body scanner B5 | `cnv_screeningHalls` |
| `nod_bodyB6` | service node | Body scanner B6 | `cnv_screeningHalls` |
| `nod_bodyB7` | service node | Body scanner B7 | `cnv_screeningHalls` |
| `nod_bodyB8` | service node | Body scanner B8 | `cnv_screeningHalls` |
| `nod_bodyB9` | service node | Body scanner B9 | `cnv_screeningHalls` |
| `nod_bodyC1` | service node | Body scanner C1 | `cnv_screeningHalls` |
| `nod_bodyC10` | service node | Body scanner C10 | `cnv_screeningHalls` |
| `nod_bodyC2` | service node | Body scanner C2 | `cnv_screeningHalls` |
| `nod_bodyC3` | service node | Body scanner C3 | `cnv_screeningHalls` |
| `nod_bodyC4` | service node | Body scanner C4 | `cnv_screeningHalls` |
| `nod_bodyC5` | service node | Body scanner C5 | `cnv_screeningHalls` |
| `nod_bodyC6` | service node | Body scanner C6 | `cnv_screeningHalls` |
| `nod_bodyC7` | service node | Body scanner C7 | `cnv_screeningHalls` |
| `nod_bodyC8` | service node | Body scanner C8 | `cnv_screeningHalls` |
| `nod_bodyC9` | service node | Body scanner C9 | `cnv_screeningHalls` |
| `nod_bodyD1` | service node | Body scanner D1 | `cnv_screeningHalls` |
| `nod_bodyD2` | service node | Body scanner D2 | `cnv_screeningHalls` |
| `nod_bodyD3` | service node | Body scanner D3 | `cnv_screeningHalls` |
| `nod_bodyD4` | service node | Body scanner D4 | `cnv_screeningHalls` |
| `nod_bodyD5` | service node | Body scanner D5 | `cnv_screeningHalls` |
| `nod_bodyD6` | service node | Body scanner D6 | `cnv_screeningHalls` |
| `nod_bodyD7` | service node | Body scanner D7 | `cnv_screeningHalls` |
| `nod_bodyD8` | service node | Body scanner D8 | `cnv_screeningHalls` |
| `nod_booked` | state node | booked | `cnv_passengerJourney` |
| `nod_borderControl` | service node | Border control | `cnv_airportOperations` |
| `nod_borderEnd` | end node | nod_borderEnd | `cnv_borderCheck` |
| `nod_borderPassed` | state node | border passed | `cnv_passengerJourney` |
| `nod_borderPoliceExt` | external node | Border police | `cnv_airportOperations` |
| `nod_borderStart` | start node | nod_borderStart | `cnv_borderCheck` |
| `nod_callFire` | emit node | fire and rescue | `cnv_emergencyDesk` |
| `nod_callGroup` | call node | call the group | `cnv_boardOneGroup` |
| `nod_callHospitals` | call node | the hospitals | `cnv_emergencyDesk` |
| `nod_callOut` | parallel node | call out | `cnv_emergencyDesk` |
| `nod_callOutEnd` | end node | nod_callOutEnd | `cnv_emergencyDesk` |
| `nod_callOutStart` | start node | nod_callOutStart | `cnv_emergencyDesk` |
| `nod_callPolice` | call node | the police | `cnv_emergencyDesk` |
| `nod_calledOut` | join node | nod_calledOut | `cnv_emergencyDesk` |
| `nod_cancelledFlight` | state node | cancelled | `cnv_flightLifecycle` |
| `nod_cateringCompany` | external node | Catering company | `cnv_airportOperations` |
| `nod_cateringRegionCatered` | state node | catered | `cnv_turnaroundMilestones` |
| `nod_cateringRegionCateringArrived` | state node | truck at the door | `cnv_turnaroundMilestones` |
| `nod_cateringRegionStart` | initial node | nod_cateringRegionStart | `cnv_turnaroundMilestones` |
| `nod_charge` | call node | charge the operator | `cnv_billOneOperator` |
| `nod_checkIn` | service node | Check-in and bag drop | `cnv_airportOperations` |
| `nod_checkInClosed` | state node | check-in closed | `cnv_flightLifecycle` |
| `nod_checkInOpen` | state node | check-in open | `cnv_flightLifecycle` |
| `nod_checkVisa` | call node | check the visa | `cnv_borderCheck` |
| `nod_checkedIn` | state node | checked in | `cnv_passengerJourney` |
| `nod_cleanDone` | emit node | cabin clean | `cnv_cabinCleaning` |
| `nod_cleanEnd` | end node | nod_cleanEnd | `cnv_cabinCleaning` |
| `nod_cleanKind` | switch node | which clean? | `cnv_cabinCleaning` |
| `nod_cleanStart` | start node | nod_cleanStart | `cnv_cabinCleaning` |
| `nod_cleaningRegionCleaned` | state node | cleaned | `cnv_turnaroundMilestones` |
| `nod_cleaningRegionCleaningCabin` | state node | cleaning | `cnv_turnaroundMilestones` |
| `nod_cleaningRegionStart` | initial node | nod_cleaningRegionStart | `cnv_turnaroundMilestones` |
| `nod_cleaningService` | service node | Cabin cleaning | `cnv_airportOperations` |
| `nod_climbStart` | initial node | nod_climbStart | `cnv_climbOut` |
| `nod_closeDoors` | emit node | doors closed | `cnv_boardingProcedure` |
| `nod_collectorA1x1` | service node | Collector A1-1 | `cnv_beltNetwork` |
| `nod_collectorA1x10` | service node | Collector A1-10 | `cnv_beltNetwork` |
| `nod_collectorA1x11` | service node | Collector A1-11 | `cnv_beltNetwork` |
| `nod_collectorA1x12` | service node | Collector A1-12 | `cnv_beltNetwork` |
| `nod_collectorA1x2` | service node | Collector A1-2 | `cnv_beltNetwork` |
| `nod_collectorA1x3` | service node | Collector A1-3 | `cnv_beltNetwork` |
| `nod_collectorA1x4` | service node | Collector A1-4 | `cnv_beltNetwork` |
| `nod_collectorA1x5` | service node | Collector A1-5 | `cnv_beltNetwork` |
| `nod_collectorA1x6` | service node | Collector A1-6 | `cnv_beltNetwork` |
| `nod_collectorA1x7` | service node | Collector A1-7 | `cnv_beltNetwork` |
| `nod_collectorA1x8` | service node | Collector A1-8 | `cnv_beltNetwork` |
| `nod_collectorA1x9` | service node | Collector A1-9 | `cnv_beltNetwork` |
| `nod_collectorA2x1` | service node | Collector A2-1 | `cnv_beltNetwork` |
| `nod_collectorA2x10` | service node | Collector A2-10 | `cnv_beltNetwork` |
| `nod_collectorA2x11` | service node | Collector A2-11 | `cnv_beltNetwork` |
| `nod_collectorA2x12` | service node | Collector A2-12 | `cnv_beltNetwork` |
| `nod_collectorA2x2` | service node | Collector A2-2 | `cnv_beltNetwork` |
| `nod_collectorA2x3` | service node | Collector A2-3 | `cnv_beltNetwork` |
| `nod_collectorA2x4` | service node | Collector A2-4 | `cnv_beltNetwork` |
| `nod_collectorA2x5` | service node | Collector A2-5 | `cnv_beltNetwork` |
| `nod_collectorA2x6` | service node | Collector A2-6 | `cnv_beltNetwork` |
| `nod_collectorA2x7` | service node | Collector A2-7 | `cnv_beltNetwork` |
| `nod_collectorA2x8` | service node | Collector A2-8 | `cnv_beltNetwork` |
| `nod_collectorA2x9` | service node | Collector A2-9 | `cnv_beltNetwork` |
| `nod_collectorA3x1` | service node | Collector A3-1 | `cnv_beltNetwork` |
| `nod_collectorA3x10` | service node | Collector A3-10 | `cnv_beltNetwork` |
| `nod_collectorA3x11` | service node | Collector A3-11 | `cnv_beltNetwork` |
| `nod_collectorA3x12` | service node | Collector A3-12 | `cnv_beltNetwork` |
| `nod_collectorA3x2` | service node | Collector A3-2 | `cnv_beltNetwork` |
| `nod_collectorA3x3` | service node | Collector A3-3 | `cnv_beltNetwork` |
| `nod_collectorA3x4` | service node | Collector A3-4 | `cnv_beltNetwork` |
| `nod_collectorA3x5` | service node | Collector A3-5 | `cnv_beltNetwork` |
| `nod_collectorA3x6` | service node | Collector A3-6 | `cnv_beltNetwork` |
| `nod_collectorA3x7` | service node | Collector A3-7 | `cnv_beltNetwork` |
| `nod_collectorA3x8` | service node | Collector A3-8 | `cnv_beltNetwork` |
| `nod_collectorA3x9` | service node | Collector A3-9 | `cnv_beltNetwork` |
| `nod_collectorA4x1` | service node | Collector A4-1 | `cnv_beltNetwork` |
| `nod_collectorA4x10` | service node | Collector A4-10 | `cnv_beltNetwork` |
| `nod_collectorA4x11` | service node | Collector A4-11 | `cnv_beltNetwork` |
| `nod_collectorA4x12` | service node | Collector A4-12 | `cnv_beltNetwork` |
| `nod_collectorA4x2` | service node | Collector A4-2 | `cnv_beltNetwork` |
| `nod_collectorA4x3` | service node | Collector A4-3 | `cnv_beltNetwork` |
| `nod_collectorA4x4` | service node | Collector A4-4 | `cnv_beltNetwork` |
| `nod_collectorA4x5` | service node | Collector A4-5 | `cnv_beltNetwork` |
| `nod_collectorA4x6` | service node | Collector A4-6 | `cnv_beltNetwork` |
| `nod_collectorA4x7` | service node | Collector A4-7 | `cnv_beltNetwork` |
| `nod_collectorA4x8` | service node | Collector A4-8 | `cnv_beltNetwork` |
| `nod_collectorA4x9` | service node | Collector A4-9 | `cnv_beltNetwork` |
| `nod_collectorA5x1` | service node | Collector A5-1 | `cnv_beltNetwork` |
| `nod_collectorA5x10` | service node | Collector A5-10 | `cnv_beltNetwork` |
| `nod_collectorA5x11` | service node | Collector A5-11 | `cnv_beltNetwork` |
| `nod_collectorA5x12` | service node | Collector A5-12 | `cnv_beltNetwork` |
| `nod_collectorA5x2` | service node | Collector A5-2 | `cnv_beltNetwork` |
| `nod_collectorA5x3` | service node | Collector A5-3 | `cnv_beltNetwork` |
| `nod_collectorA5x4` | service node | Collector A5-4 | `cnv_beltNetwork` |
| `nod_collectorA5x5` | service node | Collector A5-5 | `cnv_beltNetwork` |
| `nod_collectorA5x6` | service node | Collector A5-6 | `cnv_beltNetwork` |
| `nod_collectorA5x7` | service node | Collector A5-7 | `cnv_beltNetwork` |
| `nod_collectorA5x8` | service node | Collector A5-8 | `cnv_beltNetwork` |
| `nod_collectorA5x9` | service node | Collector A5-9 | `cnv_beltNetwork` |
| `nod_collectorA6x1` | service node | Collector A6-1 | `cnv_beltNetwork` |
| `nod_collectorA6x10` | service node | Collector A6-10 | `cnv_beltNetwork` |
| `nod_collectorA6x11` | service node | Collector A6-11 | `cnv_beltNetwork` |
| `nod_collectorA6x12` | service node | Collector A6-12 | `cnv_beltNetwork` |
| `nod_collectorA6x2` | service node | Collector A6-2 | `cnv_beltNetwork` |
| `nod_collectorA6x3` | service node | Collector A6-3 | `cnv_beltNetwork` |
| `nod_collectorA6x4` | service node | Collector A6-4 | `cnv_beltNetwork` |
| `nod_collectorA6x5` | service node | Collector A6-5 | `cnv_beltNetwork` |
| `nod_collectorA6x6` | service node | Collector A6-6 | `cnv_beltNetwork` |
| `nod_collectorA6x7` | service node | Collector A6-7 | `cnv_beltNetwork` |
| `nod_collectorA6x8` | service node | Collector A6-8 | `cnv_beltNetwork` |
| `nod_collectorA6x9` | service node | Collector A6-9 | `cnv_beltNetwork` |
| `nod_collectorB1x1` | service node | Collector B1-1 | `cnv_beltNetwork` |
| `nod_collectorB1x10` | service node | Collector B1-10 | `cnv_beltNetwork` |
| `nod_collectorB1x11` | service node | Collector B1-11 | `cnv_beltNetwork` |
| `nod_collectorB1x12` | service node | Collector B1-12 | `cnv_beltNetwork` |
| `nod_collectorB1x2` | service node | Collector B1-2 | `cnv_beltNetwork` |
| `nod_collectorB1x3` | service node | Collector B1-3 | `cnv_beltNetwork` |
| `nod_collectorB1x4` | service node | Collector B1-4 | `cnv_beltNetwork` |
| `nod_collectorB1x5` | service node | Collector B1-5 | `cnv_beltNetwork` |
| `nod_collectorB1x6` | service node | Collector B1-6 | `cnv_beltNetwork` |
| `nod_collectorB1x7` | service node | Collector B1-7 | `cnv_beltNetwork` |
| `nod_collectorB1x8` | service node | Collector B1-8 | `cnv_beltNetwork` |
| `nod_collectorB1x9` | service node | Collector B1-9 | `cnv_beltNetwork` |
| `nod_collectorB2x1` | service node | Collector B2-1 | `cnv_beltNetwork` |
| `nod_collectorB2x10` | service node | Collector B2-10 | `cnv_beltNetwork` |
| `nod_collectorB2x11` | service node | Collector B2-11 | `cnv_beltNetwork` |
| `nod_collectorB2x12` | service node | Collector B2-12 | `cnv_beltNetwork` |
| `nod_collectorB2x2` | service node | Collector B2-2 | `cnv_beltNetwork` |
| `nod_collectorB2x3` | service node | Collector B2-3 | `cnv_beltNetwork` |
| `nod_collectorB2x4` | service node | Collector B2-4 | `cnv_beltNetwork` |
| `nod_collectorB2x5` | service node | Collector B2-5 | `cnv_beltNetwork` |
| `nod_collectorB2x6` | service node | Collector B2-6 | `cnv_beltNetwork` |
| `nod_collectorB2x7` | service node | Collector B2-7 | `cnv_beltNetwork` |
| `nod_collectorB2x8` | service node | Collector B2-8 | `cnv_beltNetwork` |
| `nod_collectorB2x9` | service node | Collector B2-9 | `cnv_beltNetwork` |
| `nod_collectorB3x1` | service node | Collector B3-1 | `cnv_beltNetwork` |
| `nod_collectorB3x10` | service node | Collector B3-10 | `cnv_beltNetwork` |
| `nod_collectorB3x11` | service node | Collector B3-11 | `cnv_beltNetwork` |
| `nod_collectorB3x12` | service node | Collector B3-12 | `cnv_beltNetwork` |
| `nod_collectorB3x2` | service node | Collector B3-2 | `cnv_beltNetwork` |
| `nod_collectorB3x3` | service node | Collector B3-3 | `cnv_beltNetwork` |
| `nod_collectorB3x4` | service node | Collector B3-4 | `cnv_beltNetwork` |
| `nod_collectorB3x5` | service node | Collector B3-5 | `cnv_beltNetwork` |
| `nod_collectorB3x6` | service node | Collector B3-6 | `cnv_beltNetwork` |
| `nod_collectorB3x7` | service node | Collector B3-7 | `cnv_beltNetwork` |
| `nod_collectorB3x8` | service node | Collector B3-8 | `cnv_beltNetwork` |
| `nod_collectorB3x9` | service node | Collector B3-9 | `cnv_beltNetwork` |
| `nod_collectorB4x1` | service node | Collector B4-1 | `cnv_beltNetwork` |
| `nod_collectorB4x10` | service node | Collector B4-10 | `cnv_beltNetwork` |
| `nod_collectorB4x11` | service node | Collector B4-11 | `cnv_beltNetwork` |
| `nod_collectorB4x12` | service node | Collector B4-12 | `cnv_beltNetwork` |
| `nod_collectorB4x2` | service node | Collector B4-2 | `cnv_beltNetwork` |
| `nod_collectorB4x3` | service node | Collector B4-3 | `cnv_beltNetwork` |
| `nod_collectorB4x4` | service node | Collector B4-4 | `cnv_beltNetwork` |
| `nod_collectorB4x5` | service node | Collector B4-5 | `cnv_beltNetwork` |
| `nod_collectorB4x6` | service node | Collector B4-6 | `cnv_beltNetwork` |
| `nod_collectorB4x7` | service node | Collector B4-7 | `cnv_beltNetwork` |
| `nod_collectorB4x8` | service node | Collector B4-8 | `cnv_beltNetwork` |
| `nod_collectorB4x9` | service node | Collector B4-9 | `cnv_beltNetwork` |
| `nod_collectorB5x1` | service node | Collector B5-1 | `cnv_beltNetwork` |
| `nod_collectorB5x10` | service node | Collector B5-10 | `cnv_beltNetwork` |
| `nod_collectorB5x11` | service node | Collector B5-11 | `cnv_beltNetwork` |
| `nod_collectorB5x12` | service node | Collector B5-12 | `cnv_beltNetwork` |
| `nod_collectorB5x2` | service node | Collector B5-2 | `cnv_beltNetwork` |
| `nod_collectorB5x3` | service node | Collector B5-3 | `cnv_beltNetwork` |
| `nod_collectorB5x4` | service node | Collector B5-4 | `cnv_beltNetwork` |
| `nod_collectorB5x5` | service node | Collector B5-5 | `cnv_beltNetwork` |
| `nod_collectorB5x6` | service node | Collector B5-6 | `cnv_beltNetwork` |
| `nod_collectorB5x7` | service node | Collector B5-7 | `cnv_beltNetwork` |
| `nod_collectorB5x8` | service node | Collector B5-8 | `cnv_beltNetwork` |
| `nod_collectorB5x9` | service node | Collector B5-9 | `cnv_beltNetwork` |
| `nod_collectorB6x1` | service node | Collector B6-1 | `cnv_beltNetwork` |
| `nod_collectorB6x10` | service node | Collector B6-10 | `cnv_beltNetwork` |
| `nod_collectorB6x11` | service node | Collector B6-11 | `cnv_beltNetwork` |
| `nod_collectorB6x12` | service node | Collector B6-12 | `cnv_beltNetwork` |
| `nod_collectorB6x2` | service node | Collector B6-2 | `cnv_beltNetwork` |
| `nod_collectorB6x3` | service node | Collector B6-3 | `cnv_beltNetwork` |
| `nod_collectorB6x4` | service node | Collector B6-4 | `cnv_beltNetwork` |
| `nod_collectorB6x5` | service node | Collector B6-5 | `cnv_beltNetwork` |
| `nod_collectorB6x6` | service node | Collector B6-6 | `cnv_beltNetwork` |
| `nod_collectorB6x7` | service node | Collector B6-7 | `cnv_beltNetwork` |
| `nod_collectorB6x8` | service node | Collector B6-8 | `cnv_beltNetwork` |
| `nod_collectorB6x9` | service node | Collector B6-9 | `cnv_beltNetwork` |
| `nod_collectorC1x1` | service node | Collector C1-1 | `cnv_beltNetwork` |
| `nod_collectorC1x10` | service node | Collector C1-10 | `cnv_beltNetwork` |
| `nod_collectorC1x11` | service node | Collector C1-11 | `cnv_beltNetwork` |
| `nod_collectorC1x12` | service node | Collector C1-12 | `cnv_beltNetwork` |
| `nod_collectorC1x2` | service node | Collector C1-2 | `cnv_beltNetwork` |
| `nod_collectorC1x3` | service node | Collector C1-3 | `cnv_beltNetwork` |
| `nod_collectorC1x4` | service node | Collector C1-4 | `cnv_beltNetwork` |
| `nod_collectorC1x5` | service node | Collector C1-5 | `cnv_beltNetwork` |
| `nod_collectorC1x6` | service node | Collector C1-6 | `cnv_beltNetwork` |
| `nod_collectorC1x7` | service node | Collector C1-7 | `cnv_beltNetwork` |
| `nod_collectorC1x8` | service node | Collector C1-8 | `cnv_beltNetwork` |
| `nod_collectorC1x9` | service node | Collector C1-9 | `cnv_beltNetwork` |
| `nod_collectorC2x1` | service node | Collector C2-1 | `cnv_beltNetwork` |
| `nod_collectorC2x10` | service node | Collector C2-10 | `cnv_beltNetwork` |
| `nod_collectorC2x11` | service node | Collector C2-11 | `cnv_beltNetwork` |
| `nod_collectorC2x12` | service node | Collector C2-12 | `cnv_beltNetwork` |
| `nod_collectorC2x2` | service node | Collector C2-2 | `cnv_beltNetwork` |
| `nod_collectorC2x3` | service node | Collector C2-3 | `cnv_beltNetwork` |
| `nod_collectorC2x4` | service node | Collector C2-4 | `cnv_beltNetwork` |
| `nod_collectorC2x5` | service node | Collector C2-5 | `cnv_beltNetwork` |
| `nod_collectorC2x6` | service node | Collector C2-6 | `cnv_beltNetwork` |
| `nod_collectorC2x7` | service node | Collector C2-7 | `cnv_beltNetwork` |
| `nod_collectorC2x8` | service node | Collector C2-8 | `cnv_beltNetwork` |
| `nod_collectorC2x9` | service node | Collector C2-9 | `cnv_beltNetwork` |
| `nod_collectorC3x1` | service node | Collector C3-1 | `cnv_beltNetwork` |
| `nod_collectorC3x10` | service node | Collector C3-10 | `cnv_beltNetwork` |
| `nod_collectorC3x11` | service node | Collector C3-11 | `cnv_beltNetwork` |
| `nod_collectorC3x12` | service node | Collector C3-12 | `cnv_beltNetwork` |
| `nod_collectorC3x2` | service node | Collector C3-2 | `cnv_beltNetwork` |
| `nod_collectorC3x3` | service node | Collector C3-3 | `cnv_beltNetwork` |
| `nod_collectorC3x4` | service node | Collector C3-4 | `cnv_beltNetwork` |
| `nod_collectorC3x5` | service node | Collector C3-5 | `cnv_beltNetwork` |
| `nod_collectorC3x6` | service node | Collector C3-6 | `cnv_beltNetwork` |
| `nod_collectorC3x7` | service node | Collector C3-7 | `cnv_beltNetwork` |
| `nod_collectorC3x8` | service node | Collector C3-8 | `cnv_beltNetwork` |
| `nod_collectorC3x9` | service node | Collector C3-9 | `cnv_beltNetwork` |
| `nod_collectorC4x1` | service node | Collector C4-1 | `cnv_beltNetwork` |
| `nod_collectorC4x10` | service node | Collector C4-10 | `cnv_beltNetwork` |
| `nod_collectorC4x11` | service node | Collector C4-11 | `cnv_beltNetwork` |
| `nod_collectorC4x12` | service node | Collector C4-12 | `cnv_beltNetwork` |
| `nod_collectorC4x2` | service node | Collector C4-2 | `cnv_beltNetwork` |
| `nod_collectorC4x3` | service node | Collector C4-3 | `cnv_beltNetwork` |
| `nod_collectorC4x4` | service node | Collector C4-4 | `cnv_beltNetwork` |
| `nod_collectorC4x5` | service node | Collector C4-5 | `cnv_beltNetwork` |
| `nod_collectorC4x6` | service node | Collector C4-6 | `cnv_beltNetwork` |
| `nod_collectorC4x7` | service node | Collector C4-7 | `cnv_beltNetwork` |
| `nod_collectorC4x8` | service node | Collector C4-8 | `cnv_beltNetwork` |
| `nod_collectorC4x9` | service node | Collector C4-9 | `cnv_beltNetwork` |
| `nod_collectorC5x1` | service node | Collector C5-1 | `cnv_beltNetwork` |
| `nod_collectorC5x10` | service node | Collector C5-10 | `cnv_beltNetwork` |
| `nod_collectorC5x11` | service node | Collector C5-11 | `cnv_beltNetwork` |
| `nod_collectorC5x12` | service node | Collector C5-12 | `cnv_beltNetwork` |
| `nod_collectorC5x2` | service node | Collector C5-2 | `cnv_beltNetwork` |
| `nod_collectorC5x3` | service node | Collector C5-3 | `cnv_beltNetwork` |
| `nod_collectorC5x4` | service node | Collector C5-4 | `cnv_beltNetwork` |
| `nod_collectorC5x5` | service node | Collector C5-5 | `cnv_beltNetwork` |
| `nod_collectorC5x6` | service node | Collector C5-6 | `cnv_beltNetwork` |
| `nod_collectorC5x7` | service node | Collector C5-7 | `cnv_beltNetwork` |
| `nod_collectorC5x8` | service node | Collector C5-8 | `cnv_beltNetwork` |
| `nod_collectorC5x9` | service node | Collector C5-9 | `cnv_beltNetwork` |
| `nod_collectorC6x1` | service node | Collector C6-1 | `cnv_beltNetwork` |
| `nod_collectorC6x10` | service node | Collector C6-10 | `cnv_beltNetwork` |
| `nod_collectorC6x11` | service node | Collector C6-11 | `cnv_beltNetwork` |
| `nod_collectorC6x12` | service node | Collector C6-12 | `cnv_beltNetwork` |
| `nod_collectorC6x2` | service node | Collector C6-2 | `cnv_beltNetwork` |
| `nod_collectorC6x3` | service node | Collector C6-3 | `cnv_beltNetwork` |
| `nod_collectorC6x4` | service node | Collector C6-4 | `cnv_beltNetwork` |
| `nod_collectorC6x5` | service node | Collector C6-5 | `cnv_beltNetwork` |
| `nod_collectorC6x6` | service node | Collector C6-6 | `cnv_beltNetwork` |
| `nod_collectorC6x7` | service node | Collector C6-7 | `cnv_beltNetwork` |
| `nod_collectorC6x8` | service node | Collector C6-8 | `cnv_beltNetwork` |
| `nod_collectorC6x9` | service node | Collector C6-9 | `cnv_beltNetwork` |
| `nod_collectorD1x1` | service node | Collector D1-1 | `cnv_beltNetwork` |
| `nod_collectorD1x10` | service node | Collector D1-10 | `cnv_beltNetwork` |
| `nod_collectorD1x11` | service node | Collector D1-11 | `cnv_beltNetwork` |
| `nod_collectorD1x12` | service node | Collector D1-12 | `cnv_beltNetwork` |
| `nod_collectorD1x2` | service node | Collector D1-2 | `cnv_beltNetwork` |
| `nod_collectorD1x3` | service node | Collector D1-3 | `cnv_beltNetwork` |
| `nod_collectorD1x4` | service node | Collector D1-4 | `cnv_beltNetwork` |
| `nod_collectorD1x5` | service node | Collector D1-5 | `cnv_beltNetwork` |
| `nod_collectorD1x6` | service node | Collector D1-6 | `cnv_beltNetwork` |
| `nod_collectorD1x7` | service node | Collector D1-7 | `cnv_beltNetwork` |
| `nod_collectorD1x8` | service node | Collector D1-8 | `cnv_beltNetwork` |
| `nod_collectorD1x9` | service node | Collector D1-9 | `cnv_beltNetwork` |
| `nod_collectorD2x1` | service node | Collector D2-1 | `cnv_beltNetwork` |
| `nod_collectorD2x10` | service node | Collector D2-10 | `cnv_beltNetwork` |
| `nod_collectorD2x11` | service node | Collector D2-11 | `cnv_beltNetwork` |
| `nod_collectorD2x12` | service node | Collector D2-12 | `cnv_beltNetwork` |
| `nod_collectorD2x2` | service node | Collector D2-2 | `cnv_beltNetwork` |
| `nod_collectorD2x3` | service node | Collector D2-3 | `cnv_beltNetwork` |
| `nod_collectorD2x4` | service node | Collector D2-4 | `cnv_beltNetwork` |
| `nod_collectorD2x5` | service node | Collector D2-5 | `cnv_beltNetwork` |
| `nod_collectorD2x6` | service node | Collector D2-6 | `cnv_beltNetwork` |
| `nod_collectorD2x7` | service node | Collector D2-7 | `cnv_beltNetwork` |
| `nod_collectorD2x8` | service node | Collector D2-8 | `cnv_beltNetwork` |
| `nod_collectorD2x9` | service node | Collector D2-9 | `cnv_beltNetwork` |
| `nod_collectorD3x1` | service node | Collector D3-1 | `cnv_beltNetwork` |
| `nod_collectorD3x10` | service node | Collector D3-10 | `cnv_beltNetwork` |
| `nod_collectorD3x11` | service node | Collector D3-11 | `cnv_beltNetwork` |
| `nod_collectorD3x12` | service node | Collector D3-12 | `cnv_beltNetwork` |
| `nod_collectorD3x2` | service node | Collector D3-2 | `cnv_beltNetwork` |
| `nod_collectorD3x3` | service node | Collector D3-3 | `cnv_beltNetwork` |
| `nod_collectorD3x4` | service node | Collector D3-4 | `cnv_beltNetwork` |
| `nod_collectorD3x5` | service node | Collector D3-5 | `cnv_beltNetwork` |
| `nod_collectorD3x6` | service node | Collector D3-6 | `cnv_beltNetwork` |
| `nod_collectorD3x7` | service node | Collector D3-7 | `cnv_beltNetwork` |
| `nod_collectorD3x8` | service node | Collector D3-8 | `cnv_beltNetwork` |
| `nod_collectorD3x9` | service node | Collector D3-9 | `cnv_beltNetwork` |
| `nod_collectorD4x1` | service node | Collector D4-1 | `cnv_beltNetwork` |
| `nod_collectorD4x10` | service node | Collector D4-10 | `cnv_beltNetwork` |
| `nod_collectorD4x11` | service node | Collector D4-11 | `cnv_beltNetwork` |
| `nod_collectorD4x12` | service node | Collector D4-12 | `cnv_beltNetwork` |
| `nod_collectorD4x2` | service node | Collector D4-2 | `cnv_beltNetwork` |
| `nod_collectorD4x3` | service node | Collector D4-3 | `cnv_beltNetwork` |
| `nod_collectorD4x4` | service node | Collector D4-4 | `cnv_beltNetwork` |
| `nod_collectorD4x5` | service node | Collector D4-5 | `cnv_beltNetwork` |
| `nod_collectorD4x6` | service node | Collector D4-6 | `cnv_beltNetwork` |
| `nod_collectorD4x7` | service node | Collector D4-7 | `cnv_beltNetwork` |
| `nod_collectorD4x8` | service node | Collector D4-8 | `cnv_beltNetwork` |
| `nod_collectorD4x9` | service node | Collector D4-9 | `cnv_beltNetwork` |
| `nod_collectorD5x1` | service node | Collector D5-1 | `cnv_beltNetwork` |
| `nod_collectorD5x10` | service node | Collector D5-10 | `cnv_beltNetwork` |
| `nod_collectorD5x11` | service node | Collector D5-11 | `cnv_beltNetwork` |
| `nod_collectorD5x12` | service node | Collector D5-12 | `cnv_beltNetwork` |
| `nod_collectorD5x2` | service node | Collector D5-2 | `cnv_beltNetwork` |
| `nod_collectorD5x3` | service node | Collector D5-3 | `cnv_beltNetwork` |
| `nod_collectorD5x4` | service node | Collector D5-4 | `cnv_beltNetwork` |
| `nod_collectorD5x5` | service node | Collector D5-5 | `cnv_beltNetwork` |
| `nod_collectorD5x6` | service node | Collector D5-6 | `cnv_beltNetwork` |
| `nod_collectorD5x7` | service node | Collector D5-7 | `cnv_beltNetwork` |
| `nod_collectorD5x8` | service node | Collector D5-8 | `cnv_beltNetwork` |
| `nod_collectorD5x9` | service node | Collector D5-9 | `cnv_beltNetwork` |
| `nod_collectorD6x1` | service node | Collector D6-1 | `cnv_beltNetwork` |
| `nod_collectorD6x10` | service node | Collector D6-10 | `cnv_beltNetwork` |
| `nod_collectorD6x11` | service node | Collector D6-11 | `cnv_beltNetwork` |
| `nod_collectorD6x12` | service node | Collector D6-12 | `cnv_beltNetwork` |
| `nod_collectorD6x2` | service node | Collector D6-2 | `cnv_beltNetwork` |
| `nod_collectorD6x3` | service node | Collector D6-3 | `cnv_beltNetwork` |
| `nod_collectorD6x4` | service node | Collector D6-4 | `cnv_beltNetwork` |
| `nod_collectorD6x5` | service node | Collector D6-5 | `cnv_beltNetwork` |
| `nod_collectorD6x6` | service node | Collector D6-6 | `cnv_beltNetwork` |
| `nod_collectorD6x7` | service node | Collector D6-7 | `cnv_beltNetwork` |
| `nod_collectorD6x8` | service node | Collector D6-8 | `cnv_beltNetwork` |
| `nod_collectorD6x9` | service node | Collector D6-9 | `cnv_beltNetwork` |
| `nod_conditions` | switch node | conditions? | `cnv_deIcingProcedure` |
| `nod_countMissing` | assign node | count again | `cnv_findMissing` |
| `nod_cross11` | service node | Crossing 11 | `cnv_airfieldSurface` |
| `nod_cross15` | service node | Crossing 15 | `cnv_airfieldSurface` |
| `nod_cross3` | service node | Crossing 3 | `cnv_airfieldSurface` |
| `nod_cross7` | service node | Crossing 7 | `cnv_airfieldSurface` |
| `nod_ctA1` | service node | CT scanner A1 | `cnv_screeningHalls` |
| `nod_ctA10` | service node | CT scanner A10 | `cnv_screeningHalls` |
| `nod_ctA2` | service node | CT scanner A2 | `cnv_screeningHalls` |
| `nod_ctA3` | service node | CT scanner A3 | `cnv_screeningHalls` |
| `nod_ctA4` | service node | CT scanner A4 | `cnv_screeningHalls` |
| `nod_ctA5` | service node | CT scanner A5 | `cnv_screeningHalls` |
| `nod_ctA6` | service node | CT scanner A6 | `cnv_screeningHalls` |
| `nod_ctA7` | service node | CT scanner A7 | `cnv_screeningHalls` |
| `nod_ctA8` | service node | CT scanner A8 | `cnv_screeningHalls` |
| `nod_ctA9` | service node | CT scanner A9 | `cnv_screeningHalls` |
| `nod_ctB1` | service node | CT scanner B1 | `cnv_screeningHalls` |
| `nod_ctB10` | service node | CT scanner B10 | `cnv_screeningHalls` |
| `nod_ctB2` | service node | CT scanner B2 | `cnv_screeningHalls` |
| `nod_ctB3` | service node | CT scanner B3 | `cnv_screeningHalls` |
| `nod_ctB4` | service node | CT scanner B4 | `cnv_screeningHalls` |
| `nod_ctB5` | service node | CT scanner B5 | `cnv_screeningHalls` |
| `nod_ctB6` | service node | CT scanner B6 | `cnv_screeningHalls` |
| `nod_ctB7` | service node | CT scanner B7 | `cnv_screeningHalls` |
| `nod_ctB8` | service node | CT scanner B8 | `cnv_screeningHalls` |
| `nod_ctB9` | service node | CT scanner B9 | `cnv_screeningHalls` |
| `nod_ctC1` | service node | CT scanner C1 | `cnv_screeningHalls` |
| `nod_ctC10` | service node | CT scanner C10 | `cnv_screeningHalls` |
| `nod_ctC2` | service node | CT scanner C2 | `cnv_screeningHalls` |
| `nod_ctC3` | service node | CT scanner C3 | `cnv_screeningHalls` |
| `nod_ctC4` | service node | CT scanner C4 | `cnv_screeningHalls` |
| `nod_ctC5` | service node | CT scanner C5 | `cnv_screeningHalls` |
| `nod_ctC6` | service node | CT scanner C6 | `cnv_screeningHalls` |
| `nod_ctC7` | service node | CT scanner C7 | `cnv_screeningHalls` |
| `nod_ctC8` | service node | CT scanner C8 | `cnv_screeningHalls` |
| `nod_ctC9` | service node | CT scanner C9 | `cnv_screeningHalls` |
| `nod_ctD1` | service node | CT scanner D1 | `cnv_screeningHalls` |
| `nod_ctD2` | service node | CT scanner D2 | `cnv_screeningHalls` |
| `nod_ctD3` | service node | CT scanner D3 | `cnv_screeningHalls` |
| `nod_ctD4` | service node | CT scanner D4 | `cnv_screeningHalls` |
| `nod_ctD5` | service node | CT scanner D5 | `cnv_screeningHalls` |
| `nod_ctD6` | service node | CT scanner D6 | `cnv_screeningHalls` |
| `nod_ctD7` | service node | CT scanner D7 | `cnv_screeningHalls` |
| `nod_ctD8` | service node | CT scanner D8 | `cnv_screeningHalls` |
| `nod_cupps` | service node | Common-use platform | `cnv_checkInHalls` |
| `nod_customsCheck` | call node | customs check | `cnv_secondaryInspection` |
| `nod_customsExt` | external node | Customs | `cnv_airportOperations` |
| `nod_deIcing` | service node | De-icing | `cnv_airportOperations` |
| `nod_deIcingFlight` | state node | de-icing | `cnv_flightLifecycle` |
| `nod_declareMajor` | emit node | declare a major disruption | `cnv_disruptionDesk` |
| `nod_deepClean` | call node | deep clean | `cnv_cabinCleaning` |
| `nod_delayedFlight` | state node | delayed | `cnv_flightLifecycle` |
| `nod_deniedBoarding` | state node | denied boarding | `cnv_passengerJourney` |
| `nod_departed` | state node | departed | `cnv_flightLifecycle` |
| `nod_departureRoute` | state node | on the departure route | `cnv_climbOut` |
| `nod_deskA1x1` | service node | Desk A1 | `cnv_hallAlevel` |
| `nod_deskA1x10` | service node | Desk A10 | `cnv_hallAlevel` |
| `nod_deskA1x11` | service node | Desk A11 | `cnv_hallAlevel` |
| `nod_deskA1x12` | service node | Desk A12 | `cnv_hallAlevel` |
| `nod_deskA1x2` | service node | Desk A2 | `cnv_hallAlevel` |
| `nod_deskA1x3` | service node | Desk A3 | `cnv_hallAlevel` |
| `nod_deskA1x4` | service node | Desk A4 | `cnv_hallAlevel` |
| `nod_deskA1x5` | service node | Desk A5 | `cnv_hallAlevel` |
| `nod_deskA1x6` | service node | Desk A6 | `cnv_hallAlevel` |
| `nod_deskA1x7` | service node | Desk A7 | `cnv_hallAlevel` |
| `nod_deskA1x8` | service node | Desk A8 | `cnv_hallAlevel` |
| `nod_deskA1x9` | service node | Desk A9 | `cnv_hallAlevel` |
| `nod_deskA2x1` | service node | Desk A13 | `cnv_hallAlevel` |
| `nod_deskA2x10` | service node | Desk A22 | `cnv_hallAlevel` |
| `nod_deskA2x11` | service node | Desk A23 | `cnv_hallAlevel` |
| `nod_deskA2x12` | service node | Desk A24 | `cnv_hallAlevel` |
| `nod_deskA2x2` | service node | Desk A14 | `cnv_hallAlevel` |
| `nod_deskA2x3` | service node | Desk A15 | `cnv_hallAlevel` |
| `nod_deskA2x4` | service node | Desk A16 | `cnv_hallAlevel` |
| `nod_deskA2x5` | service node | Desk A17 | `cnv_hallAlevel` |
| `nod_deskA2x6` | service node | Desk A18 | `cnv_hallAlevel` |
| `nod_deskA2x7` | service node | Desk A19 | `cnv_hallAlevel` |
| `nod_deskA2x8` | service node | Desk A20 | `cnv_hallAlevel` |
| `nod_deskA2x9` | service node | Desk A21 | `cnv_hallAlevel` |
| `nod_deskA3x1` | service node | Desk A25 | `cnv_hallAlevel` |
| `nod_deskA3x10` | service node | Desk A34 | `cnv_hallAlevel` |
| `nod_deskA3x11` | service node | Desk A35 | `cnv_hallAlevel` |
| `nod_deskA3x12` | service node | Desk A36 | `cnv_hallAlevel` |
| `nod_deskA3x2` | service node | Desk A26 | `cnv_hallAlevel` |
| `nod_deskA3x3` | service node | Desk A27 | `cnv_hallAlevel` |
| `nod_deskA3x4` | service node | Desk A28 | `cnv_hallAlevel` |
| `nod_deskA3x5` | service node | Desk A29 | `cnv_hallAlevel` |
| `nod_deskA3x6` | service node | Desk A30 | `cnv_hallAlevel` |
| `nod_deskA3x7` | service node | Desk A31 | `cnv_hallAlevel` |
| `nod_deskA3x8` | service node | Desk A32 | `cnv_hallAlevel` |
| `nod_deskA3x9` | service node | Desk A33 | `cnv_hallAlevel` |
| `nod_deskA4x1` | service node | Desk A37 | `cnv_hallAlevel` |
| `nod_deskA4x10` | service node | Desk A46 | `cnv_hallAlevel` |
| `nod_deskA4x11` | service node | Desk A47 | `cnv_hallAlevel` |
| `nod_deskA4x12` | service node | Desk A48 | `cnv_hallAlevel` |
| `nod_deskA4x2` | service node | Desk A38 | `cnv_hallAlevel` |
| `nod_deskA4x3` | service node | Desk A39 | `cnv_hallAlevel` |
| `nod_deskA4x4` | service node | Desk A40 | `cnv_hallAlevel` |
| `nod_deskA4x5` | service node | Desk A41 | `cnv_hallAlevel` |
| `nod_deskA4x6` | service node | Desk A42 | `cnv_hallAlevel` |
| `nod_deskA4x7` | service node | Desk A43 | `cnv_hallAlevel` |
| `nod_deskA4x8` | service node | Desk A44 | `cnv_hallAlevel` |
| `nod_deskA4x9` | service node | Desk A45 | `cnv_hallAlevel` |
| `nod_deskA5x1` | service node | Desk A49 | `cnv_hallAlevel` |
| `nod_deskA5x10` | service node | Desk A58 | `cnv_hallAlevel` |
| `nod_deskA5x11` | service node | Desk A59 | `cnv_hallAlevel` |
| `nod_deskA5x12` | service node | Desk A60 | `cnv_hallAlevel` |
| `nod_deskA5x2` | service node | Desk A50 | `cnv_hallAlevel` |
| `nod_deskA5x3` | service node | Desk A51 | `cnv_hallAlevel` |
| `nod_deskA5x4` | service node | Desk A52 | `cnv_hallAlevel` |
| `nod_deskA5x5` | service node | Desk A53 | `cnv_hallAlevel` |
| `nod_deskA5x6` | service node | Desk A54 | `cnv_hallAlevel` |
| `nod_deskA5x7` | service node | Desk A55 | `cnv_hallAlevel` |
| `nod_deskA5x8` | service node | Desk A56 | `cnv_hallAlevel` |
| `nod_deskA5x9` | service node | Desk A57 | `cnv_hallAlevel` |
| `nod_deskA6x1` | service node | Desk A61 | `cnv_hallAlevel` |
| `nod_deskA6x10` | service node | Desk A70 | `cnv_hallAlevel` |
| `nod_deskA6x11` | service node | Desk A71 | `cnv_hallAlevel` |
| `nod_deskA6x12` | service node | Desk A72 | `cnv_hallAlevel` |
| `nod_deskA6x2` | service node | Desk A62 | `cnv_hallAlevel` |
| `nod_deskA6x3` | service node | Desk A63 | `cnv_hallAlevel` |
| `nod_deskA6x4` | service node | Desk A64 | `cnv_hallAlevel` |
| `nod_deskA6x5` | service node | Desk A65 | `cnv_hallAlevel` |
| `nod_deskA6x6` | service node | Desk A66 | `cnv_hallAlevel` |
| `nod_deskA6x7` | service node | Desk A67 | `cnv_hallAlevel` |
| `nod_deskA6x8` | service node | Desk A68 | `cnv_hallAlevel` |
| `nod_deskA6x9` | service node | Desk A69 | `cnv_hallAlevel` |
| `nod_deskB1x1` | service node | Desk B1 | `cnv_hallBlevel` |
| `nod_deskB1x10` | service node | Desk B10 | `cnv_hallBlevel` |
| `nod_deskB1x11` | service node | Desk B11 | `cnv_hallBlevel` |
| `nod_deskB1x12` | service node | Desk B12 | `cnv_hallBlevel` |
| `nod_deskB1x2` | service node | Desk B2 | `cnv_hallBlevel` |
| `nod_deskB1x3` | service node | Desk B3 | `cnv_hallBlevel` |
| `nod_deskB1x4` | service node | Desk B4 | `cnv_hallBlevel` |
| `nod_deskB1x5` | service node | Desk B5 | `cnv_hallBlevel` |
| `nod_deskB1x6` | service node | Desk B6 | `cnv_hallBlevel` |
| `nod_deskB1x7` | service node | Desk B7 | `cnv_hallBlevel` |
| `nod_deskB1x8` | service node | Desk B8 | `cnv_hallBlevel` |
| `nod_deskB1x9` | service node | Desk B9 | `cnv_hallBlevel` |
| `nod_deskB2x1` | service node | Desk B13 | `cnv_hallBlevel` |
| `nod_deskB2x10` | service node | Desk B22 | `cnv_hallBlevel` |
| `nod_deskB2x11` | service node | Desk B23 | `cnv_hallBlevel` |
| `nod_deskB2x12` | service node | Desk B24 | `cnv_hallBlevel` |
| `nod_deskB2x2` | service node | Desk B14 | `cnv_hallBlevel` |
| `nod_deskB2x3` | service node | Desk B15 | `cnv_hallBlevel` |
| `nod_deskB2x4` | service node | Desk B16 | `cnv_hallBlevel` |
| `nod_deskB2x5` | service node | Desk B17 | `cnv_hallBlevel` |
| `nod_deskB2x6` | service node | Desk B18 | `cnv_hallBlevel` |
| `nod_deskB2x7` | service node | Desk B19 | `cnv_hallBlevel` |
| `nod_deskB2x8` | service node | Desk B20 | `cnv_hallBlevel` |
| `nod_deskB2x9` | service node | Desk B21 | `cnv_hallBlevel` |
| `nod_deskB3x1` | service node | Desk B25 | `cnv_hallBlevel` |
| `nod_deskB3x10` | service node | Desk B34 | `cnv_hallBlevel` |
| `nod_deskB3x11` | service node | Desk B35 | `cnv_hallBlevel` |
| `nod_deskB3x12` | service node | Desk B36 | `cnv_hallBlevel` |
| `nod_deskB3x2` | service node | Desk B26 | `cnv_hallBlevel` |
| `nod_deskB3x3` | service node | Desk B27 | `cnv_hallBlevel` |
| `nod_deskB3x4` | service node | Desk B28 | `cnv_hallBlevel` |
| `nod_deskB3x5` | service node | Desk B29 | `cnv_hallBlevel` |
| `nod_deskB3x6` | service node | Desk B30 | `cnv_hallBlevel` |
| `nod_deskB3x7` | service node | Desk B31 | `cnv_hallBlevel` |
| `nod_deskB3x8` | service node | Desk B32 | `cnv_hallBlevel` |
| `nod_deskB3x9` | service node | Desk B33 | `cnv_hallBlevel` |
| `nod_deskB4x1` | service node | Desk B37 | `cnv_hallBlevel` |
| `nod_deskB4x10` | service node | Desk B46 | `cnv_hallBlevel` |
| `nod_deskB4x11` | service node | Desk B47 | `cnv_hallBlevel` |
| `nod_deskB4x12` | service node | Desk B48 | `cnv_hallBlevel` |
| `nod_deskB4x2` | service node | Desk B38 | `cnv_hallBlevel` |
| `nod_deskB4x3` | service node | Desk B39 | `cnv_hallBlevel` |
| `nod_deskB4x4` | service node | Desk B40 | `cnv_hallBlevel` |
| `nod_deskB4x5` | service node | Desk B41 | `cnv_hallBlevel` |
| `nod_deskB4x6` | service node | Desk B42 | `cnv_hallBlevel` |
| `nod_deskB4x7` | service node | Desk B43 | `cnv_hallBlevel` |
| `nod_deskB4x8` | service node | Desk B44 | `cnv_hallBlevel` |
| `nod_deskB4x9` | service node | Desk B45 | `cnv_hallBlevel` |
| `nod_deskB5x1` | service node | Desk B49 | `cnv_hallBlevel` |
| `nod_deskB5x10` | service node | Desk B58 | `cnv_hallBlevel` |
| `nod_deskB5x11` | service node | Desk B59 | `cnv_hallBlevel` |
| `nod_deskB5x12` | service node | Desk B60 | `cnv_hallBlevel` |
| `nod_deskB5x2` | service node | Desk B50 | `cnv_hallBlevel` |
| `nod_deskB5x3` | service node | Desk B51 | `cnv_hallBlevel` |
| `nod_deskB5x4` | service node | Desk B52 | `cnv_hallBlevel` |
| `nod_deskB5x5` | service node | Desk B53 | `cnv_hallBlevel` |
| `nod_deskB5x6` | service node | Desk B54 | `cnv_hallBlevel` |
| `nod_deskB5x7` | service node | Desk B55 | `cnv_hallBlevel` |
| `nod_deskB5x8` | service node | Desk B56 | `cnv_hallBlevel` |
| `nod_deskB5x9` | service node | Desk B57 | `cnv_hallBlevel` |
| `nod_deskB6x1` | service node | Desk B61 | `cnv_hallBlevel` |
| `nod_deskB6x10` | service node | Desk B70 | `cnv_hallBlevel` |
| `nod_deskB6x11` | service node | Desk B71 | `cnv_hallBlevel` |
| `nod_deskB6x12` | service node | Desk B72 | `cnv_hallBlevel` |
| `nod_deskB6x2` | service node | Desk B62 | `cnv_hallBlevel` |
| `nod_deskB6x3` | service node | Desk B63 | `cnv_hallBlevel` |
| `nod_deskB6x4` | service node | Desk B64 | `cnv_hallBlevel` |
| `nod_deskB6x5` | service node | Desk B65 | `cnv_hallBlevel` |
| `nod_deskB6x6` | service node | Desk B66 | `cnv_hallBlevel` |
| `nod_deskB6x7` | service node | Desk B67 | `cnv_hallBlevel` |
| `nod_deskB6x8` | service node | Desk B68 | `cnv_hallBlevel` |
| `nod_deskB6x9` | service node | Desk B69 | `cnv_hallBlevel` |
| `nod_deskC1x1` | service node | Desk C1 | `cnv_hallClevel` |
| `nod_deskC1x10` | service node | Desk C10 | `cnv_hallClevel` |
| `nod_deskC1x11` | service node | Desk C11 | `cnv_hallClevel` |
| `nod_deskC1x12` | service node | Desk C12 | `cnv_hallClevel` |
| `nod_deskC1x2` | service node | Desk C2 | `cnv_hallClevel` |
| `nod_deskC1x3` | service node | Desk C3 | `cnv_hallClevel` |
| `nod_deskC1x4` | service node | Desk C4 | `cnv_hallClevel` |
| `nod_deskC1x5` | service node | Desk C5 | `cnv_hallClevel` |
| `nod_deskC1x6` | service node | Desk C6 | `cnv_hallClevel` |
| `nod_deskC1x7` | service node | Desk C7 | `cnv_hallClevel` |
| `nod_deskC1x8` | service node | Desk C8 | `cnv_hallClevel` |
| `nod_deskC1x9` | service node | Desk C9 | `cnv_hallClevel` |
| `nod_deskC2x1` | service node | Desk C13 | `cnv_hallClevel` |
| `nod_deskC2x10` | service node | Desk C22 | `cnv_hallClevel` |
| `nod_deskC2x11` | service node | Desk C23 | `cnv_hallClevel` |
| `nod_deskC2x12` | service node | Desk C24 | `cnv_hallClevel` |
| `nod_deskC2x2` | service node | Desk C14 | `cnv_hallClevel` |
| `nod_deskC2x3` | service node | Desk C15 | `cnv_hallClevel` |
| `nod_deskC2x4` | service node | Desk C16 | `cnv_hallClevel` |
| `nod_deskC2x5` | service node | Desk C17 | `cnv_hallClevel` |
| `nod_deskC2x6` | service node | Desk C18 | `cnv_hallClevel` |
| `nod_deskC2x7` | service node | Desk C19 | `cnv_hallClevel` |
| `nod_deskC2x8` | service node | Desk C20 | `cnv_hallClevel` |
| `nod_deskC2x9` | service node | Desk C21 | `cnv_hallClevel` |
| `nod_deskC3x1` | service node | Desk C25 | `cnv_hallClevel` |
| `nod_deskC3x10` | service node | Desk C34 | `cnv_hallClevel` |
| `nod_deskC3x11` | service node | Desk C35 | `cnv_hallClevel` |
| `nod_deskC3x12` | service node | Desk C36 | `cnv_hallClevel` |
| `nod_deskC3x2` | service node | Desk C26 | `cnv_hallClevel` |
| `nod_deskC3x3` | service node | Desk C27 | `cnv_hallClevel` |
| `nod_deskC3x4` | service node | Desk C28 | `cnv_hallClevel` |
| `nod_deskC3x5` | service node | Desk C29 | `cnv_hallClevel` |
| `nod_deskC3x6` | service node | Desk C30 | `cnv_hallClevel` |
| `nod_deskC3x7` | service node | Desk C31 | `cnv_hallClevel` |
| `nod_deskC3x8` | service node | Desk C32 | `cnv_hallClevel` |
| `nod_deskC3x9` | service node | Desk C33 | `cnv_hallClevel` |
| `nod_deskC4x1` | service node | Desk C37 | `cnv_hallClevel` |
| `nod_deskC4x10` | service node | Desk C46 | `cnv_hallClevel` |
| `nod_deskC4x11` | service node | Desk C47 | `cnv_hallClevel` |
| `nod_deskC4x12` | service node | Desk C48 | `cnv_hallClevel` |
| `nod_deskC4x2` | service node | Desk C38 | `cnv_hallClevel` |
| `nod_deskC4x3` | service node | Desk C39 | `cnv_hallClevel` |
| `nod_deskC4x4` | service node | Desk C40 | `cnv_hallClevel` |
| `nod_deskC4x5` | service node | Desk C41 | `cnv_hallClevel` |
| `nod_deskC4x6` | service node | Desk C42 | `cnv_hallClevel` |
| `nod_deskC4x7` | service node | Desk C43 | `cnv_hallClevel` |
| `nod_deskC4x8` | service node | Desk C44 | `cnv_hallClevel` |
| `nod_deskC4x9` | service node | Desk C45 | `cnv_hallClevel` |
| `nod_deskC5x1` | service node | Desk C49 | `cnv_hallClevel` |
| `nod_deskC5x10` | service node | Desk C58 | `cnv_hallClevel` |
| `nod_deskC5x11` | service node | Desk C59 | `cnv_hallClevel` |
| `nod_deskC5x12` | service node | Desk C60 | `cnv_hallClevel` |
| `nod_deskC5x2` | service node | Desk C50 | `cnv_hallClevel` |
| `nod_deskC5x3` | service node | Desk C51 | `cnv_hallClevel` |
| `nod_deskC5x4` | service node | Desk C52 | `cnv_hallClevel` |
| `nod_deskC5x5` | service node | Desk C53 | `cnv_hallClevel` |
| `nod_deskC5x6` | service node | Desk C54 | `cnv_hallClevel` |
| `nod_deskC5x7` | service node | Desk C55 | `cnv_hallClevel` |
| `nod_deskC5x8` | service node | Desk C56 | `cnv_hallClevel` |
| `nod_deskC5x9` | service node | Desk C57 | `cnv_hallClevel` |
| `nod_deskC6x1` | service node | Desk C61 | `cnv_hallClevel` |
| `nod_deskC6x10` | service node | Desk C70 | `cnv_hallClevel` |
| `nod_deskC6x11` | service node | Desk C71 | `cnv_hallClevel` |
| `nod_deskC6x12` | service node | Desk C72 | `cnv_hallClevel` |
| `nod_deskC6x2` | service node | Desk C62 | `cnv_hallClevel` |
| `nod_deskC6x3` | service node | Desk C63 | `cnv_hallClevel` |
| `nod_deskC6x4` | service node | Desk C64 | `cnv_hallClevel` |
| `nod_deskC6x5` | service node | Desk C65 | `cnv_hallClevel` |
| `nod_deskC6x6` | service node | Desk C66 | `cnv_hallClevel` |
| `nod_deskC6x7` | service node | Desk C67 | `cnv_hallClevel` |
| `nod_deskC6x8` | service node | Desk C68 | `cnv_hallClevel` |
| `nod_deskC6x9` | service node | Desk C69 | `cnv_hallClevel` |
| `nod_deskD1x1` | service node | Desk D1 | `cnv_hallDlevel` |
| `nod_deskD1x10` | service node | Desk D10 | `cnv_hallDlevel` |
| `nod_deskD1x11` | service node | Desk D11 | `cnv_hallDlevel` |
| `nod_deskD1x12` | service node | Desk D12 | `cnv_hallDlevel` |
| `nod_deskD1x2` | service node | Desk D2 | `cnv_hallDlevel` |
| `nod_deskD1x3` | service node | Desk D3 | `cnv_hallDlevel` |
| `nod_deskD1x4` | service node | Desk D4 | `cnv_hallDlevel` |
| `nod_deskD1x5` | service node | Desk D5 | `cnv_hallDlevel` |
| `nod_deskD1x6` | service node | Desk D6 | `cnv_hallDlevel` |
| `nod_deskD1x7` | service node | Desk D7 | `cnv_hallDlevel` |
| `nod_deskD1x8` | service node | Desk D8 | `cnv_hallDlevel` |
| `nod_deskD1x9` | service node | Desk D9 | `cnv_hallDlevel` |
| `nod_deskD2x1` | service node | Desk D13 | `cnv_hallDlevel` |
| `nod_deskD2x10` | service node | Desk D22 | `cnv_hallDlevel` |
| `nod_deskD2x11` | service node | Desk D23 | `cnv_hallDlevel` |
| `nod_deskD2x12` | service node | Desk D24 | `cnv_hallDlevel` |
| `nod_deskD2x2` | service node | Desk D14 | `cnv_hallDlevel` |
| `nod_deskD2x3` | service node | Desk D15 | `cnv_hallDlevel` |
| `nod_deskD2x4` | service node | Desk D16 | `cnv_hallDlevel` |
| `nod_deskD2x5` | service node | Desk D17 | `cnv_hallDlevel` |
| `nod_deskD2x6` | service node | Desk D18 | `cnv_hallDlevel` |
| `nod_deskD2x7` | service node | Desk D19 | `cnv_hallDlevel` |
| `nod_deskD2x8` | service node | Desk D20 | `cnv_hallDlevel` |
| `nod_deskD2x9` | service node | Desk D21 | `cnv_hallDlevel` |
| `nod_deskD3x1` | service node | Desk D25 | `cnv_hallDlevel` |
| `nod_deskD3x10` | service node | Desk D34 | `cnv_hallDlevel` |
| `nod_deskD3x11` | service node | Desk D35 | `cnv_hallDlevel` |
| `nod_deskD3x12` | service node | Desk D36 | `cnv_hallDlevel` |
| `nod_deskD3x2` | service node | Desk D26 | `cnv_hallDlevel` |
| `nod_deskD3x3` | service node | Desk D27 | `cnv_hallDlevel` |
| `nod_deskD3x4` | service node | Desk D28 | `cnv_hallDlevel` |
| `nod_deskD3x5` | service node | Desk D29 | `cnv_hallDlevel` |
| `nod_deskD3x6` | service node | Desk D30 | `cnv_hallDlevel` |
| `nod_deskD3x7` | service node | Desk D31 | `cnv_hallDlevel` |
| `nod_deskD3x8` | service node | Desk D32 | `cnv_hallDlevel` |
| `nod_deskD3x9` | service node | Desk D33 | `cnv_hallDlevel` |
| `nod_deskD4x1` | service node | Desk D37 | `cnv_hallDlevel` |
| `nod_deskD4x10` | service node | Desk D46 | `cnv_hallDlevel` |
| `nod_deskD4x11` | service node | Desk D47 | `cnv_hallDlevel` |
| `nod_deskD4x12` | service node | Desk D48 | `cnv_hallDlevel` |
| `nod_deskD4x2` | service node | Desk D38 | `cnv_hallDlevel` |
| `nod_deskD4x3` | service node | Desk D39 | `cnv_hallDlevel` |
| `nod_deskD4x4` | service node | Desk D40 | `cnv_hallDlevel` |
| `nod_deskD4x5` | service node | Desk D41 | `cnv_hallDlevel` |
| `nod_deskD4x6` | service node | Desk D42 | `cnv_hallDlevel` |
| `nod_deskD4x7` | service node | Desk D43 | `cnv_hallDlevel` |
| `nod_deskD4x8` | service node | Desk D44 | `cnv_hallDlevel` |
| `nod_deskD4x9` | service node | Desk D45 | `cnv_hallDlevel` |
| `nod_deskD5x1` | service node | Desk D49 | `cnv_hallDlevel` |
| `nod_deskD5x10` | service node | Desk D58 | `cnv_hallDlevel` |
| `nod_deskD5x11` | service node | Desk D59 | `cnv_hallDlevel` |
| `nod_deskD5x12` | service node | Desk D60 | `cnv_hallDlevel` |
| `nod_deskD5x2` | service node | Desk D50 | `cnv_hallDlevel` |
| `nod_deskD5x3` | service node | Desk D51 | `cnv_hallDlevel` |
| `nod_deskD5x4` | service node | Desk D52 | `cnv_hallDlevel` |
| `nod_deskD5x5` | service node | Desk D53 | `cnv_hallDlevel` |
| `nod_deskD5x6` | service node | Desk D54 | `cnv_hallDlevel` |
| `nod_deskD5x7` | service node | Desk D55 | `cnv_hallDlevel` |
| `nod_deskD5x8` | service node | Desk D56 | `cnv_hallDlevel` |
| `nod_deskD5x9` | service node | Desk D57 | `cnv_hallDlevel` |
| `nod_deskD6x1` | service node | Desk D61 | `cnv_hallDlevel` |
| `nod_deskD6x10` | service node | Desk D70 | `cnv_hallDlevel` |
| `nod_deskD6x11` | service node | Desk D71 | `cnv_hallDlevel` |
| `nod_deskD6x12` | service node | Desk D72 | `cnv_hallDlevel` |
| `nod_deskD6x2` | service node | Desk D62 | `cnv_hallDlevel` |
| `nod_deskD6x3` | service node | Desk D63 | `cnv_hallDlevel` |
| `nod_deskD6x4` | service node | Desk D64 | `cnv_hallDlevel` |
| `nod_deskD6x5` | service node | Desk D65 | `cnv_hallDlevel` |
| `nod_deskD6x6` | service node | Desk D66 | `cnv_hallDlevel` |
| `nod_deskD6x7` | service node | Desk D67 | `cnv_hallDlevel` |
| `nod_deskD6x8` | service node | Desk D68 | `cnv_hallDlevel` |
| `nod_deskD6x9` | service node | Desk D69 | `cnv_hallDlevel` |
| `nod_deskNotifications` | service node | Notifications | `cnv_disruptionDesk` |
| `nod_desksA` | service node | Desk rows | `cnv_hallAlevel` |
| `nod_desksB` | service node | Desk rows | `cnv_hallBlevel` |
| `nod_desksC` | service node | Desk rows | `cnv_hallClevel` |
| `nod_desksD` | service node | Desk rows | `cnv_hallDlevel` |
| `nod_dispatchTruck` | emit node | truck assigned | `cnv_fuelling` |
| `nod_disruptionClosed` | state node | closed | `cnv_disruptionDesk` |
| `nod_disruptionOpen` | state node | open | `cnv_disruptionDesk` |
| `nod_disruptionStart` | initial node | nod_disruptionStart | `cnv_disruptionDesk` |
| `nod_divertedFlight` | state node | diverted | `cnv_flightLifecycle` |
| `nod_diverterA1` | service node | Diverter A1 | `cnv_beltNetwork` |
| `nod_diverterA10` | service node | Diverter A10 | `cnv_beltNetwork` |
| `nod_diverterA11` | service node | Diverter A11 | `cnv_beltNetwork` |
| `nod_diverterA12` | service node | Diverter A12 | `cnv_beltNetwork` |
| `nod_diverterA13` | service node | Diverter A13 | `cnv_beltNetwork` |
| `nod_diverterA14` | service node | Diverter A14 | `cnv_beltNetwork` |
| `nod_diverterA15` | service node | Diverter A15 | `cnv_beltNetwork` |
| `nod_diverterA16` | service node | Diverter A16 | `cnv_beltNetwork` |
| `nod_diverterA2` | service node | Diverter A2 | `cnv_beltNetwork` |
| `nod_diverterA3` | service node | Diverter A3 | `cnv_beltNetwork` |
| `nod_diverterA4` | service node | Diverter A4 | `cnv_beltNetwork` |
| `nod_diverterA5` | service node | Diverter A5 | `cnv_beltNetwork` |
| `nod_diverterA6` | service node | Diverter A6 | `cnv_beltNetwork` |
| `nod_diverterA7` | service node | Diverter A7 | `cnv_beltNetwork` |
| `nod_diverterA8` | service node | Diverter A8 | `cnv_beltNetwork` |
| `nod_diverterA9` | service node | Diverter A9 | `cnv_beltNetwork` |
| `nod_diverterB1` | service node | Diverter B1 | `cnv_beltNetwork` |
| `nod_diverterB10` | service node | Diverter B10 | `cnv_beltNetwork` |
| `nod_diverterB11` | service node | Diverter B11 | `cnv_beltNetwork` |
| `nod_diverterB12` | service node | Diverter B12 | `cnv_beltNetwork` |
| `nod_diverterB13` | service node | Diverter B13 | `cnv_beltNetwork` |
| `nod_diverterB14` | service node | Diverter B14 | `cnv_beltNetwork` |
| `nod_diverterB15` | service node | Diverter B15 | `cnv_beltNetwork` |
| `nod_diverterB16` | service node | Diverter B16 | `cnv_beltNetwork` |
| `nod_diverterB2` | service node | Diverter B2 | `cnv_beltNetwork` |
| `nod_diverterB3` | service node | Diverter B3 | `cnv_beltNetwork` |
| `nod_diverterB4` | service node | Diverter B4 | `cnv_beltNetwork` |
| `nod_diverterB5` | service node | Diverter B5 | `cnv_beltNetwork` |
| `nod_diverterB6` | service node | Diverter B6 | `cnv_beltNetwork` |
| `nod_diverterB7` | service node | Diverter B7 | `cnv_beltNetwork` |
| `nod_diverterB8` | service node | Diverter B8 | `cnv_beltNetwork` |
| `nod_diverterB9` | service node | Diverter B9 | `cnv_beltNetwork` |
| `nod_diverterC1` | service node | Diverter C1 | `cnv_beltNetwork` |
| `nod_diverterC10` | service node | Diverter C10 | `cnv_beltNetwork` |
| `nod_diverterC11` | service node | Diverter C11 | `cnv_beltNetwork` |
| `nod_diverterC12` | service node | Diverter C12 | `cnv_beltNetwork` |
| `nod_diverterC13` | service node | Diverter C13 | `cnv_beltNetwork` |
| `nod_diverterC14` | service node | Diverter C14 | `cnv_beltNetwork` |
| `nod_diverterC15` | service node | Diverter C15 | `cnv_beltNetwork` |
| `nod_diverterC16` | service node | Diverter C16 | `cnv_beltNetwork` |
| `nod_diverterC2` | service node | Diverter C2 | `cnv_beltNetwork` |
| `nod_diverterC3` | service node | Diverter C3 | `cnv_beltNetwork` |
| `nod_diverterC4` | service node | Diverter C4 | `cnv_beltNetwork` |
| `nod_diverterC5` | service node | Diverter C5 | `cnv_beltNetwork` |
| `nod_diverterC6` | service node | Diverter C6 | `cnv_beltNetwork` |
| `nod_diverterC7` | service node | Diverter C7 | `cnv_beltNetwork` |
| `nod_diverterC8` | service node | Diverter C8 | `cnv_beltNetwork` |
| `nod_diverterC9` | service node | Diverter C9 | `cnv_beltNetwork` |
| `nod_diverterD1` | service node | Diverter D1 | `cnv_beltNetwork` |
| `nod_diverterD10` | service node | Diverter D10 | `cnv_beltNetwork` |
| `nod_diverterD11` | service node | Diverter D11 | `cnv_beltNetwork` |
| `nod_diverterD12` | service node | Diverter D12 | `cnv_beltNetwork` |
| `nod_diverterD13` | service node | Diverter D13 | `cnv_beltNetwork` |
| `nod_diverterD14` | service node | Diverter D14 | `cnv_beltNetwork` |
| `nod_diverterD15` | service node | Diverter D15 | `cnv_beltNetwork` |
| `nod_diverterD16` | service node | Diverter D16 | `cnv_beltNetwork` |
| `nod_diverterD2` | service node | Diverter D2 | `cnv_beltNetwork` |
| `nod_diverterD3` | service node | Diverter D3 | `cnv_beltNetwork` |
| `nod_diverterD4` | service node | Diverter D4 | `cnv_beltNetwork` |
| `nod_diverterD5` | service node | Diverter D5 | `cnv_beltNetwork` |
| `nod_diverterD6` | service node | Diverter D6 | `cnv_beltNetwork` |
| `nod_diverterD7` | service node | Diverter D7 | `cnv_beltNetwork` |
| `nod_diverterD8` | service node | Diverter D8 | `cnv_beltNetwork` |
| `nod_diverterD9` | service node | Diverter D9 | `cnv_beltNetwork` |
| `nod_divestA1` | service node | Divest A1 | `cnv_screeningHalls` |
| `nod_divestA10` | service node | Divest A10 | `cnv_screeningHalls` |
| `nod_divestA2` | service node | Divest A2 | `cnv_screeningHalls` |
| `nod_divestA3` | service node | Divest A3 | `cnv_screeningHalls` |
| `nod_divestA4` | service node | Divest A4 | `cnv_screeningHalls` |
| `nod_divestA5` | service node | Divest A5 | `cnv_screeningHalls` |
| `nod_divestA6` | service node | Divest A6 | `cnv_screeningHalls` |
| `nod_divestA7` | service node | Divest A7 | `cnv_screeningHalls` |
| `nod_divestA8` | service node | Divest A8 | `cnv_screeningHalls` |
| `nod_divestA9` | service node | Divest A9 | `cnv_screeningHalls` |
| `nod_divestB1` | service node | Divest B1 | `cnv_screeningHalls` |
| `nod_divestB10` | service node | Divest B10 | `cnv_screeningHalls` |
| `nod_divestB2` | service node | Divest B2 | `cnv_screeningHalls` |
| `nod_divestB3` | service node | Divest B3 | `cnv_screeningHalls` |
| `nod_divestB4` | service node | Divest B4 | `cnv_screeningHalls` |
| `nod_divestB5` | service node | Divest B5 | `cnv_screeningHalls` |
| `nod_divestB6` | service node | Divest B6 | `cnv_screeningHalls` |
| `nod_divestB7` | service node | Divest B7 | `cnv_screeningHalls` |
| `nod_divestB8` | service node | Divest B8 | `cnv_screeningHalls` |
| `nod_divestB9` | service node | Divest B9 | `cnv_screeningHalls` |
| `nod_divestC1` | service node | Divest C1 | `cnv_screeningHalls` |
| `nod_divestC10` | service node | Divest C10 | `cnv_screeningHalls` |
| `nod_divestC2` | service node | Divest C2 | `cnv_screeningHalls` |
| `nod_divestC3` | service node | Divest C3 | `cnv_screeningHalls` |
| `nod_divestC4` | service node | Divest C4 | `cnv_screeningHalls` |
| `nod_divestC5` | service node | Divest C5 | `cnv_screeningHalls` |
| `nod_divestC6` | service node | Divest C6 | `cnv_screeningHalls` |
| `nod_divestC7` | service node | Divest C7 | `cnv_screeningHalls` |
| `nod_divestC8` | service node | Divest C8 | `cnv_screeningHalls` |
| `nod_divestC9` | service node | Divest C9 | `cnv_screeningHalls` |
| `nod_divestD1` | service node | Divest D1 | `cnv_screeningHalls` |
| `nod_divestD2` | service node | Divest D2 | `cnv_screeningHalls` |
| `nod_divestD3` | service node | Divest D3 | `cnv_screeningHalls` |
| `nod_divestD4` | service node | Divest D4 | `cnv_screeningHalls` |
| `nod_divestD5` | service node | Divest D5 | `cnv_screeningHalls` |
| `nod_divestD6` | service node | Divest D6 | `cnv_screeningHalls` |
| `nod_divestD7` | service node | Divest D7 | `cnv_screeningHalls` |
| `nod_divestD8` | service node | Divest D8 | `cnv_screeningHalls` |
| `nod_doorsClosed` | state node | doors closed | `cnv_flightLifecycle` |
| `nod_dropA1` | service node | Bag drop A1 | `cnv_hallAlevel` |
| `nod_dropA2` | service node | Bag drop A2 | `cnv_hallAlevel` |
| `nod_dropA3` | service node | Bag drop A3 | `cnv_hallAlevel` |
| `nod_dropA4` | service node | Bag drop A4 | `cnv_hallAlevel` |
| `nod_dropB1` | service node | Bag drop B1 | `cnv_hallBlevel` |
| `nod_dropB2` | service node | Bag drop B2 | `cnv_hallBlevel` |
| `nod_dropB3` | service node | Bag drop B3 | `cnv_hallBlevel` |
| `nod_dropB4` | service node | Bag drop B4 | `cnv_hallBlevel` |
| `nod_dropBag` | entry node | POST /bags | `cnv_bagLifecycle` |
| `nod_dropC1` | service node | Bag drop C1 | `cnv_hallClevel` |
| `nod_dropC2` | service node | Bag drop C2 | `cnv_hallClevel` |
| `nod_dropC3` | service node | Bag drop C3 | `cnv_hallClevel` |
| `nod_dropC4` | service node | Bag drop C4 | `cnv_hallClevel` |
| `nod_dropD1` | service node | Bag drop D1 | `cnv_hallDlevel` |
| `nod_dropD2` | service node | Bag drop D2 | `cnv_hallDlevel` |
| `nod_dropD3` | service node | Bag drop D3 | `cnv_hallDlevel` |
| `nod_dropD4` | service node | Bag drop D4 | `cnv_hallDlevel` |
| `nod_dutyManager` | actor node | Duty manager | `cnv_disruptionDesk` |
| `nod_eGate` | call node | e-gate | `cnv_borderCheck` |
| `nod_eachBag` | forEach node | each bag | `cnv_offloadNoShows` |
| `nod_eachOperator` | forEach node | each operator | `cnv_monthlyBilling` |
| `nod_eachPassenger` | forEach node | each passenger at the gate | `cnv_boardingProcedure` |
| `nod_earlyBagStore` | store node | Early bag store | `cnv_beltNetwork` |
| `nod_edsA1` | service node | EDS A1 | `cnv_beltNetwork` |
| `nod_edsA2` | service node | EDS A2 | `cnv_beltNetwork` |
| `nod_edsA3` | service node | EDS A3 | `cnv_beltNetwork` |
| `nod_edsA4` | service node | EDS A4 | `cnv_beltNetwork` |
| `nod_edsA5` | service node | EDS A5 | `cnv_beltNetwork` |
| `nod_edsA6` | service node | EDS A6 | `cnv_beltNetwork` |
| `nod_edsB1` | service node | EDS B1 | `cnv_beltNetwork` |
| `nod_edsB2` | service node | EDS B2 | `cnv_beltNetwork` |
| `nod_edsB3` | service node | EDS B3 | `cnv_beltNetwork` |
| `nod_edsB4` | service node | EDS B4 | `cnv_beltNetwork` |
| `nod_edsB5` | service node | EDS B5 | `cnv_beltNetwork` |
| `nod_edsB6` | service node | EDS B6 | `cnv_beltNetwork` |
| `nod_edsC1` | service node | EDS C1 | `cnv_beltNetwork` |
| `nod_edsC2` | service node | EDS C2 | `cnv_beltNetwork` |
| `nod_edsC3` | service node | EDS C3 | `cnv_beltNetwork` |
| `nod_edsC4` | service node | EDS C4 | `cnv_beltNetwork` |
| `nod_edsC5` | service node | EDS C5 | `cnv_beltNetwork` |
| `nod_edsC6` | service node | EDS C6 | `cnv_beltNetwork` |
| `nod_edsD1` | service node | EDS D1 | `cnv_beltNetwork` |
| `nod_edsD2` | service node | EDS D2 | `cnv_beltNetwork` |
| `nod_edsD3` | service node | EDS D3 | `cnv_beltNetwork` |
| `nod_edsD4` | service node | EDS D4 | `cnv_beltNetwork` |
| `nod_edsD5` | service node | EDS D5 | `cnv_beltNetwork` |
| `nod_edsD6` | service node | EDS D6 | `cnv_beltNetwork` |
| `nod_emergencyResponse` | service node | Emergency response | `cnv_airportOperations` |
| `nod_entered` | state node | entered | `cnv_parkingStay` |
| `nod_exited` | state node | exited | `cnv_parkingStay` |
| `nod_explosiveTrace` | state node | trace detection | `cnv_alarmResolution` |
| `nod_fees` | parallel node | the fees | `cnv_billOneOperator` |
| `nod_feesDone` | join node | nod_feesDone | `cnv_billOneOperator` |
| `nod_fids` | service node | Flight information displays | `cnv_airportOperations` |
| `nod_fidsAdapter` | service node | Displays feed | `cnv_aodbIntegrations` |
| `nod_finalCall` | state node | final call | `cnv_boardingPhases` |
| `nod_findEnd` | end node | nod_findEnd | `cnv_findMissing` |
| `nod_findInHold` | call node | find it in the hold | `cnv_offloadOneBag` |
| `nod_findStart` | start node | nod_findStart | `cnv_findMissing` |
| `nod_fireCover` | call node | fire cover at the aircraft | `cnv_fuelling` |
| `nod_fireStation` | service node | Fire station | `cnv_emergencyDesk` |
| `nod_flightEvents` | queue node | Flight events | `cnv_airportOperations` |
| `nod_flightRecord` | store node | Flight record | `cnv_aodbIntegrations` |
| `nod_flightStart` | initial node | nod_flightStart | `cnv_flightLifecycle` |
| `nod_flights` | store node | Flights | `cnv_airportOperations` |
| `nod_flown` | state node | flown | `cnv_bagLifecycle` |
| `nod_fuelEnd` | end node | nod_fuelEnd | `cnv_fuelling` |
| `nod_fuelOrder` | wait node | the airline's fuel order | `cnv_fuelling` |
| `nod_fuelReceipt` | call node | fuel receipt to the captain | `cnv_fuelling` |
| `nod_fuelRegionAwaitingFuel` | state node | awaiting the truck | `cnv_turnaroundMilestones` |
| `nod_fuelRegionFuelled` | state node | fuelled | `cnv_turnaroundMilestones` |
| `nod_fuelRegionFuelling` | state node | fuelling | `cnv_turnaroundMilestones` |
| `nod_fuelRegionStart` | initial node | nod_fuelRegionStart | `cnv_turnaroundMilestones` |
| `nod_fuelService` | service node | Into-plane fuelling | `cnv_airportOperations` |
| `nod_fuelStart` | start node | nod_fuelStart | `cnv_fuelling` |
| `nod_fuelSupplierExt` | external node | Fuel supplier | `cnv_airportOperations` |
| `nod_fullClean` | call node | full clean | `cnv_cabinCleaning` |
| `nod_fullEmergency` | state node | full emergency | `cnv_emergencyDesk` |
| `nod_gateA1` | service node | Gate A1 | `cnv_standPlan` |
| `nod_gateA10` | service node | Gate A10 | `cnv_standPlan` |
| `nod_gateA11` | service node | Gate A11 | `cnv_standPlan` |
| `nod_gateA13` | service node | Gate A13 | `cnv_standPlan` |
| `nod_gateA14` | service node | Gate A14 | `cnv_standPlan` |
| `nod_gateA16` | service node | Gate A16 | `cnv_standPlan` |
| `nod_gateA17` | service node | Gate A17 | `cnv_standPlan` |
| `nod_gateA19` | service node | Gate A19 | `cnv_standPlan` |
| `nod_gateA2` | service node | Gate A2 | `cnv_standPlan` |
| `nod_gateA20` | service node | Gate A20 | `cnv_standPlan` |
| `nod_gateA22` | service node | Gate A22 | `cnv_standPlan` |
| `nod_gateA23` | service node | Gate A23 | `cnv_standPlan` |
| `nod_gateA4` | service node | Gate A4 | `cnv_standPlan` |
| `nod_gateA5` | service node | Gate A5 | `cnv_standPlan` |
| `nod_gateA7` | service node | Gate A7 | `cnv_standPlan` |
| `nod_gateA8` | service node | Gate A8 | `cnv_standPlan` |
| `nod_gateAgent` | participant node | Ground handler | `cnv_boardingProcedure` |
| `nod_gateB1` | service node | Gate B1 | `cnv_standPlan` |
| `nod_gateB10` | service node | Gate B10 | `cnv_standPlan` |
| `nod_gateB11` | service node | Gate B11 | `cnv_standPlan` |
| `nod_gateB13` | service node | Gate B13 | `cnv_standPlan` |
| `nod_gateB14` | service node | Gate B14 | `cnv_standPlan` |
| `nod_gateB16` | service node | Gate B16 | `cnv_standPlan` |
| `nod_gateB17` | service node | Gate B17 | `cnv_standPlan` |
| `nod_gateB19` | service node | Gate B19 | `cnv_standPlan` |
| `nod_gateB2` | service node | Gate B2 | `cnv_standPlan` |
| `nod_gateB20` | service node | Gate B20 | `cnv_standPlan` |
| `nod_gateB22` | service node | Gate B22 | `cnv_standPlan` |
| `nod_gateB23` | service node | Gate B23 | `cnv_standPlan` |
| `nod_gateB4` | service node | Gate B4 | `cnv_standPlan` |
| `nod_gateB5` | service node | Gate B5 | `cnv_standPlan` |
| `nod_gateB7` | service node | Gate B7 | `cnv_standPlan` |
| `nod_gateB8` | service node | Gate B8 | `cnv_standPlan` |
| `nod_gateBoardingList` | call node | load the boarding list | `cnv_gateBoarding` |
| `nod_gateBridge` | call node | dock the jet bridge | `cnv_gateBoarding` |
| `nod_gateC1` | service node | Gate C1 | `cnv_standPlan` |
| `nod_gateC10` | service node | Gate C10 | `cnv_standPlan` |
| `nod_gateC11` | service node | Gate C11 | `cnv_standPlan` |
| `nod_gateC13` | service node | Gate C13 | `cnv_standPlan` |
| `nod_gateC14` | service node | Gate C14 | `cnv_standPlan` |
| `nod_gateC16` | service node | Gate C16 | `cnv_standPlan` |
| `nod_gateC17` | service node | Gate C17 | `cnv_standPlan` |
| `nod_gateC19` | service node | Gate C19 | `cnv_standPlan` |
| `nod_gateC2` | service node | Gate C2 | `cnv_standPlan` |
| `nod_gateC20` | service node | Gate C20 | `cnv_standPlan` |
| `nod_gateC22` | service node | Gate C22 | `cnv_standPlan` |
| `nod_gateC23` | service node | Gate C23 | `cnv_standPlan` |
| `nod_gateC4` | service node | Gate C4 | `cnv_standPlan` |
| `nod_gateC5` | service node | Gate C5 | `cnv_standPlan` |
| `nod_gateC7` | service node | Gate C7 | `cnv_standPlan` |
| `nod_gateC8` | service node | Gate C8 | `cnv_standPlan` |
| `nod_gateClose` | emit node | gate closed | `cnv_gateBoarding` |
| `nod_gateClosed` | state node | gate closed | `cnv_boardingPhases` |
| `nod_gateD1` | service node | Gate D1 | `cnv_standPlan` |
| `nod_gateD10` | service node | Gate D10 | `cnv_standPlan` |
| `nod_gateD11` | service node | Gate D11 | `cnv_standPlan` |
| `nod_gateD13` | service node | Gate D13 | `cnv_standPlan` |
| `nod_gateD14` | service node | Gate D14 | `cnv_standPlan` |
| `nod_gateD16` | service node | Gate D16 | `cnv_standPlan` |
| `nod_gateD17` | service node | Gate D17 | `cnv_standPlan` |
| `nod_gateD19` | service node | Gate D19 | `cnv_standPlan` |
| `nod_gateD2` | service node | Gate D2 | `cnv_standPlan` |
| `nod_gateD20` | service node | Gate D20 | `cnv_standPlan` |
| `nod_gateD22` | service node | Gate D22 | `cnv_standPlan` |
| `nod_gateD23` | service node | Gate D23 | `cnv_standPlan` |
| `nod_gateD4` | service node | Gate D4 | `cnv_standPlan` |
| `nod_gateD5` | service node | Gate D5 | `cnv_standPlan` |
| `nod_gateD7` | service node | Gate D7 | `cnv_standPlan` |
| `nod_gateD8` | service node | Gate D8 | `cnv_standPlan` |
| `nod_gateEnd` | end node | nod_gateEnd | `cnv_gateBoarding` |
| `nod_gateGroups` | forEach node | each boarding group | `cnv_gateBoarding` |
| `nod_gateOpen` | join node | gate open | `cnv_boardingProcedure` |
| `nod_gateRetract` | call node | retract the bridge | `cnv_gateBoarding` |
| `nod_gateStart` | start node | nod_gateStart | `cnv_gateBoarding` |
| `nod_generalBoarding` | state node | general | `cnv_boardingPhases` |
| `nod_getList` | call node | get the boarding list | `cnv_boardingProcedure` |
| `nod_groundController` | actor node | Ground controller | `cnv_airfieldSurface` |
| `nod_groundCrew` | actor node | Ground crew | `cnv_airportOperations` |
| `nod_groundRegionGpuConnected` | state node | power connected | `cnv_turnaroundMilestones` |
| `nod_groundRegionGpuDisconnected` | state node | power disconnected | `cnv_turnaroundMilestones` |
| `nod_groundRegionStart` | initial node | nod_groundRegionStart | `cnv_turnaroundMilestones` |
| `nod_groundRegionWaterServiced` | state node | water serviced | `cnv_turnaroundMilestones` |
| `nod_groupEnd` | end node | nod_groupEnd | `cnv_boardOneGroup` |
| `nod_groupStart` | start node | nod_groupStart | `cnv_boardOneGroup` |
| `nod_groupWait` | wait node | the group has boarded | `cnv_boardOneGroup` |
| `nod_hallA` | service node | Terminal A hall | `cnv_checkInHalls` |
| `nod_hallB` | service node | Terminal B hall | `cnv_checkInHalls` |
| `nod_hallC` | service node | Terminal C hall | `cnv_checkInHalls` |
| `nod_hallD` | service node | Terminal D hall | `cnv_checkInHalls` |
| `nod_hallsBelts` | ref node | Belt network | `cnv_checkInHalls` |
| `nod_hallsDcs` | ref node | Airline DCS | `cnv_checkInHalls` |
| `nod_handedOff` | state node | handed off | `cnv_climbOut` |
| `nod_handleLocally` | emit node | handle it at the desk | `cnv_disruptionDesk` |
| `nod_holdA1` | queue node | Holding point A1 | `cnv_airfieldSurface` |
| `nod_holdA10` | queue node | Holding point A10 | `cnv_airfieldSurface` |
| `nod_holdA11` | queue node | Holding point A11 | `cnv_airfieldSurface` |
| `nod_holdA12` | queue node | Holding point A12 | `cnv_airfieldSurface` |
| `nod_holdA13` | queue node | Holding point A13 | `cnv_airfieldSurface` |
| `nod_holdA14` | queue node | Holding point A14 | `cnv_airfieldSurface` |
| `nod_holdA15` | queue node | Holding point A15 | `cnv_airfieldSurface` |
| `nod_holdA16` | queue node | Holding point A16 | `cnv_airfieldSurface` |
| `nod_holdA2` | queue node | Holding point A2 | `cnv_airfieldSurface` |
| `nod_holdA3` | queue node | Holding point A3 | `cnv_airfieldSurface` |
| `nod_holdA4` | queue node | Holding point A4 | `cnv_airfieldSurface` |
| `nod_holdA5` | queue node | Holding point A5 | `cnv_airfieldSurface` |
| `nod_holdA6` | queue node | Holding point A6 | `cnv_airfieldSurface` |
| `nod_holdA7` | queue node | Holding point A7 | `cnv_airfieldSurface` |
| `nod_holdA8` | queue node | Holding point A8 | `cnv_airfieldSurface` |
| `nod_holdA9` | queue node | Holding point A9 | `cnv_airfieldSurface` |
| `nod_holdB1` | queue node | Holding point B1 | `cnv_airfieldSurface` |
| `nod_holdB10` | queue node | Holding point B10 | `cnv_airfieldSurface` |
| `nod_holdB11` | queue node | Holding point B11 | `cnv_airfieldSurface` |
| `nod_holdB12` | queue node | Holding point B12 | `cnv_airfieldSurface` |
| `nod_holdB13` | queue node | Holding point B13 | `cnv_airfieldSurface` |
| `nod_holdB14` | queue node | Holding point B14 | `cnv_airfieldSurface` |
| `nod_holdB15` | queue node | Holding point B15 | `cnv_airfieldSurface` |
| `nod_holdB16` | queue node | Holding point B16 | `cnv_airfieldSurface` |
| `nod_holdB2` | queue node | Holding point B2 | `cnv_airfieldSurface` |
| `nod_holdB3` | queue node | Holding point B3 | `cnv_airfieldSurface` |
| `nod_holdB4` | queue node | Holding point B4 | `cnv_airfieldSurface` |
| `nod_holdB5` | queue node | Holding point B5 | `cnv_airfieldSurface` |
| `nod_holdB6` | queue node | Holding point B6 | `cnv_airfieldSurface` |
| `nod_holdB7` | queue node | Holding point B7 | `cnv_airfieldSurface` |
| `nod_holdB8` | queue node | Holding point B8 | `cnv_airfieldSurface` |
| `nod_holdB9` | queue node | Holding point B9 | `cnv_airfieldSurface` |
| `nod_holdingPattern` | state node | holding | `cnv_climbOut` |
| `nod_holdover` | if node | holdover time left? | `cnv_deIcingProcedure` |
| `nod_howBad` | if node | nod_howBad | `cnv_disruptionDesk` |
| `nod_iceAgain` | end node | again | `cnv_deIcingProcedure` |
| `nod_iceDone` | emit node | de-icing completed | `cnv_deIcingProcedure` |
| `nod_iceEnd` | end node | nod_iceEnd | `cnv_deIcingProcedure` |
| `nod_iceStart` | start node | nod_iceStart | `cnv_deIcingProcedure` |
| `nod_icingChoice` | choice node | icing conditions? | `cnv_flightLifecycle` |
| `nod_inProgress` | state node | in progress | `cnv_workOrder` |
| `nod_inSystem` | state node | in the system | `cnv_bagLifecycle` |
| `nod_incidentStart` | initial node | nod_incidentStart | `cnv_emergencyDesk` |
| `nod_initialClimb` | state node | initial climb | `cnv_climbOut` |
| `nod_international` | choice node | leaving the Schengen area? | `cnv_passengerJourney` |
| `nod_interview` | call node | interview | `cnv_secondaryInspection` |
| `nod_irregularOps` | service node | Irregular operations desk | `cnv_airportOperations` |
| `nod_journeyPassenger` | participant node | Passenger | `cnv_passengerJourney` |
| `nod_journeyStart` | initial node | nod_journeyStart | `cnv_passengerJourney` |
| `nod_kioskA1` | service node | Kiosk cluster A1 | `cnv_hallAlevel` |
| `nod_kioskA2` | service node | Kiosk cluster A2 | `cnv_hallAlevel` |
| `nod_kioskA3` | service node | Kiosk cluster A3 | `cnv_hallAlevel` |
| `nod_kioskA4` | service node | Kiosk cluster A4 | `cnv_hallAlevel` |
| `nod_kioskA5` | service node | Kiosk cluster A5 | `cnv_hallAlevel` |
| `nod_kioskA6` | service node | Kiosk cluster A6 | `cnv_hallAlevel` |
| `nod_kioskB1` | service node | Kiosk cluster B1 | `cnv_hallBlevel` |
| `nod_kioskB2` | service node | Kiosk cluster B2 | `cnv_hallBlevel` |
| `nod_kioskB3` | service node | Kiosk cluster B3 | `cnv_hallBlevel` |
| `nod_kioskB4` | service node | Kiosk cluster B4 | `cnv_hallBlevel` |
| `nod_kioskB5` | service node | Kiosk cluster B5 | `cnv_hallBlevel` |
| `nod_kioskB6` | service node | Kiosk cluster B6 | `cnv_hallBlevel` |
| `nod_kioskC1` | service node | Kiosk cluster C1 | `cnv_hallClevel` |
| `nod_kioskC2` | service node | Kiosk cluster C2 | `cnv_hallClevel` |
| `nod_kioskC3` | service node | Kiosk cluster C3 | `cnv_hallClevel` |
| `nod_kioskC4` | service node | Kiosk cluster C4 | `cnv_hallClevel` |
| `nod_kioskC5` | service node | Kiosk cluster C5 | `cnv_hallClevel` |
| `nod_kioskC6` | service node | Kiosk cluster C6 | `cnv_hallClevel` |
| `nod_kioskD1` | service node | Kiosk cluster D1 | `cnv_hallDlevel` |
| `nod_kioskD2` | service node | Kiosk cluster D2 | `cnv_hallDlevel` |
| `nod_kioskD3` | service node | Kiosk cluster D3 | `cnv_hallDlevel` |
| `nod_kioskD4` | service node | Kiosk cluster D4 | `cnv_hallDlevel` |
| `nod_kioskD5` | service node | Kiosk cluster D5 | `cnv_hallDlevel` |
| `nod_kioskD6` | service node | Kiosk cluster D6 | `cnv_hallDlevel` |
| `nod_landingFee` | assign node | landing fee | `cnv_billOneOperator` |
| `nod_laneAlarm` | state node | alarm | `cnv_securityLane` |
| `nod_laneBusy` | state node | queue over 10 min | `cnv_securityLane` |
| `nod_laneClosed` | state node | closed | `cnv_securityLane` |
| `nod_laneOfficer` | participant node | Security screening | `cnv_securityLane` |
| `nod_laneOpen` | state node | open | `cnv_securityLane` |
| `nod_laneOpening` | state node | opening | `cnv_securityLane` |
| `nod_lanePaused` | state node | paused | `cnv_securityLane` |
| `nod_laneRecords` | store node | Lanes | `cnv_screeningHalls` |
| `nod_laneStart` | initial node | nod_laneStart | `cnv_securityLane` |
| `nod_lateralA1` | store node | Make-up A1 | `cnv_beltNetwork` |
| `nod_lateralA10` | store node | Make-up A10 | `cnv_beltNetwork` |
| `nod_lateralA11` | store node | Make-up A11 | `cnv_beltNetwork` |
| `nod_lateralA12` | store node | Make-up A12 | `cnv_beltNetwork` |
| `nod_lateralA13` | store node | Make-up A13 | `cnv_beltNetwork` |
| `nod_lateralA14` | store node | Make-up A14 | `cnv_beltNetwork` |
| `nod_lateralA15` | store node | Make-up A15 | `cnv_beltNetwork` |
| `nod_lateralA16` | store node | Make-up A16 | `cnv_beltNetwork` |
| `nod_lateralA2` | store node | Make-up A2 | `cnv_beltNetwork` |
| `nod_lateralA3` | store node | Make-up A3 | `cnv_beltNetwork` |
| `nod_lateralA4` | store node | Make-up A4 | `cnv_beltNetwork` |
| `nod_lateralA5` | store node | Make-up A5 | `cnv_beltNetwork` |
| `nod_lateralA6` | store node | Make-up A6 | `cnv_beltNetwork` |
| `nod_lateralA7` | store node | Make-up A7 | `cnv_beltNetwork` |
| `nod_lateralA8` | store node | Make-up A8 | `cnv_beltNetwork` |
| `nod_lateralA9` | store node | Make-up A9 | `cnv_beltNetwork` |
| `nod_lateralB1` | store node | Make-up B1 | `cnv_beltNetwork` |
| `nod_lateralB10` | store node | Make-up B10 | `cnv_beltNetwork` |
| `nod_lateralB11` | store node | Make-up B11 | `cnv_beltNetwork` |
| `nod_lateralB12` | store node | Make-up B12 | `cnv_beltNetwork` |
| `nod_lateralB13` | store node | Make-up B13 | `cnv_beltNetwork` |
| `nod_lateralB14` | store node | Make-up B14 | `cnv_beltNetwork` |
| `nod_lateralB15` | store node | Make-up B15 | `cnv_beltNetwork` |
| `nod_lateralB16` | store node | Make-up B16 | `cnv_beltNetwork` |
| `nod_lateralB2` | store node | Make-up B2 | `cnv_beltNetwork` |
| `nod_lateralB3` | store node | Make-up B3 | `cnv_beltNetwork` |
| `nod_lateralB4` | store node | Make-up B4 | `cnv_beltNetwork` |
| `nod_lateralB5` | store node | Make-up B5 | `cnv_beltNetwork` |
| `nod_lateralB6` | store node | Make-up B6 | `cnv_beltNetwork` |
| `nod_lateralB7` | store node | Make-up B7 | `cnv_beltNetwork` |
| `nod_lateralB8` | store node | Make-up B8 | `cnv_beltNetwork` |
| `nod_lateralB9` | store node | Make-up B9 | `cnv_beltNetwork` |
| `nod_lateralC1` | store node | Make-up C1 | `cnv_beltNetwork` |
| `nod_lateralC10` | store node | Make-up C10 | `cnv_beltNetwork` |
| `nod_lateralC11` | store node | Make-up C11 | `cnv_beltNetwork` |
| `nod_lateralC12` | store node | Make-up C12 | `cnv_beltNetwork` |
| `nod_lateralC13` | store node | Make-up C13 | `cnv_beltNetwork` |
| `nod_lateralC14` | store node | Make-up C14 | `cnv_beltNetwork` |
| `nod_lateralC15` | store node | Make-up C15 | `cnv_beltNetwork` |
| `nod_lateralC16` | store node | Make-up C16 | `cnv_beltNetwork` |
| `nod_lateralC2` | store node | Make-up C2 | `cnv_beltNetwork` |
| `nod_lateralC3` | store node | Make-up C3 | `cnv_beltNetwork` |
| `nod_lateralC4` | store node | Make-up C4 | `cnv_beltNetwork` |
| `nod_lateralC5` | store node | Make-up C5 | `cnv_beltNetwork` |
| `nod_lateralC6` | store node | Make-up C6 | `cnv_beltNetwork` |
| `nod_lateralC7` | store node | Make-up C7 | `cnv_beltNetwork` |
| `nod_lateralC8` | store node | Make-up C8 | `cnv_beltNetwork` |
| `nod_lateralC9` | store node | Make-up C9 | `cnv_beltNetwork` |
| `nod_lateralD1` | store node | Make-up D1 | `cnv_beltNetwork` |
| `nod_lateralD10` | store node | Make-up D10 | `cnv_beltNetwork` |
| `nod_lateralD11` | store node | Make-up D11 | `cnv_beltNetwork` |
| `nod_lateralD12` | store node | Make-up D12 | `cnv_beltNetwork` |
| `nod_lateralD13` | store node | Make-up D13 | `cnv_beltNetwork` |
| `nod_lateralD14` | store node | Make-up D14 | `cnv_beltNetwork` |
| `nod_lateralD15` | store node | Make-up D15 | `cnv_beltNetwork` |
| `nod_lateralD16` | store node | Make-up D16 | `cnv_beltNetwork` |
| `nod_lateralD2` | store node | Make-up D2 | `cnv_beltNetwork` |
| `nod_lateralD3` | store node | Make-up D3 | `cnv_beltNetwork` |
| `nod_lateralD4` | store node | Make-up D4 | `cnv_beltNetwork` |
| `nod_lateralD5` | store node | Make-up D5 | `cnv_beltNetwork` |
| `nod_lateralD6` | store node | Make-up D6 | `cnv_beltNetwork` |
| `nod_lateralD7` | store node | Make-up D7 | `cnv_beltNetwork` |
| `nod_lateralD8` | store node | Make-up D8 | `cnv_beltNetwork` |
| `nod_lateralD9` | store node | Make-up D9 | `cnv_beltNetwork` |
| `nod_leftWing` | call node | spray the left wing | `cnv_deIcingProcedure` |
| `nod_legacyFeed` | service node | Old displays feed | `cnv_aodbIntegrations` |
| `nod_levelThree` | state node | level 3 review | `cnv_bagLifecycle` |
| `nod_levelThreeA` | service node | Level 3 screening A | `cnv_beltNetwork` |
| `nod_levelThreeB` | service node | Level 3 screening B | `cnv_beltNetwork` |
| `nod_levelThreeC` | service node | Level 3 screening C | `cnv_beltNetwork` |
| `nod_levelThreeD` | service node | Level 3 screening D | `cnv_beltNetwork` |
| `nod_lifeAirline` | participant node | Airline | `cnv_flightLifecycle` |
| `nod_lifeAtc` | participant node | Air traffic control | `cnv_flightLifecycle` |
| `nod_lifeHandler` | participant node | Ground handler | `cnv_flightLifecycle` |
| `nod_linkA1` | service node | Link A1 | `cnv_airfieldSurface` |
| `nod_linkA11` | service node | Link A11 | `cnv_airfieldSurface` |
| `nod_linkA13` | service node | Link A13 | `cnv_airfieldSurface` |
| `nod_linkA15` | service node | Link A15 | `cnv_airfieldSurface` |
| `nod_linkA3` | service node | Link A3 | `cnv_airfieldSurface` |
| `nod_linkA5` | service node | Link A5 | `cnv_airfieldSurface` |
| `nod_linkA7` | service node | Link A7 | `cnv_airfieldSurface` |
| `nod_linkA9` | service node | Link A9 | `cnv_airfieldSurface` |
| `nod_linkB1` | service node | Link B1 | `cnv_airfieldSurface` |
| `nod_linkB11` | service node | Link B11 | `cnv_airfieldSurface` |
| `nod_linkB13` | service node | Link B13 | `cnv_airfieldSurface` |
| `nod_linkB15` | service node | Link B15 | `cnv_airfieldSurface` |
| `nod_linkB3` | service node | Link B3 | `cnv_airfieldSurface` |
| `nod_linkB5` | service node | Link B5 | `cnv_airfieldSurface` |
| `nod_linkB7` | service node | Link B7 | `cnv_airfieldSurface` |
| `nod_linkB9` | service node | Link B9 | `cnv_airfieldSurface` |
| `nod_listBags` | call node | find their bags | `cnv_offloadNoShows` |
| `nod_loadStatus` | switch node | load status? | `cnv_boardingProcedure` |
| `nod_loaded` | state node | loaded | `cnv_bagLifecycle` |
| `nod_localStandby` | state node | local standby | `cnv_emergencyDesk` |
| `nod_lostAndFound` | service node | Lost and found | `cnv_airportOperations` |
| `nod_lostStart` | initial node | nod_lostStart | `cnv_lostItem` |
| `nod_madeUp` | state node | in a container | `cnv_bagLifecycle` |
| `nod_mainLineA1` | service node | Main line A1 | `cnv_beltNetwork` |
| `nod_mainLineA2` | service node | Main line A2 | `cnv_beltNetwork` |
| `nod_mainLineA3` | service node | Main line A3 | `cnv_beltNetwork` |
| `nod_mainLineA4` | service node | Main line A4 | `cnv_beltNetwork` |
| `nod_mainLineA5` | service node | Main line A5 | `cnv_beltNetwork` |
| `nod_mainLineA6` | service node | Main line A6 | `cnv_beltNetwork` |
| `nod_mainLineB1` | service node | Main line B1 | `cnv_beltNetwork` |
| `nod_mainLineB2` | service node | Main line B2 | `cnv_beltNetwork` |
| `nod_mainLineB3` | service node | Main line B3 | `cnv_beltNetwork` |
| `nod_mainLineB4` | service node | Main line B4 | `cnv_beltNetwork` |
| `nod_mainLineB5` | service node | Main line B5 | `cnv_beltNetwork` |
| `nod_mainLineB6` | service node | Main line B6 | `cnv_beltNetwork` |
| `nod_mainLineC1` | service node | Main line C1 | `cnv_beltNetwork` |
| `nod_mainLineC2` | service node | Main line C2 | `cnv_beltNetwork` |
| `nod_mainLineC3` | service node | Main line C3 | `cnv_beltNetwork` |
| `nod_mainLineC4` | service node | Main line C4 | `cnv_beltNetwork` |
| `nod_mainLineC5` | service node | Main line C5 | `cnv_beltNetwork` |
| `nod_mainLineC6` | service node | Main line C6 | `cnv_beltNetwork` |
| `nod_mainLineD1` | service node | Main line D1 | `cnv_beltNetwork` |
| `nod_mainLineD2` | service node | Main line D2 | `cnv_beltNetwork` |
| `nod_mainLineD3` | service node | Main line D3 | `cnv_beltNetwork` |
| `nod_mainLineD4` | service node | Main line D4 | `cnv_beltNetwork` |
| `nod_mainLineD5` | service node | Main line D5 | `cnv_beltNetwork` |
| `nod_mainLineD6` | service node | Main line D6 | `cnv_beltNetwork` |
| `nod_maintenanceService` | service node | Maintenance | `cnv_airportOperations` |
| `nod_manualEncoding` | service node | Manual encoding | `cnv_beltNetwork` |
| `nod_matched` | state node | matched | `cnv_lostItem` |
| `nod_mergeA1` | queue node | Merge A1 | `cnv_beltNetwork` |
| `nod_mergeA2` | queue node | Merge A2 | `cnv_beltNetwork` |
| `nod_mergeA3` | queue node | Merge A3 | `cnv_beltNetwork` |
| `nod_mergeA4` | queue node | Merge A4 | `cnv_beltNetwork` |
| `nod_mergeA5` | queue node | Merge A5 | `cnv_beltNetwork` |
| `nod_mergeA6` | queue node | Merge A6 | `cnv_beltNetwork` |
| `nod_mergeB1` | queue node | Merge B1 | `cnv_beltNetwork` |
| `nod_mergeB2` | queue node | Merge B2 | `cnv_beltNetwork` |
| `nod_mergeB3` | queue node | Merge B3 | `cnv_beltNetwork` |
| `nod_mergeB4` | queue node | Merge B4 | `cnv_beltNetwork` |
| `nod_mergeB5` | queue node | Merge B5 | `cnv_beltNetwork` |
| `nod_mergeB6` | queue node | Merge B6 | `cnv_beltNetwork` |
| `nod_mergeC1` | queue node | Merge C1 | `cnv_beltNetwork` |
| `nod_mergeC2` | queue node | Merge C2 | `cnv_beltNetwork` |
| `nod_mergeC3` | queue node | Merge C3 | `cnv_beltNetwork` |
| `nod_mergeC4` | queue node | Merge C4 | `cnv_beltNetwork` |
| `nod_mergeC5` | queue node | Merge C5 | `cnv_beltNetwork` |
| `nod_mergeC6` | queue node | Merge C6 | `cnv_beltNetwork` |
| `nod_mergeD1` | queue node | Merge D1 | `cnv_beltNetwork` |
| `nod_mergeD2` | queue node | Merge D2 | `cnv_beltNetwork` |
| `nod_mergeD3` | queue node | Merge D3 | `cnv_beltNetwork` |
| `nod_mergeD4` | queue node | Merge D4 | `cnv_beltNetwork` |
| `nod_mergeD5` | queue node | Merge D5 | `cnv_beltNetwork` |
| `nod_mergeD6` | queue node | Merge D6 | `cnv_beltNetwork` |
| `nod_metAdapter` | service node | Weather adapter | `cnv_aodbIntegrations` |
| `nod_mishandled` | state node | mishandled | `cnv_bagLifecycle` |
| `nod_mitigating` | state node | mitigating | `cnv_disruptionDesk` |
| `nod_movements` | call node | the month's movements | `cnv_monthlyBilling` |
| `nod_mvtAdapter` | service node | Movement adapter | `cnv_aodbIntegrations` |
| `nod_networkManagerExt` | external node | Network manager | `cnv_airportOperations` |
| `nod_noShow` | state node | no-show | `cnv_passengerJourney` |
| `nod_notCheckedIn` | call node | check them in at the gate | `cnv_boardOnePassenger` |
| `nod_noticeSent` | emit node | notified | `cnv_notifyPassengers` |
| `nod_notifications` | service node | Notifications | `cnv_airportOperations` |
| `nod_notifyEnd` | end node | nod_notifyEnd | `cnv_notifyPassengers` |
| `nod_notifyStart` | start node | nod_notifyStart | `cnv_notifyPassengers` |
| `nod_notifySteps` | steps node | Notify passengers | `cnv_flightLifecycle` |
| `nod_officer` | call node | an officer checks | `cnv_borderCheck` |
| `nod_offloadBags` | subflow node | offload their bags | `cnv_boardingProcedure` |
| `nod_offloadEnd` | end node | nod_offloadEnd | `cnv_offloadNoShows` |
| `nod_offloadStart` | start node | nod_offloadStart | `cnv_offloadNoShows` |
| `nod_offloaded` | emit node | bags offloaded | `cnv_offloadNoShows` |
| `nod_offloadedBag` | state node | offloaded | `cnv_bagLifecycle` |
| `nod_offloading` | state node | offloading no-shows | `cnv_boardingPhases` |
| `nod_onBlockChocks` | assign node | chocks and cones | `cnv_turnaroundProcedure` |
| `nod_onBoard` | state node | on board | `cnv_passengerJourney` |
| `nod_oneEnd` | end node | nod_oneEnd | `cnv_boardOnePassenger` |
| `nod_oneStart` | start node | nod_oneStart | `cnv_boardOnePassenger` |
| `nod_opEnd` | end node | nod_opEnd | `cnv_billOneOperator` |
| `nod_opStart` | start node | nod_opStart | `cnv_billOneOperator` |
| `nod_openGate` | parallel node | open the gate | `cnv_boardingProcedure` |
| `nod_overstay` | state node | overstayed | `cnv_parkingStay` |
| `nod_padSlot` | wait node | a pad is free | `cnv_deIcingProcedure` |
| `nod_page` | call node | page the passenger | `cnv_findMissing` |
| `nod_paid` | state node | paid | `cnv_parkingStay` |
| `nod_paidOrNot` | wait node | paid | `cnv_billOneOperator` |
| `nod_parking` | service node | Car parks | `cnv_airportOperations` |
| `nod_parkingFee` | assign node | parking fee | `cnv_billOneOperator` |
| `nod_passValid` | if node | valid for this flight? | `cnv_boardOnePassenger` |
| `nod_passengerActor` | actor node | Passenger | `cnv_airportOperations` |
| `nod_passengerApp` | service node | Passenger app | `cnv_airportOperations` |
| `nod_passengerFee` | assign node | passenger fee | `cnv_billOneOperator` |
| `nod_passengers` | store node | Passengers | `cnv_airportOperations` |
| `nod_passengersOnBoard` | if node | passengers on board? | `cnv_fuelling` |
| `nod_passengersRegionCabinEmpty` | state node | cabin empty | `cnv_turnaroundMilestones` |
| `nod_passengersRegionCabinReady` | state node | cabin ready | `cnv_turnaroundMilestones` |
| `nod_passengersRegionDeboarding` | state node | deboarding | `cnv_turnaroundMilestones` |
| `nod_passengersRegionStart` | initial node | nod_passengersRegionStart | `cnv_turnaroundMilestones` |
| `nod_paymentProviderExt` | external node | Payment provider | `cnv_airportOperations` |
| `nod_phaseResume` | history node | the phase it was in | `cnv_boardingPhases` |
| `nod_phasesStart` | initial node | nod_phasesStart | `cnv_boardingPhases` |
| `nod_pilotActor` | actor node | Pilot | `cnv_airportOperations` |
| `nod_platformA` | ref node | Common-use platform | `cnv_hallAlevel` |
| `nod_platformB` | ref node | Common-use platform | `cnv_hallBlevel` |
| `nod_platformC` | ref node | Common-use platform | `cnv_hallClevel` |
| `nod_platformD` | ref node | Common-use platform | `cnv_hallDlevel` |
| `nod_policeCalled` | state node | police called | `cnv_alarmResolution` |
| `nod_priorityBoarding` | state node | priority | `cnv_boardingPhases` |
| `nod_problemBags` | store node | Problem bags | `cnv_beltNetwork` |
| `nod_procCater` | wait node | catered | `cnv_turnaroundProcedure` |
| `nod_procClean` | wait node | cleaned | `cnv_turnaroundProcedure` |
| `nod_procDeboard` | wait node | deboarded | `cnv_turnaroundProcedure` |
| `nod_procDone` | emit node | turnaround completed | `cnv_turnaroundProcedure` |
| `nod_procEnd` | end node | nod_procEnd | `cnv_turnaroundProcedure` |
| `nod_procFuel` | wait node | fuelled | `cnv_turnaroundProcedure` |
| `nod_procHandler` | participant node | Ground handler | `cnv_turnaroundProcedure` |
| `nod_procLoad` | wait node | holds closed | `cnv_turnaroundProcedure` |
| `nod_procOffload` | wait node | holds empty | `cnv_turnaroundProcedure` |
| `nod_procStart` | start node | nod_procStart | `cnv_turnaroundProcedure` |
| `nod_publishFlight` | entry node | POST /flights | `cnv_flightLifecycle` |
| `nod_pumped` | wait node | pumped | `cnv_fuelling` |
| `nod_pumping` | wait node | pumping | `cnv_fuelling` |
| `nod_pushedBack` | state node | pushed back | `cnv_flightLifecycle` |
| `nod_quickClean` | call node | quick clean | `cnv_cabinCleaning` |
| `nod_radarAdapter` | service node | Surveillance adapter | `cnv_aodbIntegrations` |
| `nod_raised` | state node | raised | `cnv_workOrder` |
| `nod_readFlight` | call node | read the flight | `cnv_flightAlerts` |
| `nod_readWeather` | call node | read the weather | `cnv_deIcingProcedure` |
| `nod_readyDesk` | assign node | desk ready | `cnv_boardingProcedure` |
| `nod_readyForPushback` | state node | ready for pushback | `cnv_flightLifecycle` |
| `nod_reclaim1` | service node | Reclaim 1 | `cnv_beltNetwork` |
| `nod_reclaim10` | service node | Reclaim 10 | `cnv_beltNetwork` |
| `nod_reclaim11` | service node | Reclaim 11 | `cnv_beltNetwork` |
| `nod_reclaim12` | service node | Reclaim 12 | `cnv_beltNetwork` |
| `nod_reclaim2` | service node | Reclaim 2 | `cnv_beltNetwork` |
| `nod_reclaim3` | service node | Reclaim 3 | `cnv_beltNetwork` |
| `nod_reclaim4` | service node | Reclaim 4 | `cnv_beltNetwork` |
| `nod_reclaim5` | service node | Reclaim 5 | `cnv_beltNetwork` |
| `nod_reclaim6` | service node | Reclaim 6 | `cnv_beltNetwork` |
| `nod_reclaim7` | service node | Reclaim 7 | `cnv_beltNetwork` |
| `nod_reclaim8` | service node | Reclaim 8 | `cnv_beltNetwork` |
| `nod_reclaim9` | service node | Reclaim 9 | `cnv_beltNetwork` |
| `nod_recomposeA1` | service node | Recompose A1 | `cnv_screeningHalls` |
| `nod_recomposeA10` | service node | Recompose A10 | `cnv_screeningHalls` |
| `nod_recomposeA2` | service node | Recompose A2 | `cnv_screeningHalls` |
| `nod_recomposeA3` | service node | Recompose A3 | `cnv_screeningHalls` |
| `nod_recomposeA4` | service node | Recompose A4 | `cnv_screeningHalls` |
| `nod_recomposeA5` | service node | Recompose A5 | `cnv_screeningHalls` |
| `nod_recomposeA6` | service node | Recompose A6 | `cnv_screeningHalls` |
| `nod_recomposeA7` | service node | Recompose A7 | `cnv_screeningHalls` |
| `nod_recomposeA8` | service node | Recompose A8 | `cnv_screeningHalls` |
| `nod_recomposeA9` | service node | Recompose A9 | `cnv_screeningHalls` |
| `nod_recomposeB1` | service node | Recompose B1 | `cnv_screeningHalls` |
| `nod_recomposeB10` | service node | Recompose B10 | `cnv_screeningHalls` |
| `nod_recomposeB2` | service node | Recompose B2 | `cnv_screeningHalls` |
| `nod_recomposeB3` | service node | Recompose B3 | `cnv_screeningHalls` |
| `nod_recomposeB4` | service node | Recompose B4 | `cnv_screeningHalls` |
| `nod_recomposeB5` | service node | Recompose B5 | `cnv_screeningHalls` |
| `nod_recomposeB6` | service node | Recompose B6 | `cnv_screeningHalls` |
| `nod_recomposeB7` | service node | Recompose B7 | `cnv_screeningHalls` |
| `nod_recomposeB8` | service node | Recompose B8 | `cnv_screeningHalls` |
| `nod_recomposeB9` | service node | Recompose B9 | `cnv_screeningHalls` |
| `nod_recomposeC1` | service node | Recompose C1 | `cnv_screeningHalls` |
| `nod_recomposeC10` | service node | Recompose C10 | `cnv_screeningHalls` |
| `nod_recomposeC2` | service node | Recompose C2 | `cnv_screeningHalls` |
| `nod_recomposeC3` | service node | Recompose C3 | `cnv_screeningHalls` |
| `nod_recomposeC4` | service node | Recompose C4 | `cnv_screeningHalls` |
| `nod_recomposeC5` | service node | Recompose C5 | `cnv_screeningHalls` |
| `nod_recomposeC6` | service node | Recompose C6 | `cnv_screeningHalls` |
| `nod_recomposeC7` | service node | Recompose C7 | `cnv_screeningHalls` |
| `nod_recomposeC8` | service node | Recompose C8 | `cnv_screeningHalls` |
| `nod_recomposeC9` | service node | Recompose C9 | `cnv_screeningHalls` |
| `nod_recomposeD1` | service node | Recompose D1 | `cnv_screeningHalls` |
| `nod_recomposeD2` | service node | Recompose D2 | `cnv_screeningHalls` |
| `nod_recomposeD3` | service node | Recompose D3 | `cnv_screeningHalls` |
| `nod_recomposeD4` | service node | Recompose D4 | `cnv_screeningHalls` |
| `nod_recomposeD5` | service node | Recompose D5 | `cnv_screeningHalls` |
| `nod_recomposeD6` | service node | Recompose D6 | `cnv_screeningHalls` |
| `nod_recomposeD7` | service node | Recompose D7 | `cnv_screeningHalls` |
| `nod_recomposeD8` | service node | Recompose D8 | `cnv_screeningHalls` |
| `nod_reconcileA` | store node | Reconciliation A | `cnv_beltNetwork` |
| `nod_reconcileB` | store node | Reconciliation B | `cnv_beltNetwork` |
| `nod_reconcileC` | store node | Reconciliation C | `cnv_beltNetwork` |
| `nod_reconcileD` | store node | Reconciliation D | `cnv_beltNetwork` |
| `nod_refused` | end node | refused entry | `cnv_borderCheck` |
| `nod_rejectedBag` | state node | rejected | `cnv_bagLifecycle` |
| `nod_reported` | state node | reported | `cnv_lostItem` |
| `nod_resourceManagement` | service node | Stands and gates | `cnv_airportOperations` |
| `nod_returnToStand` | state node | returning to stand | `cnv_flightLifecycle` |
| `nod_returned` | state node | returned | `cnv_lostItem` |
| `nod_rightWing` | call node | spray the right wing | `cnv_deIcingProcedure` |
| `nod_routeService` | service node | Routing | `cnv_airfieldSurface` |
| `nod_rowA1` | service node | Row A1 | `cnv_hallAlevel` |
| `nod_rowA2` | service node | Row A2 | `cnv_hallAlevel` |
| `nod_rowA3` | service node | Row A3 | `cnv_hallAlevel` |
| `nod_rowA4` | service node | Row A4 | `cnv_hallAlevel` |
| `nod_rowA5` | service node | Row A5 | `cnv_hallAlevel` |
| `nod_rowA6` | service node | Row A6 | `cnv_hallAlevel` |
| `nod_rowB1` | service node | Row B1 | `cnv_hallBlevel` |
| `nod_rowB2` | service node | Row B2 | `cnv_hallBlevel` |
| `nod_rowB3` | service node | Row B3 | `cnv_hallBlevel` |
| `nod_rowB4` | service node | Row B4 | `cnv_hallBlevel` |
| `nod_rowB5` | service node | Row B5 | `cnv_hallBlevel` |
| `nod_rowB6` | service node | Row B6 | `cnv_hallBlevel` |
| `nod_rowC1` | service node | Row C1 | `cnv_hallClevel` |
| `nod_rowC2` | service node | Row C2 | `cnv_hallClevel` |
| `nod_rowC3` | service node | Row C3 | `cnv_hallClevel` |
| `nod_rowC4` | service node | Row C4 | `cnv_hallClevel` |
| `nod_rowC5` | service node | Row C5 | `cnv_hallClevel` |
| `nod_rowC6` | service node | Row C6 | `cnv_hallClevel` |
| `nod_rowD1` | service node | Row D1 | `cnv_hallDlevel` |
| `nod_rowD2` | service node | Row D2 | `cnv_hallDlevel` |
| `nod_rowD3` | service node | Row D3 | `cnv_hallDlevel` |
| `nod_rowD4` | service node | Row D4 | `cnv_hallDlevel` |
| `nod_rowD5` | service node | Row D5 | `cnv_hallDlevel` |
| `nod_rowD6` | service node | Row D6 | `cnv_hallDlevel` |
| `nod_rwy07L` | store node | Runway 07L/25R | `cnv_airfieldSurface` |
| `nod_rwy07R` | store node | Runway 07R/25L | `cnv_airfieldSurface` |
| `nod_scanPass` | call node | scan the boarding pass | `cnv_boardOnePassenger` |
| `nod_scheduled` | state node | scheduled | `cnv_flightLifecycle` |
| `nod_screenResult` | choice node | cleared? | `cnv_bagLifecycle` |
| `nod_screened` | state node | screened | `cnv_passengerJourney` |
| `nod_screening` | state node | screening | `cnv_bagLifecycle` |
| `nod_screeningA` | service node | Hall A | `cnv_screeningHalls` |
| `nod_screeningB` | service node | Hall B | `cnv_screeningHalls` |
| `nod_screeningC` | service node | Hall C | `cnv_screeningHalls` |
| `nod_screeningD` | service node | Hall D | `cnv_screeningHalls` |
| `nod_screeningSupervisor` | actor node | Supervisor | `cnv_screeningHalls` |
| `nod_searching` | state node | hand search | `cnv_alarmResolution` |
| `nod_secondEnd` | end node | nod_secondEnd | `cnv_secondaryInspection` |
| `nod_secondStart` | start node | nod_secondStart | `cnv_secondaryInspection` |
| `nod_secondary` | subflow node | secondary inspection | `cnv_borderCheck` |
| `nod_securityFee` | assign node | security fee | `cnv_billOneOperator` |
| `nod_securityScreening` | service node | Security screening | `cnv_airportOperations` |
| `nod_sendNotice` | call node | push, SMS and e-mail | `cnv_notifyPassengers` |
| `nod_slotConfirmed` | state node | slot confirmed | `cnv_flightLifecycle` |
| `nod_slotCoordination` | external node | Slot coordination | `cnv_airportOperations` |
| `nod_sorterA` | service node | Sorter A | `cnv_beltNetwork` |
| `nod_sorterB` | service node | Sorter B | `cnv_beltNetwork` |
| `nod_sorterC` | service node | Sorter C | `cnv_beltNetwork` |
| `nod_sorterD` | service node | Sorter D | `cnv_beltNetwork` |
| `nod_sorting` | state node | sorting | `cnv_bagLifecycle` |
| `nod_spray` | parallel node | both wings | `cnv_deIcingProcedure` |
| `nod_sprayed` | join node | nod_sprayed | `cnv_deIcingProcedure` |
| `nod_ssimAdapter` | service node | Schedule adapter | `cnv_aodbIntegrations` |
| `nod_stamp` | emit node | cleared | `cnv_borderCheck` |
| `nod_stand101` | store node | Stand 101 | `cnv_standPlan` |
| `nod_stand102` | store node | Stand 102 | `cnv_standPlan` |
| `nod_stand103` | store node | Stand 103 | `cnv_standPlan` |
| `nod_stand104` | store node | Stand 104 | `cnv_standPlan` |
| `nod_stand105` | store node | Stand 105 | `cnv_standPlan` |
| `nod_stand106` | store node | Stand 106 | `cnv_standPlan` |
| `nod_stand107` | store node | Stand 107 | `cnv_standPlan` |
| `nod_stand108` | store node | Stand 108 | `cnv_standPlan` |
| `nod_stand109` | store node | Stand 109 | `cnv_standPlan` |
| `nod_stand110` | store node | Stand 110 | `cnv_standPlan` |
| `nod_stand111` | store node | Stand 111 | `cnv_standPlan` |
| `nod_stand112` | store node | Stand 112 | `cnv_standPlan` |
| `nod_stand113` | store node | Stand 113 | `cnv_standPlan` |
| `nod_stand114` | store node | Stand 114 | `cnv_standPlan` |
| `nod_stand115` | store node | Stand 115 | `cnv_standPlan` |
| `nod_stand116` | store node | Stand 116 | `cnv_standPlan` |
| `nod_stand117` | store node | Stand 117 | `cnv_standPlan` |
| `nod_stand118` | store node | Stand 118 | `cnv_standPlan` |
| `nod_stand119` | store node | Stand 119 | `cnv_standPlan` |
| `nod_stand120` | store node | Stand 120 | `cnv_standPlan` |
| `nod_stand121` | store node | Stand 121 | `cnv_standPlan` |
| `nod_stand122` | store node | Stand 122 | `cnv_standPlan` |
| `nod_stand123` | store node | Stand 123 | `cnv_standPlan` |
| `nod_stand124` | store node | Stand 124 | `cnv_standPlan` |
| `nod_stand201` | store node | Stand 201 | `cnv_standPlan` |
| `nod_stand202` | store node | Stand 202 | `cnv_standPlan` |
| `nod_stand203` | store node | Stand 203 | `cnv_standPlan` |
| `nod_stand204` | store node | Stand 204 | `cnv_standPlan` |
| `nod_stand205` | store node | Stand 205 | `cnv_standPlan` |
| `nod_stand206` | store node | Stand 206 | `cnv_standPlan` |
| `nod_stand207` | store node | Stand 207 | `cnv_standPlan` |
| `nod_stand208` | store node | Stand 208 | `cnv_standPlan` |
| `nod_stand209` | store node | Stand 209 | `cnv_standPlan` |
| `nod_stand210` | store node | Stand 210 | `cnv_standPlan` |
| `nod_stand211` | store node | Stand 211 | `cnv_standPlan` |
| `nod_stand212` | store node | Stand 212 | `cnv_standPlan` |
| `nod_stand213` | store node | Stand 213 | `cnv_standPlan` |
| `nod_stand214` | store node | Stand 214 | `cnv_standPlan` |
| `nod_stand215` | store node | Stand 215 | `cnv_standPlan` |
| `nod_stand216` | store node | Stand 216 | `cnv_standPlan` |
| `nod_stand217` | store node | Stand 217 | `cnv_standPlan` |
| `nod_stand218` | store node | Stand 218 | `cnv_standPlan` |
| `nod_stand219` | store node | Stand 219 | `cnv_standPlan` |
| `nod_stand220` | store node | Stand 220 | `cnv_standPlan` |
| `nod_stand221` | store node | Stand 221 | `cnv_standPlan` |
| `nod_stand222` | store node | Stand 222 | `cnv_standPlan` |
| `nod_stand223` | store node | Stand 223 | `cnv_standPlan` |
| `nod_stand224` | store node | Stand 224 | `cnv_standPlan` |
| `nod_stand301` | store node | Stand 301 | `cnv_standPlan` |
| `nod_stand302` | store node | Stand 302 | `cnv_standPlan` |
| `nod_stand303` | store node | Stand 303 | `cnv_standPlan` |
| `nod_stand304` | store node | Stand 304 | `cnv_standPlan` |
| `nod_stand305` | store node | Stand 305 | `cnv_standPlan` |
| `nod_stand306` | store node | Stand 306 | `cnv_standPlan` |
| `nod_stand307` | store node | Stand 307 | `cnv_standPlan` |
| `nod_stand308` | store node | Stand 308 | `cnv_standPlan` |
| `nod_stand309` | store node | Stand 309 | `cnv_standPlan` |
| `nod_stand310` | store node | Stand 310 | `cnv_standPlan` |
| `nod_stand311` | store node | Stand 311 | `cnv_standPlan` |
| `nod_stand312` | store node | Stand 312 | `cnv_standPlan` |
| `nod_stand313` | store node | Stand 313 | `cnv_standPlan` |
| `nod_stand314` | store node | Stand 314 | `cnv_standPlan` |
| `nod_stand315` | store node | Stand 315 | `cnv_standPlan` |
| `nod_stand316` | store node | Stand 316 | `cnv_standPlan` |
| `nod_stand317` | store node | Stand 317 | `cnv_standPlan` |
| `nod_stand318` | store node | Stand 318 | `cnv_standPlan` |
| `nod_stand319` | store node | Stand 319 | `cnv_standPlan` |
| `nod_stand320` | store node | Stand 320 | `cnv_standPlan` |
| `nod_stand321` | store node | Stand 321 | `cnv_standPlan` |
| `nod_stand322` | store node | Stand 322 | `cnv_standPlan` |
| `nod_stand323` | store node | Stand 323 | `cnv_standPlan` |
| `nod_stand324` | store node | Stand 324 | `cnv_standPlan` |
| `nod_stand401` | store node | Stand 401 | `cnv_standPlan` |
| `nod_stand402` | store node | Stand 402 | `cnv_standPlan` |
| `nod_stand403` | store node | Stand 403 | `cnv_standPlan` |
| `nod_stand404` | store node | Stand 404 | `cnv_standPlan` |
| `nod_stand405` | store node | Stand 405 | `cnv_standPlan` |
| `nod_stand406` | store node | Stand 406 | `cnv_standPlan` |
| `nod_stand407` | store node | Stand 407 | `cnv_standPlan` |
| `nod_stand408` | store node | Stand 408 | `cnv_standPlan` |
| `nod_stand409` | store node | Stand 409 | `cnv_standPlan` |
| `nod_stand410` | store node | Stand 410 | `cnv_standPlan` |
| `nod_stand411` | store node | Stand 411 | `cnv_standPlan` |
| `nod_stand412` | store node | Stand 412 | `cnv_standPlan` |
| `nod_stand413` | store node | Stand 413 | `cnv_standPlan` |
| `nod_stand414` | store node | Stand 414 | `cnv_standPlan` |
| `nod_stand415` | store node | Stand 415 | `cnv_standPlan` |
| `nod_stand416` | store node | Stand 416 | `cnv_standPlan` |
| `nod_stand417` | store node | Stand 417 | `cnv_standPlan` |
| `nod_stand418` | store node | Stand 418 | `cnv_standPlan` |
| `nod_stand419` | store node | Stand 419 | `cnv_standPlan` |
| `nod_stand420` | store node | Stand 420 | `cnv_standPlan` |
| `nod_stand421` | store node | Stand 421 | `cnv_standPlan` |
| `nod_stand422` | store node | Stand 422 | `cnv_standPlan` |
| `nod_stand423` | store node | Stand 423 | `cnv_standPlan` |
| `nod_stand424` | store node | Stand 424 | `cnv_standPlan` |
| `nod_stand501` | store node | Stand 501 | `cnv_standPlan` |
| `nod_stand502` | store node | Stand 502 | `cnv_standPlan` |
| `nod_stand503` | store node | Stand 503 | `cnv_standPlan` |
| `nod_stand504` | store node | Stand 504 | `cnv_standPlan` |
| `nod_stand505` | store node | Stand 505 | `cnv_standPlan` |
| `nod_stand506` | store node | Stand 506 | `cnv_standPlan` |
| `nod_stand507` | store node | Stand 507 | `cnv_standPlan` |
| `nod_stand508` | store node | Stand 508 | `cnv_standPlan` |
| `nod_stand509` | store node | Stand 509 | `cnv_standPlan` |
| `nod_stand510` | store node | Stand 510 | `cnv_standPlan` |
| `nod_stand511` | store node | Stand 511 | `cnv_standPlan` |
| `nod_stand512` | store node | Stand 512 | `cnv_standPlan` |
| `nod_stand513` | store node | Stand 513 | `cnv_standPlan` |
| `nod_stand514` | store node | Stand 514 | `cnv_standPlan` |
| `nod_stand515` | store node | Stand 515 | `cnv_standPlan` |
| `nod_stand516` | store node | Stand 516 | `cnv_standPlan` |
| `nod_stand517` | store node | Stand 517 | `cnv_standPlan` |
| `nod_stand518` | store node | Stand 518 | `cnv_standPlan` |
| `nod_stand519` | store node | Stand 519 | `cnv_standPlan` |
| `nod_stand520` | store node | Stand 520 | `cnv_standPlan` |
| `nod_stand521` | store node | Stand 521 | `cnv_standPlan` |
| `nod_stand522` | store node | Stand 522 | `cnv_standPlan` |
| `nod_stand523` | store node | Stand 523 | `cnv_standPlan` |
| `nod_stand524` | store node | Stand 524 | `cnv_standPlan` |
| `nod_standAllocated` | state node | stand allocated | `cnv_flightLifecycle` |
| `nod_standAllocator` | service node | Stand allocator | `cnv_standPlan` |
| `nod_standAny` | any node | nod_standAny | `cnv_standLifecycle` |
| `nod_standBlocked` | state node | out of service | `cnv_standLifecycle` |
| `nod_standClearing` | state node | clearing | `cnv_standLifecycle` |
| `nod_standDown` | state node | stand down | `cnv_emergencyDesk` |
| `nod_standFree` | state node | free | `cnv_standLifecycle` |
| `nod_standOccupied` | state node | occupied | `cnv_standLifecycle` |
| `nod_standPlanned` | state node | planned | `cnv_standLifecycle` |
| `nod_standPlanner` | actor node | Stand planner | `cnv_standPlan` |
| `nod_standStart` | initial node | nod_standStart | `cnv_standLifecycle` |
| `nod_stayStart` | initial node | nod_stayStart | `cnv_parkingStay` |
| `nod_stopBarA1` | service node | Stop bar A1 | `cnv_airfieldSurface` |
| `nod_stopBarA10` | service node | Stop bar A10 | `cnv_airfieldSurface` |
| `nod_stopBarA11` | service node | Stop bar A11 | `cnv_airfieldSurface` |
| `nod_stopBarA12` | service node | Stop bar A12 | `cnv_airfieldSurface` |
| `nod_stopBarA13` | service node | Stop bar A13 | `cnv_airfieldSurface` |
| `nod_stopBarA14` | service node | Stop bar A14 | `cnv_airfieldSurface` |
| `nod_stopBarA15` | service node | Stop bar A15 | `cnv_airfieldSurface` |
| `nod_stopBarA16` | service node | Stop bar A16 | `cnv_airfieldSurface` |
| `nod_stopBarA2` | service node | Stop bar A2 | `cnv_airfieldSurface` |
| `nod_stopBarA3` | service node | Stop bar A3 | `cnv_airfieldSurface` |
| `nod_stopBarA4` | service node | Stop bar A4 | `cnv_airfieldSurface` |
| `nod_stopBarA5` | service node | Stop bar A5 | `cnv_airfieldSurface` |
| `nod_stopBarA6` | service node | Stop bar A6 | `cnv_airfieldSurface` |
| `nod_stopBarA7` | service node | Stop bar A7 | `cnv_airfieldSurface` |
| `nod_stopBarA8` | service node | Stop bar A8 | `cnv_airfieldSurface` |
| `nod_stopBarA9` | service node | Stop bar A9 | `cnv_airfieldSurface` |
| `nod_stopBarB1` | service node | Stop bar B1 | `cnv_airfieldSurface` |
| `nod_stopBarB10` | service node | Stop bar B10 | `cnv_airfieldSurface` |
| `nod_stopBarB11` | service node | Stop bar B11 | `cnv_airfieldSurface` |
| `nod_stopBarB12` | service node | Stop bar B12 | `cnv_airfieldSurface` |
| `nod_stopBarB13` | service node | Stop bar B13 | `cnv_airfieldSurface` |
| `nod_stopBarB14` | service node | Stop bar B14 | `cnv_airfieldSurface` |
| `nod_stopBarB15` | service node | Stop bar B15 | `cnv_airfieldSurface` |
| `nod_stopBarB16` | service node | Stop bar B16 | `cnv_airfieldSurface` |
| `nod_stopBarB2` | service node | Stop bar B2 | `cnv_airfieldSurface` |
| `nod_stopBarB3` | service node | Stop bar B3 | `cnv_airfieldSurface` |
| `nod_stopBarB4` | service node | Stop bar B4 | `cnv_airfieldSurface` |
| `nod_stopBarB5` | service node | Stop bar B5 | `cnv_airfieldSurface` |
| `nod_stopBarB6` | service node | Stop bar B6 | `cnv_airfieldSurface` |
| `nod_stopBarB7` | service node | Stop bar B7 | `cnv_airfieldSurface` |
| `nod_stopBarB8` | service node | Stop bar B8 | `cnv_airfieldSurface` |
| `nod_stopBarB9` | service node | Stop bar B9 | `cnv_airfieldSurface` |
| `nod_stored` | state node | in the early bag store | `cnv_bagLifecycle` |
| `nod_taxiA1` | service node | Taxiway A1 | `cnv_airfieldSurface` |
| `nod_taxiA10` | service node | Taxiway A10 | `cnv_airfieldSurface` |
| `nod_taxiA11` | service node | Taxiway A11 | `cnv_airfieldSurface` |
| `nod_taxiA12` | service node | Taxiway A12 | `cnv_airfieldSurface` |
| `nod_taxiA13` | service node | Taxiway A13 | `cnv_airfieldSurface` |
| `nod_taxiA14` | service node | Taxiway A14 | `cnv_airfieldSurface` |
| `nod_taxiA15` | service node | Taxiway A15 | `cnv_airfieldSurface` |
| `nod_taxiA16` | service node | Taxiway A16 | `cnv_airfieldSurface` |
| `nod_taxiA2` | service node | Taxiway A2 | `cnv_airfieldSurface` |
| `nod_taxiA3` | service node | Taxiway A3 | `cnv_airfieldSurface` |
| `nod_taxiA4` | service node | Taxiway A4 | `cnv_airfieldSurface` |
| `nod_taxiA5` | service node | Taxiway A5 | `cnv_airfieldSurface` |
| `nod_taxiA6` | service node | Taxiway A6 | `cnv_airfieldSurface` |
| `nod_taxiA7` | service node | Taxiway A7 | `cnv_airfieldSurface` |
| `nod_taxiA8` | service node | Taxiway A8 | `cnv_airfieldSurface` |
| `nod_taxiA9` | service node | Taxiway A9 | `cnv_airfieldSurface` |
| `nod_taxiB1` | service node | Taxiway B1 | `cnv_airfieldSurface` |
| `nod_taxiB10` | service node | Taxiway B10 | `cnv_airfieldSurface` |
| `nod_taxiB11` | service node | Taxiway B11 | `cnv_airfieldSurface` |
| `nod_taxiB12` | service node | Taxiway B12 | `cnv_airfieldSurface` |
| `nod_taxiB13` | service node | Taxiway B13 | `cnv_airfieldSurface` |
| `nod_taxiB14` | service node | Taxiway B14 | `cnv_airfieldSurface` |
| `nod_taxiB15` | service node | Taxiway B15 | `cnv_airfieldSurface` |
| `nod_taxiB16` | service node | Taxiway B16 | `cnv_airfieldSurface` |
| `nod_taxiB2` | service node | Taxiway B2 | `cnv_airfieldSurface` |
| `nod_taxiB3` | service node | Taxiway B3 | `cnv_airfieldSurface` |
| `nod_taxiB4` | service node | Taxiway B4 | `cnv_airfieldSurface` |
| `nod_taxiB5` | service node | Taxiway B5 | `cnv_airfieldSurface` |
| `nod_taxiB6` | service node | Taxiway B6 | `cnv_airfieldSurface` |
| `nod_taxiB7` | service node | Taxiway B7 | `cnv_airfieldSurface` |
| `nod_taxiB8` | service node | Taxiway B8 | `cnv_airfieldSurface` |
| `nod_taxiB9` | service node | Taxiway B9 | `cnv_airfieldSurface` |
| `nod_taxiingOut` | state node | taxiing out | `cnv_flightLifecycle` |
| `nod_teams` | parallel node | all teams | `cnv_turnaroundProcedure` |
| `nod_teamsDone` | join node | all done | `cnv_turnaroundProcedure` |
| `nod_tower` | external node | Tower | `cnv_emergencyDesk` |
| `nod_transferA1` | service node | Transfer input A1 | `cnv_beltNetwork` |
| `nod_transferA2` | service node | Transfer input A2 | `cnv_beltNetwork` |
| `nod_transferB1` | service node | Transfer input B1 | `cnv_beltNetwork` |
| `nod_transferB2` | service node | Transfer input B2 | `cnv_beltNetwork` |
| `nod_transferC1` | service node | Transfer input C1 | `cnv_beltNetwork` |
| `nod_transferC2` | service node | Transfer input C2 | `cnv_beltNetwork` |
| `nod_transferD1` | service node | Transfer input D1 | `cnv_beltNetwork` |
| `nod_transferD2` | service node | Transfer input D2 | `cnv_beltNetwork` |
| `nod_travelDocument` | switch node | which document? | `cnv_borderCheck` |
| `nod_travellerA` | actor node | Passenger | `cnv_hallAlevel` |
| `nod_travellerB` | actor node | Passenger | `cnv_hallBlevel` |
| `nod_travellerC` | actor node | Passenger | `cnv_hallClevel` |
| `nod_travellerD` | actor node | Passenger | `cnv_hallDlevel` |
| `nod_trayHeld` | state node | tray held | `cnv_alarmResolution` |
| `nod_triaged` | state node | triaged | `cnv_workOrder` |
| `nod_turnaround` | service node | Turnaround coordination | `cnv_airportOperations` |
| `nod_typeFour` | assign node | type I then IV | `cnv_deIcingProcedure` |
| `nod_typeOne` | assign node | type I only | `cnv_deIcingProcedure` |
| `nod_unclaimed` | state node | unclaimed | `cnv_lostItem` |
| `nod_unread` | state node | manual encoding | `cnv_bagLifecycle` |
| `nod_visaCheck` | if node | visa needed? | `cnv_borderCheck` |
| `nod_waitCaptain` | wait node | the captain accepts the load | `cnv_boardingProcedure` |
| `nod_waitPage` | wait node | three minutes | `cnv_findMissing` |
| `nod_watchlist` | if node | on a watch list? | `cnv_borderCheck` |
| `nod_wayfinding` | service node | Wayfinding | `cnv_airportOperations` |
| `nod_weatherService` | external node | Weather service | `cnv_airportOperations` |
| `nod_whatChanged` | switch node | what changed? | `cnv_flightAlerts` |
| `nod_whoIsBooked` | call node | who is booked | `cnv_notifyPassengers` |
| `nod_whyRefused` | switch node | why not? | `cnv_boardOnePassenger` |
| `nod_workDone` | state node | done | `cnv_workOrder` |
| `nod_workOrders` | store node | Work orders | `cnv_airportOperations` |
| `nod_workRejected` | state node | rejected | `cnv_workOrder` |
| `nod_workStart` | initial node | nod_workStart | `cnv_workOrder` |
| `nod_wrongGate` | call node | send them to the right gate | `cnv_boardOnePassenger` |
| `nte_aodbNote` | note | nte_aodbNote |  |
| `nte_beltNote` | note | nte_beltNote |  |
| `nte_wayfindingNote` | note | nte_wayfindingNote |  |
| `prj_airportOperations` | project | Airport operations |  |
| `pty_airline` | party | Airline |  |
| `pty_aodb` | party | Operations database |  |
| `pty_apoc` | party | Airport operations centre |  |
| `pty_atc` | party | Air traffic control |  |
| `pty_baggageOps` | party | Baggage operations |  |
| `pty_bhs` | party | Baggage handling system |  |
| `pty_borderPolice` | party | Border police |  |
| `pty_caterer` | party | Caterer |  |
| `pty_cleaning` | party | Cabin cleaning |  |
| `pty_crew` | party | Cabin crew |  |
| `pty_customs` | party | Customs |  |
| `pty_dcs` | party | Airline departure control |  |
| `pty_fireRescue` | party | Fire and rescue |  |
| `pty_fuelSupplier` | party | Fuel supplier |  |
| `pty_groundHandler` | party | Ground handler |  |
| `pty_maintenance` | party | Airport maintenance |  |
| `pty_meteo` | party | Weather service |  |
| `pty_networkManager` | party | Network manager |  |
| `pty_passenger` | party | Passenger |  |
| `pty_paymentProvider` | party | Payment provider |  |
| `pty_pilot` | party | Pilot in command |  |
| `pty_security` | party | Security screening |  |
| `pty_slotCoordinator` | party | Slot coordinator |  |
| `rgn_bagsRegion` | region | Bags and cargo | `cnv_turnaroundMilestones` |
| `rgn_cateringRegion` | region | Catering | `cnv_turnaroundMilestones` |
| `rgn_cleaningRegion` | region | Cleaning | `cnv_turnaroundMilestones` |
| `rgn_fuelRegion` | region | Fuel | `cnv_turnaroundMilestones` |
| `rgn_groundRegion` | region | Ground power and water | `cnv_turnaroundMilestones` |
| `rgn_passengersRegion` | region | Passengers | `cnv_turnaroundMilestones` |
| `scn_aBagFromTheDropToTheHold` | scenario | A bag from the drop to the hold |  |
| `scn_aDelayThenANewSlot` | scenario | A delay, then a new slot |  |
| `scn_aDepartureOnTime` | scenario | A departure on time |  |
| `scn_aLaneInAlarm` | scenario | A lane in alarm |  |
| `scn_aStandSDay` | scenario | A stand's day |  |
| `scn_theAirlineCancels` | scenario | The airline cancels |  |
| `tmr_break` | timer | break |  |
| `tmr_checkInCloses` | timer | check-in closes |  |
| `tmr_checkInOpens` | timer | check-in opens |  |
| `tmr_fuellingLimit` | timer | fuelling limit |  |
| `tmr_graceToLeave` | timer | grace to leave |  |
| `tmr_keepFor` | timer | keep for |  |
| `tmr_pagingInterval` | timer | paging interval |  |
| `tmr_paymentTerms` | timer | payment terms |  |
| `tmr_rushWindow` | timer | rush window |  |
| `tmr_taxiOutLimit` | timer | taxi-out limit |  |
| `typ_boardingVars` | type | BoardingVars |  |
| `typ_flight` | type | Flight |  |
| `whk_cateringEvents` | webhook | Catering events |  |
| `whk_fuelTruckEvents` | webhook | Fuel truck events |  |
| `whk_paymentEvents` | webhook | Payment events |  |

## Levels

- `cnv_airportOperations` "Airport operations" [system]
  - `nod_airfield` → `cnv_airfieldSurface` "Airfield surface" [system]
  - `nod_aodb` → `cnv_aodbIntegrations` "Operations database" [system]
  - `nod_baggageHandling` → `cnv_beltNetwork` "Belt network" [system]
  - `nod_bags` → `cnv_bagLifecycle` "Bag lifecycle" [machine]
  - `nod_billing` → `cnv_monthlyBilling` "Monthly billing" [flow]
    - `nod_eachOperator` → `cnv_billOneOperator` "Bill one operator" [flow]
  - `nod_boarding` → `cnv_boardingProcedure` "Boarding procedure" [flow]
    - `nod_anyoneMissing` → `cnv_findMissing` "Find the missing" [flow]
    - `nod_eachPassenger` → `cnv_boardOnePassenger` "Board one passenger" [flow]
    - `nod_offloadBags` → `cnv_offloadNoShows` "Offload the no-shows' bags" [flow]
      - `nod_eachBag` → `cnv_offloadOneBag` "Offload one bag" [flow]
  - `nod_borderControl` → `cnv_borderCheck` "Border check" [flow]
    - `nod_secondary` → `cnv_secondaryInspection` "Secondary inspection" [flow]
  - `nod_checkIn` → `cnv_checkInHalls` "Check-in halls" [system]
    - `nod_hallA` → `cnv_hallAlevel` "Terminal A hall" [system]
    - `nod_hallB` → `cnv_hallBlevel` "Terminal B hall" [system]
    - `nod_hallC` → `cnv_hallClevel` "Terminal C hall" [system]
    - `nod_hallD` → `cnv_hallDlevel` "Terminal D hall" [system]
  - `nod_cleaningService` → `cnv_cabinCleaning` "Cabin cleaning" [flow]
  - `nod_deIcing` → `cnv_deIcingProcedure` "De-icing" [flow]
  - `nod_emergencyResponse` → `cnv_emergencyDesk` "Emergency desk" [mixed]
  - `nod_flights` → `cnv_flightLifecycle` "Flight lifecycle" [machine]
    - `nod_airborneFlight` → `cnv_climbOut` "Climb out" [machine]
    - `nod_boardingFlight` → `cnv_boardingPhases` "Boarding phases" [machine]
  - `nod_fuelService` → `cnv_fuelling` "Into-plane fuelling" [flow]
  - `nod_irregularOps` → `cnv_disruptionDesk` "Disruption desk" [mixed]
  - `nod_lostAndFound` → `cnv_lostItem` "Lost item" [machine]
  - `nod_parking` → `cnv_parkingStay` "Parking stay" [machine]
  - `nod_passengerApp` → `cnv_flightAlerts` "Flight alerts" [flow]
  - `nod_passengers` → `cnv_passengerJourney` "Passenger journey" [machine]
  - `nod_resourceManagement` → `cnv_standPlan` "Stands and gates" [system]
    - `nod_gateA1` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA10` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA11` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA13` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA14` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA16` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA17` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA19` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA2` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA20` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA22` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA23` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA4` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA5` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA7` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateA8` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB1` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB10` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB11` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB13` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB14` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB16` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB17` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB19` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB2` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB20` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB22` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB23` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB4` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB5` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB7` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateB8` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC1` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC10` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC11` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC13` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC14` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC16` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC17` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC19` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC2` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC20` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC22` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC23` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC4` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC5` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC7` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateC8` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD1` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD10` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD11` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD13` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD14` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD16` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD17` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD19` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD2` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD20` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD22` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD23` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD4` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD5` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD7` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_gateD8` → `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
      - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
    - `nod_stand101` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand102` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand103` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand104` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand105` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand106` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand107` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand108` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand109` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand110` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand111` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand112` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand113` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand114` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand115` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand116` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand117` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand118` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand119` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand120` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand121` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand122` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand123` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand124` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand201` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand202` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand203` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand204` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand205` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand206` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand207` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand208` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand209` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand210` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand211` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand212` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand213` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand214` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand215` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand216` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand217` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand218` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand219` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand220` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand221` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand222` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand223` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand224` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand301` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand302` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand303` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand304` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand305` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand306` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand307` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand308` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand309` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand310` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand311` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand312` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand313` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand314` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand315` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand316` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand317` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand318` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand319` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand320` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand321` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand322` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand323` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand324` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand401` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand402` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand403` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand404` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand405` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand406` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand407` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand408` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand409` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand410` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand411` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand412` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand413` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand414` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand415` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand416` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand417` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand418` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand419` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand420` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand421` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand422` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand423` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand424` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand501` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand502` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand503` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand504` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand505` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand506` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand507` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand508` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand509` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand510` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand511` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand512` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand513` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand514` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand515` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand516` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand517` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand518` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand519` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand520` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand521` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand522` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand523` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
    - `nod_stand524` → `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]
  - `nod_securityScreening` → `cnv_screeningHalls` "Screening halls" [system]
    - `nod_laneRecords` → `cnv_securityLane` "Security lane" [machine]
      - `nod_laneAlarm` → `cnv_alarmResolution` "Alarm resolution" [machine]
  - `nod_turnaround` → `cnv_turnaroundMilestones` "Turnaround milestones" [machine]
  - `nod_workOrders` → `cnv_workOrder` "Work order" [machine]
- `act_notifyPassengers` → `cnv_notifyPassengers` "Notify passengers" [flow]
- `act_runTheTurnaround` → `cnv_turnaroundProcedure` "Turnaround procedure" [flow]
- `def_gateBoarding` → `cnv_gateBoarding` "Gate boarding" [flow]
  - `nod_gateGroups` → `cnv_boardOneGroup` "Board one group" [flow]
- `def_standLifecycle` → `cnv_standLifecycle` "Stand lifecycle" [machine]

## Canvases

### `cnv_airfieldSurface` "Airfield surface"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1dx` | `nod_groundController` | `nod_routeService` | command |  |
| `edg_e1dy` | `nod_routeService` | `nod_rwy07L` | command |  |
| `edg_e1dz` | `nod_taxiA1` | `nod_holdA1` | data |  |
| `edg_e1e0` | `nod_holdA1` | `nod_stopBarA1` | data |  |
| `edg_e1e1` | `nod_stopBarA1` | `nod_rwy07L` | data |  |
| `edg_e1e2` | `nod_routeService` | `nod_stopBarA1` | command |  |
| `edg_e1e3` | `nod_linkA1` | `nod_taxiA1` | data |  |
| `edg_e1e4` | `nod_taxiA1` | `nod_taxiA2` | data |  |
| `edg_e1e5` | `nod_taxiA2` | `nod_holdA2` | data |  |
| `edg_e1e6` | `nod_holdA2` | `nod_stopBarA2` | data |  |
| `edg_e1e7` | `nod_stopBarA2` | `nod_rwy07L` | data |  |
| `edg_e1e8` | `nod_routeService` | `nod_stopBarA2` | command |  |
| `edg_e1e9` | `nod_taxiA2` | `nod_taxiA3` | data |  |
| `edg_e1ea` | `nod_taxiA3` | `nod_holdA3` | data |  |
| `edg_e1eb` | `nod_holdA3` | `nod_stopBarA3` | data |  |
| `edg_e1ec` | `nod_stopBarA3` | `nod_rwy07L` | data |  |
| `edg_e1ed` | `nod_routeService` | `nod_stopBarA3` | command |  |
| `edg_e1ee` | `nod_linkA3` | `nod_taxiA3` | data |  |
| `edg_e1ef` | `nod_taxiA3` | `nod_taxiA4` | data |  |
| `edg_e1eg` | `nod_taxiA4` | `nod_holdA4` | data |  |
| `edg_e1eh` | `nod_holdA4` | `nod_stopBarA4` | data |  |
| `edg_e1ei` | `nod_stopBarA4` | `nod_rwy07L` | data |  |
| `edg_e1ej` | `nod_routeService` | `nod_stopBarA4` | command |  |
| `edg_e1ek` | `nod_taxiA4` | `nod_taxiA5` | data |  |
| `edg_e1el` | `nod_taxiA5` | `nod_holdA5` | data |  |
| `edg_e1em` | `nod_holdA5` | `nod_stopBarA5` | data |  |
| `edg_e1en` | `nod_stopBarA5` | `nod_rwy07L` | data |  |
| `edg_e1eo` | `nod_routeService` | `nod_stopBarA5` | command |  |
| `edg_e1ep` | `nod_linkA5` | `nod_taxiA5` | data |  |
| `edg_e1eq` | `nod_taxiA5` | `nod_taxiA6` | data |  |
| `edg_e1er` | `nod_taxiA6` | `nod_holdA6` | data |  |
| `edg_e1es` | `nod_holdA6` | `nod_stopBarA6` | data |  |
| `edg_e1et` | `nod_stopBarA6` | `nod_rwy07L` | data |  |
| `edg_e1eu` | `nod_routeService` | `nod_stopBarA6` | command |  |
| `edg_e1ev` | `nod_taxiA6` | `nod_taxiA7` | data |  |
| `edg_e1ew` | `nod_taxiA7` | `nod_holdA7` | data |  |
| `edg_e1ex` | `nod_holdA7` | `nod_stopBarA7` | data |  |
| `edg_e1ey` | `nod_stopBarA7` | `nod_rwy07L` | data |  |
| `edg_e1ez` | `nod_routeService` | `nod_stopBarA7` | command |  |
| `edg_e1f0` | `nod_linkA7` | `nod_taxiA7` | data |  |
| `edg_e1f1` | `nod_taxiA7` | `nod_taxiA8` | data |  |
| `edg_e1f2` | `nod_taxiA8` | `nod_holdA8` | data |  |
| `edg_e1f3` | `nod_holdA8` | `nod_stopBarA8` | data |  |
| `edg_e1f4` | `nod_stopBarA8` | `nod_rwy07L` | data |  |
| `edg_e1f5` | `nod_routeService` | `nod_stopBarA8` | command |  |
| `edg_e1f6` | `nod_taxiA8` | `nod_taxiA9` | data |  |
| `edg_e1f7` | `nod_taxiA9` | `nod_holdA9` | data |  |
| `edg_e1f8` | `nod_holdA9` | `nod_stopBarA9` | data |  |
| `edg_e1f9` | `nod_stopBarA9` | `nod_rwy07L` | data |  |
| `edg_e1fa` | `nod_routeService` | `nod_stopBarA9` | command |  |
| `edg_e1fb` | `nod_linkA9` | `nod_taxiA9` | data |  |
| `edg_e1fc` | `nod_taxiA9` | `nod_taxiA10` | data |  |
| `edg_e1fd` | `nod_taxiA10` | `nod_holdA10` | data |  |
| `edg_e1fe` | `nod_holdA10` | `nod_stopBarA10` | data |  |
| `edg_e1ff` | `nod_stopBarA10` | `nod_rwy07L` | data |  |
| `edg_e1fg` | `nod_routeService` | `nod_stopBarA10` | command |  |
| `edg_e1fh` | `nod_taxiA10` | `nod_taxiA11` | data |  |
| `edg_e1fi` | `nod_taxiA11` | `nod_holdA11` | data |  |
| `edg_e1fj` | `nod_holdA11` | `nod_stopBarA11` | data |  |
| `edg_e1fk` | `nod_stopBarA11` | `nod_rwy07L` | data |  |
| `edg_e1fl` | `nod_routeService` | `nod_stopBarA11` | command |  |
| `edg_e1fm` | `nod_linkA11` | `nod_taxiA11` | data |  |
| `edg_e1fn` | `nod_taxiA11` | `nod_taxiA12` | data |  |
| `edg_e1fo` | `nod_taxiA12` | `nod_holdA12` | data |  |
| `edg_e1fp` | `nod_holdA12` | `nod_stopBarA12` | data |  |
| `edg_e1fq` | `nod_stopBarA12` | `nod_rwy07L` | data |  |
| `edg_e1fr` | `nod_routeService` | `nod_stopBarA12` | command |  |
| `edg_e1fs` | `nod_taxiA12` | `nod_taxiA13` | data |  |
| `edg_e1ft` | `nod_taxiA13` | `nod_holdA13` | data |  |
| `edg_e1fu` | `nod_holdA13` | `nod_stopBarA13` | data |  |
| `edg_e1fv` | `nod_stopBarA13` | `nod_rwy07L` | data |  |
| `edg_e1fw` | `nod_routeService` | `nod_stopBarA13` | command |  |
| `edg_e1fx` | `nod_linkA13` | `nod_taxiA13` | data |  |
| `edg_e1fy` | `nod_taxiA13` | `nod_taxiA14` | data |  |
| `edg_e1fz` | `nod_taxiA14` | `nod_holdA14` | data |  |
| `edg_e1g0` | `nod_holdA14` | `nod_stopBarA14` | data |  |
| `edg_e1g1` | `nod_stopBarA14` | `nod_rwy07L` | data |  |
| `edg_e1g2` | `nod_routeService` | `nod_stopBarA14` | command |  |
| `edg_e1g3` | `nod_taxiA14` | `nod_taxiA15` | data |  |
| `edg_e1g4` | `nod_taxiA15` | `nod_holdA15` | data |  |
| `edg_e1g5` | `nod_holdA15` | `nod_stopBarA15` | data |  |
| `edg_e1g6` | `nod_stopBarA15` | `nod_rwy07L` | data |  |
| `edg_e1g7` | `nod_routeService` | `nod_stopBarA15` | command |  |
| `edg_e1g8` | `nod_linkA15` | `nod_taxiA15` | data |  |
| `edg_e1g9` | `nod_taxiA15` | `nod_taxiA16` | data |  |
| `edg_e1ga` | `nod_taxiA16` | `nod_holdA16` | data |  |
| `edg_e1gb` | `nod_holdA16` | `nod_stopBarA16` | data |  |
| `edg_e1gc` | `nod_stopBarA16` | `nod_rwy07L` | data |  |
| `edg_e1gd` | `nod_routeService` | `nod_stopBarA16` | command |  |
| `edg_e1ge` | `nod_routeService` | `nod_rwy07R` | command |  |
| `edg_e1gf` | `nod_taxiB1` | `nod_holdB1` | data |  |
| `edg_e1gg` | `nod_holdB1` | `nod_stopBarB1` | data |  |
| `edg_e1gh` | `nod_stopBarB1` | `nod_rwy07R` | data |  |
| `edg_e1gi` | `nod_routeService` | `nod_stopBarB1` | command |  |
| `edg_e1gj` | `nod_linkB1` | `nod_taxiB1` | data |  |
| `edg_e1gk` | `nod_taxiB1` | `nod_taxiB2` | data |  |
| `edg_e1gl` | `nod_taxiB2` | `nod_holdB2` | data |  |
| `edg_e1gm` | `nod_holdB2` | `nod_stopBarB2` | data |  |
| `edg_e1gn` | `nod_stopBarB2` | `nod_rwy07R` | data |  |
| `edg_e1go` | `nod_routeService` | `nod_stopBarB2` | command |  |
| `edg_e1gp` | `nod_taxiB2` | `nod_taxiB3` | data |  |
| `edg_e1gq` | `nod_taxiB3` | `nod_holdB3` | data |  |
| `edg_e1gr` | `nod_holdB3` | `nod_stopBarB3` | data |  |
| `edg_e1gs` | `nod_stopBarB3` | `nod_rwy07R` | data |  |
| `edg_e1gt` | `nod_routeService` | `nod_stopBarB3` | command |  |
| `edg_e1gu` | `nod_linkB3` | `nod_taxiB3` | data |  |
| `edg_e1gv` | `nod_taxiB3` | `nod_taxiB4` | data |  |
| `edg_e1gw` | `nod_taxiB4` | `nod_holdB4` | data |  |
| `edg_e1gx` | `nod_holdB4` | `nod_stopBarB4` | data |  |
| `edg_e1gy` | `nod_stopBarB4` | `nod_rwy07R` | data |  |
| `edg_e1gz` | `nod_routeService` | `nod_stopBarB4` | command |  |
| `edg_e1h0` | `nod_taxiB4` | `nod_taxiB5` | data |  |
| `edg_e1h1` | `nod_taxiB5` | `nod_holdB5` | data |  |
| `edg_e1h2` | `nod_holdB5` | `nod_stopBarB5` | data |  |
| `edg_e1h3` | `nod_stopBarB5` | `nod_rwy07R` | data |  |
| `edg_e1h4` | `nod_routeService` | `nod_stopBarB5` | command |  |
| `edg_e1h5` | `nod_linkB5` | `nod_taxiB5` | data |  |
| `edg_e1h6` | `nod_taxiB5` | `nod_taxiB6` | data |  |
| `edg_e1h7` | `nod_taxiB6` | `nod_holdB6` | data |  |
| `edg_e1h8` | `nod_holdB6` | `nod_stopBarB6` | data |  |
| `edg_e1h9` | `nod_stopBarB6` | `nod_rwy07R` | data |  |
| `edg_e1ha` | `nod_routeService` | `nod_stopBarB6` | command |  |
| `edg_e1hb` | `nod_taxiB6` | `nod_taxiB7` | data |  |
| `edg_e1hc` | `nod_taxiB7` | `nod_holdB7` | data |  |
| `edg_e1hd` | `nod_holdB7` | `nod_stopBarB7` | data |  |
| `edg_e1he` | `nod_stopBarB7` | `nod_rwy07R` | data |  |
| `edg_e1hf` | `nod_routeService` | `nod_stopBarB7` | command |  |
| `edg_e1hg` | `nod_linkB7` | `nod_taxiB7` | data |  |
| `edg_e1hh` | `nod_taxiB7` | `nod_taxiB8` | data |  |
| `edg_e1hi` | `nod_taxiB8` | `nod_holdB8` | data |  |
| `edg_e1hj` | `nod_holdB8` | `nod_stopBarB8` | data |  |
| `edg_e1hk` | `nod_stopBarB8` | `nod_rwy07R` | data |  |
| `edg_e1hl` | `nod_routeService` | `nod_stopBarB8` | command |  |
| `edg_e1hm` | `nod_taxiB8` | `nod_taxiB9` | data |  |
| `edg_e1hn` | `nod_taxiB9` | `nod_holdB9` | data |  |
| `edg_e1ho` | `nod_holdB9` | `nod_stopBarB9` | data |  |
| `edg_e1hp` | `nod_stopBarB9` | `nod_rwy07R` | data |  |
| `edg_e1hq` | `nod_routeService` | `nod_stopBarB9` | command |  |
| `edg_e1hr` | `nod_linkB9` | `nod_taxiB9` | data |  |
| `edg_e1hs` | `nod_taxiB9` | `nod_taxiB10` | data |  |
| `edg_e1ht` | `nod_taxiB10` | `nod_holdB10` | data |  |
| `edg_e1hu` | `nod_holdB10` | `nod_stopBarB10` | data |  |
| `edg_e1hv` | `nod_stopBarB10` | `nod_rwy07R` | data |  |
| `edg_e1hw` | `nod_routeService` | `nod_stopBarB10` | command |  |
| `edg_e1hx` | `nod_taxiB10` | `nod_taxiB11` | data |  |
| `edg_e1hy` | `nod_taxiB11` | `nod_holdB11` | data |  |
| `edg_e1hz` | `nod_holdB11` | `nod_stopBarB11` | data |  |
| `edg_e1i0` | `nod_stopBarB11` | `nod_rwy07R` | data |  |
| `edg_e1i1` | `nod_routeService` | `nod_stopBarB11` | command |  |
| `edg_e1i2` | `nod_linkB11` | `nod_taxiB11` | data |  |
| `edg_e1i3` | `nod_taxiB11` | `nod_taxiB12` | data |  |
| `edg_e1i4` | `nod_taxiB12` | `nod_holdB12` | data |  |
| `edg_e1i5` | `nod_holdB12` | `nod_stopBarB12` | data |  |
| `edg_e1i6` | `nod_stopBarB12` | `nod_rwy07R` | data |  |
| `edg_e1i7` | `nod_routeService` | `nod_stopBarB12` | command |  |
| `edg_e1i8` | `nod_taxiB12` | `nod_taxiB13` | data |  |
| `edg_e1i9` | `nod_taxiB13` | `nod_holdB13` | data |  |
| `edg_e1ia` | `nod_holdB13` | `nod_stopBarB13` | data |  |
| `edg_e1ib` | `nod_stopBarB13` | `nod_rwy07R` | data |  |
| `edg_e1ic` | `nod_routeService` | `nod_stopBarB13` | command |  |
| `edg_e1id` | `nod_linkB13` | `nod_taxiB13` | data |  |
| `edg_e1ie` | `nod_taxiB13` | `nod_taxiB14` | data |  |
| `edg_e1if` | `nod_taxiB14` | `nod_holdB14` | data |  |
| `edg_e1ig` | `nod_holdB14` | `nod_stopBarB14` | data |  |
| `edg_e1ih` | `nod_stopBarB14` | `nod_rwy07R` | data |  |
| `edg_e1ii` | `nod_routeService` | `nod_stopBarB14` | command |  |
| `edg_e1ij` | `nod_taxiB14` | `nod_taxiB15` | data |  |
| `edg_e1ik` | `nod_taxiB15` | `nod_holdB15` | data |  |
| `edg_e1il` | `nod_holdB15` | `nod_stopBarB15` | data |  |
| `edg_e1im` | `nod_stopBarB15` | `nod_rwy07R` | data |  |
| `edg_e1in` | `nod_routeService` | `nod_stopBarB15` | command |  |
| `edg_e1io` | `nod_linkB15` | `nod_taxiB15` | data |  |
| `edg_e1ip` | `nod_taxiB15` | `nod_taxiB16` | data |  |
| `edg_e1iq` | `nod_taxiB16` | `nod_holdB16` | data |  |
| `edg_e1ir` | `nod_holdB16` | `nod_stopBarB16` | data |  |
| `edg_e1is` | `nod_stopBarB16` | `nod_rwy07R` | data |  |
| `edg_e1it` | `nod_routeService` | `nod_stopBarB16` | command |  |
| `edg_e1iu` | `nod_taxiA3` | `nod_cross3` | data |  |
| `edg_e1iv` | `nod_cross3` | `nod_taxiB3` | data |  |
| `edg_e1iw` | `nod_taxiA7` | `nod_cross7` | data |  |
| `edg_e1ix` | `nod_cross7` | `nod_taxiB7` | data |  |
| `edg_e1iy` | `nod_taxiA11` | `nod_cross11` | data |  |
| `edg_e1iz` | `nod_cross11` | `nod_taxiB11` | data |  |
| `edg_e1j0` | `nod_taxiA15` | `nod_cross15` | data |  |
| `edg_e1j1` | `nod_cross15` | `nod_taxiB15` | data |  |

### `cnv_airportOperations` "Airport operations"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1` | `nod_airlineOpsControl` | `nod_aodb` | command | ept_publishASchedule |
| `edg_e10` | `nod_baggageHandling` | `nod_alertsQueue` | event | evt_bagRush evt_bagJam |
| `edg_e11` | `nod_securityScreening` | `nod_passengers` | data |  |
| `edg_e12` | `nod_securityScreening` | `nod_alertsQueue` | event | evt_screeningAlarm |
| `edg_e13` | `nod_borderControl` | `nod_passengers` | data |  |
| `edg_e14` | `nod_borderControl` | `nod_borderPoliceExt` | command | ept_checkATraveller |
| `edg_e15` | `nod_borderControl` | `nod_customsExt` | data |  |
| `edg_e16` | `nod_boarding` | `nod_airlineDcs` | command | ept_recordABoarding |
| `edg_e17` | `nod_boarding` | `nod_passengers` | data |  |
| `edg_e18` | `nod_groundCrew` | `nod_turnaround` | command |  |
| `edg_e19` | `nod_groundCrew` | `nod_boarding` | command |  |
| `edg_e1a` | `nod_pilotActor` | `nod_turnaround` | command |  |
| `edg_e1b` | `nod_pilotActor` | `nod_airTrafficControl` | command |  |
| `edg_e1c` | `nod_deIcing` | `nod_turnaround` | event | evt_deicingCompleted |
| `edg_e1d` | `nod_fuelService` | `nod_turnaround` | event | evt_fuelCompleted |
| `edg_e1dv` | `nod_airfield` | `nod_airTrafficControl` | data |  |
| `edg_e1dw` | `nod_airTrafficControl` | `nod_airfield` | command |  |
| `edg_e1e` | `nod_fuelSupplierExt` | `nod_fuelService` | webhook | whk_fuelTruckEvents |
| `edg_e1f` | `nod_cateringCompany` | `nod_turnaround` | webhook | whk_cateringEvents |
| `edg_e1g` | `nod_cleaningService` | `nod_turnaround` | event | evt_cleaningCompleted |
| `edg_e1h` | `nod_billing` | `nod_paymentProviderExt` | command | ept_chargeAnOperator |
| `edg_e1i` | `nod_paymentProviderExt` | `nod_billing` | webhook | whk_paymentEvents |
| `edg_e1j` | `nod_parking` | `nod_paymentProviderExt` | command |  |
| `edg_e1k` | `nod_alertsQueue` | `nod_irregularOps` | stream |  |
| `edg_e1l` | `nod_alertsQueue` | `nod_emergencyResponse` | stream |  |
| `edg_e1m` | `nod_alertsQueue` | `nod_apocDuty` | stream |  |
| `edg_e1n` | `nod_apocDuty` | `nod_irregularOps` | command |  |
| `edg_e1o` | `nod_apocDuty` | `nod_emergencyResponse` | command |  |
| `edg_e1p` | `nod_irregularOps` | `nod_aodb` | command |  |
| `edg_e1q` | `nod_irregularOps` | `nod_notifications` | command |  |
| `edg_e1r` | `nod_notifications` | `nod_passengerApp` | event | evt_passengerNotified |
| `edg_e1s` | `nod_emergencyResponse` | `nod_airTrafficControl` | command |  |
| `edg_e1t` | `nod_emergencyResponse` | `nod_alertsQueue` | event | evt_emergencyDeclared evt_emergencyClosed |
| `edg_e1u` | `nod_maintenanceService` | `nod_workOrders` | data |  |
| `edg_e1v` | `nod_resourceManagement` | `nod_maintenanceService` | command |  |
| `edg_e1w` | `nod_maintenanceService` | `nod_resourceManagement` | event | evt_standReturned |
| `edg_e1x` | `nod_fids` | `nod_wayfinding` | data |  |
| `edg_e1y` | `nod_lostAndFound` | `nod_bags` | data |  |
| `edg_e1z` | `nod_passengerApp` | `nod_lostAndFound` | command |  |
| `edg_e2` | `nod_slotCoordination` | `nod_aodb` | data |  |
| `edg_e3` | `nod_networkManagerExt` | `nod_aodb` | event | evt_ctotIssued evt_ctotRevised evt_flowMeasure |
| `edg_e4` | `nod_airTrafficControl` | `nod_aodb` | event | evt_aircraftLanded evt_aircraftAirborne evt_aircraftOnBlock evt_aircraftOffBlock |
| `edg_e5` | `nod_weatherService` | `nod_aodb` | event | evt_weatherWarning evt_weatherObservation |
| `edg_e6` | `nod_aodb` | `nod_flights` | data |  |
| `edg_e7` | `nod_aodb` | `nod_flightEvents` | event | evt_flightUpdated evt_flightDelayed evt_flightCancelled evt_gateChanged |
| `edg_e8` | `nod_flightEvents` | `nod_fids` | stream |  |
| `edg_e9` | `nod_flightEvents` | `nod_passengerApp` | stream |  |
| `edg_ea` | `nod_flightEvents` | `nod_resourceManagement` | stream |  |
| `edg_eb` | `nod_flightEvents` | `nod_turnaround` | stream |  |
| `edg_ec` | `nod_flightEvents` | `nod_billing` | stream |  |
| `edg_ed` | `nod_flightEvents` | `nod_baggageHandling` | stream |  |
| `edg_ee` | `nod_flightEvents` | `nod_boarding` | stream |  |
| `edg_ef` | `nod_flightEvents` | `nod_deIcing` | stream |  |
| `edg_eg` | `nod_flightEvents` | `nod_irregularOps` | stream |  |
| `edg_eh` | `nod_resourceManagement` | `nod_aodb` | command | ept_allocateAStand |
| `edg_ei` | `nod_turnaround` | `nod_aodb` | command | ept_recordAMilestone |
| `edg_ej` | `nod_turnaround` | `nod_networkManagerExt` | event | evt_dpiSent |
| `edg_ek` | `nod_passengerActor` | `nod_passengerApp` | command |  |
| `edg_el` | `nod_passengerActor` | `nod_checkIn` | command |  |
| `edg_em` | `nod_passengerActor` | `nod_securityScreening` | command |  |
| `edg_en` | `nod_passengerActor` | `nod_borderControl` | command |  |
| `edg_eo` | `nod_passengerActor` | `nod_boarding` | command |  |
| `edg_ep` | `nod_passengerActor` | `nod_parking` | command |  |
| `edg_eq` | `nod_passengerActor` | `nod_lostAndFound` | command |  |
| `edg_er` | `nod_airlineAgent` | `nod_checkIn` | command |  |
| `edg_es` | `nod_airlineAgent` | `nod_boarding` | command |  |
| `edg_et` | `nod_checkIn` | `nod_airlineDcs` | command | ept_checkAPassengerIn |
| `edg_eu` | `nod_checkIn` | `nod_baggageHandling` | data |  |
| `edg_ev` | `nod_checkIn` | `nod_bagMessages` | event | evt_bagSourceMessage |
| `edg_ew` | `nod_airlineDcs` | `nod_bagMessages` | event | evt_bagTransferMessage |
| `edg_ex` | `nod_bagMessages` | `nod_baggageHandling` | stream |  |
| `edg_ey` | `nod_baggageHandling` | `nod_bags` | data |  |
| `edg_ez` | `nod_baggageHandling` | `nod_bagMessages` | event | evt_bagProcessed |

### `cnv_alarmResolution` "Alarm resolution"

machine · transitions partial · subject lane.alarm

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e1a9` | `nod_alarmStart` | `nod_trayHeld` | (none) |  |  |
| `edg_e1aa` | `nod_trayHeld` | `nod_searching` | on:evt_searchStarted |  |  |
| `edg_e1ab` | `nod_searching` | `nod_alarmCleared` | on:evt_searchClear |  |  |
| `edg_e1ac` | `nod_searching` | `nod_explosiveTrace` | on:evt_searchSuspicious |  |  |
| `edg_e1ad` | `nod_explosiveTrace` | `nod_alarmCleared` | on:evt_traceNegative |  |  |
| `edg_e1ae` | `nod_explosiveTrace` | `nod_policeCalled` | on:evt_tracePositive |  |  |

### `cnv_aodbIntegrations` "Operations database"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1d8` | `nod_aodbBus` | `nod_flightRecord` | data |  |
| `edg_e1d9` | `nod_ssimAdapter` | `nod_aodbBus` | event |  |
| `edg_e1da` | `nod_mvtAdapter` | `nod_aodbBus` | event |  |
| `edg_e1db` | `nod_acdmAdapter` | `nod_aodbBus` | event |  |
| `edg_e1dc` | `nod_radarAdapter` | `nod_aodbBus` | event |  |
| `edg_e1dd` | `nod_metAdapter` | `nod_aodbBus` | event |  |
| `edg_e1de` | `nod_billingAdapter` | `nod_aodbBus` | data |  |
| `edg_e1df` | `nod_fidsAdapter` | `nod_aodbBus` | data |  |
| `edg_e1dg` | `nod_legacyFeed` | `nod_aodbBus` | data |  |

### `cnv_bagLifecycle` "Bag lifecycle"

machine · transitions complete · subject bag.status

Roles (derived; change the field that holds them):

- `nod_bagHandler` sends `edg_emt` — `by` of `edg_emt`
- `nod_bagHandler` sends `edg_emv` — `by` of `edg_emv`
- `nod_bagPassenger` sends `nod_dropBag` — `by` of `nod_dropBag`

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_emf` | `nod_bagStart` | `nod_accepted` | (none) |  |  |
| `edg_emg` | `nod_dropBag` | `nod_accepted` | (none) |  | emit:evt_bagSourceMessage |
| `edg_emh` | `nod_accepted` | `nod_inSystem` | on:evt_bagInducted |  |  |
| `edg_emi` | `nod_inSystem` | `nod_screening` | on:evt_bagScreened |  |  |
| `edg_emj` | `nod_screening` | `nod_screenResult` | always |  |  |
| `edg_emk` | `nod_screenResult` | `nod_sorting` | (none) | grd_cleared |  |
| `edg_eml` | `nod_screenResult` | `nod_levelThree` | (none) |  |  |
| `edg_emm` | `nod_levelThree` | `nod_sorting` | on:evt_bagCleared |  |  |
| `edg_emn` | `nod_levelThree` | `nod_rejectedBag` | on:evt_bagRejected |  |  |
| `edg_emo` | `nod_sorting` | `nod_madeUp` | on:evt_bagSorted |  |  |
| `edg_emp` | `nod_sorting` | `nod_stored` | on:evt_bagEarly |  |  |
| `edg_emq` | `nod_stored` | `nod_sorting` | on:evt_bagReleased |  |  |
| `edg_emr` | `nod_sorting` | `nod_unread` | on:evt_bagNoRead |  |  |
| `edg_ems` | `nod_unread` | `nod_sorting` | on:evt_bagEncoded |  |  |
| `edg_emt` | `nod_madeUp` | `nod_loaded` | on:evt_bagLoaded |  |  |
| `edg_emu` | `nod_loaded` | `nod_flown` | on:evt_aircraftAirborne |  |  |
| `edg_emv` | `nod_loaded` | `nod_offloadedBag` | on:evt_bagsOffloaded |  |  |
| `edg_emw` | `nod_offloadedBag` | `nod_sorting` | on:evt_bagReflighted |  |  |
| `edg_emx` | `nod_offloadedBag` | `nod_mishandled` | after:tmr_rushWindow |  |  |

### `cnv_beltNetwork` "Belt network"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e5j` | `nod_collectorA1x1` | `nod_mergeA1` | data | evt_bagMoved |
| `edg_e5k` | `nod_collectorA1x2` | `nod_mergeA1` | data |  |
| `edg_e5l` | `nod_collectorA1x3` | `nod_mergeA1` | data |  |
| `edg_e5m` | `nod_collectorA1x4` | `nod_mergeA1` | data |  |
| `edg_e5n` | `nod_collectorA1x5` | `nod_mergeA1` | data |  |
| `edg_e5o` | `nod_collectorA1x6` | `nod_mergeA1` | data |  |
| `edg_e5p` | `nod_collectorA1x7` | `nod_mergeA1` | data |  |
| `edg_e5q` | `nod_collectorA1x8` | `nod_mergeA1` | data |  |
| `edg_e5r` | `nod_collectorA1x9` | `nod_mergeA1` | data |  |
| `edg_e5s` | `nod_collectorA1x10` | `nod_mergeA1` | data |  |
| `edg_e5t` | `nod_collectorA1x11` | `nod_mergeA1` | data |  |
| `edg_e5u` | `nod_collectorA1x12` | `nod_mergeA1` | data |  |
| `edg_e5v` | `nod_mergeA1` | `nod_mainLineA1` | data |  |
| `edg_e5w` | `nod_collectorA2x1` | `nod_mergeA2` | data | evt_bagMoved |
| `edg_e5x` | `nod_collectorA2x2` | `nod_mergeA2` | data |  |
| `edg_e5y` | `nod_collectorA2x3` | `nod_mergeA2` | data |  |
| `edg_e5z` | `nod_collectorA2x4` | `nod_mergeA2` | data |  |
| `edg_e60` | `nod_collectorA2x5` | `nod_mergeA2` | data |  |
| `edg_e61` | `nod_collectorA2x6` | `nod_mergeA2` | data |  |
| `edg_e62` | `nod_collectorA2x7` | `nod_mergeA2` | data |  |
| `edg_e63` | `nod_collectorA2x8` | `nod_mergeA2` | data |  |
| `edg_e64` | `nod_collectorA2x9` | `nod_mergeA2` | data |  |
| `edg_e65` | `nod_collectorA2x10` | `nod_mergeA2` | data |  |
| `edg_e66` | `nod_collectorA2x11` | `nod_mergeA2` | data |  |
| `edg_e67` | `nod_collectorA2x12` | `nod_mergeA2` | data |  |
| `edg_e68` | `nod_mergeA2` | `nod_mainLineA2` | data |  |
| `edg_e69` | `nod_collectorA3x1` | `nod_mergeA3` | data | evt_bagMoved |
| `edg_e6a` | `nod_collectorA3x2` | `nod_mergeA3` | data |  |
| `edg_e6b` | `nod_collectorA3x3` | `nod_mergeA3` | data |  |
| `edg_e6c` | `nod_collectorA3x4` | `nod_mergeA3` | data |  |
| `edg_e6d` | `nod_collectorA3x5` | `nod_mergeA3` | data |  |
| `edg_e6e` | `nod_collectorA3x6` | `nod_mergeA3` | data |  |
| `edg_e6f` | `nod_collectorA3x7` | `nod_mergeA3` | data |  |
| `edg_e6g` | `nod_collectorA3x8` | `nod_mergeA3` | data |  |
| `edg_e6h` | `nod_collectorA3x9` | `nod_mergeA3` | data |  |
| `edg_e6i` | `nod_collectorA3x10` | `nod_mergeA3` | data |  |
| `edg_e6j` | `nod_collectorA3x11` | `nod_mergeA3` | data |  |
| `edg_e6k` | `nod_collectorA3x12` | `nod_mergeA3` | data |  |
| `edg_e6l` | `nod_mergeA3` | `nod_mainLineA3` | data |  |
| `edg_e6m` | `nod_collectorA4x1` | `nod_mergeA4` | data | evt_bagMoved |
| `edg_e6n` | `nod_collectorA4x2` | `nod_mergeA4` | data |  |
| `edg_e6o` | `nod_collectorA4x3` | `nod_mergeA4` | data |  |
| `edg_e6p` | `nod_collectorA4x4` | `nod_mergeA4` | data |  |
| `edg_e6q` | `nod_collectorA4x5` | `nod_mergeA4` | data |  |
| `edg_e6r` | `nod_collectorA4x6` | `nod_mergeA4` | data |  |
| `edg_e6s` | `nod_collectorA4x7` | `nod_mergeA4` | data |  |
| `edg_e6t` | `nod_collectorA4x8` | `nod_mergeA4` | data |  |
| `edg_e6u` | `nod_collectorA4x9` | `nod_mergeA4` | data |  |
| `edg_e6v` | `nod_collectorA4x10` | `nod_mergeA4` | data |  |
| `edg_e6w` | `nod_collectorA4x11` | `nod_mergeA4` | data |  |
| `edg_e6x` | `nod_collectorA4x12` | `nod_mergeA4` | data |  |
| `edg_e6y` | `nod_mergeA4` | `nod_mainLineA4` | data |  |
| `edg_e6z` | `nod_collectorA5x1` | `nod_mergeA5` | data | evt_bagMoved |
| `edg_e70` | `nod_collectorA5x2` | `nod_mergeA5` | data |  |
| `edg_e71` | `nod_collectorA5x3` | `nod_mergeA5` | data |  |
| `edg_e72` | `nod_collectorA5x4` | `nod_mergeA5` | data |  |
| `edg_e73` | `nod_collectorA5x5` | `nod_mergeA5` | data |  |
| `edg_e74` | `nod_collectorA5x6` | `nod_mergeA5` | data |  |
| `edg_e75` | `nod_collectorA5x7` | `nod_mergeA5` | data |  |
| `edg_e76` | `nod_collectorA5x8` | `nod_mergeA5` | data |  |
| `edg_e77` | `nod_collectorA5x9` | `nod_mergeA5` | data |  |
| `edg_e78` | `nod_collectorA5x10` | `nod_mergeA5` | data |  |
| `edg_e79` | `nod_collectorA5x11` | `nod_mergeA5` | data |  |
| `edg_e7a` | `nod_collectorA5x12` | `nod_mergeA5` | data |  |
| `edg_e7b` | `nod_mergeA5` | `nod_mainLineA5` | data |  |
| `edg_e7c` | `nod_collectorA6x1` | `nod_mergeA6` | data | evt_bagMoved |
| `edg_e7d` | `nod_collectorA6x2` | `nod_mergeA6` | data |  |
| `edg_e7e` | `nod_collectorA6x3` | `nod_mergeA6` | data |  |
| `edg_e7f` | `nod_collectorA6x4` | `nod_mergeA6` | data |  |
| `edg_e7g` | `nod_collectorA6x5` | `nod_mergeA6` | data |  |
| `edg_e7h` | `nod_collectorA6x6` | `nod_mergeA6` | data |  |
| `edg_e7i` | `nod_collectorA6x7` | `nod_mergeA6` | data |  |
| `edg_e7j` | `nod_collectorA6x8` | `nod_mergeA6` | data |  |
| `edg_e7k` | `nod_collectorA6x9` | `nod_mergeA6` | data |  |
| `edg_e7l` | `nod_collectorA6x10` | `nod_mergeA6` | data |  |
| `edg_e7m` | `nod_collectorA6x11` | `nod_mergeA6` | data |  |
| `edg_e7n` | `nod_collectorA6x12` | `nod_mergeA6` | data |  |
| `edg_e7o` | `nod_mergeA6` | `nod_mainLineA6` | data |  |
| `edg_e7p` | `nod_mainLineA1` | `nod_mainLineA2` | data |  |
| `edg_e7q` | `nod_mainLineA2` | `nod_mainLineA3` | data |  |
| `edg_e7r` | `nod_mainLineA3` | `nod_mainLineA4` | data |  |
| `edg_e7s` | `nod_mainLineA4` | `nod_mainLineA5` | data |  |
| `edg_e7t` | `nod_mainLineA5` | `nod_mainLineA6` | data |  |
| `edg_e7u` | `nod_mainLineA1` | `nod_edsA1` | data |  |
| `edg_e7v` | `nod_mainLineA2` | `nod_edsA1` | data |  |
| `edg_e7w` | `nod_edsA1` | `nod_sorterA` | data |  |
| `edg_e7x` | `nod_edsA1` | `nod_levelThreeA` | data | evt_screeningAlarm |
| `edg_e7y` | `nod_mainLineA2` | `nod_edsA2` | data |  |
| `edg_e7z` | `nod_mainLineA3` | `nod_edsA2` | data |  |
| `edg_e80` | `nod_edsA2` | `nod_sorterA` | data |  |
| `edg_e81` | `nod_edsA2` | `nod_levelThreeA` | data | evt_screeningAlarm |
| `edg_e82` | `nod_mainLineA3` | `nod_edsA3` | data |  |
| `edg_e83` | `nod_mainLineA4` | `nod_edsA3` | data |  |
| `edg_e84` | `nod_edsA3` | `nod_sorterA` | data |  |
| `edg_e85` | `nod_edsA3` | `nod_levelThreeA` | data | evt_screeningAlarm |
| `edg_e86` | `nod_mainLineA4` | `nod_edsA4` | data |  |
| `edg_e87` | `nod_mainLineA5` | `nod_edsA4` | data |  |
| `edg_e88` | `nod_edsA4` | `nod_sorterA` | data |  |
| `edg_e89` | `nod_edsA4` | `nod_levelThreeA` | data | evt_screeningAlarm |
| `edg_e8a` | `nod_mainLineA5` | `nod_edsA5` | data |  |
| `edg_e8b` | `nod_mainLineA6` | `nod_edsA5` | data |  |
| `edg_e8c` | `nod_edsA5` | `nod_sorterA` | data |  |
| `edg_e8d` | `nod_edsA5` | `nod_levelThreeA` | data | evt_screeningAlarm |
| `edg_e8e` | `nod_mainLineA6` | `nod_edsA6` | data |  |
| `edg_e8f` | `nod_mainLineA1` | `nod_edsA6` | data |  |
| `edg_e8g` | `nod_edsA6` | `nod_sorterA` | data |  |
| `edg_e8h` | `nod_edsA6` | `nod_levelThreeA` | data | evt_screeningAlarm |
| `edg_e8i` | `nod_levelThreeA` | `nod_sorterA` | data |  |
| `edg_e8j` | `nod_levelThreeA` | `nod_reconcileA` | data |  |
| `edg_e8k` | `nod_sorterA` | `nod_diverterA1` | data |  |
| `edg_e8l` | `nod_diverterA1` | `nod_lateralA1` | data | evt_bagSorted |
| `edg_e8m` | `nod_sorterA` | `nod_diverterA2` | data |  |
| `edg_e8n` | `nod_diverterA2` | `nod_lateralA2` | data |  |
| `edg_e8o` | `nod_sorterA` | `nod_diverterA3` | data |  |
| `edg_e8p` | `nod_diverterA3` | `nod_lateralA3` | data |  |
| `edg_e8q` | `nod_sorterA` | `nod_diverterA4` | data |  |
| `edg_e8r` | `nod_diverterA4` | `nod_lateralA4` | data |  |
| `edg_e8s` | `nod_sorterA` | `nod_diverterA5` | data |  |
| `edg_e8t` | `nod_diverterA5` | `nod_lateralA5` | data |  |
| `edg_e8u` | `nod_sorterA` | `nod_diverterA6` | data |  |
| `edg_e8v` | `nod_diverterA6` | `nod_lateralA6` | data |  |
| `edg_e8w` | `nod_sorterA` | `nod_diverterA7` | data |  |
| `edg_e8x` | `nod_diverterA7` | `nod_lateralA7` | data |  |
| `edg_e8y` | `nod_sorterA` | `nod_diverterA8` | data |  |
| `edg_e8z` | `nod_diverterA8` | `nod_lateralA8` | data |  |
| `edg_e90` | `nod_sorterA` | `nod_diverterA9` | data |  |
| `edg_e91` | `nod_diverterA9` | `nod_lateralA9` | data |  |
| `edg_e92` | `nod_sorterA` | `nod_diverterA10` | data |  |
| `edg_e93` | `nod_diverterA10` | `nod_lateralA10` | data |  |
| `edg_e94` | `nod_sorterA` | `nod_diverterA11` | data |  |
| `edg_e95` | `nod_diverterA11` | `nod_lateralA11` | data |  |
| `edg_e96` | `nod_sorterA` | `nod_diverterA12` | data |  |
| `edg_e97` | `nod_diverterA12` | `nod_lateralA12` | data |  |
| `edg_e98` | `nod_sorterA` | `nod_diverterA13` | data |  |
| `edg_e99` | `nod_diverterA13` | `nod_lateralA13` | data |  |
| `edg_e9a` | `nod_sorterA` | `nod_diverterA14` | data |  |
| `edg_e9b` | `nod_diverterA14` | `nod_lateralA14` | data |  |
| `edg_e9c` | `nod_sorterA` | `nod_diverterA15` | data |  |
| `edg_e9d` | `nod_diverterA15` | `nod_lateralA15` | data |  |
| `edg_e9e` | `nod_sorterA` | `nod_diverterA16` | data |  |
| `edg_e9f` | `nod_diverterA16` | `nod_lateralA16` | data |  |
| `edg_e9g` | `nod_collectorB1x1` | `nod_mergeB1` | data | evt_bagMoved |
| `edg_e9h` | `nod_collectorB1x2` | `nod_mergeB1` | data |  |
| `edg_e9i` | `nod_collectorB1x3` | `nod_mergeB1` | data |  |
| `edg_e9j` | `nod_collectorB1x4` | `nod_mergeB1` | data |  |
| `edg_e9k` | `nod_collectorB1x5` | `nod_mergeB1` | data |  |
| `edg_e9l` | `nod_collectorB1x6` | `nod_mergeB1` | data |  |
| `edg_e9m` | `nod_collectorB1x7` | `nod_mergeB1` | data |  |
| `edg_e9n` | `nod_collectorB1x8` | `nod_mergeB1` | data |  |
| `edg_e9o` | `nod_collectorB1x9` | `nod_mergeB1` | data |  |
| `edg_e9p` | `nod_collectorB1x10` | `nod_mergeB1` | data |  |
| `edg_e9q` | `nod_collectorB1x11` | `nod_mergeB1` | data |  |
| `edg_e9r` | `nod_collectorB1x12` | `nod_mergeB1` | data |  |
| `edg_e9s` | `nod_mergeB1` | `nod_mainLineB1` | data |  |
| `edg_e9t` | `nod_collectorB2x1` | `nod_mergeB2` | data | evt_bagMoved |
| `edg_e9u` | `nod_collectorB2x2` | `nod_mergeB2` | data |  |
| `edg_e9v` | `nod_collectorB2x3` | `nod_mergeB2` | data |  |
| `edg_e9w` | `nod_collectorB2x4` | `nod_mergeB2` | data |  |
| `edg_e9x` | `nod_collectorB2x5` | `nod_mergeB2` | data |  |
| `edg_e9y` | `nod_collectorB2x6` | `nod_mergeB2` | data |  |
| `edg_e9z` | `nod_collectorB2x7` | `nod_mergeB2` | data |  |
| `edg_ea0` | `nod_collectorB2x8` | `nod_mergeB2` | data |  |
| `edg_ea1` | `nod_collectorB2x9` | `nod_mergeB2` | data |  |
| `edg_ea2` | `nod_collectorB2x10` | `nod_mergeB2` | data |  |
| `edg_ea3` | `nod_collectorB2x11` | `nod_mergeB2` | data |  |
| `edg_ea4` | `nod_collectorB2x12` | `nod_mergeB2` | data |  |
| `edg_ea5` | `nod_mergeB2` | `nod_mainLineB2` | data |  |
| `edg_ea6` | `nod_collectorB3x1` | `nod_mergeB3` | data | evt_bagMoved |
| `edg_ea7` | `nod_collectorB3x2` | `nod_mergeB3` | data |  |
| `edg_ea8` | `nod_collectorB3x3` | `nod_mergeB3` | data |  |
| `edg_ea9` | `nod_collectorB3x4` | `nod_mergeB3` | data |  |
| `edg_eaa` | `nod_collectorB3x5` | `nod_mergeB3` | data |  |
| `edg_eab` | `nod_collectorB3x6` | `nod_mergeB3` | data |  |
| `edg_eac` | `nod_collectorB3x7` | `nod_mergeB3` | data |  |
| `edg_ead` | `nod_collectorB3x8` | `nod_mergeB3` | data |  |
| `edg_eae` | `nod_collectorB3x9` | `nod_mergeB3` | data |  |
| `edg_eaf` | `nod_collectorB3x10` | `nod_mergeB3` | data |  |
| `edg_eag` | `nod_collectorB3x11` | `nod_mergeB3` | data |  |
| `edg_eah` | `nod_collectorB3x12` | `nod_mergeB3` | data |  |
| `edg_eai` | `nod_mergeB3` | `nod_mainLineB3` | data |  |
| `edg_eaj` | `nod_collectorB4x1` | `nod_mergeB4` | data | evt_bagMoved |
| `edg_eak` | `nod_collectorB4x2` | `nod_mergeB4` | data |  |
| `edg_eal` | `nod_collectorB4x3` | `nod_mergeB4` | data |  |
| `edg_eam` | `nod_collectorB4x4` | `nod_mergeB4` | data |  |
| `edg_ean` | `nod_collectorB4x5` | `nod_mergeB4` | data |  |
| `edg_eao` | `nod_collectorB4x6` | `nod_mergeB4` | data |  |
| `edg_eap` | `nod_collectorB4x7` | `nod_mergeB4` | data |  |
| `edg_eaq` | `nod_collectorB4x8` | `nod_mergeB4` | data |  |
| `edg_ear` | `nod_collectorB4x9` | `nod_mergeB4` | data |  |
| `edg_eas` | `nod_collectorB4x10` | `nod_mergeB4` | data |  |
| `edg_eat` | `nod_collectorB4x11` | `nod_mergeB4` | data |  |
| `edg_eau` | `nod_collectorB4x12` | `nod_mergeB4` | data |  |
| `edg_eav` | `nod_mergeB4` | `nod_mainLineB4` | data |  |
| `edg_eaw` | `nod_collectorB5x1` | `nod_mergeB5` | data | evt_bagMoved |
| `edg_eax` | `nod_collectorB5x2` | `nod_mergeB5` | data |  |
| `edg_eay` | `nod_collectorB5x3` | `nod_mergeB5` | data |  |
| `edg_eaz` | `nod_collectorB5x4` | `nod_mergeB5` | data |  |
| `edg_eb0` | `nod_collectorB5x5` | `nod_mergeB5` | data |  |
| `edg_eb1` | `nod_collectorB5x6` | `nod_mergeB5` | data |  |
| `edg_eb2` | `nod_collectorB5x7` | `nod_mergeB5` | data |  |
| `edg_eb3` | `nod_collectorB5x8` | `nod_mergeB5` | data |  |
| `edg_eb4` | `nod_collectorB5x9` | `nod_mergeB5` | data |  |
| `edg_eb5` | `nod_collectorB5x10` | `nod_mergeB5` | data |  |
| `edg_eb6` | `nod_collectorB5x11` | `nod_mergeB5` | data |  |
| `edg_eb7` | `nod_collectorB5x12` | `nod_mergeB5` | data |  |
| `edg_eb8` | `nod_mergeB5` | `nod_mainLineB5` | data |  |
| `edg_eb9` | `nod_collectorB6x1` | `nod_mergeB6` | data | evt_bagMoved |
| `edg_eba` | `nod_collectorB6x2` | `nod_mergeB6` | data |  |
| `edg_ebb` | `nod_collectorB6x3` | `nod_mergeB6` | data |  |
| `edg_ebc` | `nod_collectorB6x4` | `nod_mergeB6` | data |  |
| `edg_ebd` | `nod_collectorB6x5` | `nod_mergeB6` | data |  |
| `edg_ebe` | `nod_collectorB6x6` | `nod_mergeB6` | data |  |
| `edg_ebf` | `nod_collectorB6x7` | `nod_mergeB6` | data |  |
| `edg_ebg` | `nod_collectorB6x8` | `nod_mergeB6` | data |  |
| `edg_ebh` | `nod_collectorB6x9` | `nod_mergeB6` | data |  |
| `edg_ebi` | `nod_collectorB6x10` | `nod_mergeB6` | data |  |
| `edg_ebj` | `nod_collectorB6x11` | `nod_mergeB6` | data |  |
| `edg_ebk` | `nod_collectorB6x12` | `nod_mergeB6` | data |  |
| `edg_ebl` | `nod_mergeB6` | `nod_mainLineB6` | data |  |
| `edg_ebm` | `nod_mainLineB1` | `nod_mainLineB2` | data |  |
| `edg_ebn` | `nod_mainLineB2` | `nod_mainLineB3` | data |  |
| `edg_ebo` | `nod_mainLineB3` | `nod_mainLineB4` | data |  |
| `edg_ebp` | `nod_mainLineB4` | `nod_mainLineB5` | data |  |
| `edg_ebq` | `nod_mainLineB5` | `nod_mainLineB6` | data |  |
| `edg_ebr` | `nod_mainLineB1` | `nod_edsB1` | data |  |
| `edg_ebs` | `nod_mainLineB2` | `nod_edsB1` | data |  |
| `edg_ebt` | `nod_edsB1` | `nod_sorterB` | data |  |
| `edg_ebu` | `nod_edsB1` | `nod_levelThreeB` | data | evt_screeningAlarm |
| `edg_ebv` | `nod_mainLineB2` | `nod_edsB2` | data |  |
| `edg_ebw` | `nod_mainLineB3` | `nod_edsB2` | data |  |
| `edg_ebx` | `nod_edsB2` | `nod_sorterB` | data |  |
| `edg_eby` | `nod_edsB2` | `nod_levelThreeB` | data | evt_screeningAlarm |
| `edg_ebz` | `nod_mainLineB3` | `nod_edsB3` | data |  |
| `edg_ec0` | `nod_mainLineB4` | `nod_edsB3` | data |  |
| `edg_ec1` | `nod_edsB3` | `nod_sorterB` | data |  |
| `edg_ec2` | `nod_edsB3` | `nod_levelThreeB` | data | evt_screeningAlarm |
| `edg_ec3` | `nod_mainLineB4` | `nod_edsB4` | data |  |
| `edg_ec4` | `nod_mainLineB5` | `nod_edsB4` | data |  |
| `edg_ec5` | `nod_edsB4` | `nod_sorterB` | data |  |
| `edg_ec6` | `nod_edsB4` | `nod_levelThreeB` | data | evt_screeningAlarm |
| `edg_ec7` | `nod_mainLineB5` | `nod_edsB5` | data |  |
| `edg_ec8` | `nod_mainLineB6` | `nod_edsB5` | data |  |
| `edg_ec9` | `nod_edsB5` | `nod_sorterB` | data |  |
| `edg_eca` | `nod_edsB5` | `nod_levelThreeB` | data | evt_screeningAlarm |
| `edg_ecb` | `nod_mainLineB6` | `nod_edsB6` | data |  |
| `edg_ecc` | `nod_mainLineB1` | `nod_edsB6` | data |  |
| `edg_ecd` | `nod_edsB6` | `nod_sorterB` | data |  |
| `edg_ece` | `nod_edsB6` | `nod_levelThreeB` | data | evt_screeningAlarm |
| `edg_ecf` | `nod_levelThreeB` | `nod_sorterB` | data |  |
| `edg_ecg` | `nod_levelThreeB` | `nod_reconcileB` | data |  |
| `edg_ech` | `nod_sorterB` | `nod_diverterB1` | data |  |
| `edg_eci` | `nod_diverterB1` | `nod_lateralB1` | data | evt_bagSorted |
| `edg_ecj` | `nod_sorterB` | `nod_diverterB2` | data |  |
| `edg_eck` | `nod_diverterB2` | `nod_lateralB2` | data |  |
| `edg_ecl` | `nod_sorterB` | `nod_diverterB3` | data |  |
| `edg_ecm` | `nod_diverterB3` | `nod_lateralB3` | data |  |
| `edg_ecn` | `nod_sorterB` | `nod_diverterB4` | data |  |
| `edg_eco` | `nod_diverterB4` | `nod_lateralB4` | data |  |
| `edg_ecp` | `nod_sorterB` | `nod_diverterB5` | data |  |
| `edg_ecq` | `nod_diverterB5` | `nod_lateralB5` | data |  |
| `edg_ecr` | `nod_sorterB` | `nod_diverterB6` | data |  |
| `edg_ecs` | `nod_diverterB6` | `nod_lateralB6` | data |  |
| `edg_ect` | `nod_sorterB` | `nod_diverterB7` | data |  |
| `edg_ecu` | `nod_diverterB7` | `nod_lateralB7` | data |  |
| `edg_ecv` | `nod_sorterB` | `nod_diverterB8` | data |  |
| `edg_ecw` | `nod_diverterB8` | `nod_lateralB8` | data |  |
| `edg_ecx` | `nod_sorterB` | `nod_diverterB9` | data |  |
| `edg_ecy` | `nod_diverterB9` | `nod_lateralB9` | data |  |
| `edg_ecz` | `nod_sorterB` | `nod_diverterB10` | data |  |
| `edg_ed0` | `nod_diverterB10` | `nod_lateralB10` | data |  |
| `edg_ed1` | `nod_sorterB` | `nod_diverterB11` | data |  |
| `edg_ed2` | `nod_diverterB11` | `nod_lateralB11` | data |  |
| `edg_ed3` | `nod_sorterB` | `nod_diverterB12` | data |  |
| `edg_ed4` | `nod_diverterB12` | `nod_lateralB12` | data |  |
| `edg_ed5` | `nod_sorterB` | `nod_diverterB13` | data |  |
| `edg_ed6` | `nod_diverterB13` | `nod_lateralB13` | data |  |
| `edg_ed7` | `nod_sorterB` | `nod_diverterB14` | data |  |
| `edg_ed8` | `nod_diverterB14` | `nod_lateralB14` | data |  |
| `edg_ed9` | `nod_sorterB` | `nod_diverterB15` | data |  |
| `edg_eda` | `nod_diverterB15` | `nod_lateralB15` | data |  |
| `edg_edb` | `nod_sorterB` | `nod_diverterB16` | data |  |
| `edg_edc` | `nod_diverterB16` | `nod_lateralB16` | data |  |
| `edg_edd` | `nod_collectorC1x1` | `nod_mergeC1` | data | evt_bagMoved |
| `edg_ede` | `nod_collectorC1x2` | `nod_mergeC1` | data |  |
| `edg_edf` | `nod_collectorC1x3` | `nod_mergeC1` | data |  |
| `edg_edg` | `nod_collectorC1x4` | `nod_mergeC1` | data |  |
| `edg_edh` | `nod_collectorC1x5` | `nod_mergeC1` | data |  |
| `edg_edi` | `nod_collectorC1x6` | `nod_mergeC1` | data |  |
| `edg_edj` | `nod_collectorC1x7` | `nod_mergeC1` | data |  |
| `edg_edk` | `nod_collectorC1x8` | `nod_mergeC1` | data |  |
| `edg_edl` | `nod_collectorC1x9` | `nod_mergeC1` | data |  |
| `edg_edm` | `nod_collectorC1x10` | `nod_mergeC1` | data |  |
| `edg_edn` | `nod_collectorC1x11` | `nod_mergeC1` | data |  |
| `edg_edo` | `nod_collectorC1x12` | `nod_mergeC1` | data |  |
| `edg_edp` | `nod_mergeC1` | `nod_mainLineC1` | data |  |
| `edg_edq` | `nod_collectorC2x1` | `nod_mergeC2` | data | evt_bagMoved |
| `edg_edr` | `nod_collectorC2x2` | `nod_mergeC2` | data |  |
| `edg_eds` | `nod_collectorC2x3` | `nod_mergeC2` | data |  |
| `edg_edt` | `nod_collectorC2x4` | `nod_mergeC2` | data |  |
| `edg_edu` | `nod_collectorC2x5` | `nod_mergeC2` | data |  |
| `edg_edv` | `nod_collectorC2x6` | `nod_mergeC2` | data |  |
| `edg_edw` | `nod_collectorC2x7` | `nod_mergeC2` | data |  |
| `edg_edx` | `nod_collectorC2x8` | `nod_mergeC2` | data |  |
| `edg_edy` | `nod_collectorC2x9` | `nod_mergeC2` | data |  |
| `edg_edz` | `nod_collectorC2x10` | `nod_mergeC2` | data |  |
| `edg_ee0` | `nod_collectorC2x11` | `nod_mergeC2` | data |  |
| `edg_ee1` | `nod_collectorC2x12` | `nod_mergeC2` | data |  |
| `edg_ee2` | `nod_mergeC2` | `nod_mainLineC2` | data |  |
| `edg_ee3` | `nod_collectorC3x1` | `nod_mergeC3` | data | evt_bagMoved |
| `edg_ee4` | `nod_collectorC3x2` | `nod_mergeC3` | data |  |
| `edg_ee5` | `nod_collectorC3x3` | `nod_mergeC3` | data |  |
| `edg_ee6` | `nod_collectorC3x4` | `nod_mergeC3` | data |  |
| `edg_ee7` | `nod_collectorC3x5` | `nod_mergeC3` | data |  |
| `edg_ee8` | `nod_collectorC3x6` | `nod_mergeC3` | data |  |
| `edg_ee9` | `nod_collectorC3x7` | `nod_mergeC3` | data |  |
| `edg_eea` | `nod_collectorC3x8` | `nod_mergeC3` | data |  |
| `edg_eeb` | `nod_collectorC3x9` | `nod_mergeC3` | data |  |
| `edg_eec` | `nod_collectorC3x10` | `nod_mergeC3` | data |  |
| `edg_eed` | `nod_collectorC3x11` | `nod_mergeC3` | data |  |
| `edg_eee` | `nod_collectorC3x12` | `nod_mergeC3` | data |  |
| `edg_eef` | `nod_mergeC3` | `nod_mainLineC3` | data |  |
| `edg_eeg` | `nod_collectorC4x1` | `nod_mergeC4` | data | evt_bagMoved |
| `edg_eeh` | `nod_collectorC4x2` | `nod_mergeC4` | data |  |
| `edg_eei` | `nod_collectorC4x3` | `nod_mergeC4` | data |  |
| `edg_eej` | `nod_collectorC4x4` | `nod_mergeC4` | data |  |
| `edg_eek` | `nod_collectorC4x5` | `nod_mergeC4` | data |  |
| `edg_eel` | `nod_collectorC4x6` | `nod_mergeC4` | data |  |
| `edg_eem` | `nod_collectorC4x7` | `nod_mergeC4` | data |  |
| `edg_een` | `nod_collectorC4x8` | `nod_mergeC4` | data |  |
| `edg_eeo` | `nod_collectorC4x9` | `nod_mergeC4` | data |  |
| `edg_eep` | `nod_collectorC4x10` | `nod_mergeC4` | data |  |
| `edg_eeq` | `nod_collectorC4x11` | `nod_mergeC4` | data |  |
| `edg_eer` | `nod_collectorC4x12` | `nod_mergeC4` | data |  |
| `edg_ees` | `nod_mergeC4` | `nod_mainLineC4` | data |  |
| `edg_eet` | `nod_collectorC5x1` | `nod_mergeC5` | data | evt_bagMoved |
| `edg_eeu` | `nod_collectorC5x2` | `nod_mergeC5` | data |  |
| `edg_eev` | `nod_collectorC5x3` | `nod_mergeC5` | data |  |
| `edg_eew` | `nod_collectorC5x4` | `nod_mergeC5` | data |  |
| `edg_eex` | `nod_collectorC5x5` | `nod_mergeC5` | data |  |
| `edg_eey` | `nod_collectorC5x6` | `nod_mergeC5` | data |  |
| `edg_eez` | `nod_collectorC5x7` | `nod_mergeC5` | data |  |
| `edg_ef0` | `nod_collectorC5x8` | `nod_mergeC5` | data |  |
| `edg_ef1` | `nod_collectorC5x9` | `nod_mergeC5` | data |  |
| `edg_ef2` | `nod_collectorC5x10` | `nod_mergeC5` | data |  |
| `edg_ef3` | `nod_collectorC5x11` | `nod_mergeC5` | data |  |
| `edg_ef4` | `nod_collectorC5x12` | `nod_mergeC5` | data |  |
| `edg_ef5` | `nod_mergeC5` | `nod_mainLineC5` | data |  |
| `edg_ef6` | `nod_collectorC6x1` | `nod_mergeC6` | data | evt_bagMoved |
| `edg_ef7` | `nod_collectorC6x2` | `nod_mergeC6` | data |  |
| `edg_ef8` | `nod_collectorC6x3` | `nod_mergeC6` | data |  |
| `edg_ef9` | `nod_collectorC6x4` | `nod_mergeC6` | data |  |
| `edg_efa` | `nod_collectorC6x5` | `nod_mergeC6` | data |  |
| `edg_efb` | `nod_collectorC6x6` | `nod_mergeC6` | data |  |
| `edg_efc` | `nod_collectorC6x7` | `nod_mergeC6` | data |  |
| `edg_efd` | `nod_collectorC6x8` | `nod_mergeC6` | data |  |
| `edg_efe` | `nod_collectorC6x9` | `nod_mergeC6` | data |  |
| `edg_eff` | `nod_collectorC6x10` | `nod_mergeC6` | data |  |
| `edg_efg` | `nod_collectorC6x11` | `nod_mergeC6` | data |  |
| `edg_efh` | `nod_collectorC6x12` | `nod_mergeC6` | data |  |
| `edg_efi` | `nod_mergeC6` | `nod_mainLineC6` | data |  |
| `edg_efj` | `nod_mainLineC1` | `nod_mainLineC2` | data |  |
| `edg_efk` | `nod_mainLineC2` | `nod_mainLineC3` | data |  |
| `edg_efl` | `nod_mainLineC3` | `nod_mainLineC4` | data |  |
| `edg_efm` | `nod_mainLineC4` | `nod_mainLineC5` | data |  |
| `edg_efn` | `nod_mainLineC5` | `nod_mainLineC6` | data |  |
| `edg_efo` | `nod_mainLineC1` | `nod_edsC1` | data |  |
| `edg_efp` | `nod_mainLineC2` | `nod_edsC1` | data |  |
| `edg_efq` | `nod_edsC1` | `nod_sorterC` | data |  |
| `edg_efr` | `nod_edsC1` | `nod_levelThreeC` | data | evt_screeningAlarm |
| `edg_efs` | `nod_mainLineC2` | `nod_edsC2` | data |  |
| `edg_eft` | `nod_mainLineC3` | `nod_edsC2` | data |  |
| `edg_efu` | `nod_edsC2` | `nod_sorterC` | data |  |
| `edg_efv` | `nod_edsC2` | `nod_levelThreeC` | data | evt_screeningAlarm |
| `edg_efw` | `nod_mainLineC3` | `nod_edsC3` | data |  |
| `edg_efx` | `nod_mainLineC4` | `nod_edsC3` | data |  |
| `edg_efy` | `nod_edsC3` | `nod_sorterC` | data |  |
| `edg_efz` | `nod_edsC3` | `nod_levelThreeC` | data | evt_screeningAlarm |
| `edg_eg0` | `nod_mainLineC4` | `nod_edsC4` | data |  |
| `edg_eg1` | `nod_mainLineC5` | `nod_edsC4` | data |  |
| `edg_eg2` | `nod_edsC4` | `nod_sorterC` | data |  |
| `edg_eg3` | `nod_edsC4` | `nod_levelThreeC` | data | evt_screeningAlarm |
| `edg_eg4` | `nod_mainLineC5` | `nod_edsC5` | data |  |
| `edg_eg5` | `nod_mainLineC6` | `nod_edsC5` | data |  |
| `edg_eg6` | `nod_edsC5` | `nod_sorterC` | data |  |
| `edg_eg7` | `nod_edsC5` | `nod_levelThreeC` | data | evt_screeningAlarm |
| `edg_eg8` | `nod_mainLineC6` | `nod_edsC6` | data |  |
| `edg_eg9` | `nod_mainLineC1` | `nod_edsC6` | data |  |
| `edg_ega` | `nod_edsC6` | `nod_sorterC` | data |  |
| `edg_egb` | `nod_edsC6` | `nod_levelThreeC` | data | evt_screeningAlarm |
| `edg_egc` | `nod_levelThreeC` | `nod_sorterC` | data |  |
| `edg_egd` | `nod_levelThreeC` | `nod_reconcileC` | data |  |
| `edg_ege` | `nod_sorterC` | `nod_diverterC1` | data |  |
| `edg_egf` | `nod_diverterC1` | `nod_lateralC1` | data | evt_bagSorted |
| `edg_egg` | `nod_sorterC` | `nod_diverterC2` | data |  |
| `edg_egh` | `nod_diverterC2` | `nod_lateralC2` | data |  |
| `edg_egi` | `nod_sorterC` | `nod_diverterC3` | data |  |
| `edg_egj` | `nod_diverterC3` | `nod_lateralC3` | data |  |
| `edg_egk` | `nod_sorterC` | `nod_diverterC4` | data |  |
| `edg_egl` | `nod_diverterC4` | `nod_lateralC4` | data |  |
| `edg_egm` | `nod_sorterC` | `nod_diverterC5` | data |  |
| `edg_egn` | `nod_diverterC5` | `nod_lateralC5` | data |  |
| `edg_ego` | `nod_sorterC` | `nod_diverterC6` | data |  |
| `edg_egp` | `nod_diverterC6` | `nod_lateralC6` | data |  |
| `edg_egq` | `nod_sorterC` | `nod_diverterC7` | data |  |
| `edg_egr` | `nod_diverterC7` | `nod_lateralC7` | data |  |
| `edg_egs` | `nod_sorterC` | `nod_diverterC8` | data |  |
| `edg_egt` | `nod_diverterC8` | `nod_lateralC8` | data |  |
| `edg_egu` | `nod_sorterC` | `nod_diverterC9` | data |  |
| `edg_egv` | `nod_diverterC9` | `nod_lateralC9` | data |  |
| `edg_egw` | `nod_sorterC` | `nod_diverterC10` | data |  |
| `edg_egx` | `nod_diverterC10` | `nod_lateralC10` | data |  |
| `edg_egy` | `nod_sorterC` | `nod_diverterC11` | data |  |
| `edg_egz` | `nod_diverterC11` | `nod_lateralC11` | data |  |
| `edg_eh0` | `nod_sorterC` | `nod_diverterC12` | data |  |
| `edg_eh1` | `nod_diverterC12` | `nod_lateralC12` | data |  |
| `edg_eh2` | `nod_sorterC` | `nod_diverterC13` | data |  |
| `edg_eh3` | `nod_diverterC13` | `nod_lateralC13` | data |  |
| `edg_eh4` | `nod_sorterC` | `nod_diverterC14` | data |  |
| `edg_eh5` | `nod_diverterC14` | `nod_lateralC14` | data |  |
| `edg_eh6` | `nod_sorterC` | `nod_diverterC15` | data |  |
| `edg_eh7` | `nod_diverterC15` | `nod_lateralC15` | data |  |
| `edg_eh8` | `nod_sorterC` | `nod_diverterC16` | data |  |
| `edg_eh9` | `nod_diverterC16` | `nod_lateralC16` | data |  |
| `edg_eha` | `nod_collectorD1x1` | `nod_mergeD1` | data | evt_bagMoved |
| `edg_ehb` | `nod_collectorD1x2` | `nod_mergeD1` | data |  |
| `edg_ehc` | `nod_collectorD1x3` | `nod_mergeD1` | data |  |
| `edg_ehd` | `nod_collectorD1x4` | `nod_mergeD1` | data |  |
| `edg_ehe` | `nod_collectorD1x5` | `nod_mergeD1` | data |  |
| `edg_ehf` | `nod_collectorD1x6` | `nod_mergeD1` | data |  |
| `edg_ehg` | `nod_collectorD1x7` | `nod_mergeD1` | data |  |
| `edg_ehh` | `nod_collectorD1x8` | `nod_mergeD1` | data |  |
| `edg_ehi` | `nod_collectorD1x9` | `nod_mergeD1` | data |  |
| `edg_ehj` | `nod_collectorD1x10` | `nod_mergeD1` | data |  |
| `edg_ehk` | `nod_collectorD1x11` | `nod_mergeD1` | data |  |
| `edg_ehl` | `nod_collectorD1x12` | `nod_mergeD1` | data |  |
| `edg_ehm` | `nod_mergeD1` | `nod_mainLineD1` | data |  |
| `edg_ehn` | `nod_collectorD2x1` | `nod_mergeD2` | data | evt_bagMoved |
| `edg_eho` | `nod_collectorD2x2` | `nod_mergeD2` | data |  |
| `edg_ehp` | `nod_collectorD2x3` | `nod_mergeD2` | data |  |
| `edg_ehq` | `nod_collectorD2x4` | `nod_mergeD2` | data |  |
| `edg_ehr` | `nod_collectorD2x5` | `nod_mergeD2` | data |  |
| `edg_ehs` | `nod_collectorD2x6` | `nod_mergeD2` | data |  |
| `edg_eht` | `nod_collectorD2x7` | `nod_mergeD2` | data |  |
| `edg_ehu` | `nod_collectorD2x8` | `nod_mergeD2` | data |  |
| `edg_ehv` | `nod_collectorD2x9` | `nod_mergeD2` | data |  |
| `edg_ehw` | `nod_collectorD2x10` | `nod_mergeD2` | data |  |
| `edg_ehx` | `nod_collectorD2x11` | `nod_mergeD2` | data |  |
| `edg_ehy` | `nod_collectorD2x12` | `nod_mergeD2` | data |  |
| `edg_ehz` | `nod_mergeD2` | `nod_mainLineD2` | data |  |
| `edg_ei0` | `nod_collectorD3x1` | `nod_mergeD3` | data | evt_bagMoved |
| `edg_ei1` | `nod_collectorD3x2` | `nod_mergeD3` | data |  |
| `edg_ei2` | `nod_collectorD3x3` | `nod_mergeD3` | data |  |
| `edg_ei3` | `nod_collectorD3x4` | `nod_mergeD3` | data |  |
| `edg_ei4` | `nod_collectorD3x5` | `nod_mergeD3` | data |  |
| `edg_ei5` | `nod_collectorD3x6` | `nod_mergeD3` | data |  |
| `edg_ei6` | `nod_collectorD3x7` | `nod_mergeD3` | data |  |
| `edg_ei7` | `nod_collectorD3x8` | `nod_mergeD3` | data |  |
| `edg_ei8` | `nod_collectorD3x9` | `nod_mergeD3` | data |  |
| `edg_ei9` | `nod_collectorD3x10` | `nod_mergeD3` | data |  |
| `edg_eia` | `nod_collectorD3x11` | `nod_mergeD3` | data |  |
| `edg_eib` | `nod_collectorD3x12` | `nod_mergeD3` | data |  |
| `edg_eic` | `nod_mergeD3` | `nod_mainLineD3` | data |  |
| `edg_eid` | `nod_collectorD4x1` | `nod_mergeD4` | data | evt_bagMoved |
| `edg_eie` | `nod_collectorD4x2` | `nod_mergeD4` | data |  |
| `edg_eif` | `nod_collectorD4x3` | `nod_mergeD4` | data |  |
| `edg_eig` | `nod_collectorD4x4` | `nod_mergeD4` | data |  |
| `edg_eih` | `nod_collectorD4x5` | `nod_mergeD4` | data |  |
| `edg_eii` | `nod_collectorD4x6` | `nod_mergeD4` | data |  |
| `edg_eij` | `nod_collectorD4x7` | `nod_mergeD4` | data |  |
| `edg_eik` | `nod_collectorD4x8` | `nod_mergeD4` | data |  |
| `edg_eil` | `nod_collectorD4x9` | `nod_mergeD4` | data |  |
| `edg_eim` | `nod_collectorD4x10` | `nod_mergeD4` | data |  |
| `edg_ein` | `nod_collectorD4x11` | `nod_mergeD4` | data |  |
| `edg_eio` | `nod_collectorD4x12` | `nod_mergeD4` | data |  |
| `edg_eip` | `nod_mergeD4` | `nod_mainLineD4` | data |  |
| `edg_eiq` | `nod_collectorD5x1` | `nod_mergeD5` | data | evt_bagMoved |
| `edg_eir` | `nod_collectorD5x2` | `nod_mergeD5` | data |  |
| `edg_eis` | `nod_collectorD5x3` | `nod_mergeD5` | data |  |
| `edg_eit` | `nod_collectorD5x4` | `nod_mergeD5` | data |  |
| `edg_eiu` | `nod_collectorD5x5` | `nod_mergeD5` | data |  |
| `edg_eiv` | `nod_collectorD5x6` | `nod_mergeD5` | data |  |
| `edg_eiw` | `nod_collectorD5x7` | `nod_mergeD5` | data |  |
| `edg_eix` | `nod_collectorD5x8` | `nod_mergeD5` | data |  |
| `edg_eiy` | `nod_collectorD5x9` | `nod_mergeD5` | data |  |
| `edg_eiz` | `nod_collectorD5x10` | `nod_mergeD5` | data |  |
| `edg_ej0` | `nod_collectorD5x11` | `nod_mergeD5` | data |  |
| `edg_ej1` | `nod_collectorD5x12` | `nod_mergeD5` | data |  |
| `edg_ej2` | `nod_mergeD5` | `nod_mainLineD5` | data |  |
| `edg_ej3` | `nod_collectorD6x1` | `nod_mergeD6` | data | evt_bagMoved |
| `edg_ej4` | `nod_collectorD6x2` | `nod_mergeD6` | data |  |
| `edg_ej5` | `nod_collectorD6x3` | `nod_mergeD6` | data |  |
| `edg_ej6` | `nod_collectorD6x4` | `nod_mergeD6` | data |  |
| `edg_ej7` | `nod_collectorD6x5` | `nod_mergeD6` | data |  |
| `edg_ej8` | `nod_collectorD6x6` | `nod_mergeD6` | data |  |
| `edg_ej9` | `nod_collectorD6x7` | `nod_mergeD6` | data |  |
| `edg_eja` | `nod_collectorD6x8` | `nod_mergeD6` | data |  |
| `edg_ejb` | `nod_collectorD6x9` | `nod_mergeD6` | data |  |
| `edg_ejc` | `nod_collectorD6x10` | `nod_mergeD6` | data |  |
| `edg_ejd` | `nod_collectorD6x11` | `nod_mergeD6` | data |  |
| `edg_eje` | `nod_collectorD6x12` | `nod_mergeD6` | data |  |
| `edg_ejf` | `nod_mergeD6` | `nod_mainLineD6` | data |  |
| `edg_ejg` | `nod_mainLineD1` | `nod_mainLineD2` | data |  |
| `edg_ejh` | `nod_mainLineD2` | `nod_mainLineD3` | data |  |
| `edg_eji` | `nod_mainLineD3` | `nod_mainLineD4` | data |  |
| `edg_ejj` | `nod_mainLineD4` | `nod_mainLineD5` | data |  |
| `edg_ejk` | `nod_mainLineD5` | `nod_mainLineD6` | data |  |
| `edg_ejl` | `nod_mainLineD1` | `nod_edsD1` | data |  |
| `edg_ejm` | `nod_mainLineD2` | `nod_edsD1` | data |  |
| `edg_ejn` | `nod_edsD1` | `nod_sorterD` | data |  |
| `edg_ejo` | `nod_edsD1` | `nod_levelThreeD` | data | evt_screeningAlarm |
| `edg_ejp` | `nod_mainLineD2` | `nod_edsD2` | data |  |
| `edg_ejq` | `nod_mainLineD3` | `nod_edsD2` | data |  |
| `edg_ejr` | `nod_edsD2` | `nod_sorterD` | data |  |
| `edg_ejs` | `nod_edsD2` | `nod_levelThreeD` | data | evt_screeningAlarm |
| `edg_ejt` | `nod_mainLineD3` | `nod_edsD3` | data |  |
| `edg_eju` | `nod_mainLineD4` | `nod_edsD3` | data |  |
| `edg_ejv` | `nod_edsD3` | `nod_sorterD` | data |  |
| `edg_ejw` | `nod_edsD3` | `nod_levelThreeD` | data | evt_screeningAlarm |
| `edg_ejx` | `nod_mainLineD4` | `nod_edsD4` | data |  |
| `edg_ejy` | `nod_mainLineD5` | `nod_edsD4` | data |  |
| `edg_ejz` | `nod_edsD4` | `nod_sorterD` | data |  |
| `edg_ek0` | `nod_edsD4` | `nod_levelThreeD` | data | evt_screeningAlarm |
| `edg_ek1` | `nod_mainLineD5` | `nod_edsD5` | data |  |
| `edg_ek2` | `nod_mainLineD6` | `nod_edsD5` | data |  |
| `edg_ek3` | `nod_edsD5` | `nod_sorterD` | data |  |
| `edg_ek4` | `nod_edsD5` | `nod_levelThreeD` | data | evt_screeningAlarm |
| `edg_ek5` | `nod_mainLineD6` | `nod_edsD6` | data |  |
| `edg_ek6` | `nod_mainLineD1` | `nod_edsD6` | data |  |
| `edg_ek7` | `nod_edsD6` | `nod_sorterD` | data |  |
| `edg_ek8` | `nod_edsD6` | `nod_levelThreeD` | data | evt_screeningAlarm |
| `edg_ek9` | `nod_levelThreeD` | `nod_sorterD` | data |  |
| `edg_eka` | `nod_levelThreeD` | `nod_reconcileD` | data |  |
| `edg_ekb` | `nod_sorterD` | `nod_diverterD1` | data |  |
| `edg_ekc` | `nod_diverterD1` | `nod_lateralD1` | data | evt_bagSorted |
| `edg_ekd` | `nod_sorterD` | `nod_diverterD2` | data |  |
| `edg_eke` | `nod_diverterD2` | `nod_lateralD2` | data |  |
| `edg_ekf` | `nod_sorterD` | `nod_diverterD3` | data |  |
| `edg_ekg` | `nod_diverterD3` | `nod_lateralD3` | data |  |
| `edg_ekh` | `nod_sorterD` | `nod_diverterD4` | data |  |
| `edg_eki` | `nod_diverterD4` | `nod_lateralD4` | data |  |
| `edg_ekj` | `nod_sorterD` | `nod_diverterD5` | data |  |
| `edg_ekk` | `nod_diverterD5` | `nod_lateralD5` | data |  |
| `edg_ekl` | `nod_sorterD` | `nod_diverterD6` | data |  |
| `edg_ekm` | `nod_diverterD6` | `nod_lateralD6` | data |  |
| `edg_ekn` | `nod_sorterD` | `nod_diverterD7` | data |  |
| `edg_eko` | `nod_diverterD7` | `nod_lateralD7` | data |  |
| `edg_ekp` | `nod_sorterD` | `nod_diverterD8` | data |  |
| `edg_ekq` | `nod_diverterD8` | `nod_lateralD8` | data |  |
| `edg_ekr` | `nod_sorterD` | `nod_diverterD9` | data |  |
| `edg_eks` | `nod_diverterD9` | `nod_lateralD9` | data |  |
| `edg_ekt` | `nod_sorterD` | `nod_diverterD10` | data |  |
| `edg_eku` | `nod_diverterD10` | `nod_lateralD10` | data |  |
| `edg_ekv` | `nod_sorterD` | `nod_diverterD11` | data |  |
| `edg_ekw` | `nod_diverterD11` | `nod_lateralD11` | data |  |
| `edg_ekx` | `nod_sorterD` | `nod_diverterD12` | data |  |
| `edg_eky` | `nod_diverterD12` | `nod_lateralD12` | data |  |
| `edg_ekz` | `nod_sorterD` | `nod_diverterD13` | data |  |
| `edg_el0` | `nod_diverterD13` | `nod_lateralD13` | data |  |
| `edg_el1` | `nod_sorterD` | `nod_diverterD14` | data |  |
| `edg_el2` | `nod_diverterD14` | `nod_lateralD14` | data |  |
| `edg_el3` | `nod_sorterD` | `nod_diverterD15` | data |  |
| `edg_el4` | `nod_diverterD15` | `nod_lateralD15` | data |  |
| `edg_el5` | `nod_sorterD` | `nod_diverterD16` | data |  |
| `edg_el6` | `nod_diverterD16` | `nod_lateralD16` | data |  |
| `edg_el7` | `nod_sorterA` | `nod_earlyBagStore` | data |  |
| `edg_el8` | `nod_earlyBagStore` | `nod_sorterA` | data |  |
| `edg_el9` | `nod_sorterA` | `nod_manualEncoding` | data |  |
| `edg_ela` | `nod_manualEncoding` | `nod_sorterA` | data |  |
| `edg_elb` | `nod_sorterA` | `nod_problemBags` | data |  |
| `edg_elc` | `nod_transferA1` | `nod_sorterA` | data | evt_bagTransferred |
| `edg_eld` | `nod_transferA2` | `nod_sorterA` | data | evt_bagTransferred |
| `edg_ele` | `nod_sorterB` | `nod_earlyBagStore` | data |  |
| `edg_elf` | `nod_earlyBagStore` | `nod_sorterB` | data |  |
| `edg_elg` | `nod_sorterB` | `nod_manualEncoding` | data |  |
| `edg_elh` | `nod_manualEncoding` | `nod_sorterB` | data |  |
| `edg_eli` | `nod_sorterB` | `nod_problemBags` | data |  |
| `edg_elj` | `nod_transferB1` | `nod_sorterB` | data | evt_bagTransferred |
| `edg_elk` | `nod_transferB2` | `nod_sorterB` | data | evt_bagTransferred |
| `edg_ell` | `nod_sorterC` | `nod_earlyBagStore` | data |  |
| `edg_elm` | `nod_earlyBagStore` | `nod_sorterC` | data |  |
| `edg_eln` | `nod_sorterC` | `nod_manualEncoding` | data |  |
| `edg_elo` | `nod_manualEncoding` | `nod_sorterC` | data |  |
| `edg_elp` | `nod_sorterC` | `nod_problemBags` | data |  |
| `edg_elq` | `nod_transferC1` | `nod_sorterC` | data | evt_bagTransferred |
| `edg_elr` | `nod_transferC2` | `nod_sorterC` | data | evt_bagTransferred |
| `edg_els` | `nod_sorterD` | `nod_earlyBagStore` | data |  |
| `edg_elt` | `nod_earlyBagStore` | `nod_sorterD` | data |  |
| `edg_elu` | `nod_sorterD` | `nod_manualEncoding` | data |  |
| `edg_elv` | `nod_manualEncoding` | `nod_sorterD` | data |  |
| `edg_elw` | `nod_sorterD` | `nod_problemBags` | data |  |
| `edg_elx` | `nod_transferD1` | `nod_sorterD` | data | evt_bagTransferred |
| `edg_ely` | `nod_transferD2` | `nod_sorterD` | data | evt_bagTransferred |
| `edg_elz` | `nod_sorterA` | `nod_sorterB` | data |  |
| `edg_em0` | `nod_sorterB` | `nod_sorterC` | data |  |
| `edg_em1` | `nod_sorterC` | `nod_sorterD` | data |  |
| `edg_em2` | `nod_sorterD` | `nod_sorterA` | data |  |
| `edg_em3` | `nod_arrivalsApron` | `nod_reclaim1` | data |  |
| `edg_em4` | `nod_arrivalsApron` | `nod_reclaim2` | data |  |
| `edg_em5` | `nod_arrivalsApron` | `nod_reclaim3` | data |  |
| `edg_em6` | `nod_arrivalsApron` | `nod_reclaim4` | data |  |
| `edg_em7` | `nod_arrivalsApron` | `nod_reclaim5` | data |  |
| `edg_em8` | `nod_arrivalsApron` | `nod_reclaim6` | data |  |
| `edg_em9` | `nod_arrivalsApron` | `nod_reclaim7` | data |  |
| `edg_ema` | `nod_arrivalsApron` | `nod_reclaim8` | data |  |
| `edg_emb` | `nod_arrivalsApron` | `nod_reclaim9` | data |  |
| `edg_emc` | `nod_arrivalsApron` | `nod_reclaim10` | data |  |
| `edg_emd` | `nod_arrivalsApron` | `nod_reclaim11` | data |  |
| `edg_eme` | `nod_arrivalsApron` | `nod_reclaim12` | data |  |

### `cnv_billOneOperator` "Bill one operator"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1bs` | `nod_opStart` | `nod_fees` |  |  |
| `edg_e1bt` | `nod_fees` | `nod_landingFee` |  |  |
| `edg_e1bu` | `nod_landingFee` | `nod_feesDone` |  |  |
| `edg_e1bv` | `nod_fees` | `nod_parkingFee` |  |  |
| `edg_e1bw` | `nod_parkingFee` | `nod_feesDone` |  |  |
| `edg_e1bx` | `nod_fees` | `nod_passengerFee` |  |  |
| `edg_e1by` | `nod_passengerFee` | `nod_feesDone` |  |  |
| `edg_e1bz` | `nod_fees` | `nod_securityFee` |  |  |
| `edg_e1c0` | `nod_securityFee` | `nod_feesDone` |  |  |
| `edg_e1c1` | `nod_feesDone` | `nod_charge` |  |  |
| `edg_e1c2` | `nod_charge` | `nod_paidOrNot` |  |  |
| `edg_e1c3` | `nod_paidOrNot` | `nod_opEnd` |  |  |

### `cnv_boardOneGroup` "Board one group"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1j8` | `nod_groupStart` | `nod_callGroup` |  |  |
| `edg_e1j9` | `nod_callGroup` | `nod_groupWait` |  |  |
| `edg_e1ja` | `nod_groupWait` | `nod_groupEnd` |  |  |

### `cnv_boardOnePassenger` "Board one passenger"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e49` | `nod_oneStart` | `nod_scanPass` |  |  |
| `edg_e4a` | `nod_scanPass` | `nod_passValid` |  |  |
| `edg_e4b` | `nod_passValid` | `nod_boarded` | true |  |
| `edg_e4c` | `nod_passValid` | `nod_whyRefused` | false |  |
| `edg_e4d` | `nod_whyRefused` | `nod_wrongGate` | case "wrongGate" |  |
| `edg_e4e` | `nod_whyRefused` | `nod_notCheckedIn` | case "notCheckedIn" |  |
| `edg_e4f` | `nod_whyRefused` | `nod_oneEnd` | default |  |
| `edg_e4g` | `nod_boarded` | `nod_oneEnd` |  |  |
| `edg_e4h` | `nod_wrongGate` | `nod_oneEnd` |  |  |
| `edg_e4i` | `nod_notCheckedIn` | `nod_oneEnd` |  |  |

### `cnv_boardingPhases` "Boarding phases"

machine · transitions complete · subject flight.boarding

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e2w` | `nod_phasesStart` | `nod_priorityBoarding` | (none) |  |  |
| `edg_e2x` | `nod_priorityBoarding` | `nod_generalBoarding` | on:evt_boardingGeneral |  |  |
| `edg_e2y` | `nod_generalBoarding` | `nod_finalCall` | on:evt_boardingFinalCall |  |  |
| `edg_e2z` | `nod_finalCall` | `nod_gateClosed` | on:evt_gateClosed | "every checked-in passenger has boarded" |  |
| `edg_e30` | `nod_finalCall` | `nod_offloading` | on:evt_gateClosed |  |  |
| `edg_e31` | `nod_offloading` | `nod_gateClosed` | on:evt_bagsOffloaded |  |  |
| `edg_e32` | `nod_priorityBoarding` | `nod_boardingStopped` | on:evt_boardingSuspended |  |  |
| `edg_e33` | `nod_generalBoarding` | `nod_boardingStopped` | on:evt_boardingSuspended |  |  |
| `edg_e34` | `nod_finalCall` | `nod_boardingStopped` | on:evt_boardingSuspended |  |  |
| `edg_e35` | `nod_boardingStopped` | `nod_phaseResume` | on:evt_boardingResumed |  |  |
| `edg_e36` | `nod_phaseResume` | `nod_priorityBoarding` | (none) |  |  |

### `cnv_boardingProcedure` "Boarding procedure"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e3t` | `nod_boardStart` | `nod_getList` |  |  |
| `edg_e3u` | `nod_getList` | `nod_openGate` |  |  |
| `edg_e3v` | `nod_openGate` | `nod_announce` |  |  |
| `edg_e3w` | `nod_openGate` | `nod_readyDesk` |  |  |
| `edg_e3x` | `nod_announce` | `nod_gateOpen` |  |  |
| `edg_e3y` | `nod_readyDesk` | `nod_gateOpen` |  |  |
| `edg_e3z` | `nod_gateOpen` | `nod_eachPassenger` |  |  |
| `edg_e40` | `nod_eachPassenger` | `nod_anyoneMissing` |  |  |
| `edg_e41` | `nod_anyoneMissing` | `nod_loadStatus` |  |  |
| `edg_e42` | `nod_loadStatus` | `nod_closeDoors` | case "complete" |  |
| `edg_e43` | `nod_loadStatus` | `nod_offloadBags` | case "noShows" |  |
| `edg_e44` | `nod_loadStatus` | `nod_boardFail` | default |  |
| `edg_e45` | `nod_offloadBags` | `nod_closeDoors` |  |  |
| `edg_e46` | `nod_closeDoors` | `nod_waitCaptain` |  |  |
| `edg_e47` | `nod_waitCaptain` | `nod_boardEnd` |  |  |
| `edg_e48` | `nod_getList` | `nod_boardFail` | error |  |

### `cnv_borderCheck` "Border check"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1af` | `nod_borderStart` | `nod_travelDocument` |  |  |
| `edg_e1ag` | `nod_travelDocument` | `nod_eGate` | case "biometricPassport" |  |
| `edg_e1ah` | `nod_travelDocument` | `nod_officer` | default |  |
| `edg_e1ai` | `nod_eGate` | `nod_officer` | error |  |
| `edg_e1aj` | `nod_eGate` | `nod_watchlist` |  |  |
| `edg_e1ak` | `nod_officer` | `nod_visaCheck` |  |  |
| `edg_e1al` | `nod_visaCheck` | `nod_checkVisa` | true |  |
| `edg_e1am` | `nod_visaCheck` | `nod_watchlist` | false |  |
| `edg_e1an` | `nod_checkVisa` | `nod_watchlist` |  |  |
| `edg_e1ao` | `nod_watchlist` | `nod_secondary` | true |  |
| `edg_e1ap` | `nod_watchlist` | `nod_stamp` | false |  |
| `edg_e1aq` | `nod_secondary` | `nod_stamp` |  |  |
| `edg_e1ar` | `nod_secondary` | `nod_refused` | error |  |
| `edg_e1as` | `nod_stamp` | `nod_borderEnd` |  |  |

### `cnv_cabinCleaning` "Cabin cleaning"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1cd` | `nod_cleanStart` | `nod_cleanKind` |  |  |
| `edg_e1ce` | `nod_cleanKind` | `nod_quickClean` | case "under 35" |  |
| `edg_e1cf` | `nod_cleanKind` | `nod_fullClean` | case "35 to 90" |  |
| `edg_e1cg` | `nod_cleanKind` | `nod_deepClean` | case "night stop" |  |
| `edg_e1ch` | `nod_quickClean` | `nod_cleanDone` |  |  |
| `edg_e1ci` | `nod_fullClean` | `nod_cleanDone` |  |  |
| `edg_e1cj` | `nod_deepClean` | `nod_cleanDone` |  |  |
| `edg_e1ck` | `nod_cleanKind` | `nod_quickClean` | default |  |
| `edg_e1cl` | `nod_cleanDone` | `nod_cleanEnd` |  |  |

### `cnv_checkInHalls` "Check-in halls"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e10x` | `nod_hallD` | `nod_cupps` | command |  |
| `edg_e10y` | `nod_hallD` | `nod_hallsBelts` | link |  |
| `edg_et8` | `nod_cupps` | `nod_hallsDcs` | link |  |
| `edg_et9` | `nod_hallA` | `nod_cupps` | command |  |
| `edg_eta` | `nod_hallA` | `nod_hallsBelts` | link |  |
| `edg_evt` | `nod_hallB` | `nod_cupps` | command |  |
| `edg_evu` | `nod_hallB` | `nod_hallsBelts` | link |  |
| `edg_eyd` | `nod_hallC` | `nod_cupps` | command |  |
| `edg_eye` | `nod_hallC` | `nod_hallsBelts` | link |  |

### `cnv_climbOut` "Climb out"

machine · transitions partial · subject flight.climb

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e37` | `nod_climbStart` | `nod_initialClimb` | (none) |  |  |
| `edg_e38` | `nod_initialClimb` | `nod_departureRoute` | on:evt_routeJoined |  |  |
| `edg_e39` | `nod_departureRoute` | `nod_handedOff` | on:evt_handoffAccepted |  |  |
| `edg_e3a` | `nod_departureRoute` | `nod_holdingPattern` | on:evt_holdInstructed |  |  |
| `edg_e3b` | `nod_holdingPattern` | `nod_departureRoute` | on:evt_holdReleased |  |  |

### `cnv_deIcingProcedure` "De-icing"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e4t` | `nod_iceStart` | `nod_readWeather` |  |  |
| `edg_e4u` | `nod_readWeather` | `nod_conditions` |  |  |
| `edg_e4v` | `nod_conditions` | `nod_typeOne` | case "frost" |  |
| `edg_e4w` | `nod_conditions` | `nod_typeFour` | case "snow" |  |
| `edg_e4x` | `nod_conditions` | `nod_typeFour` | case "freezingRain" |  |
| `edg_e4y` | `nod_conditions` | `nod_typeOne` | default |  |
| `edg_e4z` | `nod_typeOne` | `nod_padSlot` |  |  |
| `edg_e50` | `nod_typeFour` | `nod_padSlot` |  |  |
| `edg_e51` | `nod_padSlot` | `nod_spray` |  |  |
| `edg_e52` | `nod_spray` | `nod_leftWing` |  |  |
| `edg_e53` | `nod_spray` | `nod_rightWing` |  |  |
| `edg_e54` | `nod_leftWing` | `nod_sprayed` |  |  |
| `edg_e55` | `nod_rightWing` | `nod_sprayed` |  |  |
| `edg_e56` | `nod_sprayed` | `nod_holdover` |  |  |
| `edg_e57` | `nod_holdover` | `nod_iceDone` | true |  |
| `edg_e58` | `nod_holdover` | `nod_iceAgain` | false |  |
| `edg_e59` | `nod_iceDone` | `nod_iceEnd` |  |  |

### `cnv_disruptionDesk` "Disruption desk"

mixed

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e5a` | `nod_disruptionStart` | `nod_disruptionOpen` | (none) |  |  |
| `edg_e5b` | `nod_disruptionOpen` | `nod_assessing` | on:evt_disruptionReported |  |  |
| `edg_e5c` | `nod_assessing` | `nod_mitigating` | on:evt_disruptionMajor |  |  |
| `edg_e5d` | `nod_assessing` | `nod_mitigating` | on:evt_disruptionLocal |  |  |
| `edg_e5e` | `nod_mitigating` | `nod_disruptionClosed` | on:evt_disruptionResolved |  |  |
| `edg_e5f` | `nod_assessStart` | `nod_howBad` | flow |  |  |
| `edg_e5g` | `nod_howBad` | `nod_declareMajor` | true |  |  |
| `edg_e5h` | `nod_howBad` | `nod_handleLocally` | false |  |  |
| `edg_e5i` | `nod_dutyManager` | `nod_deskNotifications` | command |  |  |

### `cnv_emergencyDesk` "Emergency desk"

mixed

Roles (derived; change the field that holds them):

- `nod_tower` sends `edg_e1cu` — `by` of `edg_e1cu`
- `nod_tower` sends `edg_e1cv` — `by` of `edg_e1cv`

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e1ct` | `nod_incidentStart` | `nod_localStandby` | (none) |  |  |
| `edg_e1cu` | `nod_localStandby` | `nod_fullEmergency` | on:evt_emergencyEscalated |  |  |
| `edg_e1cv` | `nod_fullEmergency` | `nod_aircraftAccident` | on:evt_aircraftAccident |  |  |
| `edg_e1cw` | `nod_localStandby` | `nod_standDown` | on:evt_aircraftLandedSafely |  |  |
| `edg_e1cx` | `nod_fullEmergency` | `nod_standDown` | on:evt_aircraftLandedSafely |  |  |
| `edg_e1cy` | `nod_aircraftAccident` | `nod_standDown` | on:evt_emergencyClosed |  |  |
| `edg_e1cz` | `nod_callOutStart` | `nod_callOut` | flow |  |  |
| `edg_e1d0` | `nod_callOut` | `nod_callFire` | flow |  |  |
| `edg_e1d1` | `nod_callOut` | `nod_callHospitals` | flow |  |  |
| `edg_e1d2` | `nod_callOut` | `nod_callPolice` | flow |  |  |
| `edg_e1d3` | `nod_callFire` | `nod_calledOut` | flow |  |  |
| `edg_e1d4` | `nod_callHospitals` | `nod_calledOut` | flow |  |  |
| `edg_e1d5` | `nod_callPolice` | `nod_calledOut` | flow |  |  |
| `edg_e1d6` | `nod_calledOut` | `nod_callOutEnd` | flow |  |  |
| `edg_e1d7` | `nod_tower` | `nod_fireStation` | command |  |  |

### `cnv_findMissing` "Find the missing"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e4j` | `nod_findStart` | `nod_page` |  |  |
| `edg_e4k` | `nod_page` | `nod_waitPage` |  |  |
| `edg_e4l` | `nod_waitPage` | `nod_countMissing` |  |  |
| `edg_e4m` | `nod_countMissing` | `nod_findEnd` |  |  |

### `cnv_flightAlerts` "Flight alerts"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1be` | `nod_alertStart` | `nod_readFlight` |  |  |
| `edg_e1bf` | `nod_readFlight` | `nod_whatChanged` |  |  |
| `edg_e1bg` | `nod_whatChanged` | `nod_alertGate` | case "gate" |  |
| `edg_e1bh` | `nod_alertGate` | `nod_alertEnd` |  |  |
| `edg_e1bi` | `nod_whatChanged` | `nod_alertDelay` | case "delay" |  |
| `edg_e1bj` | `nod_alertDelay` | `nod_alertEnd` |  |  |
| `edg_e1bk` | `nod_whatChanged` | `nod_alertBoarding` | case "boarding" |  |
| `edg_e1bl` | `nod_alertBoarding` | `nod_alertEnd` |  |  |
| `edg_e1bm` | `nod_whatChanged` | `nod_alertCancelled` | case "cancelled" |  |
| `edg_e1bn` | `nod_alertCancelled` | `nod_alertEnd` |  |  |
| `edg_e1bo` | `nod_whatChanged` | `nod_alertEnd` | default |  |

### `cnv_flightLifecycle` "Flight lifecycle"

machine · stage target · transitions complete · subject flight.status

Roles (derived; change the field that holds them):

- `edg_e2a` is for `nod_lifeHandler` — `party` of `act_requestDeIcing`
- `edg_e2i` runs `nod_notifySteps` — `actions` of `edg_e2i`
- `edg_e2l` runs `nod_notifySteps` — `actions` of `edg_e2l`
- `edg_e2m` runs `nod_notifySteps` — `actions` of `edg_e2m`
- `edg_e2n` runs `nod_notifySteps` — `actions` of `edg_e2n`
- `edg_e2o` runs `nod_notifySteps` — `actions` of `edg_e2o`
- `edg_e2p` runs `nod_notifySteps` — `actions` of `edg_e2p`
- `edg_e2r` runs `nod_notifySteps` — `actions` of `edg_e2r`
- `nod_lifeAirline` sends `edg_e2r` — `by` of `edg_e2r`
- `nod_lifeAirline` sends `nod_publishFlight` — `by` of `nod_publishFlight`
- `nod_lifeAtc` sends `edg_e2d` — `by` of `edg_e2d`
- `nod_lifeAtc` sends `edg_e2f` — `by` of `edg_e2f`
- `nod_lifeHandler` sends `edg_e27` — `by` of `edg_e27`
- `nod_lifeHandler` sends `edg_e2c` — `by` of `edg_e2c`

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e20` | `nod_flightStart` | `nod_scheduled` | (none) |  |  |
| `edg_e21` | `nod_publishFlight` | `nod_scheduled` | (none) |  | action:act_publishToDisplays |
| `edg_e22` | `nod_scheduled` | `nod_slotConfirmed` | on:evt_ctotIssued |  |  |
| `edg_e23` | `nod_slotConfirmed` | `nod_slotConfirmed` | on:evt_ctotRevised |  |  |
| `edg_e24` | `nod_slotConfirmed` | `nod_standAllocated` | on:evt_standAllocated |  |  |
| `edg_e25` | `nod_standAllocated` | `nod_checkInOpen` | after:tmr_checkInOpens |  | action:act_publishToDisplays assign:context.gate |
| `edg_e26` | `nod_checkInOpen` | `nod_checkInClosed` | after:tmr_checkInCloses |  |  |
| `edg_e27` | `nod_checkInClosed` | `nod_boardingFlight` | on:evt_boardingStarted |  |  |
| `edg_e28` | `nod_boardingFlight` | `nod_doorsClosed` | on:evt_doorsClosed |  |  |
| `edg_e29` | `nod_doorsClosed` | `nod_icingChoice` | always |  |  |
| `edg_e2a` | `nod_icingChoice` | `nod_deIcingFlight` | (none) | grd_icingConditions | action:act_requestDeIcing |
| `edg_e2b` | `nod_icingChoice` | `nod_readyForPushback` | (none) |  |  |
| `edg_e2c` | `nod_deIcingFlight` | `nod_readyForPushback` | on:evt_deicingCompleted |  |  |
| `edg_e2d` | `nod_readyForPushback` | `nod_pushedBack` | on:evt_aircraftOffBlock |  |  |
| `edg_e2e` | `nod_pushedBack` | `nod_taxiingOut` | on:evt_taxiStarted |  |  |
| `edg_e2f` | `nod_taxiingOut` | `nod_airborneFlight` | on:evt_aircraftAirborne |  |  |
| `edg_e2g` | `nod_taxiingOut` | `nod_returnToStand` | on:evt_aircraftReturning |  |  |
| `edg_e2h` | `nod_taxiingOut` | `nod_delayedFlight` | after:tmr_taxiOutLimit |  |  |
| `edg_e2i` | `nod_returnToStand` | `nod_standAllocated` | on:evt_aircraftOnBlock |  | action:act_notifyPassengers |
| `edg_e2j` | `nod_airborneFlight` | `nod_departed` | done:true |  | action:act_chargeTheMovement |
| `edg_e2k` | `nod_airborneFlight` | `nod_divertedFlight` | on:evt_flightDiverted |  |  |
| `edg_e2l` | `nod_scheduled` | `nod_delayedFlight` | on:evt_flightDelayed |  | action:act_notifyPassengers |
| `edg_e2m` | `nod_slotConfirmed` | `nod_delayedFlight` | on:evt_flightDelayed |  | action:act_notifyPassengers |
| `edg_e2n` | `nod_standAllocated` | `nod_delayedFlight` | on:evt_flightDelayed |  | action:act_notifyPassengers |
| `edg_e2o` | `nod_checkInOpen` | `nod_delayedFlight` | on:evt_flightDelayed |  | action:act_notifyPassengers |
| `edg_e2p` | `nod_checkInClosed` | `nod_delayedFlight` | on:evt_flightDelayed |  | action:act_notifyPassengers |
| `edg_e2q` | `nod_delayedFlight` | `nod_slotConfirmed` | on:evt_ctotRevised |  | action:act_publishToDisplays |
| `edg_e2r` | `nod_anyCancel` | `nod_cancelledFlight` | on:evt_flightCancelled |  | action:act_notifyPassengers action:act_releaseTheStand |

### `cnv_fuelling` "Into-plane fuelling"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1c4` | `nod_fuelStart` | `nod_fuelOrder` |  |  |
| `edg_e1c5` | `nod_fuelOrder` | `nod_passengersOnBoard` |  |  |
| `edg_e1c6` | `nod_passengersOnBoard` | `nod_fireCover` | true |  |
| `edg_e1c7` | `nod_passengersOnBoard` | `nod_dispatchTruck` | false |  |
| `edg_e1c8` | `nod_fireCover` | `nod_dispatchTruck` |  |  |
| `edg_e1c9` | `nod_dispatchTruck` | `nod_pumping` |  |  |
| `edg_e1ca` | `nod_pumping` | `nod_pumped` |  |  |
| `edg_e1cb` | `nod_pumped` | `nod_fuelReceipt` |  |  |
| `edg_e1cc` | `nod_fuelReceipt` | `nod_fuelEnd` |  |  |

### `cnv_gateBoarding` "Gate boarding"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1j2` | `nod_gateStart` | `nod_gateBridge` |  |  |
| `edg_e1j3` | `nod_gateBridge` | `nod_gateBoardingList` |  |  |
| `edg_e1j4` | `nod_gateBoardingList` | `nod_gateGroups` |  |  |
| `edg_e1j5` | `nod_gateGroups` | `nod_gateClose` |  |  |
| `edg_e1j6` | `nod_gateClose` | `nod_gateRetract` |  |  |
| `edg_e1j7` | `nod_gateRetract` | `nod_gateEnd` |  |  |

### `cnv_hallAlevel` "Terminal A hall"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_etb` | `nod_desksA` | `nod_platformA` | link |  |
| `edg_etc` | `nod_desksA` | `nod_rowA1` | command |  |
| `edg_etd` | `nod_rowA1` | `nod_deskA1x1` | command |  |
| `edg_ete` | `nod_rowA1` | `nod_deskA1x2` | command |  |
| `edg_etf` | `nod_rowA1` | `nod_deskA1x3` | command |  |
| `edg_etg` | `nod_rowA1` | `nod_deskA1x4` | command |  |
| `edg_eth` | `nod_rowA1` | `nod_deskA1x5` | command |  |
| `edg_eti` | `nod_rowA1` | `nod_deskA1x6` | command |  |
| `edg_etj` | `nod_rowA1` | `nod_deskA1x7` | command |  |
| `edg_etk` | `nod_rowA1` | `nod_deskA1x8` | command |  |
| `edg_etl` | `nod_rowA1` | `nod_deskA1x9` | command |  |
| `edg_etm` | `nod_rowA1` | `nod_deskA1x10` | command |  |
| `edg_etn` | `nod_rowA1` | `nod_deskA1x11` | command |  |
| `edg_eto` | `nod_rowA1` | `nod_deskA1x12` | command |  |
| `edg_etp` | `nod_desksA` | `nod_rowA2` | command |  |
| `edg_etq` | `nod_rowA2` | `nod_deskA2x1` | command |  |
| `edg_etr` | `nod_rowA2` | `nod_deskA2x2` | command |  |
| `edg_ets` | `nod_rowA2` | `nod_deskA2x3` | command |  |
| `edg_ett` | `nod_rowA2` | `nod_deskA2x4` | command |  |
| `edg_etu` | `nod_rowA2` | `nod_deskA2x5` | command |  |
| `edg_etv` | `nod_rowA2` | `nod_deskA2x6` | command |  |
| `edg_etw` | `nod_rowA2` | `nod_deskA2x7` | command |  |
| `edg_etx` | `nod_rowA2` | `nod_deskA2x8` | command |  |
| `edg_ety` | `nod_rowA2` | `nod_deskA2x9` | command |  |
| `edg_etz` | `nod_rowA2` | `nod_deskA2x10` | command |  |
| `edg_eu0` | `nod_rowA2` | `nod_deskA2x11` | command |  |
| `edg_eu1` | `nod_rowA2` | `nod_deskA2x12` | command |  |
| `edg_eu2` | `nod_desksA` | `nod_rowA3` | command |  |
| `edg_eu3` | `nod_rowA3` | `nod_deskA3x1` | command |  |
| `edg_eu4` | `nod_rowA3` | `nod_deskA3x2` | command |  |
| `edg_eu5` | `nod_rowA3` | `nod_deskA3x3` | command |  |
| `edg_eu6` | `nod_rowA3` | `nod_deskA3x4` | command |  |
| `edg_eu7` | `nod_rowA3` | `nod_deskA3x5` | command |  |
| `edg_eu8` | `nod_rowA3` | `nod_deskA3x6` | command |  |
| `edg_eu9` | `nod_rowA3` | `nod_deskA3x7` | command |  |
| `edg_eua` | `nod_rowA3` | `nod_deskA3x8` | command |  |
| `edg_eub` | `nod_rowA3` | `nod_deskA3x9` | command |  |
| `edg_euc` | `nod_rowA3` | `nod_deskA3x10` | command |  |
| `edg_eud` | `nod_rowA3` | `nod_deskA3x11` | command |  |
| `edg_eue` | `nod_rowA3` | `nod_deskA3x12` | command |  |
| `edg_euf` | `nod_desksA` | `nod_rowA4` | command |  |
| `edg_eug` | `nod_rowA4` | `nod_deskA4x1` | command |  |
| `edg_euh` | `nod_rowA4` | `nod_deskA4x2` | command |  |
| `edg_eui` | `nod_rowA4` | `nod_deskA4x3` | command |  |
| `edg_euj` | `nod_rowA4` | `nod_deskA4x4` | command |  |
| `edg_euk` | `nod_rowA4` | `nod_deskA4x5` | command |  |
| `edg_eul` | `nod_rowA4` | `nod_deskA4x6` | command |  |
| `edg_eum` | `nod_rowA4` | `nod_deskA4x7` | command |  |
| `edg_eun` | `nod_rowA4` | `nod_deskA4x8` | command |  |
| `edg_euo` | `nod_rowA4` | `nod_deskA4x9` | command |  |
| `edg_eup` | `nod_rowA4` | `nod_deskA4x10` | command |  |
| `edg_euq` | `nod_rowA4` | `nod_deskA4x11` | command |  |
| `edg_eur` | `nod_rowA4` | `nod_deskA4x12` | command |  |
| `edg_eus` | `nod_desksA` | `nod_rowA5` | command |  |
| `edg_eut` | `nod_rowA5` | `nod_deskA5x1` | command |  |
| `edg_euu` | `nod_rowA5` | `nod_deskA5x2` | command |  |
| `edg_euv` | `nod_rowA5` | `nod_deskA5x3` | command |  |
| `edg_euw` | `nod_rowA5` | `nod_deskA5x4` | command |  |
| `edg_eux` | `nod_rowA5` | `nod_deskA5x5` | command |  |
| `edg_euy` | `nod_rowA5` | `nod_deskA5x6` | command |  |
| `edg_euz` | `nod_rowA5` | `nod_deskA5x7` | command |  |
| `edg_ev0` | `nod_rowA5` | `nod_deskA5x8` | command |  |
| `edg_ev1` | `nod_rowA5` | `nod_deskA5x9` | command |  |
| `edg_ev2` | `nod_rowA5` | `nod_deskA5x10` | command |  |
| `edg_ev3` | `nod_rowA5` | `nod_deskA5x11` | command |  |
| `edg_ev4` | `nod_rowA5` | `nod_deskA5x12` | command |  |
| `edg_ev5` | `nod_desksA` | `nod_rowA6` | command |  |
| `edg_ev6` | `nod_rowA6` | `nod_deskA6x1` | command |  |
| `edg_ev7` | `nod_rowA6` | `nod_deskA6x2` | command |  |
| `edg_ev8` | `nod_rowA6` | `nod_deskA6x3` | command |  |
| `edg_ev9` | `nod_rowA6` | `nod_deskA6x4` | command |  |
| `edg_eva` | `nod_rowA6` | `nod_deskA6x5` | command |  |
| `edg_evb` | `nod_rowA6` | `nod_deskA6x6` | command |  |
| `edg_evc` | `nod_rowA6` | `nod_deskA6x7` | command |  |
| `edg_evd` | `nod_rowA6` | `nod_deskA6x8` | command |  |
| `edg_eve` | `nod_rowA6` | `nod_deskA6x9` | command |  |
| `edg_evf` | `nod_rowA6` | `nod_deskA6x10` | command |  |
| `edg_evg` | `nod_rowA6` | `nod_deskA6x11` | command |  |
| `edg_evh` | `nod_rowA6` | `nod_deskA6x12` | command |  |
| `edg_evi` | `nod_kioskA1` | `nod_platformA` | link |  |
| `edg_evj` | `nod_kioskA2` | `nod_platformA` | link |  |
| `edg_evk` | `nod_kioskA3` | `nod_platformA` | link |  |
| `edg_evl` | `nod_kioskA4` | `nod_platformA` | link |  |
| `edg_evm` | `nod_kioskA5` | `nod_platformA` | link |  |
| `edg_evn` | `nod_kioskA6` | `nod_platformA` | link |  |
| `edg_evo` | `nod_dropA1` | `nod_platformA` | link |  |
| `edg_evp` | `nod_dropA2` | `nod_platformA` | link |  |
| `edg_evq` | `nod_dropA3` | `nod_platformA` | link |  |
| `edg_evr` | `nod_dropA4` | `nod_platformA` | link |  |
| `edg_evs` | `nod_travellerA` | `nod_desksA` | command |  |

### `cnv_hallBlevel` "Terminal B hall"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_evv` | `nod_desksB` | `nod_platformB` | link |  |
| `edg_evw` | `nod_desksB` | `nod_rowB1` | command |  |
| `edg_evx` | `nod_rowB1` | `nod_deskB1x1` | command |  |
| `edg_evy` | `nod_rowB1` | `nod_deskB1x2` | command |  |
| `edg_evz` | `nod_rowB1` | `nod_deskB1x3` | command |  |
| `edg_ew0` | `nod_rowB1` | `nod_deskB1x4` | command |  |
| `edg_ew1` | `nod_rowB1` | `nod_deskB1x5` | command |  |
| `edg_ew2` | `nod_rowB1` | `nod_deskB1x6` | command |  |
| `edg_ew3` | `nod_rowB1` | `nod_deskB1x7` | command |  |
| `edg_ew4` | `nod_rowB1` | `nod_deskB1x8` | command |  |
| `edg_ew5` | `nod_rowB1` | `nod_deskB1x9` | command |  |
| `edg_ew6` | `nod_rowB1` | `nod_deskB1x10` | command |  |
| `edg_ew7` | `nod_rowB1` | `nod_deskB1x11` | command |  |
| `edg_ew8` | `nod_rowB1` | `nod_deskB1x12` | command |  |
| `edg_ew9` | `nod_desksB` | `nod_rowB2` | command |  |
| `edg_ewa` | `nod_rowB2` | `nod_deskB2x1` | command |  |
| `edg_ewb` | `nod_rowB2` | `nod_deskB2x2` | command |  |
| `edg_ewc` | `nod_rowB2` | `nod_deskB2x3` | command |  |
| `edg_ewd` | `nod_rowB2` | `nod_deskB2x4` | command |  |
| `edg_ewe` | `nod_rowB2` | `nod_deskB2x5` | command |  |
| `edg_ewf` | `nod_rowB2` | `nod_deskB2x6` | command |  |
| `edg_ewg` | `nod_rowB2` | `nod_deskB2x7` | command |  |
| `edg_ewh` | `nod_rowB2` | `nod_deskB2x8` | command |  |
| `edg_ewi` | `nod_rowB2` | `nod_deskB2x9` | command |  |
| `edg_ewj` | `nod_rowB2` | `nod_deskB2x10` | command |  |
| `edg_ewk` | `nod_rowB2` | `nod_deskB2x11` | command |  |
| `edg_ewl` | `nod_rowB2` | `nod_deskB2x12` | command |  |
| `edg_ewm` | `nod_desksB` | `nod_rowB3` | command |  |
| `edg_ewn` | `nod_rowB3` | `nod_deskB3x1` | command |  |
| `edg_ewo` | `nod_rowB3` | `nod_deskB3x2` | command |  |
| `edg_ewp` | `nod_rowB3` | `nod_deskB3x3` | command |  |
| `edg_ewq` | `nod_rowB3` | `nod_deskB3x4` | command |  |
| `edg_ewr` | `nod_rowB3` | `nod_deskB3x5` | command |  |
| `edg_ews` | `nod_rowB3` | `nod_deskB3x6` | command |  |
| `edg_ewt` | `nod_rowB3` | `nod_deskB3x7` | command |  |
| `edg_ewu` | `nod_rowB3` | `nod_deskB3x8` | command |  |
| `edg_ewv` | `nod_rowB3` | `nod_deskB3x9` | command |  |
| `edg_eww` | `nod_rowB3` | `nod_deskB3x10` | command |  |
| `edg_ewx` | `nod_rowB3` | `nod_deskB3x11` | command |  |
| `edg_ewy` | `nod_rowB3` | `nod_deskB3x12` | command |  |
| `edg_ewz` | `nod_desksB` | `nod_rowB4` | command |  |
| `edg_ex0` | `nod_rowB4` | `nod_deskB4x1` | command |  |
| `edg_ex1` | `nod_rowB4` | `nod_deskB4x2` | command |  |
| `edg_ex2` | `nod_rowB4` | `nod_deskB4x3` | command |  |
| `edg_ex3` | `nod_rowB4` | `nod_deskB4x4` | command |  |
| `edg_ex4` | `nod_rowB4` | `nod_deskB4x5` | command |  |
| `edg_ex5` | `nod_rowB4` | `nod_deskB4x6` | command |  |
| `edg_ex6` | `nod_rowB4` | `nod_deskB4x7` | command |  |
| `edg_ex7` | `nod_rowB4` | `nod_deskB4x8` | command |  |
| `edg_ex8` | `nod_rowB4` | `nod_deskB4x9` | command |  |
| `edg_ex9` | `nod_rowB4` | `nod_deskB4x10` | command |  |
| `edg_exa` | `nod_rowB4` | `nod_deskB4x11` | command |  |
| `edg_exb` | `nod_rowB4` | `nod_deskB4x12` | command |  |
| `edg_exc` | `nod_desksB` | `nod_rowB5` | command |  |
| `edg_exd` | `nod_rowB5` | `nod_deskB5x1` | command |  |
| `edg_exe` | `nod_rowB5` | `nod_deskB5x2` | command |  |
| `edg_exf` | `nod_rowB5` | `nod_deskB5x3` | command |  |
| `edg_exg` | `nod_rowB5` | `nod_deskB5x4` | command |  |
| `edg_exh` | `nod_rowB5` | `nod_deskB5x5` | command |  |
| `edg_exi` | `nod_rowB5` | `nod_deskB5x6` | command |  |
| `edg_exj` | `nod_rowB5` | `nod_deskB5x7` | command |  |
| `edg_exk` | `nod_rowB5` | `nod_deskB5x8` | command |  |
| `edg_exl` | `nod_rowB5` | `nod_deskB5x9` | command |  |
| `edg_exm` | `nod_rowB5` | `nod_deskB5x10` | command |  |
| `edg_exn` | `nod_rowB5` | `nod_deskB5x11` | command |  |
| `edg_exo` | `nod_rowB5` | `nod_deskB5x12` | command |  |
| `edg_exp` | `nod_desksB` | `nod_rowB6` | command |  |
| `edg_exq` | `nod_rowB6` | `nod_deskB6x1` | command |  |
| `edg_exr` | `nod_rowB6` | `nod_deskB6x2` | command |  |
| `edg_exs` | `nod_rowB6` | `nod_deskB6x3` | command |  |
| `edg_ext` | `nod_rowB6` | `nod_deskB6x4` | command |  |
| `edg_exu` | `nod_rowB6` | `nod_deskB6x5` | command |  |
| `edg_exv` | `nod_rowB6` | `nod_deskB6x6` | command |  |
| `edg_exw` | `nod_rowB6` | `nod_deskB6x7` | command |  |
| `edg_exx` | `nod_rowB6` | `nod_deskB6x8` | command |  |
| `edg_exy` | `nod_rowB6` | `nod_deskB6x9` | command |  |
| `edg_exz` | `nod_rowB6` | `nod_deskB6x10` | command |  |
| `edg_ey0` | `nod_rowB6` | `nod_deskB6x11` | command |  |
| `edg_ey1` | `nod_rowB6` | `nod_deskB6x12` | command |  |
| `edg_ey2` | `nod_kioskB1` | `nod_platformB` | link |  |
| `edg_ey3` | `nod_kioskB2` | `nod_platformB` | link |  |
| `edg_ey4` | `nod_kioskB3` | `nod_platformB` | link |  |
| `edg_ey5` | `nod_kioskB4` | `nod_platformB` | link |  |
| `edg_ey6` | `nod_kioskB5` | `nod_platformB` | link |  |
| `edg_ey7` | `nod_kioskB6` | `nod_platformB` | link |  |
| `edg_ey8` | `nod_dropB1` | `nod_platformB` | link |  |
| `edg_ey9` | `nod_dropB2` | `nod_platformB` | link |  |
| `edg_eya` | `nod_dropB3` | `nod_platformB` | link |  |
| `edg_eyb` | `nod_dropB4` | `nod_platformB` | link |  |
| `edg_eyc` | `nod_travellerB` | `nod_desksB` | command |  |

### `cnv_hallClevel` "Terminal C hall"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e100` | `nod_rowC5` | `nod_deskC5x4` | command |  |
| `edg_e101` | `nod_rowC5` | `nod_deskC5x5` | command |  |
| `edg_e102` | `nod_rowC5` | `nod_deskC5x6` | command |  |
| `edg_e103` | `nod_rowC5` | `nod_deskC5x7` | command |  |
| `edg_e104` | `nod_rowC5` | `nod_deskC5x8` | command |  |
| `edg_e105` | `nod_rowC5` | `nod_deskC5x9` | command |  |
| `edg_e106` | `nod_rowC5` | `nod_deskC5x10` | command |  |
| `edg_e107` | `nod_rowC5` | `nod_deskC5x11` | command |  |
| `edg_e108` | `nod_rowC5` | `nod_deskC5x12` | command |  |
| `edg_e109` | `nod_desksC` | `nod_rowC6` | command |  |
| `edg_e10a` | `nod_rowC6` | `nod_deskC6x1` | command |  |
| `edg_e10b` | `nod_rowC6` | `nod_deskC6x2` | command |  |
| `edg_e10c` | `nod_rowC6` | `nod_deskC6x3` | command |  |
| `edg_e10d` | `nod_rowC6` | `nod_deskC6x4` | command |  |
| `edg_e10e` | `nod_rowC6` | `nod_deskC6x5` | command |  |
| `edg_e10f` | `nod_rowC6` | `nod_deskC6x6` | command |  |
| `edg_e10g` | `nod_rowC6` | `nod_deskC6x7` | command |  |
| `edg_e10h` | `nod_rowC6` | `nod_deskC6x8` | command |  |
| `edg_e10i` | `nod_rowC6` | `nod_deskC6x9` | command |  |
| `edg_e10j` | `nod_rowC6` | `nod_deskC6x10` | command |  |
| `edg_e10k` | `nod_rowC6` | `nod_deskC6x11` | command |  |
| `edg_e10l` | `nod_rowC6` | `nod_deskC6x12` | command |  |
| `edg_e10m` | `nod_kioskC1` | `nod_platformC` | link |  |
| `edg_e10n` | `nod_kioskC2` | `nod_platformC` | link |  |
| `edg_e10o` | `nod_kioskC3` | `nod_platformC` | link |  |
| `edg_e10p` | `nod_kioskC4` | `nod_platformC` | link |  |
| `edg_e10q` | `nod_kioskC5` | `nod_platformC` | link |  |
| `edg_e10r` | `nod_kioskC6` | `nod_platformC` | link |  |
| `edg_e10s` | `nod_dropC1` | `nod_platformC` | link |  |
| `edg_e10t` | `nod_dropC2` | `nod_platformC` | link |  |
| `edg_e10u` | `nod_dropC3` | `nod_platformC` | link |  |
| `edg_e10v` | `nod_dropC4` | `nod_platformC` | link |  |
| `edg_e10w` | `nod_travellerC` | `nod_desksC` | command |  |
| `edg_eyf` | `nod_desksC` | `nod_platformC` | link |  |
| `edg_eyg` | `nod_desksC` | `nod_rowC1` | command |  |
| `edg_eyh` | `nod_rowC1` | `nod_deskC1x1` | command |  |
| `edg_eyi` | `nod_rowC1` | `nod_deskC1x2` | command |  |
| `edg_eyj` | `nod_rowC1` | `nod_deskC1x3` | command |  |
| `edg_eyk` | `nod_rowC1` | `nod_deskC1x4` | command |  |
| `edg_eyl` | `nod_rowC1` | `nod_deskC1x5` | command |  |
| `edg_eym` | `nod_rowC1` | `nod_deskC1x6` | command |  |
| `edg_eyn` | `nod_rowC1` | `nod_deskC1x7` | command |  |
| `edg_eyo` | `nod_rowC1` | `nod_deskC1x8` | command |  |
| `edg_eyp` | `nod_rowC1` | `nod_deskC1x9` | command |  |
| `edg_eyq` | `nod_rowC1` | `nod_deskC1x10` | command |  |
| `edg_eyr` | `nod_rowC1` | `nod_deskC1x11` | command |  |
| `edg_eys` | `nod_rowC1` | `nod_deskC1x12` | command |  |
| `edg_eyt` | `nod_desksC` | `nod_rowC2` | command |  |
| `edg_eyu` | `nod_rowC2` | `nod_deskC2x1` | command |  |
| `edg_eyv` | `nod_rowC2` | `nod_deskC2x2` | command |  |
| `edg_eyw` | `nod_rowC2` | `nod_deskC2x3` | command |  |
| `edg_eyx` | `nod_rowC2` | `nod_deskC2x4` | command |  |
| `edg_eyy` | `nod_rowC2` | `nod_deskC2x5` | command |  |
| `edg_eyz` | `nod_rowC2` | `nod_deskC2x6` | command |  |
| `edg_ez0` | `nod_rowC2` | `nod_deskC2x7` | command |  |
| `edg_ez1` | `nod_rowC2` | `nod_deskC2x8` | command |  |
| `edg_ez2` | `nod_rowC2` | `nod_deskC2x9` | command |  |
| `edg_ez3` | `nod_rowC2` | `nod_deskC2x10` | command |  |
| `edg_ez4` | `nod_rowC2` | `nod_deskC2x11` | command |  |
| `edg_ez5` | `nod_rowC2` | `nod_deskC2x12` | command |  |
| `edg_ez6` | `nod_desksC` | `nod_rowC3` | command |  |
| `edg_ez7` | `nod_rowC3` | `nod_deskC3x1` | command |  |
| `edg_ez8` | `nod_rowC3` | `nod_deskC3x2` | command |  |
| `edg_ez9` | `nod_rowC3` | `nod_deskC3x3` | command |  |
| `edg_eza` | `nod_rowC3` | `nod_deskC3x4` | command |  |
| `edg_ezb` | `nod_rowC3` | `nod_deskC3x5` | command |  |
| `edg_ezc` | `nod_rowC3` | `nod_deskC3x6` | command |  |
| `edg_ezd` | `nod_rowC3` | `nod_deskC3x7` | command |  |
| `edg_eze` | `nod_rowC3` | `nod_deskC3x8` | command |  |
| `edg_ezf` | `nod_rowC3` | `nod_deskC3x9` | command |  |
| `edg_ezg` | `nod_rowC3` | `nod_deskC3x10` | command |  |
| `edg_ezh` | `nod_rowC3` | `nod_deskC3x11` | command |  |
| `edg_ezi` | `nod_rowC3` | `nod_deskC3x12` | command |  |
| `edg_ezj` | `nod_desksC` | `nod_rowC4` | command |  |
| `edg_ezk` | `nod_rowC4` | `nod_deskC4x1` | command |  |
| `edg_ezl` | `nod_rowC4` | `nod_deskC4x2` | command |  |
| `edg_ezm` | `nod_rowC4` | `nod_deskC4x3` | command |  |
| `edg_ezn` | `nod_rowC4` | `nod_deskC4x4` | command |  |
| `edg_ezo` | `nod_rowC4` | `nod_deskC4x5` | command |  |
| `edg_ezp` | `nod_rowC4` | `nod_deskC4x6` | command |  |
| `edg_ezq` | `nod_rowC4` | `nod_deskC4x7` | command |  |
| `edg_ezr` | `nod_rowC4` | `nod_deskC4x8` | command |  |
| `edg_ezs` | `nod_rowC4` | `nod_deskC4x9` | command |  |
| `edg_ezt` | `nod_rowC4` | `nod_deskC4x10` | command |  |
| `edg_ezu` | `nod_rowC4` | `nod_deskC4x11` | command |  |
| `edg_ezv` | `nod_rowC4` | `nod_deskC4x12` | command |  |
| `edg_ezw` | `nod_desksC` | `nod_rowC5` | command |  |
| `edg_ezx` | `nod_rowC5` | `nod_deskC5x1` | command |  |
| `edg_ezy` | `nod_rowC5` | `nod_deskC5x2` | command |  |
| `edg_ezz` | `nod_rowC5` | `nod_deskC5x3` | command |  |

### `cnv_hallDlevel` "Terminal D hall"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e10z` | `nod_desksD` | `nod_platformD` | link |  |
| `edg_e110` | `nod_desksD` | `nod_rowD1` | command |  |
| `edg_e111` | `nod_rowD1` | `nod_deskD1x1` | command |  |
| `edg_e112` | `nod_rowD1` | `nod_deskD1x2` | command |  |
| `edg_e113` | `nod_rowD1` | `nod_deskD1x3` | command |  |
| `edg_e114` | `nod_rowD1` | `nod_deskD1x4` | command |  |
| `edg_e115` | `nod_rowD1` | `nod_deskD1x5` | command |  |
| `edg_e116` | `nod_rowD1` | `nod_deskD1x6` | command |  |
| `edg_e117` | `nod_rowD1` | `nod_deskD1x7` | command |  |
| `edg_e118` | `nod_rowD1` | `nod_deskD1x8` | command |  |
| `edg_e119` | `nod_rowD1` | `nod_deskD1x9` | command |  |
| `edg_e11a` | `nod_rowD1` | `nod_deskD1x10` | command |  |
| `edg_e11b` | `nod_rowD1` | `nod_deskD1x11` | command |  |
| `edg_e11c` | `nod_rowD1` | `nod_deskD1x12` | command |  |
| `edg_e11d` | `nod_desksD` | `nod_rowD2` | command |  |
| `edg_e11e` | `nod_rowD2` | `nod_deskD2x1` | command |  |
| `edg_e11f` | `nod_rowD2` | `nod_deskD2x2` | command |  |
| `edg_e11g` | `nod_rowD2` | `nod_deskD2x3` | command |  |
| `edg_e11h` | `nod_rowD2` | `nod_deskD2x4` | command |  |
| `edg_e11i` | `nod_rowD2` | `nod_deskD2x5` | command |  |
| `edg_e11j` | `nod_rowD2` | `nod_deskD2x6` | command |  |
| `edg_e11k` | `nod_rowD2` | `nod_deskD2x7` | command |  |
| `edg_e11l` | `nod_rowD2` | `nod_deskD2x8` | command |  |
| `edg_e11m` | `nod_rowD2` | `nod_deskD2x9` | command |  |
| `edg_e11n` | `nod_rowD2` | `nod_deskD2x10` | command |  |
| `edg_e11o` | `nod_rowD2` | `nod_deskD2x11` | command |  |
| `edg_e11p` | `nod_rowD2` | `nod_deskD2x12` | command |  |
| `edg_e11q` | `nod_desksD` | `nod_rowD3` | command |  |
| `edg_e11r` | `nod_rowD3` | `nod_deskD3x1` | command |  |
| `edg_e11s` | `nod_rowD3` | `nod_deskD3x2` | command |  |
| `edg_e11t` | `nod_rowD3` | `nod_deskD3x3` | command |  |
| `edg_e11u` | `nod_rowD3` | `nod_deskD3x4` | command |  |
| `edg_e11v` | `nod_rowD3` | `nod_deskD3x5` | command |  |
| `edg_e11w` | `nod_rowD3` | `nod_deskD3x6` | command |  |
| `edg_e11x` | `nod_rowD3` | `nod_deskD3x7` | command |  |
| `edg_e11y` | `nod_rowD3` | `nod_deskD3x8` | command |  |
| `edg_e11z` | `nod_rowD3` | `nod_deskD3x9` | command |  |
| `edg_e120` | `nod_rowD3` | `nod_deskD3x10` | command |  |
| `edg_e121` | `nod_rowD3` | `nod_deskD3x11` | command |  |
| `edg_e122` | `nod_rowD3` | `nod_deskD3x12` | command |  |
| `edg_e123` | `nod_desksD` | `nod_rowD4` | command |  |
| `edg_e124` | `nod_rowD4` | `nod_deskD4x1` | command |  |
| `edg_e125` | `nod_rowD4` | `nod_deskD4x2` | command |  |
| `edg_e126` | `nod_rowD4` | `nod_deskD4x3` | command |  |
| `edg_e127` | `nod_rowD4` | `nod_deskD4x4` | command |  |
| `edg_e128` | `nod_rowD4` | `nod_deskD4x5` | command |  |
| `edg_e129` | `nod_rowD4` | `nod_deskD4x6` | command |  |
| `edg_e12a` | `nod_rowD4` | `nod_deskD4x7` | command |  |
| `edg_e12b` | `nod_rowD4` | `nod_deskD4x8` | command |  |
| `edg_e12c` | `nod_rowD4` | `nod_deskD4x9` | command |  |
| `edg_e12d` | `nod_rowD4` | `nod_deskD4x10` | command |  |
| `edg_e12e` | `nod_rowD4` | `nod_deskD4x11` | command |  |
| `edg_e12f` | `nod_rowD4` | `nod_deskD4x12` | command |  |
| `edg_e12g` | `nod_desksD` | `nod_rowD5` | command |  |
| `edg_e12h` | `nod_rowD5` | `nod_deskD5x1` | command |  |
| `edg_e12i` | `nod_rowD5` | `nod_deskD5x2` | command |  |
| `edg_e12j` | `nod_rowD5` | `nod_deskD5x3` | command |  |
| `edg_e12k` | `nod_rowD5` | `nod_deskD5x4` | command |  |
| `edg_e12l` | `nod_rowD5` | `nod_deskD5x5` | command |  |
| `edg_e12m` | `nod_rowD5` | `nod_deskD5x6` | command |  |
| `edg_e12n` | `nod_rowD5` | `nod_deskD5x7` | command |  |
| `edg_e12o` | `nod_rowD5` | `nod_deskD5x8` | command |  |
| `edg_e12p` | `nod_rowD5` | `nod_deskD5x9` | command |  |
| `edg_e12q` | `nod_rowD5` | `nod_deskD5x10` | command |  |
| `edg_e12r` | `nod_rowD5` | `nod_deskD5x11` | command |  |
| `edg_e12s` | `nod_rowD5` | `nod_deskD5x12` | command |  |
| `edg_e12t` | `nod_desksD` | `nod_rowD6` | command |  |
| `edg_e12u` | `nod_rowD6` | `nod_deskD6x1` | command |  |
| `edg_e12v` | `nod_rowD6` | `nod_deskD6x2` | command |  |
| `edg_e12w` | `nod_rowD6` | `nod_deskD6x3` | command |  |
| `edg_e12x` | `nod_rowD6` | `nod_deskD6x4` | command |  |
| `edg_e12y` | `nod_rowD6` | `nod_deskD6x5` | command |  |
| `edg_e12z` | `nod_rowD6` | `nod_deskD6x6` | command |  |
| `edg_e130` | `nod_rowD6` | `nod_deskD6x7` | command |  |
| `edg_e131` | `nod_rowD6` | `nod_deskD6x8` | command |  |
| `edg_e132` | `nod_rowD6` | `nod_deskD6x9` | command |  |
| `edg_e133` | `nod_rowD6` | `nod_deskD6x10` | command |  |
| `edg_e134` | `nod_rowD6` | `nod_deskD6x11` | command |  |
| `edg_e135` | `nod_rowD6` | `nod_deskD6x12` | command |  |
| `edg_e136` | `nod_kioskD1` | `nod_platformD` | link |  |
| `edg_e137` | `nod_kioskD2` | `nod_platformD` | link |  |
| `edg_e138` | `nod_kioskD3` | `nod_platformD` | link |  |
| `edg_e139` | `nod_kioskD4` | `nod_platformD` | link |  |
| `edg_e13a` | `nod_kioskD5` | `nod_platformD` | link |  |
| `edg_e13b` | `nod_kioskD6` | `nod_platformD` | link |  |
| `edg_e13c` | `nod_dropD1` | `nod_platformD` | link |  |
| `edg_e13d` | `nod_dropD2` | `nod_platformD` | link |  |
| `edg_e13e` | `nod_dropD3` | `nod_platformD` | link |  |
| `edg_e13f` | `nod_dropD4` | `nod_platformD` | link |  |
| `edg_e13g` | `nod_travellerD` | `nod_desksD` | command |  |

### `cnv_lostItem` "Lost item"

machine · stage target · transitions partial · subject item.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_emy` | `nod_lostStart` | `nod_reported` | (none) |  |  |
| `edg_emz` | `nod_reported` | `nod_matched` | on:evt_itemMatched |  |  |
| `edg_en0` | `nod_matched` | `nod_returned` | on:evt_itemCollected |  |  |
| `edg_en1` | `nod_reported` | `nod_unclaimed` | after:tmr_keepFor |  |  |

### `cnv_monthlyBilling` "Monthly billing"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1bp` | `nod_billStart` | `nod_movements` |  |  |
| `edg_e1bq` | `nod_movements` | `nod_eachOperator` |  |  |
| `edg_e1br` | `nod_eachOperator` | `nod_billEnd` |  |  |

### `cnv_notifyPassengers` "Notify passengers"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e2s` | `nod_notifyStart` | `nod_whoIsBooked` |  |  |
| `edg_e2t` | `nod_whoIsBooked` | `nod_sendNotice` |  |  |
| `edg_e2u` | `nod_sendNotice` | `nod_noticeSent` |  |  |
| `edg_e2v` | `nod_noticeSent` | `nod_notifyEnd` |  |  |

### `cnv_offloadNoShows` "Offload the no-shows' bags"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e4n` | `nod_offloadStart` | `nod_listBags` |  |  |
| `edg_e4o` | `nod_listBags` | `nod_eachBag` |  |  |
| `edg_e4p` | `nod_eachBag` | `nod_offloaded` |  |  |
| `edg_e4q` | `nod_offloaded` | `nod_offloadEnd` |  |  |

### `cnv_offloadOneBag` "Offload one bag"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e4r` | `nod_bagOutStart` | `nod_findInHold` |  |  |
| `edg_e4s` | `nod_findInHold` | `nod_bagOutEnd` |  |  |

### `cnv_parkingStay` "Parking stay"

machine · transitions partial · subject stay.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e1b9` | `nod_stayStart` | `nod_entered` | (none) |  |  |
| `edg_e1ba` | `nod_entered` | `nod_paid` | on:evt_stayPaid |  |  |
| `edg_e1bb` | `nod_paid` | `nod_exited` | on:evt_stayExited |  |  |
| `edg_e1bc` | `nod_paid` | `nod_overstay` | after:tmr_graceToLeave |  |  |
| `edg_e1bd` | `nod_overstay` | `nod_paid` | on:evt_stayPaid |  |  |

### `cnv_passengerJourney` "Passenger journey"

machine · transitions partial · subject journey.stage

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e1aw` | `nod_journeyStart` | `nod_booked` | (none) |  |  |
| `edg_e1ax` | `nod_booked` | `nod_checkedIn` | on:evt_passengerCheckedIn |  |  |
| `edg_e1ay` | `nod_checkedIn` | `nod_bagDropped` | on:evt_bagDropped |  |  |
| `edg_e1az` | `nod_checkedIn` | `nod_screened` | on:evt_passengerScreened |  |  |
| `edg_e1b0` | `nod_bagDropped` | `nod_screened` | on:evt_passengerScreened |  |  |
| `edg_e1b1` | `nod_screened` | `nod_international` | always |  |  |
| `edg_e1b2` | `nod_international` | `nod_borderPassed` | (none) | "the destination is outside the Schengen area" |  |
| `edg_e1b3` | `nod_international` | `nod_airside` | (none) |  |  |
| `edg_e1b4` | `nod_borderPassed` | `nod_airside` | on:evt_borderCleared |  |  |
| `edg_e1b5` | `nod_airside` | `nod_atGate` | on:evt_passengerAtGate |  |  |
| `edg_e1b6` | `nod_atGate` | `nod_onBoard` | on:evt_passengerBoarded |  |  |
| `edg_e1b7` | `nod_atGate` | `nod_deniedBoarding` | on:evt_boardingDenied |  |  |
| `edg_e1b8` | `nod_airside` | `nod_noShow` | on:evt_gateClosed |  |  |

### `cnv_screeningHalls` "Screening halls"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e13h` | `nod_screeningSupervisor` | `nod_laneRecords` | command |  |
| `edg_e13i` | `nod_screeningA` | `nod_laneRecords` | data |  |
| `edg_e13j` | `nod_screeningA` | `nod_divestA1` | command |  |
| `edg_e13k` | `nod_divestA1` | `nod_ctA1` | data |  |
| `edg_e13l` | `nod_divestA1` | `nod_bodyA1` | data |  |
| `edg_e13m` | `nod_ctA1` | `nod_recomposeA1` | data |  |
| `edg_e13n` | `nod_ctA1` | `nod_alarmTableA1` | data |  |
| `edg_e13o` | `nod_alarmTableA1` | `nod_recomposeA1` | data |  |
| `edg_e13p` | `nod_screeningA` | `nod_divestA2` | command |  |
| `edg_e13q` | `nod_divestA2` | `nod_ctA2` | data |  |
| `edg_e13r` | `nod_divestA2` | `nod_bodyA2` | data |  |
| `edg_e13s` | `nod_ctA2` | `nod_recomposeA2` | data |  |
| `edg_e13t` | `nod_ctA2` | `nod_alarmTableA2` | data |  |
| `edg_e13u` | `nod_alarmTableA2` | `nod_recomposeA2` | data |  |
| `edg_e13v` | `nod_screeningA` | `nod_divestA3` | command |  |
| `edg_e13w` | `nod_divestA3` | `nod_ctA3` | data |  |
| `edg_e13x` | `nod_divestA3` | `nod_bodyA3` | data |  |
| `edg_e13y` | `nod_ctA3` | `nod_recomposeA3` | data |  |
| `edg_e13z` | `nod_ctA3` | `nod_alarmTableA3` | data |  |
| `edg_e140` | `nod_alarmTableA3` | `nod_recomposeA3` | data |  |
| `edg_e141` | `nod_screeningA` | `nod_divestA4` | command |  |
| `edg_e142` | `nod_divestA4` | `nod_ctA4` | data |  |
| `edg_e143` | `nod_divestA4` | `nod_bodyA4` | data |  |
| `edg_e144` | `nod_ctA4` | `nod_recomposeA4` | data |  |
| `edg_e145` | `nod_ctA4` | `nod_alarmTableA4` | data |  |
| `edg_e146` | `nod_alarmTableA4` | `nod_recomposeA4` | data |  |
| `edg_e147` | `nod_screeningA` | `nod_divestA5` | command |  |
| `edg_e148` | `nod_divestA5` | `nod_ctA5` | data |  |
| `edg_e149` | `nod_divestA5` | `nod_bodyA5` | data |  |
| `edg_e14a` | `nod_ctA5` | `nod_recomposeA5` | data |  |
| `edg_e14b` | `nod_ctA5` | `nod_alarmTableA5` | data |  |
| `edg_e14c` | `nod_alarmTableA5` | `nod_recomposeA5` | data |  |
| `edg_e14d` | `nod_screeningA` | `nod_divestA6` | command |  |
| `edg_e14e` | `nod_divestA6` | `nod_ctA6` | data |  |
| `edg_e14f` | `nod_divestA6` | `nod_bodyA6` | data |  |
| `edg_e14g` | `nod_ctA6` | `nod_recomposeA6` | data |  |
| `edg_e14h` | `nod_ctA6` | `nod_alarmTableA6` | data |  |
| `edg_e14i` | `nod_alarmTableA6` | `nod_recomposeA6` | data |  |
| `edg_e14j` | `nod_screeningA` | `nod_divestA7` | command |  |
| `edg_e14k` | `nod_divestA7` | `nod_ctA7` | data |  |
| `edg_e14l` | `nod_divestA7` | `nod_bodyA7` | data |  |
| `edg_e14m` | `nod_ctA7` | `nod_recomposeA7` | data |  |
| `edg_e14n` | `nod_ctA7` | `nod_alarmTableA7` | data |  |
| `edg_e14o` | `nod_alarmTableA7` | `nod_recomposeA7` | data |  |
| `edg_e14p` | `nod_screeningA` | `nod_divestA8` | command |  |
| `edg_e14q` | `nod_divestA8` | `nod_ctA8` | data |  |
| `edg_e14r` | `nod_divestA8` | `nod_bodyA8` | data |  |
| `edg_e14s` | `nod_ctA8` | `nod_recomposeA8` | data |  |
| `edg_e14t` | `nod_ctA8` | `nod_alarmTableA8` | data |  |
| `edg_e14u` | `nod_alarmTableA8` | `nod_recomposeA8` | data |  |
| `edg_e14v` | `nod_screeningA` | `nod_divestA9` | command |  |
| `edg_e14w` | `nod_divestA9` | `nod_ctA9` | data |  |
| `edg_e14x` | `nod_divestA9` | `nod_bodyA9` | data |  |
| `edg_e14y` | `nod_ctA9` | `nod_recomposeA9` | data |  |
| `edg_e14z` | `nod_ctA9` | `nod_alarmTableA9` | data |  |
| `edg_e150` | `nod_alarmTableA9` | `nod_recomposeA9` | data |  |
| `edg_e151` | `nod_screeningA` | `nod_divestA10` | command |  |
| `edg_e152` | `nod_divestA10` | `nod_ctA10` | data |  |
| `edg_e153` | `nod_divestA10` | `nod_bodyA10` | data |  |
| `edg_e154` | `nod_ctA10` | `nod_recomposeA10` | data |  |
| `edg_e155` | `nod_ctA10` | `nod_alarmTableA10` | data |  |
| `edg_e156` | `nod_alarmTableA10` | `nod_recomposeA10` | data |  |
| `edg_e157` | `nod_screeningB` | `nod_laneRecords` | data |  |
| `edg_e158` | `nod_screeningB` | `nod_divestB1` | command |  |
| `edg_e159` | `nod_divestB1` | `nod_ctB1` | data |  |
| `edg_e15a` | `nod_divestB1` | `nod_bodyB1` | data |  |
| `edg_e15b` | `nod_ctB1` | `nod_recomposeB1` | data |  |
| `edg_e15c` | `nod_ctB1` | `nod_alarmTableB1` | data |  |
| `edg_e15d` | `nod_alarmTableB1` | `nod_recomposeB1` | data |  |
| `edg_e15e` | `nod_screeningB` | `nod_divestB2` | command |  |
| `edg_e15f` | `nod_divestB2` | `nod_ctB2` | data |  |
| `edg_e15g` | `nod_divestB2` | `nod_bodyB2` | data |  |
| `edg_e15h` | `nod_ctB2` | `nod_recomposeB2` | data |  |
| `edg_e15i` | `nod_ctB2` | `nod_alarmTableB2` | data |  |
| `edg_e15j` | `nod_alarmTableB2` | `nod_recomposeB2` | data |  |
| `edg_e15k` | `nod_screeningB` | `nod_divestB3` | command |  |
| `edg_e15l` | `nod_divestB3` | `nod_ctB3` | data |  |
| `edg_e15m` | `nod_divestB3` | `nod_bodyB3` | data |  |
| `edg_e15n` | `nod_ctB3` | `nod_recomposeB3` | data |  |
| `edg_e15o` | `nod_ctB3` | `nod_alarmTableB3` | data |  |
| `edg_e15p` | `nod_alarmTableB3` | `nod_recomposeB3` | data |  |
| `edg_e15q` | `nod_screeningB` | `nod_divestB4` | command |  |
| `edg_e15r` | `nod_divestB4` | `nod_ctB4` | data |  |
| `edg_e15s` | `nod_divestB4` | `nod_bodyB4` | data |  |
| `edg_e15t` | `nod_ctB4` | `nod_recomposeB4` | data |  |
| `edg_e15u` | `nod_ctB4` | `nod_alarmTableB4` | data |  |
| `edg_e15v` | `nod_alarmTableB4` | `nod_recomposeB4` | data |  |
| `edg_e15w` | `nod_screeningB` | `nod_divestB5` | command |  |
| `edg_e15x` | `nod_divestB5` | `nod_ctB5` | data |  |
| `edg_e15y` | `nod_divestB5` | `nod_bodyB5` | data |  |
| `edg_e15z` | `nod_ctB5` | `nod_recomposeB5` | data |  |
| `edg_e160` | `nod_ctB5` | `nod_alarmTableB5` | data |  |
| `edg_e161` | `nod_alarmTableB5` | `nod_recomposeB5` | data |  |
| `edg_e162` | `nod_screeningB` | `nod_divestB6` | command |  |
| `edg_e163` | `nod_divestB6` | `nod_ctB6` | data |  |
| `edg_e164` | `nod_divestB6` | `nod_bodyB6` | data |  |
| `edg_e165` | `nod_ctB6` | `nod_recomposeB6` | data |  |
| `edg_e166` | `nod_ctB6` | `nod_alarmTableB6` | data |  |
| `edg_e167` | `nod_alarmTableB6` | `nod_recomposeB6` | data |  |
| `edg_e168` | `nod_screeningB` | `nod_divestB7` | command |  |
| `edg_e169` | `nod_divestB7` | `nod_ctB7` | data |  |
| `edg_e16a` | `nod_divestB7` | `nod_bodyB7` | data |  |
| `edg_e16b` | `nod_ctB7` | `nod_recomposeB7` | data |  |
| `edg_e16c` | `nod_ctB7` | `nod_alarmTableB7` | data |  |
| `edg_e16d` | `nod_alarmTableB7` | `nod_recomposeB7` | data |  |
| `edg_e16e` | `nod_screeningB` | `nod_divestB8` | command |  |
| `edg_e16f` | `nod_divestB8` | `nod_ctB8` | data |  |
| `edg_e16g` | `nod_divestB8` | `nod_bodyB8` | data |  |
| `edg_e16h` | `nod_ctB8` | `nod_recomposeB8` | data |  |
| `edg_e16i` | `nod_ctB8` | `nod_alarmTableB8` | data |  |
| `edg_e16j` | `nod_alarmTableB8` | `nod_recomposeB8` | data |  |
| `edg_e16k` | `nod_screeningB` | `nod_divestB9` | command |  |
| `edg_e16l` | `nod_divestB9` | `nod_ctB9` | data |  |
| `edg_e16m` | `nod_divestB9` | `nod_bodyB9` | data |  |
| `edg_e16n` | `nod_ctB9` | `nod_recomposeB9` | data |  |
| `edg_e16o` | `nod_ctB9` | `nod_alarmTableB9` | data |  |
| `edg_e16p` | `nod_alarmTableB9` | `nod_recomposeB9` | data |  |
| `edg_e16q` | `nod_screeningB` | `nod_divestB10` | command |  |
| `edg_e16r` | `nod_divestB10` | `nod_ctB10` | data |  |
| `edg_e16s` | `nod_divestB10` | `nod_bodyB10` | data |  |
| `edg_e16t` | `nod_ctB10` | `nod_recomposeB10` | data |  |
| `edg_e16u` | `nod_ctB10` | `nod_alarmTableB10` | data |  |
| `edg_e16v` | `nod_alarmTableB10` | `nod_recomposeB10` | data |  |
| `edg_e16w` | `nod_screeningC` | `nod_laneRecords` | data |  |
| `edg_e16x` | `nod_screeningC` | `nod_divestC1` | command |  |
| `edg_e16y` | `nod_divestC1` | `nod_ctC1` | data |  |
| `edg_e16z` | `nod_divestC1` | `nod_bodyC1` | data |  |
| `edg_e170` | `nod_ctC1` | `nod_recomposeC1` | data |  |
| `edg_e171` | `nod_ctC1` | `nod_alarmTableC1` | data |  |
| `edg_e172` | `nod_alarmTableC1` | `nod_recomposeC1` | data |  |
| `edg_e173` | `nod_screeningC` | `nod_divestC2` | command |  |
| `edg_e174` | `nod_divestC2` | `nod_ctC2` | data |  |
| `edg_e175` | `nod_divestC2` | `nod_bodyC2` | data |  |
| `edg_e176` | `nod_ctC2` | `nod_recomposeC2` | data |  |
| `edg_e177` | `nod_ctC2` | `nod_alarmTableC2` | data |  |
| `edg_e178` | `nod_alarmTableC2` | `nod_recomposeC2` | data |  |
| `edg_e179` | `nod_screeningC` | `nod_divestC3` | command |  |
| `edg_e17a` | `nod_divestC3` | `nod_ctC3` | data |  |
| `edg_e17b` | `nod_divestC3` | `nod_bodyC3` | data |  |
| `edg_e17c` | `nod_ctC3` | `nod_recomposeC3` | data |  |
| `edg_e17d` | `nod_ctC3` | `nod_alarmTableC3` | data |  |
| `edg_e17e` | `nod_alarmTableC3` | `nod_recomposeC3` | data |  |
| `edg_e17f` | `nod_screeningC` | `nod_divestC4` | command |  |
| `edg_e17g` | `nod_divestC4` | `nod_ctC4` | data |  |
| `edg_e17h` | `nod_divestC4` | `nod_bodyC4` | data |  |
| `edg_e17i` | `nod_ctC4` | `nod_recomposeC4` | data |  |
| `edg_e17j` | `nod_ctC4` | `nod_alarmTableC4` | data |  |
| `edg_e17k` | `nod_alarmTableC4` | `nod_recomposeC4` | data |  |
| `edg_e17l` | `nod_screeningC` | `nod_divestC5` | command |  |
| `edg_e17m` | `nod_divestC5` | `nod_ctC5` | data |  |
| `edg_e17n` | `nod_divestC5` | `nod_bodyC5` | data |  |
| `edg_e17o` | `nod_ctC5` | `nod_recomposeC5` | data |  |
| `edg_e17p` | `nod_ctC5` | `nod_alarmTableC5` | data |  |
| `edg_e17q` | `nod_alarmTableC5` | `nod_recomposeC5` | data |  |
| `edg_e17r` | `nod_screeningC` | `nod_divestC6` | command |  |
| `edg_e17s` | `nod_divestC6` | `nod_ctC6` | data |  |
| `edg_e17t` | `nod_divestC6` | `nod_bodyC6` | data |  |
| `edg_e17u` | `nod_ctC6` | `nod_recomposeC6` | data |  |
| `edg_e17v` | `nod_ctC6` | `nod_alarmTableC6` | data |  |
| `edg_e17w` | `nod_alarmTableC6` | `nod_recomposeC6` | data |  |
| `edg_e17x` | `nod_screeningC` | `nod_divestC7` | command |  |
| `edg_e17y` | `nod_divestC7` | `nod_ctC7` | data |  |
| `edg_e17z` | `nod_divestC7` | `nod_bodyC7` | data |  |
| `edg_e180` | `nod_ctC7` | `nod_recomposeC7` | data |  |
| `edg_e181` | `nod_ctC7` | `nod_alarmTableC7` | data |  |
| `edg_e182` | `nod_alarmTableC7` | `nod_recomposeC7` | data |  |
| `edg_e183` | `nod_screeningC` | `nod_divestC8` | command |  |
| `edg_e184` | `nod_divestC8` | `nod_ctC8` | data |  |
| `edg_e185` | `nod_divestC8` | `nod_bodyC8` | data |  |
| `edg_e186` | `nod_ctC8` | `nod_recomposeC8` | data |  |
| `edg_e187` | `nod_ctC8` | `nod_alarmTableC8` | data |  |
| `edg_e188` | `nod_alarmTableC8` | `nod_recomposeC8` | data |  |
| `edg_e189` | `nod_screeningC` | `nod_divestC9` | command |  |
| `edg_e18a` | `nod_divestC9` | `nod_ctC9` | data |  |
| `edg_e18b` | `nod_divestC9` | `nod_bodyC9` | data |  |
| `edg_e18c` | `nod_ctC9` | `nod_recomposeC9` | data |  |
| `edg_e18d` | `nod_ctC9` | `nod_alarmTableC9` | data |  |
| `edg_e18e` | `nod_alarmTableC9` | `nod_recomposeC9` | data |  |
| `edg_e18f` | `nod_screeningC` | `nod_divestC10` | command |  |
| `edg_e18g` | `nod_divestC10` | `nod_ctC10` | data |  |
| `edg_e18h` | `nod_divestC10` | `nod_bodyC10` | data |  |
| `edg_e18i` | `nod_ctC10` | `nod_recomposeC10` | data |  |
| `edg_e18j` | `nod_ctC10` | `nod_alarmTableC10` | data |  |
| `edg_e18k` | `nod_alarmTableC10` | `nod_recomposeC10` | data |  |
| `edg_e18l` | `nod_screeningD` | `nod_laneRecords` | data |  |
| `edg_e18m` | `nod_screeningD` | `nod_divestD1` | command |  |
| `edg_e18n` | `nod_divestD1` | `nod_ctD1` | data |  |
| `edg_e18o` | `nod_divestD1` | `nod_bodyD1` | data |  |
| `edg_e18p` | `nod_ctD1` | `nod_recomposeD1` | data |  |
| `edg_e18q` | `nod_ctD1` | `nod_alarmTableD1` | data |  |
| `edg_e18r` | `nod_alarmTableD1` | `nod_recomposeD1` | data |  |
| `edg_e18s` | `nod_screeningD` | `nod_divestD2` | command |  |
| `edg_e18t` | `nod_divestD2` | `nod_ctD2` | data |  |
| `edg_e18u` | `nod_divestD2` | `nod_bodyD2` | data |  |
| `edg_e18v` | `nod_ctD2` | `nod_recomposeD2` | data |  |
| `edg_e18w` | `nod_ctD2` | `nod_alarmTableD2` | data |  |
| `edg_e18x` | `nod_alarmTableD2` | `nod_recomposeD2` | data |  |
| `edg_e18y` | `nod_screeningD` | `nod_divestD3` | command |  |
| `edg_e18z` | `nod_divestD3` | `nod_ctD3` | data |  |
| `edg_e190` | `nod_divestD3` | `nod_bodyD3` | data |  |
| `edg_e191` | `nod_ctD3` | `nod_recomposeD3` | data |  |
| `edg_e192` | `nod_ctD3` | `nod_alarmTableD3` | data |  |
| `edg_e193` | `nod_alarmTableD3` | `nod_recomposeD3` | data |  |
| `edg_e194` | `nod_screeningD` | `nod_divestD4` | command |  |
| `edg_e195` | `nod_divestD4` | `nod_ctD4` | data |  |
| `edg_e196` | `nod_divestD4` | `nod_bodyD4` | data |  |
| `edg_e197` | `nod_ctD4` | `nod_recomposeD4` | data |  |
| `edg_e198` | `nod_ctD4` | `nod_alarmTableD4` | data |  |
| `edg_e199` | `nod_alarmTableD4` | `nod_recomposeD4` | data |  |
| `edg_e19a` | `nod_screeningD` | `nod_divestD5` | command |  |
| `edg_e19b` | `nod_divestD5` | `nod_ctD5` | data |  |
| `edg_e19c` | `nod_divestD5` | `nod_bodyD5` | data |  |
| `edg_e19d` | `nod_ctD5` | `nod_recomposeD5` | data |  |
| `edg_e19e` | `nod_ctD5` | `nod_alarmTableD5` | data |  |
| `edg_e19f` | `nod_alarmTableD5` | `nod_recomposeD5` | data |  |
| `edg_e19g` | `nod_screeningD` | `nod_divestD6` | command |  |
| `edg_e19h` | `nod_divestD6` | `nod_ctD6` | data |  |
| `edg_e19i` | `nod_divestD6` | `nod_bodyD6` | data |  |
| `edg_e19j` | `nod_ctD6` | `nod_recomposeD6` | data |  |
| `edg_e19k` | `nod_ctD6` | `nod_alarmTableD6` | data |  |
| `edg_e19l` | `nod_alarmTableD6` | `nod_recomposeD6` | data |  |
| `edg_e19m` | `nod_screeningD` | `nod_divestD7` | command |  |
| `edg_e19n` | `nod_divestD7` | `nod_ctD7` | data |  |
| `edg_e19o` | `nod_divestD7` | `nod_bodyD7` | data |  |
| `edg_e19p` | `nod_ctD7` | `nod_recomposeD7` | data |  |
| `edg_e19q` | `nod_ctD7` | `nod_alarmTableD7` | data |  |
| `edg_e19r` | `nod_alarmTableD7` | `nod_recomposeD7` | data |  |
| `edg_e19s` | `nod_screeningD` | `nod_divestD8` | command |  |
| `edg_e19t` | `nod_divestD8` | `nod_ctD8` | data |  |
| `edg_e19u` | `nod_divestD8` | `nod_bodyD8` | data |  |
| `edg_e19v` | `nod_ctD8` | `nod_recomposeD8` | data |  |
| `edg_e19w` | `nod_ctD8` | `nod_alarmTableD8` | data |  |
| `edg_e19x` | `nod_alarmTableD8` | `nod_recomposeD8` | data |  |

### `cnv_secondaryInspection` "Secondary inspection"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1at` | `nod_secondStart` | `nod_interview` |  |  |
| `edg_e1au` | `nod_interview` | `nod_customsCheck` |  |  |
| `edg_e1av` | `nod_customsCheck` | `nod_secondEnd` |  |  |

### `cnv_securityLane` "Security lane"

machine · transitions complete · subject lane.status

Roles (derived; change the field that holds them):

- `nod_laneOfficer` sends `edg_e19z` — `by` of `edg_e19z`
- `nod_laneOfficer` sends `edg_e1a6` — `by` of `edg_e1a6`
- `nod_laneOfficer` sends `edg_e1a8` — `by` of `edg_e1a8`

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e19y` | `nod_laneStart` | `nod_laneClosed` | (none) |  |  |
| `edg_e19z` | `nod_laneClosed` | `nod_laneOpening` | on:evt_laneStaffed |  |  |
| `edg_e1a0` | `nod_laneOpening` | `nod_laneOpen` | on:evt_laneSelfTested |  |  |
| `edg_e1a1` | `nod_laneOpen` | `nod_laneBusy` | on:evt_queueLong |  |  |
| `edg_e1a2` | `nod_laneBusy` | `nod_laneOpen` | on:evt_queueNormal |  |  |
| `edg_e1a3` | `nod_laneOpen` | `nod_laneAlarm` | on:evt_screeningAlarm |  |  |
| `edg_e1a4` | `nod_laneBusy` | `nod_laneAlarm` | on:evt_screeningAlarm |  |  |
| `edg_e1a5` | `nod_laneAlarm` | `nod_laneOpen` | done:true |  |  |
| `edg_e1a6` | `nod_laneOpen` | `nod_lanePaused` | on:evt_laneBreak |  |  |
| `edg_e1a7` | `nod_lanePaused` | `nod_laneOpen` | after:tmr_break |  |  |
| `edg_e1a8` | `nod_laneOpen` | `nod_laneClosed` | on:evt_laneClosed |  |  |

### `cnv_standLifecycle` "Stand lifecycle"

machine · transitions complete · subject stand.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_et0` | `nod_standStart` | `nod_standFree` | (none) |  |  |
| `edg_et1` | `nod_standFree` | `nod_standPlanned` | on:evt_standAllocated |  |  |
| `edg_et2` | `nod_standPlanned` | `nod_standFree` | on:evt_standDeallocated |  |  |
| `edg_et3` | `nod_standPlanned` | `nod_standOccupied` | on:evt_aircraftOnBlock |  |  |
| `edg_et4` | `nod_standOccupied` | `nod_standClearing` | on:evt_aircraftOffBlock |  |  |
| `edg_et5` | `nod_standClearing` | `nod_standFree` | on:evt_standInspected |  |  |
| `edg_et6` | `nod_standAny` | `nod_standBlocked` | on:evt_standOutOfService |  |  |
| `edg_et7` | `nod_standBlocked` | `nod_standFree` | on:evt_standReturned |  |  |

### `cnv_standPlan` "Stands and gates"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_en2` | `nod_standPlanner` | `nod_standAllocator` | command | ept_allocateAStand |
| `edg_en3` | `nod_standAllocator` | `nod_apron1` | command |  |
| `edg_en4` | `nod_apron1` | `nod_stand101` | data |  |
| `edg_en5` | `nod_gateA1` | `nod_stand101` | command |  |
| `edg_en6` | `nod_apron1` | `nod_stand102` | data |  |
| `edg_en7` | `nod_gateA2` | `nod_stand102` | command |  |
| `edg_en8` | `nod_apron1` | `nod_stand103` | data |  |
| `edg_en9` | `nod_apron1` | `nod_stand104` | data |  |
| `edg_ena` | `nod_gateA4` | `nod_stand104` | command |  |
| `edg_enb` | `nod_apron1` | `nod_stand105` | data |  |
| `edg_enc` | `nod_gateA5` | `nod_stand105` | command |  |
| `edg_end` | `nod_apron1` | `nod_stand106` | data |  |
| `edg_ene` | `nod_apron1` | `nod_stand107` | data |  |
| `edg_enf` | `nod_gateA7` | `nod_stand107` | command |  |
| `edg_eng` | `nod_apron1` | `nod_stand108` | data |  |
| `edg_enh` | `nod_gateA8` | `nod_stand108` | command |  |
| `edg_eni` | `nod_apron1` | `nod_stand109` | data |  |
| `edg_enj` | `nod_apron1` | `nod_stand110` | data |  |
| `edg_enk` | `nod_gateA10` | `nod_stand110` | command |  |
| `edg_enl` | `nod_apron1` | `nod_stand111` | data |  |
| `edg_enm` | `nod_gateA11` | `nod_stand111` | command |  |
| `edg_enn` | `nod_apron1` | `nod_stand112` | data |  |
| `edg_eno` | `nod_apron1` | `nod_stand113` | data |  |
| `edg_enp` | `nod_gateA13` | `nod_stand113` | command |  |
| `edg_enq` | `nod_apron1` | `nod_stand114` | data |  |
| `edg_enr` | `nod_gateA14` | `nod_stand114` | command |  |
| `edg_ens` | `nod_apron1` | `nod_stand115` | data |  |
| `edg_ent` | `nod_apron1` | `nod_stand116` | data |  |
| `edg_enu` | `nod_gateA16` | `nod_stand116` | command |  |
| `edg_env` | `nod_apron1` | `nod_stand117` | data |  |
| `edg_enw` | `nod_gateA17` | `nod_stand117` | command |  |
| `edg_enx` | `nod_apron1` | `nod_stand118` | data |  |
| `edg_eny` | `nod_apron1` | `nod_stand119` | data |  |
| `edg_enz` | `nod_gateA19` | `nod_stand119` | command |  |
| `edg_eo0` | `nod_apron1` | `nod_stand120` | data |  |
| `edg_eo1` | `nod_gateA20` | `nod_stand120` | command |  |
| `edg_eo2` | `nod_apron1` | `nod_stand121` | data |  |
| `edg_eo3` | `nod_apron1` | `nod_stand122` | data |  |
| `edg_eo4` | `nod_gateA22` | `nod_stand122` | command |  |
| `edg_eo5` | `nod_apron1` | `nod_stand123` | data |  |
| `edg_eo6` | `nod_gateA23` | `nod_stand123` | command |  |
| `edg_eo7` | `nod_apron1` | `nod_stand124` | data |  |
| `edg_eo8` | `nod_standAllocator` | `nod_apron2` | command |  |
| `edg_eo9` | `nod_apron2` | `nod_stand201` | data |  |
| `edg_eoa` | `nod_gateB1` | `nod_stand201` | command |  |
| `edg_eob` | `nod_apron2` | `nod_stand202` | data |  |
| `edg_eoc` | `nod_gateB2` | `nod_stand202` | command |  |
| `edg_eod` | `nod_apron2` | `nod_stand203` | data |  |
| `edg_eoe` | `nod_apron2` | `nod_stand204` | data |  |
| `edg_eof` | `nod_gateB4` | `nod_stand204` | command |  |
| `edg_eog` | `nod_apron2` | `nod_stand205` | data |  |
| `edg_eoh` | `nod_gateB5` | `nod_stand205` | command |  |
| `edg_eoi` | `nod_apron2` | `nod_stand206` | data |  |
| `edg_eoj` | `nod_apron2` | `nod_stand207` | data |  |
| `edg_eok` | `nod_gateB7` | `nod_stand207` | command |  |
| `edg_eol` | `nod_apron2` | `nod_stand208` | data |  |
| `edg_eom` | `nod_gateB8` | `nod_stand208` | command |  |
| `edg_eon` | `nod_apron2` | `nod_stand209` | data |  |
| `edg_eoo` | `nod_apron2` | `nod_stand210` | data |  |
| `edg_eop` | `nod_gateB10` | `nod_stand210` | command |  |
| `edg_eoq` | `nod_apron2` | `nod_stand211` | data |  |
| `edg_eor` | `nod_gateB11` | `nod_stand211` | command |  |
| `edg_eos` | `nod_apron2` | `nod_stand212` | data |  |
| `edg_eot` | `nod_apron2` | `nod_stand213` | data |  |
| `edg_eou` | `nod_gateB13` | `nod_stand213` | command |  |
| `edg_eov` | `nod_apron2` | `nod_stand214` | data |  |
| `edg_eow` | `nod_gateB14` | `nod_stand214` | command |  |
| `edg_eox` | `nod_apron2` | `nod_stand215` | data |  |
| `edg_eoy` | `nod_apron2` | `nod_stand216` | data |  |
| `edg_eoz` | `nod_gateB16` | `nod_stand216` | command |  |
| `edg_ep0` | `nod_apron2` | `nod_stand217` | data |  |
| `edg_ep1` | `nod_gateB17` | `nod_stand217` | command |  |
| `edg_ep2` | `nod_apron2` | `nod_stand218` | data |  |
| `edg_ep3` | `nod_apron2` | `nod_stand219` | data |  |
| `edg_ep4` | `nod_gateB19` | `nod_stand219` | command |  |
| `edg_ep5` | `nod_apron2` | `nod_stand220` | data |  |
| `edg_ep6` | `nod_gateB20` | `nod_stand220` | command |  |
| `edg_ep7` | `nod_apron2` | `nod_stand221` | data |  |
| `edg_ep8` | `nod_apron2` | `nod_stand222` | data |  |
| `edg_ep9` | `nod_gateB22` | `nod_stand222` | command |  |
| `edg_epa` | `nod_apron2` | `nod_stand223` | data |  |
| `edg_epb` | `nod_gateB23` | `nod_stand223` | command |  |
| `edg_epc` | `nod_apron2` | `nod_stand224` | data |  |
| `edg_epd` | `nod_standAllocator` | `nod_apron3` | command |  |
| `edg_epe` | `nod_apron3` | `nod_stand301` | data |  |
| `edg_epf` | `nod_gateC1` | `nod_stand301` | command |  |
| `edg_epg` | `nod_apron3` | `nod_stand302` | data |  |
| `edg_eph` | `nod_gateC2` | `nod_stand302` | command |  |
| `edg_epi` | `nod_apron3` | `nod_stand303` | data |  |
| `edg_epj` | `nod_apron3` | `nod_stand304` | data |  |
| `edg_epk` | `nod_gateC4` | `nod_stand304` | command |  |
| `edg_epl` | `nod_apron3` | `nod_stand305` | data |  |
| `edg_epm` | `nod_gateC5` | `nod_stand305` | command |  |
| `edg_epn` | `nod_apron3` | `nod_stand306` | data |  |
| `edg_epo` | `nod_apron3` | `nod_stand307` | data |  |
| `edg_epp` | `nod_gateC7` | `nod_stand307` | command |  |
| `edg_epq` | `nod_apron3` | `nod_stand308` | data |  |
| `edg_epr` | `nod_gateC8` | `nod_stand308` | command |  |
| `edg_eps` | `nod_apron3` | `nod_stand309` | data |  |
| `edg_ept` | `nod_apron3` | `nod_stand310` | data |  |
| `edg_epu` | `nod_gateC10` | `nod_stand310` | command |  |
| `edg_epv` | `nod_apron3` | `nod_stand311` | data |  |
| `edg_epw` | `nod_gateC11` | `nod_stand311` | command |  |
| `edg_epx` | `nod_apron3` | `nod_stand312` | data |  |
| `edg_epy` | `nod_apron3` | `nod_stand313` | data |  |
| `edg_epz` | `nod_gateC13` | `nod_stand313` | command |  |
| `edg_eq0` | `nod_apron3` | `nod_stand314` | data |  |
| `edg_eq1` | `nod_gateC14` | `nod_stand314` | command |  |
| `edg_eq2` | `nod_apron3` | `nod_stand315` | data |  |
| `edg_eq3` | `nod_apron3` | `nod_stand316` | data |  |
| `edg_eq4` | `nod_gateC16` | `nod_stand316` | command |  |
| `edg_eq5` | `nod_apron3` | `nod_stand317` | data |  |
| `edg_eq6` | `nod_gateC17` | `nod_stand317` | command |  |
| `edg_eq7` | `nod_apron3` | `nod_stand318` | data |  |
| `edg_eq8` | `nod_apron3` | `nod_stand319` | data |  |
| `edg_eq9` | `nod_gateC19` | `nod_stand319` | command |  |
| `edg_eqa` | `nod_apron3` | `nod_stand320` | data |  |
| `edg_eqb` | `nod_gateC20` | `nod_stand320` | command |  |
| `edg_eqc` | `nod_apron3` | `nod_stand321` | data |  |
| `edg_eqd` | `nod_apron3` | `nod_stand322` | data |  |
| `edg_eqe` | `nod_gateC22` | `nod_stand322` | command |  |
| `edg_eqf` | `nod_apron3` | `nod_stand323` | data |  |
| `edg_eqg` | `nod_gateC23` | `nod_stand323` | command |  |
| `edg_eqh` | `nod_apron3` | `nod_stand324` | data |  |
| `edg_eqi` | `nod_standAllocator` | `nod_apron4` | command |  |
| `edg_eqj` | `nod_apron4` | `nod_stand401` | data |  |
| `edg_eqk` | `nod_gateD1` | `nod_stand401` | command |  |
| `edg_eql` | `nod_apron4` | `nod_stand402` | data |  |
| `edg_eqm` | `nod_gateD2` | `nod_stand402` | command |  |
| `edg_eqn` | `nod_apron4` | `nod_stand403` | data |  |
| `edg_eqo` | `nod_apron4` | `nod_stand404` | data |  |
| `edg_eqp` | `nod_gateD4` | `nod_stand404` | command |  |
| `edg_eqq` | `nod_apron4` | `nod_stand405` | data |  |
| `edg_eqr` | `nod_gateD5` | `nod_stand405` | command |  |
| `edg_eqs` | `nod_apron4` | `nod_stand406` | data |  |
| `edg_eqt` | `nod_apron4` | `nod_stand407` | data |  |
| `edg_equ` | `nod_gateD7` | `nod_stand407` | command |  |
| `edg_eqv` | `nod_apron4` | `nod_stand408` | data |  |
| `edg_eqw` | `nod_gateD8` | `nod_stand408` | command |  |
| `edg_eqx` | `nod_apron4` | `nod_stand409` | data |  |
| `edg_eqy` | `nod_apron4` | `nod_stand410` | data |  |
| `edg_eqz` | `nod_gateD10` | `nod_stand410` | command |  |
| `edg_er0` | `nod_apron4` | `nod_stand411` | data |  |
| `edg_er1` | `nod_gateD11` | `nod_stand411` | command |  |
| `edg_er2` | `nod_apron4` | `nod_stand412` | data |  |
| `edg_er3` | `nod_apron4` | `nod_stand413` | data |  |
| `edg_er4` | `nod_gateD13` | `nod_stand413` | command |  |
| `edg_er5` | `nod_apron4` | `nod_stand414` | data |  |
| `edg_er6` | `nod_gateD14` | `nod_stand414` | command |  |
| `edg_er7` | `nod_apron4` | `nod_stand415` | data |  |
| `edg_er8` | `nod_apron4` | `nod_stand416` | data |  |
| `edg_er9` | `nod_gateD16` | `nod_stand416` | command |  |
| `edg_era` | `nod_apron4` | `nod_stand417` | data |  |
| `edg_erb` | `nod_gateD17` | `nod_stand417` | command |  |
| `edg_erc` | `nod_apron4` | `nod_stand418` | data |  |
| `edg_erd` | `nod_apron4` | `nod_stand419` | data |  |
| `edg_ere` | `nod_gateD19` | `nod_stand419` | command |  |
| `edg_erf` | `nod_apron4` | `nod_stand420` | data |  |
| `edg_erg` | `nod_gateD20` | `nod_stand420` | command |  |
| `edg_erh` | `nod_apron4` | `nod_stand421` | data |  |
| `edg_eri` | `nod_apron4` | `nod_stand422` | data |  |
| `edg_erj` | `nod_gateD22` | `nod_stand422` | command |  |
| `edg_erk` | `nod_apron4` | `nod_stand423` | data |  |
| `edg_erl` | `nod_gateD23` | `nod_stand423` | command |  |
| `edg_erm` | `nod_apron4` | `nod_stand424` | data |  |
| `edg_ern` | `nod_standAllocator` | `nod_apron5` | command |  |
| `edg_ero` | `nod_apron5` | `nod_stand501` | data |  |
| `edg_erp` | `nod_apronBuses` | `nod_stand501` | command |  |
| `edg_erq` | `nod_apron5` | `nod_stand502` | data |  |
| `edg_err` | `nod_apronBuses` | `nod_stand502` | command |  |
| `edg_ers` | `nod_apron5` | `nod_stand503` | data |  |
| `edg_ert` | `nod_apronBuses` | `nod_stand503` | command |  |
| `edg_eru` | `nod_apron5` | `nod_stand504` | data |  |
| `edg_erv` | `nod_apronBuses` | `nod_stand504` | command |  |
| `edg_erw` | `nod_apron5` | `nod_stand505` | data |  |
| `edg_erx` | `nod_apronBuses` | `nod_stand505` | command |  |
| `edg_ery` | `nod_apron5` | `nod_stand506` | data |  |
| `edg_erz` | `nod_apronBuses` | `nod_stand506` | command |  |
| `edg_es0` | `nod_apron5` | `nod_stand507` | data |  |
| `edg_es1` | `nod_apronBuses` | `nod_stand507` | command |  |
| `edg_es2` | `nod_apron5` | `nod_stand508` | data |  |
| `edg_es3` | `nod_apronBuses` | `nod_stand508` | command |  |
| `edg_es4` | `nod_apron5` | `nod_stand509` | data |  |
| `edg_es5` | `nod_apronBuses` | `nod_stand509` | command |  |
| `edg_es6` | `nod_apron5` | `nod_stand510` | data |  |
| `edg_es7` | `nod_apronBuses` | `nod_stand510` | command |  |
| `edg_es8` | `nod_apron5` | `nod_stand511` | data |  |
| `edg_es9` | `nod_apronBuses` | `nod_stand511` | command |  |
| `edg_esa` | `nod_apron5` | `nod_stand512` | data |  |
| `edg_esb` | `nod_apronBuses` | `nod_stand512` | command |  |
| `edg_esc` | `nod_apron5` | `nod_stand513` | data |  |
| `edg_esd` | `nod_apronBuses` | `nod_stand513` | command |  |
| `edg_ese` | `nod_apron5` | `nod_stand514` | data |  |
| `edg_esf` | `nod_apronBuses` | `nod_stand514` | command |  |
| `edg_esg` | `nod_apron5` | `nod_stand515` | data |  |
| `edg_esh` | `nod_apronBuses` | `nod_stand515` | command |  |
| `edg_esi` | `nod_apron5` | `nod_stand516` | data |  |
| `edg_esj` | `nod_apronBuses` | `nod_stand516` | command |  |
| `edg_esk` | `nod_apron5` | `nod_stand517` | data |  |
| `edg_esl` | `nod_apronBuses` | `nod_stand517` | command |  |
| `edg_esm` | `nod_apron5` | `nod_stand518` | data |  |
| `edg_esn` | `nod_apronBuses` | `nod_stand518` | command |  |
| `edg_eso` | `nod_apron5` | `nod_stand519` | data |  |
| `edg_esp` | `nod_apronBuses` | `nod_stand519` | command |  |
| `edg_esq` | `nod_apron5` | `nod_stand520` | data |  |
| `edg_esr` | `nod_apronBuses` | `nod_stand520` | command |  |
| `edg_ess` | `nod_apron5` | `nod_stand521` | data |  |
| `edg_est` | `nod_apronBuses` | `nod_stand521` | command |  |
| `edg_esu` | `nod_apron5` | `nod_stand522` | data |  |
| `edg_esv` | `nod_apronBuses` | `nod_stand522` | command |  |
| `edg_esw` | `nod_apron5` | `nod_stand523` | data |  |
| `edg_esx` | `nod_apronBuses` | `nod_stand523` | command |  |
| `edg_esy` | `nod_apron5` | `nod_stand524` | data |  |
| `edg_esz` | `nod_apronBuses` | `nod_stand524` | command |  |

### `cnv_turnaroundMilestones` "Turnaround milestones"

machine · transitions complete · subject turnaround.milestones

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e3c` | `nod_passengersRegionStart` | `nod_passengersRegionDeboarding` | (none) |  | action:act_runTheTurnaround |
| `edg_e3d` | `nod_passengersRegionDeboarding` | `nod_passengersRegionCabinEmpty` | on:evt_deboardingCompleted |  |  |
| `edg_e3e` | `nod_passengersRegionCabinEmpty` | `nod_passengersRegionCabinReady` | on:evt_cabinReady |  |  |
| `edg_e3f` | `nod_bagsRegionStart` | `nod_bagsRegionOffloadingBags` | (none) |  |  |
| `edg_e3g` | `nod_bagsRegionOffloadingBags` | `nod_bagsRegionHoldsEmpty` | on:evt_offloadCompleted |  |  |
| `edg_e3h` | `nod_bagsRegionHoldsEmpty` | `nod_bagsRegionLoadingBags` | on:evt_loadingStarted |  |  |
| `edg_e3i` | `nod_bagsRegionLoadingBags` | `nod_bagsRegionHoldsClosed` | on:evt_holdsClosed |  |  |
| `edg_e3j` | `nod_fuelRegionStart` | `nod_fuelRegionAwaitingFuel` | (none) |  |  |
| `edg_e3k` | `nod_fuelRegionAwaitingFuel` | `nod_fuelRegionFuelling` | on:evt_fuelStarted |  |  |
| `edg_e3l` | `nod_fuelRegionFuelling` | `nod_fuelRegionFuelled` | on:evt_fuelCompleted |  |  |
| `edg_e3m` | `nod_cateringRegionStart` | `nod_cateringRegionCateringArrived` | (none) |  |  |
| `edg_e3n` | `nod_cateringRegionCateringArrived` | `nod_cateringRegionCatered` | on:evt_cateringCompleted |  |  |
| `edg_e3o` | `nod_cleaningRegionStart` | `nod_cleaningRegionCleaningCabin` | (none) |  |  |
| `edg_e3p` | `nod_cleaningRegionCleaningCabin` | `nod_cleaningRegionCleaned` | on:evt_cleaningCompleted |  |  |
| `edg_e3q` | `nod_groundRegionStart` | `nod_groundRegionGpuConnected` | (none) |  |  |
| `edg_e3r` | `nod_groundRegionGpuConnected` | `nod_groundRegionWaterServiced` | on:evt_waterCompleted |  |  |
| `edg_e3s` | `nod_groundRegionWaterServiced` | `nod_groundRegionGpuDisconnected` | on:evt_gpuDisconnected |  |  |

### `cnv_turnaroundProcedure` "Turnaround procedure"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_e1dh` | `nod_procStart` | `nod_onBlockChocks` |  |  |
| `edg_e1di` | `nod_onBlockChocks` | `nod_teams` |  |  |
| `edg_e1dj` | `nod_teams` | `nod_procDeboard` |  |  |
| `edg_e1dk` | `nod_teams` | `nod_procCater` |  |  |
| `edg_e1dl` | `nod_teams` | `nod_procOffload` |  |  |
| `edg_e1dm` | `nod_teams` | `nod_procFuel` |  |  |
| `edg_e1dn` | `nod_procDeboard` | `nod_procClean` |  |  |
| `edg_e1do` | `nod_procOffload` | `nod_procLoad` |  |  |
| `edg_e1dp` | `nod_procClean` | `nod_teamsDone` |  |  |
| `edg_e1dq` | `nod_procCater` | `nod_teamsDone` |  |  |
| `edg_e1dr` | `nod_procLoad` | `nod_teamsDone` |  |  |
| `edg_e1ds` | `nod_procFuel` | `nod_teamsDone` |  |  |
| `edg_e1dt` | `nod_teamsDone` | `nod_procDone` |  |  |
| `edg_e1du` | `nod_procDone` | `nod_procEnd` |  |  |

### `cnv_workOrder` "Work order"

machine · transitions complete · subject workOrder.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_e1cm` | `nod_workStart` | `nod_raised` | (none) |  |  |
| `edg_e1cn` | `nod_raised` | `nod_triaged` | on:evt_workTriaged |  |  |
| `edg_e1co` | `nod_raised` | `nod_workRejected` | on:evt_workRejected |  |  |
| `edg_e1cp` | `nod_triaged` | `nod_inProgress` | on:evt_workStarted |  |  |
| `edg_e1cq` | `nod_inProgress` | `nod_awaitingParts` | on:evt_workPartsNeeded |  |  |
| `edg_e1cr` | `nod_awaitingParts` | `nod_inProgress` | on:evt_workPartsArrived |  |  |
| `edg_e1cs` | `nod_inProgress` | `nod_workDone` | on:evt_workCompleted |  | emit:evt_standReturned |

## Findings

| ID | Code | Severity | Targets | Title | Source |
| --- | --- | --- | --- | --- | --- |
| `fnd_legacyFeed` | L1 | medium | `nod_legacyFeed` `nod_wayfinding` | Wayfinding still polls the old displays feed | audit |
| `fnd_noShowWindow` | B2 | low | `nod_offloadedBag` | No-shows' bags wait two hours before they count as mishandled | audit |

## Scenarios

### `scn_aBagFromTheDropToTheHold` "A bag from the drop to the hold" on `cnv_bagLifecycle`

start 2026-10-01T06:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_bagInducted` |  | `nod_inSystem` |
| 2 | `event:evt_bagScreened` | `choice@nod_screenResult="edg_eml"` | `nod_levelThree` |
| 3 | `event:evt_bagSorted` |  | `nod_levelThree` |
| 4 | `event:evt_bagLoaded` |  | `nod_levelThree` |
| 5 | `event:evt_aircraftAirborne` |  | `nod_levelThree` |

### `scn_aDelayThenANewSlot` "A delay, then a new slot" on `cnv_flightLifecycle`

start 2026-10-01T06:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_ctotIssued` |  | `nod_slotConfirmed` |
| 2 | `event:evt_standAllocated` |  | `nod_standAllocated` |
| 3 | `wait:next` |  | `nod_checkInOpen` |
| 4 | `event:evt_flightDelayed` |  | `nod_delayedFlight` |
| 5 | `event:evt_ctotRevised` |  | `nod_slotConfirmed` |

### `scn_aDepartureOnTime` "A departure on time" on `cnv_flightLifecycle`

start 2026-10-01T06:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_ctotIssued` |  | `nod_slotConfirmed` |
| 2 | `event:evt_standAllocated` |  | `nod_standAllocated` |
| 3 | `wait:next` |  | `nod_checkInOpen` |
| 4 | `wait:next` |  | `nod_checkInClosed` |
| 5 | `event:evt_boardingStarted` |  | `nod_boardingFlight/nod_priorityBoarding` |
| 6 | `event:evt_doorsClosed` | `choice@nod_icingChoice="edg_e2b"` | `nod_readyForPushback` |
| 7 | `event:evt_aircraftOffBlock` |  | `nod_pushedBack` |
| 8 | `event:evt_taxiStarted` |  | `nod_taxiingOut` |
| 9 | `event:evt_aircraftAirborne` |  | `nod_airborneFlight/nod_initialClimb` |

### `scn_aLaneInAlarm` "A lane in alarm" on `cnv_securityLane`

start 2026-10-01T06:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_laneStaffed` |  | `nod_laneOpening` |
| 2 | `event:evt_laneSelfTested` |  | `nod_laneOpen` |
| 3 | `event:evt_screeningAlarm` |  | `nod_laneAlarm/nod_trayHeld` |
| 4 | `event:evt_searchStarted` |  | `nod_laneAlarm/nod_searching` |
| 5 | `event:evt_searchClear` |  | `nod_laneOpen` |

### `scn_aStandSDay` "A stand's day" on `cnv_standLifecycle`

start 2026-10-01T06:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_standAllocated` |  | `nod_standPlanned` |
| 2 | `event:evt_aircraftOnBlock` |  | `nod_standOccupied` |
| 3 | `event:evt_aircraftOffBlock` |  | `nod_standClearing` |
| 4 | `event:evt_standInspected` |  | `nod_standFree` |

### `scn_theAirlineCancels` "The airline cancels" on `cnv_flightLifecycle`

start 2026-10-01T06:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_ctotIssued` |  | `nod_slotConfirmed` |
| 2 | `event:evt_standAllocated` |  | `nod_standAllocated` |
| 3 | `event:evt_flightCancelled` |  | `nod_cancelledFlight` ended done |

## Problems

| Severity | Code | Target | Message |
| --- | --- | --- | --- |
| warning | `canvas.dense` | `cnv_airfieldSurface` | system canvas "Airfield surface" has 120 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_airportOperations` | system canvas "Airport operations" has 45 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_bagLifecycle` | machine canvas "Bag lifecycle" has 18 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_beltNetwork` | system canvas "Belt network" has 524 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_boardingProcedure` | flow canvas "Boarding procedure" has 15 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_deIcingProcedure` | flow canvas "De-icing" has 14 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_emergencyDesk` | mixed canvas "Emergency desk" has 14 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_flightLifecycle` | machine canvas "Flight lifecycle" has 25 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_hallAlevel` | system canvas "Terminal A hall" has 91 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_hallBlevel` | system canvas "Terminal B hall" has 91 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_hallClevel` | system canvas "Terminal C hall" has 91 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_hallDlevel` | system canvas "Terminal D hall" has 91 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_passengerJourney` | machine canvas "Passenger journey" has 13 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_screeningHalls` | system canvas "Screening halls" has 196 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_standPlan` | system canvas "Stands and gates" has 192 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_turnaroundMilestones` | machine canvas "Turnaround milestones" has 23 nodes; consider moving detail into nested levels |
| warning | `canvas.dense` | `cnv_turnaroundProcedure` | flow canvas "Turnaround procedure" has 13 nodes; consider moving detail into nested levels |
| incomplete | `spec.unspecified` | `ept_acceptABag` | endpoint "Accept a bag" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_alertTheHospitals` | endpoint "Alert the hospitals" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_allocateAStand` | endpoint "Allocate a stand" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_announce` | endpoint "Announce" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_boardingList` | endpoint "Boarding list" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_chargeAnOperator` | endpoint "Charge an operator" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_checkAPassengerIn` | endpoint "Check a passenger in" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_checkATraveller` | endpoint "Check a traveller" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_directions` | endpoint "Directions" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_findBags` | endpoint "Find bags" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_fuelReceipt` | endpoint "Fuel receipt" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_movements` | endpoint "Movements" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_publishASchedule` | endpoint "Publish a schedule" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_readAFlight` | endpoint "Read a flight" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_recordABoarding` | endpoint "Record a boarding" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_recordAMilestone` | endpoint "Record a milestone" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_sendAPush` | endpoint "Send a push" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_visaRecord` | endpoint "Visa record" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_weather` | endpoint "Weather" does not specify request, responses |
| incomplete | `spec.unspecified` | `evt_aircraftAccident` | event "aircraft.accident" does not specify payload |
| incomplete | `spec.unspecified` | `evt_aircraftAirborne` | event "aircraft.airborne" does not specify payload |
| incomplete | `spec.unspecified` | `evt_aircraftLanded` | event "aircraft.landed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_aircraftLandedSafely` | event "aircraft.landedSafely" does not specify payload |
| incomplete | `spec.unspecified` | `evt_aircraftOffBlock` | event "aircraft.offBlock" does not specify payload |
| incomplete | `spec.unspecified` | `evt_aircraftOnBlock` | event "aircraft.onBlock" does not specify payload |
| incomplete | `spec.unspecified` | `evt_aircraftReturning` | event "aircraft.returning" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagCleared` | event "bag.cleared" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagDropped` | event "bag.dropped" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagEarly` | event "bag.early" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagEncoded` | event "bag.encoded" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagInducted` | event "bag.inducted" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagJam` | event "bag.jam" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagLoaded` | event "bag.loaded" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagMoved` | event "bag.moved" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagNoRead` | event "bag.noRead" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagProcessed` | event "bag.processed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagReflighted` | event "bag.reflighted" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagRejected` | event "bag.rejected" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagReleased` | event "bag.released" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagRush` | event "bag.rush" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagScreened` | event "bag.screened" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagSorted` | event "bag.sorted" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagSourceMessage` | event "bag.sourceMessage" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagTransferMessage` | event "bag.transferMessage" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagTransferred` | event "bag.transferred" does not specify payload |
| incomplete | `spec.unspecified` | `evt_bagsOffloaded` | event "bags.offloaded" does not specify payload |
| incomplete | `spec.unspecified` | `evt_boardingDenied` | event "boarding.denied" does not specify payload |
| incomplete | `spec.unspecified` | `evt_boardingFinalCall` | event "boarding.finalCall" does not specify payload |
| incomplete | `spec.unspecified` | `evt_boardingGeneral` | event "boarding.general" does not specify payload |
| incomplete | `spec.unspecified` | `evt_boardingResumed` | event "boarding.resumed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_boardingStarted` | event "boarding.started" does not specify payload |
| incomplete | `spec.unspecified` | `evt_boardingSuspended` | event "boarding.suspended" does not specify payload |
| incomplete | `spec.unspecified` | `evt_borderCleared` | event "border.cleared" does not specify payload |
| incomplete | `spec.unspecified` | `evt_cabinReady` | event "cabin.ready" does not specify payload |
| incomplete | `spec.unspecified` | `evt_cateringCompleted` | event "catering.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_chargeFailed` | event "charge.failed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_chargeSucceeded` | event "charge.succeeded" does not specify payload |
| incomplete | `spec.unspecified` | `evt_cleaningCompleted` | event "cleaning.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_ctotIssued` | event "ctot.issued" does not specify payload |
| incomplete | `spec.unspecified` | `evt_ctotRevised` | event "ctot.revised" does not specify payload |
| incomplete | `spec.unspecified` | `evt_deboardingCompleted` | event "deboarding.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_deicingCompleted` | event "deicing.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_deicingPadAssigned` | event "deicing.padAssigned" does not specify payload |
| incomplete | `spec.unspecified` | `evt_deicingRequested` | event "deicing.requested" does not specify payload |
| incomplete | `spec.unspecified` | `evt_disruptionLocal` | event "disruption.local" does not specify payload |
| incomplete | `spec.unspecified` | `evt_disruptionMajor` | event "disruption.major" does not specify payload |
| incomplete | `spec.unspecified` | `evt_disruptionReported` | event "disruption.reported" does not specify payload |
| incomplete | `spec.unspecified` | `evt_disruptionResolved` | event "disruption.resolved" does not specify payload |
| incomplete | `spec.unspecified` | `evt_doorsClosed` | event "doors.closed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_dpiSent` | event "dpi.sent" does not specify payload |
| incomplete | `spec.unspecified` | `evt_emergencyClosed` | event "emergency.closed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_emergencyDeclared` | event "emergency.declared" does not specify payload |
| incomplete | `spec.unspecified` | `evt_emergencyEscalated` | event "emergency.escalated" does not specify payload |
| incomplete | `spec.unspecified` | `evt_flightCancelled` | event "flight.cancelled" does not specify payload |
| incomplete | `spec.unspecified` | `evt_flightDelayed` | event "flight.delayed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_flightDiverted` | event "flight.diverted" does not specify payload |
| incomplete | `spec.unspecified` | `evt_flightUpdated` | event "flight.updated" does not specify payload |
| incomplete | `spec.unspecified` | `evt_flowMeasure` | event "flow.measure" does not specify payload |
| incomplete | `spec.unspecified` | `evt_fuelCompleted` | event "fuel.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_fuelOrdered` | event "fuel.ordered" does not specify payload |
| incomplete | `spec.unspecified` | `evt_fuelStarted` | event "fuel.started" does not specify payload |
| incomplete | `spec.unspecified` | `evt_fuelTruckAssigned` | event "fuel.truckAssigned" does not specify payload |
| incomplete | `spec.unspecified` | `evt_gateChanged` | event "gate.changed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_gateClosed` | event "gate.closed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_gpuDisconnected` | event "gpu.disconnected" does not specify payload |
| incomplete | `spec.unspecified` | `evt_handoffAccepted` | event "handoff.accepted" does not specify payload |
| incomplete | `spec.unspecified` | `evt_holdInstructed` | event "hold.instructed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_holdReleased` | event "hold.released" does not specify payload |
| incomplete | `spec.unspecified` | `evt_holdsClosed` | event "holds.closed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_itemCollected` | event "item.collected" does not specify payload |
| incomplete | `spec.unspecified` | `evt_itemMatched` | event "item.matched" does not specify payload |
| incomplete | `spec.unspecified` | `evt_laneBreak` | event "lane.break" does not specify payload |
| incomplete | `spec.unspecified` | `evt_laneClosed` | event "lane.closed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_laneSelfTested` | event "lane.selfTested" does not specify payload |
| incomplete | `spec.unspecified` | `evt_laneStaffed` | event "lane.staffed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_loadingStarted` | event "loading.started" does not specify payload |
| incomplete | `spec.unspecified` | `evt_loadsheetAccepted` | event "loadsheet.accepted" does not specify payload |
| incomplete | `spec.unspecified` | `evt_offloadCompleted` | event "offload.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_passengerAtGate` | event "passenger.atGate" does not specify payload |
| incomplete | `spec.unspecified` | `evt_passengerBoarded` | event "passenger.boarded" does not specify payload |
| incomplete | `spec.unspecified` | `evt_passengerCheckedIn` | event "passenger.checkedIn" does not specify payload |
| incomplete | `spec.unspecified` | `evt_passengerNotified` | event "passenger.notified" does not specify payload |
| incomplete | `spec.unspecified` | `evt_passengerScreened` | event "passenger.screened" does not specify payload |
| incomplete | `spec.unspecified` | `evt_queueLong` | event "queue.long" does not specify payload |
| incomplete | `spec.unspecified` | `evt_queueNormal` | event "queue.normal" does not specify payload |
| incomplete | `spec.unspecified` | `evt_routeJoined` | event "route.joined" does not specify payload |
| incomplete | `spec.unspecified` | `evt_screeningAlarm` | event "screening.alarm" does not specify payload |
| incomplete | `spec.unspecified` | `evt_searchClear` | event "search.clear" does not specify payload |
| incomplete | `spec.unspecified` | `evt_searchStarted` | event "search.started" does not specify payload |
| incomplete | `spec.unspecified` | `evt_searchSuspicious` | event "search.suspicious" does not specify payload |
| incomplete | `spec.unspecified` | `evt_standAllocated` | event "stand.allocated" does not specify payload |
| incomplete | `spec.unspecified` | `evt_standDeallocated` | event "stand.deallocated" does not specify payload |
| incomplete | `spec.unspecified` | `evt_standInspected` | event "stand.inspected" does not specify payload |
| incomplete | `spec.unspecified` | `evt_standOutOfService` | event "stand.outOfService" does not specify payload |
| incomplete | `spec.unspecified` | `evt_standReturned` | event "stand.returned" does not specify payload |
| incomplete | `spec.unspecified` | `evt_stayExited` | event "stay.exited" does not specify payload |
| incomplete | `spec.unspecified` | `evt_stayPaid` | event "stay.paid" does not specify payload |
| incomplete | `spec.unspecified` | `evt_taxiStarted` | event "taxi.started" does not specify payload |
| incomplete | `spec.unspecified` | `evt_traceNegative` | event "trace.negative" does not specify payload |
| incomplete | `spec.unspecified` | `evt_tracePositive` | event "trace.positive" does not specify payload |
| incomplete | `spec.unspecified` | `evt_turnaroundCompleted` | event "turnaround.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_waterCompleted` | event "water.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_weatherObservation` | event "weather.observation" does not specify payload |
| incomplete | `spec.unspecified` | `evt_weatherWarning` | event "weather.warning" does not specify payload |
| incomplete | `spec.unspecified` | `evt_workCompleted` | event "work.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_workPartsArrived` | event "work.partsArrived" does not specify payload |
| incomplete | `spec.unspecified` | `evt_workPartsNeeded` | event "work.partsNeeded" does not specify payload |
| incomplete | `spec.unspecified` | `evt_workRejected` | event "work.rejected" does not specify payload |
| incomplete | `spec.unspecified` | `evt_workStarted` | event "work.started" does not specify payload |
| incomplete | `spec.unspecified` | `evt_workTriaged` | event "work.triaged" does not specify payload |
| incomplete | `spec.unspecified` | `whk_cateringEvents` | webhook "Catering events" does not specify payload |
| incomplete | `spec.unspecified` | `whk_fuelTruckEvents` | webhook "Fuel truck events" does not specify payload |
| incomplete | `spec.unspecified` | `whk_paymentEvents` | webhook "Payment events" does not specify payload |
| incomplete | `confidence.low` | `nod_legacyFeed` | service "Old displays feed" has low confidence; verify it |
| incomplete | `confidence.low` | `nod_wayfinding` | service "Wayfinding" has low confidence; verify it |
| incomplete | `comment.open` | `cnv_standPlan` | system canvas "Stands and gates" has an open comment: "Remote stands need a bus plan per wave, not per flight." |
| incomplete | `comment.open` | `nod_edsD5` | service "EDS D5" has an open comment: "Until D5 and D6 exist, can terminal C's machines take D's peak?" |
| incomplete | `comment.open` | `nod_taxiingOut` | state "taxiing out" has an open comment: "Is 40 minutes at the holding point the right limit in winter, with de-icing queues?" |
