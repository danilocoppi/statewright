// Airside: into-plane fuelling, cabin cleaning, maintenance work orders, the emergency response desk (a mixed level),
// the operations database's integrations, and the turnaround procedure as the flow of a catalog action, drawn as
// embedded steps where the turnaround's machine runs it.

export function airside(b) {
  const P = key => `pty_${key}`;
  const on = (...names) => ({ on: b.events(...names) });

  // ── Into-plane fuelling ────────────────────────────────────────────────────
  const fuel = b.level("fuelling", "flow", "Into-plane fuelling", { owner: "nod_fuelService" });
  const f = (key, node) => b.node(fuel, key, node);
  f("fuelStart", { kind: "start" });
  f("fuelOrder", { kind: "wait", name: "the airline's fuel order", on: b.events("fuel.ordered") });
  f("passengersOnBoard", {
    kind: "if",
    name: "passengers on board?",
    condition: { text: "boarding has started or deboarding has not ended" }
  });
  f("fireCover", { kind: "call", name: "fire cover at the aircraft", party: P("fireRescue") });
  f("dispatchTruck", { kind: "emit", name: "truck assigned", event: b.event("fuel.truckAssigned") });
  f("pumping", { kind: "wait", name: "pumping", on: b.events("fuel.started") });
  f("pumped", { kind: "wait", name: "pumped", on: ["evt_fuelCompleted"], after: b.timer("fuelling limit", "PT45M") });
  f("fuelReceipt", {
    kind: "call",
    name: "fuel receipt to the captain",
    endpoint: b.endpoint("POST", "/fuel/receipts", "Fuel receipt", { party: P("fuelSupplier") })
  });
  f("fuelEnd", { kind: "end", outcome: "success" });
  const fe = (from, to, fields = {}) => b.edge(fuel, `nod_${from}`, `nod_${to}`, fields);
  fe("fuelStart", "fuelOrder");
  fe("fuelOrder", "passengersOnBoard");
  fe("passengersOnBoard", "fireCover", { kind: "true" });
  fe("passengersOnBoard", "dispatchTruck", { kind: "false" });
  fe("fireCover", "dispatchTruck");
  fe("dispatchTruck", "pumping");
  fe("pumping", "pumped");
  fe("pumped", "fuelReceipt");
  fe("fuelReceipt", "fuelEnd");
  b.lane(
    fuel,
    "fuelLane",
    "Fuel supplier",
    ["nod_dispatchTruck", "nod_pumping", "nod_pumped", "nod_fuelReceipt"],
    P("fuelSupplier")
  );

  // ── Cabin cleaning ─────────────────────────────────────────────────────────
  const clean = b.level("cabinCleaning", "flow", "Cabin cleaning", { owner: "nod_cleaningService" });
  b.chain(clean, [
    ["cleanStart", { kind: "start" }],
    ["cleanKind", { kind: "switch", name: "which clean?", on: { var: "vars.turnaround.minutes" } }]
  ]);
  for (const [key, words, minutes] of [
    ["quickClean", "quick clean", "under 35"],
    ["fullClean", "full clean", "35 to 90"],
    ["deepClean", "deep clean", "night stop"]
  ]) {
    b.node(clean, key, { kind: "call", name: words, party: P("cleaning") });
    b.edge(clean, "nod_cleanKind", `nod_${key}`, { kind: "case", case: minutes });
  }
  b.node(clean, "cleanDone", { kind: "emit", name: "cabin clean", event: "evt_cleaningCompleted" });
  b.node(clean, "cleanEnd", { kind: "end" });
  for (const key of ["quickClean", "fullClean", "deepClean"]) b.edge(clean, `nod_${key}`, "nod_cleanDone");
  b.edge(clean, "nod_cleanKind", "nod_quickClean", { kind: "default" });
  b.edge(clean, "nod_cleanDone", "nod_cleanEnd");

  // ── Maintenance work orders ────────────────────────────────────────────────
  const work = b.level("workOrder", "machine", "Work order", {
    owner: "nod_workOrders",
    subject: "workOrder.status",
    transitions: "complete"
  });
  const w = (key, name, extra = {}) => b.node(work, key, { kind: "state", name, ...extra });
  b.node(work, "workStart", { kind: "initial" });
  w("raised", "raised", { category: "waiting" });
  w("triaged", "triaged", { category: "waiting" });
  w("inProgress", "in progress", { category: "processing" });
  w("awaitingParts", "awaiting parts", { category: "hold" });
  w("workDone", "done", { outcome: "success", terminal: true });
  w("workRejected", "rejected", { outcome: "stopped", terminal: true });
  const wt = (from, to, fields = {}) => b.edge(work, `nod_${from}`, `nod_${to}`, fields);
  wt("workStart", "raised");
  wt("raised", "triaged", { ...on("work.triaged"), by: P("maintenance"), intent: "happy" });
  wt("raised", "workRejected", { ...on("work.rejected"), by: P("maintenance") });
  wt("triaged", "inProgress", { ...on("work.started"), intent: "happy" });
  wt("inProgress", "awaitingParts", { ...on("work.partsNeeded") });
  wt("awaitingParts", "inProgress", { ...on("work.partsArrived") });
  wt("inProgress", "workDone", { ...on("work.completed"), actions: [{ emit: "evt_standReturned" }], intent: "happy" });

  // ── Emergency response: an incident's alert levels, the steps of the plan, who is called ──────────────────
  const emergency = b.level("emergencyDesk", "mixed", "Emergency desk", {
    owner: "nod_emergencyResponse",
    subject: "incident.alert",
    caption: "The airport emergency plan: alert levels, the call-out, and who comes."
  });
  const m = (key, node) => b.node(emergency, key, node);
  m("incidentStart", { kind: "initial" });
  m("localStandby", { kind: "state", name: "local standby", category: "waiting" });
  m("fullEmergency", { kind: "state", name: "full emergency", category: "processing" });
  m("aircraftAccident", { kind: "state", name: "aircraft accident", category: "processing" });
  m("standDown", { kind: "state", name: "stand down", outcome: "success", terminal: true });
  m("callOutStart", { kind: "start" });
  m("callOut", { kind: "parallel", name: "call out" });
  m("callFire", { kind: "emit", name: "fire and rescue", event: "evt_emergencyDeclared" });
  m("callHospitals", {
    kind: "call",
    name: "the hospitals",
    endpoint: b.endpoint("POST", "/emergency/hospitals", "Alert the hospitals")
  });
  m("callPolice", { kind: "call", name: "the police", party: P("borderPolice") });
  m("calledOut", { kind: "join" });
  m("callOutEnd", { kind: "end" });
  m("tower", { kind: "external", name: "Tower", party: P("atc") });
  m("fireStation", { kind: "service", name: "Fire station", party: P("fireRescue") });
  const me = (from, to, fields = {}) => b.edge(emergency, `nod_${from}`, `nod_${to}`, fields);
  me("incidentStart", "localStandby", { kind: "transition" });
  me("localStandby", "fullEmergency", { kind: "transition", ...on("emergency.escalated"), by: P("atc") });
  me("fullEmergency", "aircraftAccident", {
    kind: "transition",
    ...on("aircraft.accident"),
    by: P("atc"),
    intent: "failure"
  });
  me("localStandby", "standDown", { kind: "transition", ...on("aircraft.landedSafely"), intent: "happy" });
  me("fullEmergency", "standDown", { kind: "transition", ...on("aircraft.landedSafely"), intent: "happy" });
  me("aircraftAccident", "standDown", { kind: "transition", ...on("emergency.closed") });
  me("callOutStart", "callOut");
  me("callOut", "callFire");
  me("callOut", "callHospitals");
  me("callOut", "callPolice");
  me("callFire", "calledOut");
  me("callHospitals", "calledOut");
  me("callPolice", "calledOut");
  me("calledOut", "callOutEnd");
  me("tower", "fireStation", { kind: "command", label: "crash alarm" });

  // ── The operations database's integrations ─────────────────────────────────
  const aodb = b.level("aodbIntegrations", "system", "Operations database", {
    owner: "nod_aodb",
    caption: "One record per flight; adapters translate each partner's messages into it."
  });
  const core = b.node(aodb, "flightRecord", { kind: "store", name: "Flight record", summary: "PostgreSQL · 7 years" });
  const bus = b.node(aodb, "aodbBus", { kind: "queue", name: "Integration bus", summary: "AMQP" });
  b.edge(aodb, bus, core, { kind: "data" });
  for (const [key, name, summary] of [
    ["ssimAdapter", "Schedule adapter", "SSIM · seasonal"],
    ["mvtAdapter", "Movement adapter", "IATA MVT · LDM"],
    ["acdmAdapter", "A-CDM adapter", "DPI · to the network manager"],
    ["radarAdapter", "Surveillance adapter", "ADS-B · A-SMGCS"],
    ["metAdapter", "Weather adapter", "METAR · TAF"],
    ["billingAdapter", "Billing export", "monthly"],
    ["fidsAdapter", "Displays feed", "pushed · 2 s"],
    ["legacyFeed", "Old displays feed", "FTP · polled every 60 s"]
  ]) {
    const id = b.node(aodb, key, {
      kind: "service",
      name,
      summary,
      ...(key === "legacyFeed" ? { provenance: "legacy", confidence: "low" } : {})
    });
    b.edge(aodb, id, bus, {
      kind: key.endsWith("Feed") || key.startsWith("fids") || key.startsWith("billing") ? "data" : "event"
    });
  }

  // ── The turnaround procedure: a catalog action's flow ──────────────────────
  const run = b.action("Run the turnaround", {
    party: P("groundHandler"),
    emits: [b.event("turnaround.completed")],
    description: "Everything that happens to an aircraft between on-block and off-block."
  });
  const proc = b.level("turnaroundProcedure", "flow", "Turnaround procedure", { owner: run });
  const tp = (key, node) => b.node(proc, key, node);
  tp("procStart", { kind: "start" });
  tp("onBlockChocks", { kind: "assign", name: "chocks and cones", set: { "vars.safe": true } });
  tp("teams", { kind: "parallel", name: "all teams" });
  tp("procDeboard", { kind: "wait", name: "deboarded", on: ["evt_deboardingCompleted"] });
  tp("procClean", { kind: "wait", name: "cleaned", on: ["evt_cleaningCompleted"] });
  tp("procCater", { kind: "wait", name: "catered", on: ["evt_cateringCompleted"] });
  tp("procOffload", { kind: "wait", name: "holds empty", on: ["evt_offloadCompleted"] });
  tp("procLoad", { kind: "wait", name: "holds closed", on: ["evt_holdsClosed"] });
  tp("procFuel", { kind: "wait", name: "fuelled", on: ["evt_fuelCompleted"] });
  tp("teamsDone", { kind: "join", name: "all done" });
  tp("procDone", { kind: "emit", name: "turnaround completed", event: "evt_turnaroundCompleted" });
  tp("procEnd", { kind: "end", outcome: "success" });
  tp("procHandler", { kind: "participant", party: P("groundHandler") });
  const pe = (from, to, fields = {}) => b.edge(proc, `nod_${from}`, `nod_${to}`, fields);
  pe("procStart", "onBlockChocks");
  pe("onBlockChocks", "teams");
  for (const team of ["procDeboard", "procCater", "procOffload", "procFuel"]) pe("teams", team);
  pe("procDeboard", "procClean");
  pe("procOffload", "procLoad");
  for (const last of ["procClean", "procCater", "procLoad", "procFuel"]) pe(last, "teamsDone");
  pe("teamsDone", "procDone");
  pe("procDone", "procEnd");
  b.lane(proc, "rampLane", "Ramp", ["nod_procOffload", "nod_procLoad"], P("groundHandler"));
  b.lane(proc, "cabinLane", "Cabin", ["nod_procDeboard", "nod_procClean", "nod_procCater"], P("cleaning"));
  // The turnaround starts the procedure as its passengers' region begins.
  b.commands.push({
    type: "edge.update",
    args: { id: b.firstOf("rgn_passengersRegion"), set: { actions: [{ action: run }] } }
  });
}
