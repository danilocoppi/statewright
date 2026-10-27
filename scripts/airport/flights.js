// Flights: the life of a departing flight (with its boarding and its climb out as levels of their own), the
// turnaround's milestones in six parallel regions, boarding and de-icing as procedures, and the desk that handles
// disruptions as a mixed level.

export function flights(b) {
  const P = key => `pty_${key}`;

  b.type("Flight", {
    kind: "object",
    fields: [
      { name: "flightNumber", type: "string", required: true },
      { name: "scheduledOff", type: "datetime", required: true },
      { name: "ctot", type: "datetime" },
      { name: "stand", type: "string" },
      { name: "gate", type: "string" },
      { name: "icing", type: "boolean" },
      { name: "delayCode", type: "string" }
    ]
  });
  b.type("BoardingVars", {
    kind: "object",
    fields: [
      { name: "flight", type: "string", required: true },
      { name: "passengers", type: "json" },
      { name: "missing", type: "integer" }
    ]
  });

  // ── The life of a departing flight ─────────────────────────────────────────
  const life = b.level("flightLifecycle", "machine", "Flight lifecycle", {
    owner: "nod_flights",
    subject: "flight.status",
    context: "typ_flight",
    transitions: "complete",
    stage: "target",
    caption: "A departure, from the published schedule to the hand-off to approach control."
  });
  const tm = {
    checkInOpens: b.timer("check-in opens", "PT3H", { description: "Three hours before the scheduled off-block." }),
    checkInCloses: b.timer("check-in closes", "PT2H20M"),
    taxiTimeout: b.timer("taxi-out limit", "PT40M")
  };
  const act = {
    fids: b.action("Publish to displays", { party: P("aodb"), description: "Pushes the flight to every screen." }),
    notify: b.action("Notify passengers", {
      party: P("aodb"),
      emits: [b.event("passenger.notified")],
      description: "Push, SMS and e-mail to everyone booked on the flight."
    }),
    releaseStand: b.action("Release the stand", { party: P("apoc") }),
    requestDeicing: b.action("Request de-icing", { party: P("groundHandler"), emits: [b.event("deicing.requested")] }),
    chargeMovement: b.action("Charge the movement", { party: P("paymentProvider") })
  };
  const s = (key, name, extra = {}) => b.node(life, key, { kind: "state", name, ...extra });
  b.node(life, "flightStart", { kind: "initial" });
  b.node(life, "publishFlight", {
    kind: "entry",
    name: "POST /flights",
    via: "ept_publishASchedule",
    by: P("airline")
  });
  s("scheduled", "scheduled", { category: "waiting" });
  s("slotConfirmed", "slot confirmed", { category: "waiting" });
  s("standAllocated", "stand allocated", { category: "waiting" });
  s("checkInOpen", "check-in open", { category: "processing" });
  s("checkInClosed", "check-in closed", { category: "waiting" });
  s("boardingFlight", "boarding", { category: "processing" });
  s("doorsClosed", "doors closed");
  b.node(life, "icingChoice", { kind: "choice", name: "icing conditions?" });
  s("deIcingFlight", "de-icing", { category: "processing" });
  s("readyForPushback", "ready for pushback", { category: "waiting" });
  s("pushedBack", "pushed back");
  s("taxiingOut", "taxiing out", { category: "processing" });
  s("airborneFlight", "airborne");
  s("departed", "departed", { outcome: "success", terminal: true });
  s("delayedFlight", "delayed", { category: "hold" });
  s("returnToStand", "returning to stand", { category: "hold" });
  s("cancelledFlight", "cancelled", { outcome: "failure", terminal: true });
  s("divertedFlight", "diverted", { outcome: "stopped", terminal: true });
  b.node(life, "anyCancel", {
    kind: "any",
    name: "any status",
    except: ["nod_departed", "nod_airborneFlight", "nod_divertedFlight"]
  });

  const on = (...names) => ({ on: b.events(...names) });
  const t = (from, to, fields) => b.edge(life, `nod_${from}`, `nod_${to}`, fields);
  t("flightStart", "scheduled", {});
  t("publishFlight", "scheduled", { actions: [{ action: act.fids }] });
  t("scheduled", "slotConfirmed", { ...on("ctot.issued"), by: P("networkManager"), intent: "happy" });
  t("slotConfirmed", "slotConfirmed", { ...on("ctot.revised"), internal: true, label: "ctot revised" });
  t("slotConfirmed", "standAllocated", { ...on("stand.allocated"), by: P("apoc"), intent: "happy" });
  t("standAllocated", "checkInOpen", {
    after: tm.checkInOpens,
    actions: [{ action: act.fids }, { assign: { "context.gate": "allocated" } }],
    intent: "happy"
  });
  t("checkInOpen", "checkInClosed", { after: tm.checkInCloses, intent: "happy" });
  t("checkInClosed", "boardingFlight", { ...on("boarding.started"), by: P("groundHandler"), intent: "happy" });
  t("boardingFlight", "doorsClosed", { ...on("doors.closed"), by: P("crew"), intent: "happy" });
  t("doorsClosed", "icingChoice", { always: true });
  t("icingChoice", "deIcingFlight", {
    guard: { guard: b.guard("Icing conditions", "Frost, snow or freezing rain at the airport, or ice on the wings.") },
    actions: [{ action: act.requestDeicing }]
  });
  t("icingChoice", "readyForPushback", { else: true, intent: "happy" });
  t("deIcingFlight", "readyForPushback", { ...on("deicing.completed"), by: P("groundHandler") });
  t("readyForPushback", "pushedBack", { ...on("aircraft.offBlock"), by: P("atc"), intent: "happy" });
  t("pushedBack", "taxiingOut", { ...on("taxi.started"), by: P("pilot"), intent: "happy" });
  t("taxiingOut", "airborneFlight", { ...on("aircraft.airborne"), by: P("atc"), intent: "happy" });
  t("taxiingOut", "returnToStand", { ...on("aircraft.returning"), by: P("pilot"), intent: "failure" });
  t("taxiingOut", "delayedFlight", { after: tm.taxiTimeout, label: "40 min at the holding point" });
  t("returnToStand", "standAllocated", { ...on("aircraft.onBlock"), actions: [{ action: act.notify }] });
  t("airborneFlight", "departed", { done: true, actions: [{ action: act.chargeMovement }], intent: "happy" });
  t("airborneFlight", "divertedFlight", { ...on("flight.diverted"), by: P("pilot"), intent: "failure" });
  for (const from of ["scheduled", "slotConfirmed", "standAllocated", "checkInOpen", "checkInClosed"]) {
    t(from, "delayedFlight", { ...on("flight.delayed"), actions: [{ action: act.notify }] });
  }
  t("delayedFlight", "slotConfirmed", {
    ...on("ctot.revised"),
    by: P("networkManager"),
    actions: [{ action: act.fids }]
  });
  t("anyCancel", "cancelledFlight", {
    ...on("flight.cancelled"),
    by: P("airline"),
    actions: [{ action: act.notify }, { action: act.releaseStand }],
    intent: "failure"
  });
  const notifyFlow = b.level("notifyPassengers", "flow", "Notify passengers", { owner: act.notify });
  b.chain(notifyFlow, [
    ["notifyStart", { kind: "start" }],
    [
      "whoIsBooked",
      {
        kind: "call",
        name: "who is booked",
        endpoint: b.endpoint("GET", "/dcs/flights/{id}/passengers", "Boarding list", { party: P("dcs") })
      }
    ],
    [
      "sendNotice",
      { kind: "call", name: "push, SMS and e-mail", endpoint: b.endpoint("POST", "/push", "Send a push") }
    ],
    ["noticeSent", { kind: "emit", name: "notified", event: "evt_passengerNotified" }],
    ["notifyEnd", { kind: "end" }]
  ]);
  b.node(life, "notifySteps", { kind: "steps", action: act.notify });
  // Who sends what, drawn on the level.
  b.node(life, "lifeAtc", { kind: "participant", party: P("atc") });
  b.node(life, "lifeAirline", { kind: "participant", party: P("airline") });
  b.node(life, "lifeHandler", { kind: "participant", party: P("groundHandler") });

  // Boarding, as phases of its own.
  const phases = b.level("boardingPhases", "machine", "Boarding phases", {
    owner: "nod_boardingFlight",
    subject: "flight.boarding",
    transitions: "complete"
  });
  b.node(phases, "phasesStart", { kind: "initial" });
  const ph = (key, name, extra = {}) => b.node(phases, key, { kind: "state", name, ...extra });
  ph("priorityBoarding", "priority", { category: "processing" });
  ph("generalBoarding", "general", { category: "processing" });
  ph("finalCall", "final call", { category: "processing" });
  ph("gateClosed", "gate closed", { outcome: "success", terminal: true });
  ph("offloading", "offloading no-shows", { category: "hold" });
  // Closing the gate asks whether everyone boarded: `else` belongs to a choice, where it is the branch taken when no
  // other holds; on a state it would always hold.
  b.node(phases, "everyoneBoarded", { kind: "choice", name: "everyone boarded?" });
  const pt = (from, to, fields) => b.edge(phases, `nod_${from}`, `nod_${to}`, fields);
  pt("phasesStart", "priorityBoarding", {});
  pt("priorityBoarding", "generalBoarding", { ...on("boarding.general"), intent: "happy" });
  pt("generalBoarding", "finalCall", { ...on("boarding.finalCall"), intent: "happy" });
  pt("finalCall", "everyoneBoarded", { ...on("gate.closed"), intent: "happy" });
  pt("everyoneBoarded", "offloading", { else: true, label: "someone is missing" });
  pt("everyoneBoarded", "gateClosed", {
    id: "edg_everyoneBoarded",
    guard: { text: "every checked-in passenger has boarded" },
    intent: "happy"
  });
  pt("offloading", "gateClosed", { ...on("bags.offloaded"), by: P("groundHandler") });
  // A boarding stopped at the gate (a security check, a fault at the bridge) resumes at the phase it was in.
  ph("boardingStopped", "stopped at the gate", { category: "hold" });
  b.node(phases, "phaseResume", { kind: "history", name: "the phase it was in" });
  for (const from of ["priorityBoarding", "generalBoarding", "finalCall"]) {
    pt(from, "boardingStopped", { ...on("boarding.suspended") });
  }
  pt("boardingStopped", "phaseResume", { ...on("boarding.resumed") });
  pt("phaseResume", "priorityBoarding", { label: "from the start" });

  // The climb out, as the airport follows it until approach control takes over.
  const air = b.level("climbOut", "machine", "Climb out", { owner: "nod_airborneFlight", subject: "flight.climb" });
  b.node(air, "climbStart", { kind: "initial" });
  const as = (key, name, extra = {}) => b.node(air, key, { kind: "state", name, ...extra });
  as("initialClimb", "initial climb", { category: "processing" });
  as("departureRoute", "on the departure route", { category: "processing" });
  as("holdingPattern", "holding", { category: "hold" });
  as("handedOff", "handed off", { outcome: "success", terminal: true });
  const at = (from, to, fields) => b.edge(air, `nod_${from}`, `nod_${to}`, fields);
  at("climbStart", "initialClimb", {});
  at("initialClimb", "departureRoute", { ...on("route.joined"), intent: "happy" });
  at("departureRoute", "handedOff", { ...on("handoff.accepted"), by: P("atc"), intent: "happy" });
  at("departureRoute", "holdingPattern", { ...on("hold.instructed"), by: P("atc") });
  at("holdingPattern", "departureRoute", { ...on("hold.released"), by: P("atc") });

  // ── The turnaround's milestones (A-CDM), six things at once ───────────────
  const ta = b.level("turnaroundMilestones", "machine", "Turnaround milestones", {
    owner: "nod_turnaround",
    subject: "turnaround.milestones",
    transitions: "complete",
    caption: "Each region is one team's work on the stand; the turnaround ends when all six are done."
  });
  const regions = [
    [
      "passengersRegion",
      "Passengers",
      [
        ["deboarding", "deboarding", "deboarding.started"],
        ["cabinEmpty", "cabin empty", "deboarding.completed"],
        ["cabinReady", "cabin ready", "cabin.ready"]
      ]
    ],
    [
      "bagsRegion",
      "Bags and cargo",
      [
        ["offloadingBags", "offloading", "offload.started"],
        ["holdsEmpty", "holds empty", "offload.completed"],
        ["loadingBags", "loading", "loading.started"],
        ["holdsClosed", "holds closed", "holds.closed"]
      ]
    ],
    [
      "fuelRegion",
      "Fuel",
      [
        ["awaitingFuel", "awaiting the truck", "fuel.truckAssigned"],
        ["fuelling", "fuelling", "fuel.started"],
        ["fuelled", "fuelled", "fuel.completed"]
      ]
    ],
    [
      "cateringRegion",
      "Catering",
      [
        ["cateringArrived", "truck at the door", "catering.arrived"],
        ["catered", "catered", "catering.completed"]
      ]
    ],
    [
      "cleaningRegion",
      "Cleaning",
      [
        ["cleaningCabin", "cleaning", "cleaning.started"],
        ["cleaned", "cleaned", "cleaning.completed"]
      ]
    ],
    [
      "groundRegion",
      "Ground power and water",
      [
        ["gpuConnected", "power connected", "gpu.connected"],
        ["waterServiced", "water serviced", "water.completed"],
        ["gpuDisconnected", "power disconnected", "gpu.disconnected"]
      ]
    ]
  ];
  for (const [key, name, states] of regions) {
    const region = b.region(ta, key, name);
    const start = b.node(ta, `${key}Start`, { kind: "initial", region });
    const ids = states.map(([state, label], index) =>
      b.node(ta, `${key}${state[0].toUpperCase()}${state.slice(1)}`, {
        kind: "state",
        name: label,
        region,
        ...(index === states.length - 1 ? { outcome: "success", terminal: true } : { category: "processing" })
      })
    );
    b.firsts = { ...(b.firsts ?? {}), [region]: b.edge(ta, start, ids[0], {}) };
    ids
      .slice(1)
      .forEach((id, index) => b.edge(ta, ids[index], id, { on: [b.event(states[index + 1][2])], intent: "happy" }));
  }

  // ── Boarding, as the gate does it ──────────────────────────────────────────
  const board = b.level("boardingProcedure", "flow", "Boarding procedure", {
    owner: "nod_boarding",
    vars: "typ_boardingVars",
    caption: "From the boarding list to doors closed."
  });
  const st = (key, node) => b.node(board, key, node);
  st("boardStart", { kind: "start" });
  st("getList", {
    kind: "call",
    name: "get the boarding list",
    endpoint: b.endpoint("GET", "/dcs/flights/{id}/passengers", "Boarding list", { party: P("dcs") })
  });
  st("openGate", { kind: "parallel", name: "open the gate" });
  st("announce", { kind: "call", name: "announce boarding", endpoint: "ept_publishASchedule" });
  st("readyDesk", { kind: "assign", name: "desk ready", set: { "vars.missing": 0 } });
  st("gateOpen", { kind: "join", name: "gate open" });
  st("eachPassenger", {
    kind: "forEach",
    name: "each passenger at the gate",
    items: { var: "vars.passengers" },
    as: "passenger"
  });
  st("anyoneMissing", {
    kind: "while",
    name: "while someone is missing",
    condition: { expr: { ">": [{ var: "vars.missing" }, 0] }, text: "a checked-in passenger has not boarded" }
  });
  st("loadStatus", { kind: "switch", name: "load status?", on: { var: "vars.loadStatus" } });
  st("offloadBags", { kind: "subflow", name: "offload their bags" });
  st("closeDoors", { kind: "emit", name: "doors closed", event: "evt_doorsClosed" });
  st("waitCaptain", { kind: "wait", name: "the captain accepts the load", on: b.events("loadsheet.accepted") });
  st("boardEnd", { kind: "end", name: "boarded", outcome: "success" });
  st("boardFail", { kind: "end", name: "flight held", outcome: "failure" });
  st("gateAgent", { kind: "participant", party: P("groundHandler") });
  const e = (from, to, fields = {}) => b.edge(board, `nod_${from}`, `nod_${to}`, fields);
  e("boardStart", "getList");
  e("getList", "openGate");
  e("openGate", "announce");
  e("openGate", "readyDesk");
  e("announce", "gateOpen");
  e("readyDesk", "gateOpen");
  e("gateOpen", "eachPassenger");
  e("eachPassenger", "anyoneMissing");
  e("anyoneMissing", "loadStatus");
  e("loadStatus", "closeDoors", { kind: "case", case: "complete" });
  e("loadStatus", "offloadBags", { kind: "case", case: "noShows" });
  e("loadStatus", "boardFail", { kind: "default" });
  e("offloadBags", "closeDoors");
  e("closeDoors", "waitCaptain");
  e("waitCaptain", "boardEnd");
  e("getList", "boardFail", { kind: "error" });
  b.lane(board, "gateLane", "Gate agent", ["nod_getList", "nod_announce", "nod_readyDesk"], P("groundHandler"));

  const one = b.level("boardOnePassenger", "flow", "Board one passenger", { owner: "nod_eachPassenger" });
  b.chain(one, [
    ["oneStart", { kind: "start" }],
    ["scanPass", { kind: "call", name: "scan the boarding pass", endpoint: "ept_recordABoarding" }],
    [
      "passValid",
      { kind: "if", name: "valid for this flight?", condition: { text: "the pass is for this flight and gate" } }
    ]
  ]);
  b.node(one, "boarded", { kind: "emit", name: "boarded", event: b.event("passenger.boarded") });
  b.node(one, "whyRefused", { kind: "switch", name: "why not?", on: { var: "vars.passenger.problem" } });
  b.node(one, "wrongGate", {
    kind: "call",
    name: "send them to the right gate",
    endpoint: b.endpoint("POST", "/wayfinding/directions", "Directions")
  });
  b.node(one, "notCheckedIn", { kind: "call", name: "check them in at the gate", endpoint: "ept_checkAPassengerIn" });
  b.node(one, "oneEnd", { kind: "end" });
  b.edge(one, "nod_passValid", "nod_boarded", { kind: "true" });
  b.edge(one, "nod_passValid", "nod_whyRefused", { kind: "false" });
  b.edge(one, "nod_whyRefused", "nod_wrongGate", { kind: "case", case: "wrongGate" });
  b.edge(one, "nod_whyRefused", "nod_notCheckedIn", { kind: "case", case: "notCheckedIn" });
  b.edge(one, "nod_whyRefused", "nod_oneEnd", { kind: "default" });
  b.edge(one, "nod_boarded", "nod_oneEnd");
  b.edge(one, "nod_wrongGate", "nod_oneEnd");
  b.edge(one, "nod_notCheckedIn", "nod_oneEnd");

  const missing = b.level("findMissing", "flow", "Find the missing", { owner: "nod_anyoneMissing" });
  b.chain(missing, [
    ["findStart", { kind: "start" }],
    ["page", { kind: "call", name: "page the passenger", endpoint: b.endpoint("POST", "/announcements", "Announce") }],
    ["waitPage", { kind: "wait", name: "three minutes", after: b.timer("paging interval", "PT3M") }],
    ["countMissing", { kind: "assign", name: "count again", set: { "vars.missing": { var: "vars.stillMissing" } } }],
    ["findEnd", { kind: "end" }]
  ]);

  const offload = b.level("offloadNoShows", "flow", "Offload the no-shows' bags", { owner: "nod_offloadBags" });
  b.chain(offload, [
    ["offloadStart", { kind: "start" }],
    [
      "listBags",
      { kind: "call", name: "find their bags", endpoint: b.endpoint("GET", "/bags?flight={id}&pax={pax}", "Find bags") }
    ],
    ["eachBag", { kind: "forEach", name: "each bag", items: { var: "vars.bags" }, as: "bag" }],
    ["offloaded", { kind: "emit", name: "bags offloaded", event: b.event("bags.offloaded") }],
    ["offloadEnd", { kind: "end" }]
  ]);
  const bagOut = b.level("offloadOneBag", "flow", "Offload one bag", { owner: "nod_eachBag" });
  b.chain(bagOut, [
    ["bagOutStart", { kind: "start" }],
    ["findInHold", { kind: "call", name: "find it in the hold", party: P("groundHandler") }],
    ["bagOutEnd", { kind: "end" }]
  ]);

  // ── De-icing ───────────────────────────────────────────────────────────────
  const ice = b.level("deIcingProcedure", "flow", "De-icing", { owner: "nod_deIcing" });
  const ic = (key, node) => b.node(ice, key, node);
  ic("iceStart", { kind: "start" });
  ic("readWeather", {
    kind: "call",
    name: "read the weather",
    endpoint: b.endpoint("GET", "/metar/{airport}", "Weather", { party: P("meteo") })
  });
  ic("conditions", { kind: "switch", name: "conditions?", on: { var: "vars.weather.precipitation" } });
  ic("typeOne", { kind: "assign", name: "type I only", set: { "vars.fluid": "I" } });
  ic("typeFour", { kind: "assign", name: "type I then IV", set: { "vars.fluid": "I+IV" } });
  ic("padSlot", { kind: "wait", name: "a pad is free", on: b.events("deicing.padAssigned") });
  ic("spray", { kind: "parallel", name: "both wings" });
  ic("leftWing", { kind: "call", name: "spray the left wing", party: P("groundHandler") });
  ic("rightWing", { kind: "call", name: "spray the right wing", party: P("groundHandler") });
  ic("sprayed", { kind: "join" });
  ic("holdover", {
    kind: "if",
    name: "holdover time left?",
    condition: { text: "the fluid's holdover time covers the taxi to the runway" }
  });
  ic("iceDone", { kind: "emit", name: "de-icing completed", event: "evt_deicingCompleted" });
  ic("iceEnd", { kind: "end", outcome: "success" });
  ic("iceAgain", { kind: "end", name: "again", outcome: "failure" });
  const ie = (from, to, fields = {}) => b.edge(ice, `nod_${from}`, `nod_${to}`, fields);
  ie("iceStart", "readWeather");
  ie("readWeather", "conditions");
  ie("conditions", "typeOne", { kind: "case", case: "frost" });
  ie("conditions", "typeFour", { kind: "case", case: "snow" });
  ie("conditions", "typeFour", { kind: "case", case: "freezingRain" });
  ie("conditions", "typeOne", { kind: "default" });
  ie("typeOne", "padSlot");
  ie("typeFour", "padSlot");
  ie("padSlot", "spray");
  ie("spray", "leftWing");
  ie("spray", "rightWing");
  ie("leftWing", "sprayed");
  ie("rightWing", "sprayed");
  ie("sprayed", "holdover");
  ie("holdover", "iceDone", { kind: "true" });
  ie("holdover", "iceAgain", { kind: "false" });
  ie("iceDone", "iceEnd");

  // ── The irregular operations desk: a disruption's states, the steps that settle it, who acts ──────────────
  const desk = b.level("disruptionDesk", "mixed", "Disruption desk", {
    owner: "nod_irregularOps",
    subject: "disruption.status",
    caption: "A mixed level: a disruption's states, the steps the desk takes, and who it works with."
  });
  const d = (key, node) => b.node(desk, key, node);
  d("disruptionStart", { kind: "initial" });
  d("disruptionOpen", { kind: "state", name: "open", category: "waiting" });
  d("assessing", { kind: "state", name: "assessing", category: "processing" });
  d("mitigating", { kind: "state", name: "mitigating", category: "processing" });
  d("disruptionClosed", { kind: "state", name: "closed", outcome: "success", terminal: true });
  d("assessStart", { kind: "start" });
  d("howBad", { kind: "if", condition: { text: "more than 20 flights are affected" } });
  d("declareMajor", { kind: "emit", name: "declare a major disruption", event: b.event("disruption.major") });
  d("handleLocally", { kind: "emit", name: "handle it at the desk", event: b.event("disruption.local") });
  d("dutyManager", { kind: "actor", name: "Duty manager", party: P("apoc") });
  d("deskNotifications", { kind: "service", name: "Notifications", party: P("aodb") });
  const de = (from, to, fields = {}) => b.edge(desk, `nod_${from}`, `nod_${to}`, fields);
  de("disruptionStart", "disruptionOpen", { kind: "transition" });
  de("disruptionOpen", "assessing", { kind: "transition", on: b.events("disruption.reported") });
  de("assessing", "mitigating", { kind: "transition", on: ["evt_disruptionMajor"] });
  de("assessing", "mitigating", { kind: "transition", on: ["evt_disruptionLocal"] });
  de("mitigating", "disruptionClosed", { kind: "transition", on: b.events("disruption.resolved") });
  de("assessStart", "howBad");
  de("howBad", "declareMajor", { kind: "true" });
  de("howBad", "handleLocally", { kind: "false" });
  de("dutyManager", "deskNotifications", { kind: "command" });
}
