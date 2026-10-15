# Audit of Airport operations

0 errors, 17 warnings and 138 incomplete. 6 scenarios, none going elsewhere. The scenarios cover 12 % of the states, nodes and transitions.

## Problems

### Warning

| Code | Target | Level | Message |
| --- | --- | --- | --- |
| `canvas.dense` | `cnv_airfieldSurface` | `cnv_airfieldSurface` | system canvas "Airfield surface" has 120 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_airportOperations` | `cnv_airportOperations` | system canvas "Airport operations" has 45 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_bagLifecycle` | `cnv_bagLifecycle` | machine canvas "Bag lifecycle" has 18 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_beltNetwork` | `cnv_beltNetwork` | system canvas "Belt network" has 524 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_boardingProcedure` | `cnv_boardingProcedure` | flow canvas "Boarding procedure" has 15 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_deIcingProcedure` | `cnv_deIcingProcedure` | flow canvas "De-icing" has 14 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_emergencyDesk` | `cnv_emergencyDesk` | mixed canvas "Emergency desk" has 14 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_flightLifecycle` | `cnv_flightLifecycle` | machine canvas "Flight lifecycle" has 25 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_hallAlevel` | `cnv_hallAlevel` | system canvas "Terminal A hall" has 91 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_hallBlevel` | `cnv_hallBlevel` | system canvas "Terminal B hall" has 91 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_hallClevel` | `cnv_hallClevel` | system canvas "Terminal C hall" has 91 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_hallDlevel` | `cnv_hallDlevel` | system canvas "Terminal D hall" has 91 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_passengerJourney` | `cnv_passengerJourney` | machine canvas "Passenger journey" has 13 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_screeningHalls` | `cnv_screeningHalls` | system canvas "Screening halls" has 196 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_standPlan` | `cnv_standPlan` | system canvas "Stands and gates" has 192 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_turnaroundMilestones` | `cnv_turnaroundMilestones` | machine canvas "Turnaround milestones" has 23 nodes; consider moving detail into nested levels |
| `canvas.dense` | `cnv_turnaroundProcedure` | `cnv_turnaroundProcedure` | flow canvas "Turnaround procedure" has 13 nodes; consider moving detail into nested levels |

### Incomplete

| Code | Target | Level | Message |
| --- | --- | --- | --- |
| `spec.unspecified` | `ept_acceptABag` |  | endpoint "Accept a bag" does not specify request, responses |
| `spec.unspecified` | `ept_alertTheHospitals` |  | endpoint "Alert the hospitals" does not specify request, responses |
| `spec.unspecified` | `ept_allocateAStand` |  | endpoint "Allocate a stand" does not specify request, responses |
| `spec.unspecified` | `ept_announce` |  | endpoint "Announce" does not specify request, responses |
| `spec.unspecified` | `ept_boardingList` |  | endpoint "Boarding list" does not specify request, responses |
| `spec.unspecified` | `ept_chargeAnOperator` |  | endpoint "Charge an operator" does not specify request, responses |
| `spec.unspecified` | `ept_checkAPassengerIn` |  | endpoint "Check a passenger in" does not specify request, responses |
| `spec.unspecified` | `ept_checkATraveller` |  | endpoint "Check a traveller" does not specify request, responses |
| `spec.unspecified` | `ept_directions` |  | endpoint "Directions" does not specify request, responses |
| `spec.unspecified` | `ept_findBags` |  | endpoint "Find bags" does not specify request, responses |
| `spec.unspecified` | `ept_fuelReceipt` |  | endpoint "Fuel receipt" does not specify request, responses |
| `spec.unspecified` | `ept_movements` |  | endpoint "Movements" does not specify request, responses |
| `spec.unspecified` | `ept_publishASchedule` |  | endpoint "Publish a schedule" does not specify request, responses |
| `spec.unspecified` | `ept_readAFlight` |  | endpoint "Read a flight" does not specify request, responses |
| `spec.unspecified` | `ept_recordABoarding` |  | endpoint "Record a boarding" does not specify request, responses |
| `spec.unspecified` | `ept_recordAMilestone` |  | endpoint "Record a milestone" does not specify request, responses |
| `spec.unspecified` | `ept_sendAPush` |  | endpoint "Send a push" does not specify request, responses |
| `spec.unspecified` | `ept_visaRecord` |  | endpoint "Visa record" does not specify request, responses |
| `spec.unspecified` | `ept_weather` |  | endpoint "Weather" does not specify request, responses |
| `spec.unspecified` | `evt_aircraftAccident` |  | event "aircraft.accident" does not specify payload |
| `spec.unspecified` | `evt_aircraftAirborne` |  | event "aircraft.airborne" does not specify payload |
| `spec.unspecified` | `evt_aircraftLanded` |  | event "aircraft.landed" does not specify payload |
| `spec.unspecified` | `evt_aircraftLandedSafely` |  | event "aircraft.landedSafely" does not specify payload |
| `spec.unspecified` | `evt_aircraftOffBlock` |  | event "aircraft.offBlock" does not specify payload |
| `spec.unspecified` | `evt_aircraftOnBlock` |  | event "aircraft.onBlock" does not specify payload |
| `spec.unspecified` | `evt_aircraftReturning` |  | event "aircraft.returning" does not specify payload |
| `spec.unspecified` | `evt_bagCleared` |  | event "bag.cleared" does not specify payload |
| `spec.unspecified` | `evt_bagDropped` |  | event "bag.dropped" does not specify payload |
| `spec.unspecified` | `evt_bagEarly` |  | event "bag.early" does not specify payload |
| `spec.unspecified` | `evt_bagEncoded` |  | event "bag.encoded" does not specify payload |
| `spec.unspecified` | `evt_bagInducted` |  | event "bag.inducted" does not specify payload |
| `spec.unspecified` | `evt_bagJam` |  | event "bag.jam" does not specify payload |
| `spec.unspecified` | `evt_bagLoaded` |  | event "bag.loaded" does not specify payload |
| `spec.unspecified` | `evt_bagMoved` |  | event "bag.moved" does not specify payload |
| `spec.unspecified` | `evt_bagNoRead` |  | event "bag.noRead" does not specify payload |
| `spec.unspecified` | `evt_bagProcessed` |  | event "bag.processed" does not specify payload |
| `spec.unspecified` | `evt_bagReflighted` |  | event "bag.reflighted" does not specify payload |
| `spec.unspecified` | `evt_bagRejected` |  | event "bag.rejected" does not specify payload |
| `spec.unspecified` | `evt_bagReleased` |  | event "bag.released" does not specify payload |
| `spec.unspecified` | `evt_bagRush` |  | event "bag.rush" does not specify payload |
| `spec.unspecified` | `evt_bagScreened` |  | event "bag.screened" does not specify payload |
| `spec.unspecified` | `evt_bagSorted` |  | event "bag.sorted" does not specify payload |
| `spec.unspecified` | `evt_bagSourceMessage` |  | event "bag.sourceMessage" does not specify payload |
| `spec.unspecified` | `evt_bagTransferMessage` |  | event "bag.transferMessage" does not specify payload |
| `spec.unspecified` | `evt_bagTransferred` |  | event "bag.transferred" does not specify payload |
| `spec.unspecified` | `evt_bagsOffloaded` |  | event "bags.offloaded" does not specify payload |
| `spec.unspecified` | `evt_boardingDenied` |  | event "boarding.denied" does not specify payload |
| `spec.unspecified` | `evt_boardingFinalCall` |  | event "boarding.finalCall" does not specify payload |
| `spec.unspecified` | `evt_boardingGeneral` |  | event "boarding.general" does not specify payload |
| `spec.unspecified` | `evt_boardingResumed` |  | event "boarding.resumed" does not specify payload |
| `spec.unspecified` | `evt_boardingStarted` |  | event "boarding.started" does not specify payload |
| `spec.unspecified` | `evt_boardingSuspended` |  | event "boarding.suspended" does not specify payload |
| `spec.unspecified` | `evt_borderCleared` |  | event "border.cleared" does not specify payload |
| `spec.unspecified` | `evt_cabinReady` |  | event "cabin.ready" does not specify payload |
| `spec.unspecified` | `evt_cateringCompleted` |  | event "catering.completed" does not specify payload |
| `spec.unspecified` | `evt_chargeFailed` |  | event "charge.failed" does not specify payload |
| `spec.unspecified` | `evt_chargeSucceeded` |  | event "charge.succeeded" does not specify payload |
| `spec.unspecified` | `evt_cleaningCompleted` |  | event "cleaning.completed" does not specify payload |
| `spec.unspecified` | `evt_ctotIssued` |  | event "ctot.issued" does not specify payload |
| `spec.unspecified` | `evt_ctotRevised` |  | event "ctot.revised" does not specify payload |
| `spec.unspecified` | `evt_deboardingCompleted` |  | event "deboarding.completed" does not specify payload |
| `spec.unspecified` | `evt_deicingCompleted` |  | event "deicing.completed" does not specify payload |
| `spec.unspecified` | `evt_deicingPadAssigned` |  | event "deicing.padAssigned" does not specify payload |
| `spec.unspecified` | `evt_deicingRequested` |  | event "deicing.requested" does not specify payload |
| `spec.unspecified` | `evt_disruptionLocal` |  | event "disruption.local" does not specify payload |
| `spec.unspecified` | `evt_disruptionMajor` |  | event "disruption.major" does not specify payload |
| `spec.unspecified` | `evt_disruptionReported` |  | event "disruption.reported" does not specify payload |
| `spec.unspecified` | `evt_disruptionResolved` |  | event "disruption.resolved" does not specify payload |
| `spec.unspecified` | `evt_doorsClosed` |  | event "doors.closed" does not specify payload |
| `spec.unspecified` | `evt_dpiSent` |  | event "dpi.sent" does not specify payload |
| `spec.unspecified` | `evt_emergencyClosed` |  | event "emergency.closed" does not specify payload |
| `spec.unspecified` | `evt_emergencyDeclared` |  | event "emergency.declared" does not specify payload |
| `spec.unspecified` | `evt_emergencyEscalated` |  | event "emergency.escalated" does not specify payload |
| `spec.unspecified` | `evt_flightCancelled` |  | event "flight.cancelled" does not specify payload |
| `spec.unspecified` | `evt_flightDelayed` |  | event "flight.delayed" does not specify payload |
| `spec.unspecified` | `evt_flightDiverted` |  | event "flight.diverted" does not specify payload |
| `spec.unspecified` | `evt_flightUpdated` |  | event "flight.updated" does not specify payload |
| `spec.unspecified` | `evt_flowMeasure` |  | event "flow.measure" does not specify payload |
| `spec.unspecified` | `evt_fuelCompleted` |  | event "fuel.completed" does not specify payload |
| `spec.unspecified` | `evt_fuelOrdered` |  | event "fuel.ordered" does not specify payload |
| `spec.unspecified` | `evt_fuelStarted` |  | event "fuel.started" does not specify payload |
| `spec.unspecified` | `evt_fuelTruckAssigned` |  | event "fuel.truckAssigned" does not specify payload |
| `spec.unspecified` | `evt_gateChanged` |  | event "gate.changed" does not specify payload |
| `spec.unspecified` | `evt_gateClosed` |  | event "gate.closed" does not specify payload |
| `spec.unspecified` | `evt_gpuDisconnected` |  | event "gpu.disconnected" does not specify payload |
| `spec.unspecified` | `evt_handoffAccepted` |  | event "handoff.accepted" does not specify payload |
| `spec.unspecified` | `evt_holdInstructed` |  | event "hold.instructed" does not specify payload |
| `spec.unspecified` | `evt_holdReleased` |  | event "hold.released" does not specify payload |
| `spec.unspecified` | `evt_holdsClosed` |  | event "holds.closed" does not specify payload |
| `spec.unspecified` | `evt_itemCollected` |  | event "item.collected" does not specify payload |
| `spec.unspecified` | `evt_itemMatched` |  | event "item.matched" does not specify payload |
| `spec.unspecified` | `evt_laneBreak` |  | event "lane.break" does not specify payload |
| `spec.unspecified` | `evt_laneClosed` |  | event "lane.closed" does not specify payload |
| `spec.unspecified` | `evt_laneSelfTested` |  | event "lane.selfTested" does not specify payload |
| `spec.unspecified` | `evt_laneStaffed` |  | event "lane.staffed" does not specify payload |
| `spec.unspecified` | `evt_loadingStarted` |  | event "loading.started" does not specify payload |
| `spec.unspecified` | `evt_loadsheetAccepted` |  | event "loadsheet.accepted" does not specify payload |
| `spec.unspecified` | `evt_offloadCompleted` |  | event "offload.completed" does not specify payload |
| `spec.unspecified` | `evt_passengerAtGate` |  | event "passenger.atGate" does not specify payload |
| `spec.unspecified` | `evt_passengerBoarded` |  | event "passenger.boarded" does not specify payload |
| `spec.unspecified` | `evt_passengerCheckedIn` |  | event "passenger.checkedIn" does not specify payload |
| `spec.unspecified` | `evt_passengerNotified` |  | event "passenger.notified" does not specify payload |
| `spec.unspecified` | `evt_passengerScreened` |  | event "passenger.screened" does not specify payload |
| `spec.unspecified` | `evt_queueLong` |  | event "queue.long" does not specify payload |
| `spec.unspecified` | `evt_queueNormal` |  | event "queue.normal" does not specify payload |
| `spec.unspecified` | `evt_routeJoined` |  | event "route.joined" does not specify payload |
| `spec.unspecified` | `evt_screeningAlarm` |  | event "screening.alarm" does not specify payload |
| `spec.unspecified` | `evt_searchClear` |  | event "search.clear" does not specify payload |
| `spec.unspecified` | `evt_searchStarted` |  | event "search.started" does not specify payload |
| `spec.unspecified` | `evt_searchSuspicious` |  | event "search.suspicious" does not specify payload |
| `spec.unspecified` | `evt_standAllocated` |  | event "stand.allocated" does not specify payload |
| `spec.unspecified` | `evt_standDeallocated` |  | event "stand.deallocated" does not specify payload |
| `spec.unspecified` | `evt_standInspected` |  | event "stand.inspected" does not specify payload |
| `spec.unspecified` | `evt_standOutOfService` |  | event "stand.outOfService" does not specify payload |
| `spec.unspecified` | `evt_standReturned` |  | event "stand.returned" does not specify payload |
| `spec.unspecified` | `evt_stayExited` |  | event "stay.exited" does not specify payload |
| `spec.unspecified` | `evt_stayPaid` |  | event "stay.paid" does not specify payload |
| `spec.unspecified` | `evt_taxiStarted` |  | event "taxi.started" does not specify payload |
| `spec.unspecified` | `evt_traceNegative` |  | event "trace.negative" does not specify payload |
| `spec.unspecified` | `evt_tracePositive` |  | event "trace.positive" does not specify payload |
| `spec.unspecified` | `evt_turnaroundCompleted` |  | event "turnaround.completed" does not specify payload |
| `spec.unspecified` | `evt_waterCompleted` |  | event "water.completed" does not specify payload |
| `spec.unspecified` | `evt_weatherObservation` |  | event "weather.observation" does not specify payload |
| `spec.unspecified` | `evt_weatherWarning` |  | event "weather.warning" does not specify payload |
| `spec.unspecified` | `evt_workCompleted` |  | event "work.completed" does not specify payload |
| `spec.unspecified` | `evt_workPartsArrived` |  | event "work.partsArrived" does not specify payload |
| `spec.unspecified` | `evt_workPartsNeeded` |  | event "work.partsNeeded" does not specify payload |
| `spec.unspecified` | `evt_workRejected` |  | event "work.rejected" does not specify payload |
| `spec.unspecified` | `evt_workStarted` |  | event "work.started" does not specify payload |
| `spec.unspecified` | `evt_workTriaged` |  | event "work.triaged" does not specify payload |
| `spec.unspecified` | `whk_cateringEvents` |  | webhook "Catering events" does not specify payload |
| `spec.unspecified` | `whk_fuelTruckEvents` |  | webhook "Fuel truck events" does not specify payload |
| `spec.unspecified` | `whk_paymentEvents` |  | webhook "Payment events" does not specify payload |
| `confidence.low` | `nod_legacyFeed` | `cnv_aodbIntegrations` | service "Old displays feed" has low confidence; verify it |
| `confidence.low` | `nod_wayfinding` | `cnv_airportOperations` | service "Wayfinding" has low confidence; verify it |
| `comment.open` | `cnv_standPlan` | `cnv_standPlan` | system canvas "Stands and gates" has an open comment: "Remote stands need a bus plan per wave, not per flight." |
| `comment.open` | `nod_edsD5` | `cnv_beltNetwork` | service "EDS D5" has an open comment: "Until D5 and D6 exist, can terminal C's machines take D's peak?" |
| `comment.open` | `nod_taxiingOut` | `cnv_flightLifecycle` | state "taxiing out" has an open comment: "Is 40 minutes at the holding point the right limit in winter, with de-icing queues?" |

## Scenarios

| Scenario | Name | Level | Result |
| --- | --- | --- | --- |
| `scn_aBagFromTheDropToTheHold` | A bag from the drop to the hold | `cnv_bagLifecycle` | same as recorded |
| `scn_aDelayThenANewSlot` | A delay, then a new slot | `cnv_flightLifecycle` | same as recorded |
| `scn_aDepartureOnTime` | A departure on time | `cnv_flightLifecycle` | same as recorded |
| `scn_aLaneInAlarm` | A lane in alarm | `cnv_securityLane` | same as recorded |
| `scn_aStandSDay` | A stand's day | `cnv_standLifecycle` | same as recorded |
| `scn_theAirlineCancels` | The airline cancels | `cnv_flightLifecycle` | same as recorded |

## Coverage

| Level | Kind | States or nodes | Transitions | Covered | Not reached |
| --- | --- | --- | --- | --- | --- |
| Alarm resolution (`cnv_alarmResolution`) | machine | 3 / 5 | 3 / 6 | 55 % | `nod_explosiveTrace` `nod_policeCalled` `edg_e1ac` `edg_e1ad` `edg_e1ae` |
| Bag lifecycle (`cnv_bagLifecycle`) | machine | 4 / 13 | 5 / 19 | 28 % | `nod_flown` `nod_loaded` `nod_madeUp` `nod_mishandled` `nod_offloadedBag` `nod_rejectedBag` `nod_sorting` `nod_stored` `nod_unread` `edg_emg` `edg_emk` `edg_emm` `edg_emn` `edg_emo` `edg_emp` `edg_emq` `edg_emr` `edg_ems` `edg_emt` `edg_emu` `edg_emv` `edg_emw` `edg_emx` |
| Bill one operator (`cnv_billOneOperator`) | flow | 0 / 10 | 0 / 12 | 0 % | `nod_charge` `nod_fees` `nod_feesDone` `nod_landingFee` `nod_opEnd` `nod_opStart` `nod_paidOrNot` `nod_parkingFee` `nod_passengerFee` `nod_securityFee` `edg_e1bs` `edg_e1bt` `edg_e1bu` `edg_e1bv` `edg_e1bw` `edg_e1bx` `edg_e1by` `edg_e1bz` `edg_e1c0` `edg_e1c1` `edg_e1c2` `edg_e1c3` |
| Board one group (`cnv_boardOneGroup`) | flow | 0 / 4 | 0 / 3 | 0 % | `nod_callGroup` `nod_groupEnd` `nod_groupStart` `nod_groupWait` `edg_e1j8` `edg_e1j9` `edg_e1ja` |
| Board one passenger (`cnv_boardOnePassenger`) | flow | 0 / 8 | 0 / 10 | 0 % | `nod_boarded` `nod_notCheckedIn` `nod_oneEnd` `nod_oneStart` `nod_passValid` `nod_scanPass` `nod_whyRefused` `nod_wrongGate` `edg_e49` `edg_e4a` `edg_e4b` `edg_e4c` `edg_e4d` `edg_e4e` `edg_e4f` `edg_e4g` `edg_e4h` `edg_e4i` |
| Boarding phases (`cnv_boardingPhases`) | machine | 1 / 6 | 1 / 11 | 12 % | `nod_boardingStopped` `nod_finalCall` `nod_gateClosed` `nod_generalBoarding` `nod_offloading` `edg_e2x` `edg_e2y` `edg_e2z` `edg_e30` `edg_e31` `edg_e32` `edg_e33` `edg_e34` `edg_e35` `edg_e36` |
| Boarding procedure (`cnv_boardingProcedure`) | flow | 0 / 14 | 0 / 16 | 0 % | `nod_announce` `nod_anyoneMissing` `nod_boardEnd` `nod_boardFail` `nod_boardStart` `nod_closeDoors` `nod_eachPassenger` `nod_gateOpen` `nod_getList` `nod_loadStatus` `nod_offloadBags` `nod_openGate` `nod_readyDesk` `nod_waitCaptain` `edg_e3t` `edg_e3u` `edg_e3v` `edg_e3w` `edg_e3x` `edg_e3y` `edg_e3z` `edg_e40` `edg_e41` `edg_e42` `edg_e43` `edg_e44` `edg_e45` `edg_e46` `edg_e47` `edg_e48` |
| Border check (`cnv_borderCheck`) | flow | 0 / 11 | 0 / 14 | 0 % | `nod_borderEnd` `nod_borderStart` `nod_checkVisa` `nod_eGate` `nod_officer` `nod_refused` `nod_secondary` `nod_stamp` `nod_travelDocument` `nod_visaCheck` `nod_watchlist` `edg_e1af` `edg_e1ag` `edg_e1ah` `edg_e1ai` `edg_e1aj` `edg_e1ak` `edg_e1al` `edg_e1am` `edg_e1an` `edg_e1ao` `edg_e1ap` `edg_e1aq` `edg_e1ar` `edg_e1as` |
| Cabin cleaning (`cnv_cabinCleaning`) | flow | 0 / 7 | 0 / 9 | 0 % | `nod_cleanDone` `nod_cleanEnd` `nod_cleanKind` `nod_cleanStart` `nod_deepClean` `nod_fullClean` `nod_quickClean` `edg_e1cd` `edg_e1ce` `edg_e1cf` `edg_e1cg` `edg_e1ch` `edg_e1ci` `edg_e1cj` `edg_e1ck` `edg_e1cl` |
| Climb out (`cnv_climbOut`) | machine | 1 / 4 | 1 / 5 | 22 % | `nod_departureRoute` `nod_handedOff` `nod_holdingPattern` `edg_e38` `edg_e39` `edg_e3a` `edg_e3b` |
| De-icing (`cnv_deIcingProcedure`) | flow | 0 / 14 | 0 / 17 | 0 % | `nod_conditions` `nod_holdover` `nod_iceAgain` `nod_iceDone` `nod_iceEnd` `nod_iceStart` `nod_leftWing` `nod_padSlot` `nod_readWeather` `nod_rightWing` `nod_spray` `nod_sprayed` `nod_typeFour` `nod_typeOne` `edg_e4t` `edg_e4u` `edg_e4v` `edg_e4w` `edg_e4x` `edg_e4y` `edg_e4z` `edg_e50` `edg_e51` `edg_e52` `edg_e53` `edg_e54` `edg_e55` `edg_e56` `edg_e57` `edg_e58` `edg_e59` |
| Disruption desk (`cnv_disruptionDesk`) | machine | 0 / 4 | 0 / 5 | 0 % | `nod_assessing` `nod_disruptionClosed` `nod_disruptionOpen` `nod_mitigating` `edg_e5a` `edg_e5b` `edg_e5c` `edg_e5d` `edg_e5e` |
| Emergency desk (`cnv_emergencyDesk`) | machine | 0 / 4 | 0 / 6 | 0 % | `nod_aircraftAccident` `nod_fullEmergency` `nod_localStandby` `nod_standDown` `edg_e1ct` `edg_e1cu` `edg_e1cv` `edg_e1cw` `edg_e1cx` `edg_e1cy` |
| Find the missing (`cnv_findMissing`) | flow | 0 / 5 | 0 / 4 | 0 % | `nod_countMissing` `nod_findEnd` `nod_findStart` `nod_page` `nod_waitPage` `edg_e4j` `edg_e4k` `edg_e4l` `edg_e4m` |
| Flight alerts (`cnv_flightAlerts`) | flow | 0 / 8 | 0 / 11 | 0 % | `nod_alertBoarding` `nod_alertCancelled` `nod_alertDelay` `nod_alertEnd` `nod_alertGate` `nod_alertStart` `nod_readFlight` `nod_whatChanged` `edg_e1be` `edg_e1bf` `edg_e1bg` `edg_e1bh` `edg_e1bi` `edg_e1bj` `edg_e1bk` `edg_e1bl` `edg_e1bm` `edg_e1bn` `edg_e1bo` |
| Flight lifecycle (`cnv_flightLifecycle`) | machine | 13 / 17 | 15 / 28 | 62 % | `nod_deIcingFlight` `nod_departed` `nod_divertedFlight` `nod_returnToStand` `edg_e21` `edg_e23` `edg_e2a` `edg_e2c` `edg_e2g` `edg_e2h` `edg_e2i` `edg_e2j` `edg_e2k` `edg_e2l` `edg_e2m` `edg_e2n` `edg_e2p` |
| Gate boarding (`cnv_gateBoarding`) | flow | 0 / 7 | 0 / 6 | 0 % | `nod_gateBoardingList` `nod_gateBridge` `nod_gateClose` `nod_gateEnd` `nod_gateGroups` `nod_gateRetract` `nod_gateStart` `edg_e1j2` `edg_e1j3` `edg_e1j4` `edg_e1j5` `edg_e1j6` `edg_e1j7` |
| Into-plane fuelling (`cnv_fuelling`) | flow | 0 / 9 | 0 / 9 | 0 % | `nod_dispatchTruck` `nod_fireCover` `nod_fuelEnd` `nod_fuelOrder` `nod_fuelReceipt` `nod_fuelStart` `nod_passengersOnBoard` `nod_pumped` `nod_pumping` `edg_e1c4` `edg_e1c5` `edg_e1c6` `edg_e1c7` `edg_e1c8` `edg_e1c9` `edg_e1ca` `edg_e1cb` `edg_e1cc` |
| Lost item (`cnv_lostItem`) | machine | 0 / 4 | 0 / 4 | 0 % | `nod_matched` `nod_reported` `nod_returned` `nod_unclaimed` `edg_emy` `edg_emz` `edg_en0` `edg_en1` |
| Monthly billing (`cnv_monthlyBilling`) | flow | 0 / 4 | 0 / 3 | 0 % | `nod_billEnd` `nod_billStart` `nod_eachOperator` `nod_movements` `edg_e1bp` `edg_e1bq` `edg_e1br` |
| Notify passengers (`cnv_notifyPassengers`) | flow | 0 / 5 | 0 / 4 | 0 % | `nod_noticeSent` `nod_notifyEnd` `nod_notifyStart` `nod_sendNotice` `nod_whoIsBooked` `edg_e2s` `edg_e2t` `edg_e2u` `edg_e2v` |
| Offload one bag (`cnv_offloadOneBag`) | flow | 0 / 3 | 0 / 2 | 0 % | `nod_bagOutEnd` `nod_bagOutStart` `nod_findInHold` `edg_e4r` `edg_e4s` |
| Offload the no-shows' bags (`cnv_offloadNoShows`) | flow | 0 / 5 | 0 / 4 | 0 % | `nod_eachBag` `nod_listBags` `nod_offloadEnd` `nod_offloadStart` `nod_offloaded` `edg_e4n` `edg_e4o` `edg_e4p` `edg_e4q` |
| Parking stay (`cnv_parkingStay`) | machine | 0 / 4 | 0 / 5 | 0 % | `nod_entered` `nod_exited` `nod_overstay` `nod_paid` `edg_e1b9` `edg_e1ba` `edg_e1bb` `edg_e1bc` `edg_e1bd` |
| Passenger journey (`cnv_passengerJourney`) | machine | 0 / 10 | 0 / 13 | 0 % | `nod_airside` `nod_atGate` `nod_bagDropped` `nod_booked` `nod_borderPassed` `nod_checkedIn` `nod_deniedBoarding` `nod_noShow` `nod_onBoard` `nod_screened` `edg_e1aw` `edg_e1ax` `edg_e1ay` `edg_e1az` `edg_e1b0` `edg_e1b1` `edg_e1b2` `edg_e1b3` `edg_e1b4` `edg_e1b5` `edg_e1b6` `edg_e1b7` `edg_e1b8` |
| Secondary inspection (`cnv_secondaryInspection`) | flow | 0 / 4 | 0 / 3 | 0 % | `nod_customsCheck` `nod_interview` `nod_secondEnd` `nod_secondStart` `edg_e1at` `edg_e1au` `edg_e1av` |
| Security lane (`cnv_securityLane`) | machine | 4 / 6 | 5 / 11 | 53 % | `nod_laneBusy` `nod_lanePaused` `edg_e1a1` `edg_e1a2` `edg_e1a4` `edg_e1a6` `edg_e1a7` `edg_e1a8` |
| Stand lifecycle (`cnv_standLifecycle`) | machine | 4 / 5 | 5 / 8 | 69 % | `nod_standBlocked` `edg_et2` `edg_et6` `edg_et7` |
| Turnaround milestones (`cnv_turnaroundMilestones`) | machine | 0 / 17 | 0 / 17 | 0 % | `nod_bagsRegionHoldsClosed` `nod_bagsRegionHoldsEmpty` `nod_bagsRegionLoadingBags` `nod_bagsRegionOffloadingBags` `nod_cateringRegionCatered` `nod_cateringRegionCateringArrived` `nod_cleaningRegionCleaned` `nod_cleaningRegionCleaningCabin` `nod_fuelRegionAwaitingFuel` `nod_fuelRegionFuelled` `nod_fuelRegionFuelling` `nod_groundRegionGpuConnected` `nod_groundRegionGpuDisconnected` `nod_groundRegionWaterServiced` `nod_passengersRegionCabinEmpty` `nod_passengersRegionCabinReady` `nod_passengersRegionDeboarding` `edg_e3c` `edg_e3d` `edg_e3e` `edg_e3f` `edg_e3g` `edg_e3h` `edg_e3i` `edg_e3j` `edg_e3k` `edg_e3l` `edg_e3m` `edg_e3n` `edg_e3o` `edg_e3p` `edg_e3q` `edg_e3r` `edg_e3s` |
| Turnaround procedure (`cnv_turnaroundProcedure`) | flow | 0 / 12 | 0 / 14 | 0 % | `nod_onBlockChocks` `nod_procCater` `nod_procClean` `nod_procDeboard` `nod_procDone` `nod_procEnd` `nod_procFuel` `nod_procLoad` `nod_procOffload` `nod_procStart` `nod_teams` `nod_teamsDone` `edg_e1dh` `edg_e1di` `edg_e1dj` `edg_e1dk` `edg_e1dl` `edg_e1dm` `edg_e1dn` `edg_e1do` `edg_e1dp` `edg_e1dq` `edg_e1dr` `edg_e1ds` `edg_e1dt` `edg_e1du` |
| Work order (`cnv_workOrder`) | machine | 0 / 6 | 0 / 7 | 0 % | `nod_awaitingParts` `nod_inProgress` `nod_raised` `nod_triaged` `nod_workDone` `nod_workRejected` `edg_e1cm` `edg_e1cn` `edg_e1co` `edg_e1cp` `edg_e1cq` `edg_e1cr` `edg_e1cs` |
