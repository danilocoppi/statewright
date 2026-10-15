// Landside and the passenger: check-in and bag drop in four terminal halls (each a level of its own), the security
// lane, border control, the passenger's journey, the car parks, the app and aeronautical billing.

const TERMINALS = ["A", "B", "C", "D"];

export function landside(b) {
  const P = key => `pty_${key}`;
  const on = (...names) => ({ on: b.events(...names) });

  // ── Check-in: the four halls ───────────────────────────────────────────────
  const halls = b.level("checkInHalls", "system", "Check-in halls", {
    owner: "nod_checkIn",
    caption: "Common-use check-in: any airline at any desk, through the CUPPS platform."
  });
  const cupps = b.node(halls, "cupps", {
    kind: "service",
    name: "Common-use platform",
    summary: "CUPPS · IATA RP 1797"
  });
  const dcsRef = b.node(halls, "hallsDcs", { kind: "ref", name: "Airline DCS", target: "nod_airlineDcs" });
  const bhsRef = b.node(halls, "hallsBelts", { kind: "ref", name: "Belt network", target: "cnv_beltNetwork" });
  b.edge(halls, cupps, dcsRef, { kind: "link" });
  for (const terminal of TERMINALS) {
    const hall = b.node(halls, `hall${terminal}`, {
      kind: "service",
      name: `Terminal ${terminal} hall`,
      summary: terminal === "D" ? "opens 2027 · 60 desks" : "72 desks · 24 kiosks · 12 drops",
      ...(terminal === "D" ? { provenance: "proposed" } : {})
    });
    b.edge(halls, hall, cupps, { kind: "command" });
    b.edge(halls, hall, bhsRef, { kind: "link" });

    const level = b.level(`hall${terminal}Level`, "system", `Terminal ${terminal} hall`, { owner: hall });
    const desks = b.node(level, `desks${terminal}`, { kind: "service", name: "Desk rows", summary: "rows 1–6" });
    const platform = b.node(level, `platform${terminal}`, { kind: "ref", name: "Common-use platform", target: cupps });
    b.edge(level, desks, platform, { kind: "link" });
    for (let row = 1; row <= 6; row += 1) {
      const rowBox = b.node(level, `row${terminal}${row}`, {
        kind: "service",
        name: `Row ${terminal}${row}`,
        summary: "12 desks"
      });
      b.edge(level, desks, rowBox, { kind: "command" });
      for (let desk = 1; desk <= 12; desk += 1) {
        const id = b.node(level, `desk${terminal}${row}x${desk}`, {
          kind: "service",
          name: `Desk ${terminal}${(row - 1) * 12 + desk}`,
          ...(desk === 12 ? { summary: "special assistance" }
          : desk === 1 ? { summary: "premium" }
          : {})
        });
        b.edge(level, rowBox, id, { kind: "command" });
      }
    }
    for (let kiosk = 1; kiosk <= 6; kiosk += 1) {
      const id = b.node(level, `kiosk${terminal}${kiosk}`, {
        kind: "service",
        name: `Kiosk cluster ${terminal}${kiosk}`,
        summary: "4 kiosks"
      });
      b.edge(level, id, platform, { kind: "link" });
    }
    for (let drop = 1; drop <= 4; drop += 1) {
      const id = b.node(level, `drop${terminal}${drop}`, {
        kind: "service",
        name: `Bag drop ${terminal}${drop}`,
        summary: "self-service · 3 units"
      });
      b.edge(level, id, platform, { kind: "link" });
    }
    const traveller = b.node(level, `traveller${terminal}`, {
      kind: "actor",
      name: "Passenger",
      party: P("passenger")
    });
    b.edge(level, traveller, desks, { kind: "command" });
  }

  // ── The security lane ──────────────────────────────────────────────────────
  // ── Security: the screening halls, every lane and what it is made of ────────
  const screening = b.level("screeningHalls", "system", "Screening halls", {
    owner: "nod_securityScreening",
    caption: "38 lanes in four halls. Each lane: divest, CT scanner, body scanner, recompose, and an alarm table."
  });
  const lanes = b.node(screening, "laneRecords", {
    kind: "store",
    name: "Lanes",
    summary: "the status of every lane",
    party: P("security")
  });
  const supervisor = b.node(screening, "screeningSupervisor", {
    kind: "actor",
    name: "Supervisor",
    party: P("security")
  });
  b.edge(screening, supervisor, lanes, { kind: "command" });
  const perHall = [10, 10, 10, 8];
  TERMINALS.forEach((terminal, hall) => {
    const head = b.node(screening, `screening${terminal}`, {
      kind: "service",
      name: `Hall ${terminal}`,
      summary: `${perHall[hall]} lanes`
    });
    b.edge(screening, head, lanes, { kind: "data" });
    for (let index = 1; index <= perHall[hall]; index += 1) {
      const parts = [
        ["divest", "Divest", "4 positions · trays"],
        ["ct", "CT scanner", "liquids and laptops stay in"],
        ["body", "Body scanner", "millimetre wave"],
        ["recompose", "Recompose", "automatic tray return"],
        ["alarmTable", "Alarm table", "hand search · trace"]
      ].map(([part, name, summary]) =>
        b.node(screening, `${part}${terminal}${index}`, {
          kind: "service",
          name: `${name} ${terminal}${index}`,
          summary
        })
      );
      b.edge(screening, head, parts[0], { kind: "command" });
      b.edge(screening, parts[0], parts[1], { kind: "data", label: "trays" });
      b.edge(screening, parts[0], parts[2], { kind: "data", label: "people" });
      b.edge(screening, parts[1], parts[3], { kind: "data" });
      b.edge(screening, parts[1], parts[4], { kind: "data", label: "alarm" });
      b.edge(screening, parts[4], parts[3], { kind: "data", label: "cleared" });
    }
  });

  const lane = b.level("securityLane", "machine", "Security lane", {
    owner: "nod_laneRecords",
    subject: "lane.status",
    transitions: "complete",
    caption: "One of 38 lanes. A lane in alarm stops taking trays until the alarm is resolved."
  });
  const ls = (key, name, extra = {}) => b.node(lane, key, { kind: "state", name, ...extra });
  b.node(lane, "laneStart", { kind: "initial" });
  ls("laneClosed", "closed", { category: "waiting" });
  ls("laneOpening", "opening", { category: "processing" });
  ls("laneOpen", "open", { category: "processing" });
  ls("laneBusy", "queue over 10 min", { category: "hold" });
  ls("laneAlarm", "alarm", { category: "hold" });
  ls("lanePaused", "paused", { category: "waiting" });
  const lt = (from, to, fields = {}) => b.edge(lane, `nod_${from}`, `nod_${to}`, fields);
  lt("laneStart", "laneClosed");
  lt("laneClosed", "laneOpening", { ...on("lane.staffed"), by: P("security"), intent: "happy" });
  lt("laneOpening", "laneOpen", { ...on("lane.selfTested"), intent: "happy" });
  lt("laneOpen", "laneBusy", { ...on("queue.long") });
  lt("laneBusy", "laneOpen", { ...on("queue.normal") });
  lt("laneOpen", "laneAlarm", { ...on("screening.alarm") });
  lt("laneBusy", "laneAlarm", { ...on("screening.alarm") });
  lt("laneAlarm", "laneOpen", { done: true });
  lt("laneOpen", "lanePaused", { ...on("lane.break"), by: P("security") });
  lt("lanePaused", "laneOpen", { after: b.timer("break", "PT15M") });
  lt("laneOpen", "laneClosed", { ...on("lane.closed"), by: P("security") });
  b.node(lane, "laneOfficer", { kind: "participant", party: P("security") });

  const alarm = b.level("alarmResolution", "machine", "Alarm resolution", {
    owner: "nod_laneAlarm",
    subject: "lane.alarm"
  });
  b.node(alarm, "alarmStart", { kind: "initial" });
  const al = (key, name, extra = {}) => b.node(alarm, key, { kind: "state", name, ...extra });
  al("trayHeld", "tray held", { category: "hold" });
  al("searching", "hand search", { category: "processing" });
  al("explosiveTrace", "trace detection", { category: "processing" });
  al("alarmCleared", "cleared", { outcome: "success", terminal: true });
  al("policeCalled", "police called", { outcome: "stopped", terminal: true });
  b.edge(alarm, "nod_alarmStart", "nod_trayHeld");
  b.edge(alarm, "nod_trayHeld", "nod_searching", { ...on("search.started"), by: P("security") });
  b.edge(alarm, "nod_searching", "nod_alarmCleared", { ...on("search.clear"), intent: "happy" });
  b.edge(alarm, "nod_searching", "nod_explosiveTrace", { ...on("search.suspicious") });
  b.edge(alarm, "nod_explosiveTrace", "nod_alarmCleared", { ...on("trace.negative") });
  b.edge(alarm, "nod_explosiveTrace", "nod_policeCalled", { ...on("trace.positive"), intent: "failure" });

  // ── Border control ─────────────────────────────────────────────────────────
  const border = b.level("borderCheck", "flow", "Border check", { owner: "nod_borderControl" });
  const bn = (key, node) => b.node(border, key, node);
  bn("borderStart", { kind: "start" });
  bn("travelDocument", { kind: "switch", name: "which document?", on: { var: "vars.document.kind" } });
  bn("eGate", { kind: "call", name: "e-gate", endpoint: "ept_checkATraveller" });
  bn("officer", { kind: "call", name: "an officer checks", party: P("borderPolice") });
  bn("visaCheck", {
    kind: "if",
    name: "visa needed?",
    condition: { text: "the traveller's nationality needs a visa for this destination" }
  });
  bn("checkVisa", {
    kind: "call",
    name: "check the visa",
    endpoint: b.endpoint("GET", "/visas/{number}", "Visa record", { party: P("borderPolice") })
  });
  bn("watchlist", { kind: "if", name: "on a watch list?", condition: { text: "the database returned a hit" } });
  bn("secondary", { kind: "subflow", name: "secondary inspection" });
  bn("stamp", { kind: "emit", name: "cleared", event: b.event("border.cleared") });
  bn("borderEnd", { kind: "end", outcome: "success" });
  bn("refused", { kind: "end", name: "refused entry", outcome: "failure" });
  const be = (from, to, fields = {}) => b.edge(border, `nod_${from}`, `nod_${to}`, fields);
  be("borderStart", "travelDocument");
  be("travelDocument", "eGate", { kind: "case", case: "biometricPassport" });
  be("travelDocument", "officer", { kind: "default" });
  be("eGate", "officer", { kind: "error" });
  be("eGate", "watchlist");
  be("officer", "visaCheck");
  be("visaCheck", "checkVisa", { kind: "true" });
  be("visaCheck", "watchlist", { kind: "false" });
  be("checkVisa", "watchlist");
  be("watchlist", "secondary", { kind: "true" });
  be("watchlist", "stamp", { kind: "false" });
  be("secondary", "stamp");
  be("secondary", "refused", { kind: "error" });
  be("stamp", "borderEnd");
  const second = b.level("secondaryInspection", "flow", "Secondary inspection", { owner: "nod_secondary" });
  b.chain(second, [
    ["secondStart", { kind: "start" }],
    ["interview", { kind: "call", name: "interview", party: P("borderPolice") }],
    ["customsCheck", { kind: "call", name: "customs check", party: P("customs") }],
    ["secondEnd", { kind: "end" }]
  ]);

  // ── The passenger's journey ────────────────────────────────────────────────
  const journey = b.level("passengerJourney", "machine", "Passenger journey", {
    owner: "nod_passengers",
    subject: "journey.stage",
    transitions: "partial",
    caption: "Where a departing passenger is, as the airport knows it — never who they are."
  });
  const pj = (key, name, extra = {}) => b.node(journey, key, { kind: "state", name, ...extra });
  b.node(journey, "journeyStart", { kind: "initial" });
  pj("booked", "booked", { category: "waiting" });
  pj("checkedIn", "checked in", { category: "waiting" });
  pj("bagDropped", "bag dropped", { category: "waiting" });
  pj("screened", "screened", { category: "waiting" });
  b.node(journey, "international", { kind: "choice", name: "leaving the Schengen area?" });
  pj("borderPassed", "border passed", { category: "waiting" });
  pj("airside", "airside", { category: "waiting", summary: "shops · lounges · gates" });
  pj("atGate", "at the gate", { category: "waiting" });
  pj("onBoard", "on board", { outcome: "success", terminal: true });
  pj("noShow", "no-show", { outcome: "failure", terminal: true });
  pj("deniedBoarding", "denied boarding", { outcome: "stopped", terminal: true });
  const jt = (from, to, fields = {}) => b.edge(journey, `nod_${from}`, `nod_${to}`, fields);
  jt("journeyStart", "booked");
  jt("booked", "checkedIn", { ...on("passenger.checkedIn"), intent: "happy" });
  jt("checkedIn", "bagDropped", { ...on("bag.dropped") });
  jt("checkedIn", "screened", { ...on("passenger.screened"), label: "hand luggage only" });
  jt("bagDropped", "screened", { ...on("passenger.screened"), intent: "happy" });
  jt("screened", "international", { always: true });
  jt("international", "borderPassed", { guard: { text: "the destination is outside the Schengen area" } });
  jt("international", "airside", { else: true, intent: "happy" });
  jt("borderPassed", "airside", { ...on("border.cleared") });
  jt("airside", "atGate", { ...on("passenger.atGate"), intent: "happy" });
  jt("atGate", "onBoard", { ...on("passenger.boarded"), intent: "happy" });
  jt("atGate", "deniedBoarding", { ...on("boarding.denied"), by: P("airline"), intent: "failure" });
  jt("airside", "noShow", { ...on("gate.closed"), intent: "failure" });
  b.node(journey, "journeyPassenger", { kind: "participant", party: P("passenger") });

  // ── Car parks ──────────────────────────────────────────────────────────────
  const park = b.level("parkingStay", "machine", "Parking stay", { owner: "nod_parking", subject: "stay.status" });
  b.chain(
    park,
    [
      ["stayStart", { kind: "initial" }],
      ["entered", { kind: "state", name: "entered", category: "waiting" }],
      ["paid", { kind: "state", name: "paid", category: "waiting" }],
      ["exited", { kind: "state", name: "exited", outcome: "success", terminal: true }]
    ],
    index => (index === 0 ? {} : { on: b.events(["stay.paid", "stay.exited"][index - 1]) })
  );
  b.node(park, "overstay", { kind: "state", name: "overstayed", category: "hold" });
  b.edge(park, "nod_paid", "nod_overstay", { after: b.timer("grace to leave", "PT20M") });
  b.edge(park, "nod_overstay", "nod_paid", { on: ["evt_stayPaid"] });

  // ── The passenger app's flight alerts ──────────────────────────────────────
  const app = b.level("flightAlerts", "flow", "Flight alerts", { owner: "nod_passengerApp" });
  b.chain(app, [
    ["alertStart", { kind: "start" }],
    [
      "readFlight",
      { kind: "call", name: "read the flight", endpoint: b.endpoint("GET", "/flights/{id}", "Read a flight") }
    ],
    ["whatChanged", { kind: "switch", name: "what changed?", on: { var: "vars.change" } }]
  ]);
  b.node(app, "alertEnd", { kind: "end" });
  for (const [change, words] of [
    ["gate", "your gate changed"],
    ["delay", "your flight is delayed"],
    ["boarding", "boarding has started"],
    ["cancelled", "your flight is cancelled"]
  ]) {
    const id = b.node(app, `alert${change[0].toUpperCase()}${change.slice(1)}`, {
      kind: "call",
      name: words,
      endpoint: b.endpoint("POST", "/push", "Send a push")
    });
    b.edge(app, "nod_whatChanged", id, { kind: "case", case: change });
    b.edge(app, id, "nod_alertEnd");
  }
  b.edge(app, "nod_whatChanged", "nod_alertEnd", { kind: "default" });

  // ── Aeronautical billing ───────────────────────────────────────────────────
  const bill = b.level("monthlyBilling", "flow", "Monthly billing", { owner: "nod_billing" });
  b.chain(bill, [
    ["billStart", { kind: "start" }],
    [
      "movements",
      { kind: "call", name: "the month's movements", endpoint: b.endpoint("GET", "/movements?month={m}", "Movements") }
    ],
    ["eachOperator", { kind: "forEach", name: "each operator", items: { var: "vars.operators" }, as: "operator" }],
    ["billEnd", { kind: "end", outcome: "success" }]
  ]);
  const operator = b.level("billOneOperator", "flow", "Bill one operator", { owner: "nod_eachOperator" });
  b.chain(operator, [
    ["opStart", { kind: "start" }],
    ["fees", { kind: "parallel", name: "the fees" }]
  ]);
  b.node(operator, "feesDone", { kind: "join" });
  for (const fee of ["landing", "parking", "passenger", "security"]) {
    const id = b.node(operator, `${fee}Fee`, {
      kind: "assign",
      name: `${fee} fee`,
      set: { [`vars.fees.${fee}`]: { var: `vars.operator.${fee}` } }
    });
    b.edge(operator, "nod_fees", id);
    b.edge(operator, id, "nod_feesDone");
  }
  b.node(operator, "charge", { kind: "call", name: "charge the operator", endpoint: "ept_chargeAnOperator" });
  b.node(operator, "paidOrNot", {
    kind: "wait",
    name: "paid",
    on: b.events("charge.succeeded", "charge.failed"),
    after: b.timer("payment terms", "P30D")
  });
  b.node(operator, "opEnd", { kind: "end" });
  b.edge(operator, "nod_feesDone", "nod_charge");
  b.edge(operator, "nod_charge", "nod_paidOrNot");
  b.edge(operator, "nod_paidOrNot", "nod_opEnd");
}
