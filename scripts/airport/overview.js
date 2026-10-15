// Level 0: the airport as its operations centre sees it — the people, the airport's own systems, the partners outside,
// and what passes between them.

export function overview(b) {
  const root = b.root;
  b.commands.push({
    type: "canvas.update",
    args: {
      id: root,
      set: {
        name: "Airport operations",
        title: "Airport operations",
        caption:
          "Four terminals, two runways, 120 stands. The operations database is the source of truth for every " +
          "flight; everything else listens to it or feeds it."
      }
    }
  });

  // Who acts.
  const pty = {
    passenger: b.party("passenger", "human", "Passenger"),
    airline: b.party("airline", "external", "Airline"),
    handler: b.party("groundHandler", "operator", "Ground handler"),
    atc: b.party("atc", "external", "Air traffic control"),
    border: b.party("borderPolice", "external", "Border police"),
    security: b.party("security", "operator", "Security screening"),
    apoc: b.party("apoc", "operator", "Airport operations centre"),
    bhsOps: b.party("baggageOps", "operator", "Baggage operations"),
    fuel: b.party("fuelSupplier", "external", "Fuel supplier"),
    caterer: b.party("caterer", "external", "Caterer"),
    cleaning: b.party("cleaning", "operator", "Cabin cleaning"),
    crew: b.party("crew", "human", "Cabin crew"),
    pilot: b.party("pilot", "human", "Pilot in command"),
    fire: b.party("fireRescue", "operator", "Fire and rescue"),
    maintenance: b.party("maintenance", "operator", "Airport maintenance"),
    meteo: b.party("meteo", "external", "Weather service"),
    network: b.party("networkManager", "external", "Network manager"),
    slots: b.party("slotCoordinator", "external", "Slot coordinator"),
    payments: b.party("paymentProvider", "external", "Payment provider"),
    customs: b.party("customs", "external", "Customs"),
    aodb: b.party("aodb", "system", "Operations database"),
    bhs: b.party("bhs", "system", "Baggage handling system"),
    dcs: b.party("dcs", "external", "Airline departure control")
  };

  const box = (key, kind, name, extra = {}) => b.node(root, key, { kind, name, ...extra });

  // The people.
  box("passengerActor", "actor", "Passenger", { party: pty.passenger });
  box("airlineAgent", "actor", "Airline agent", { party: pty.airline });
  box("groundCrew", "actor", "Ground crew", { party: pty.handler, summary: "ramp · pushback · loading" });
  box("pilotActor", "actor", "Pilot", { party: pty.pilot });
  box("apocDuty", "actor", "Duty manager", { party: pty.apoc, summary: "APOC · 24/7" });

  // The partners outside.
  box("airTrafficControl", "external", "Air traffic control", { party: pty.atc, summary: "tower · ground · approach" });
  box("airlineDcs", "external", "Airline DCS", { party: pty.dcs, summary: "check-in · boarding lists · load" });
  box("airlineOpsControl", "external", "Airline ops control", { party: pty.airline });
  box("networkManagerExt", "external", "Network manager", { party: pty.network, summary: "CTOT · flow measures" });
  box("weatherService", "external", "Weather service", { party: pty.meteo, summary: "METAR · TAF · warnings" });
  box("slotCoordination", "external", "Slot coordination", { party: pty.slots });
  box("fuelSupplierExt", "external", "Fuel supplier", { party: pty.fuel });
  box("cateringCompany", "external", "Catering company", { party: pty.caterer });
  box("paymentProviderExt", "external", "Payment provider", { party: pty.payments });
  box("customsExt", "external", "Customs", { party: pty.customs });
  box("borderPoliceExt", "external", "Border police", { party: pty.border });

  // The airport's own systems.
  box("aodb", "service", "Operations database", {
    party: pty.aodb,
    summary: "AODB · the flight of record",
    evidence: [{ kind: "doc", url: "https://www.eurocontrol.int/concept/airport-collaborative-decision-making" }]
  });
  box("fids", "service", "Flight information displays", { summary: "1,400 screens · 9 languages" });
  box("resourceManagement", "service", "Stands and gates", { party: pty.apoc, summary: "120 stands · 64 gates" });
  box("checkIn", "service", "Check-in and bag drop", { party: pty.handler });
  box("securityScreening", "service", "Security screening", { party: pty.security, summary: "38 lanes · CT scanners" });
  box("borderControl", "service", "Border control", { party: pty.border, summary: "e-gates · officers" });
  box("baggageHandling", "service", "Baggage handling", {
    party: pty.bhs,
    summary: "68 km of belts · 4 sorters · 48 EDS"
  });
  box("turnaround", "service", "Turnaround coordination", { party: pty.apoc, summary: "A-CDM milestones" });
  box("boarding", "service", "Boarding", { party: pty.handler });
  box("deIcing", "service", "De-icing", { party: pty.handler, summary: "6 remote pads" });
  box("fuelService", "service", "Into-plane fuelling", { party: pty.fuel });
  box("cleaningService", "service", "Cabin cleaning", { party: pty.cleaning });
  box("passengerApp", "service", "Passenger app", { summary: "iOS · Android · web" });
  box("notifications", "service", "Notifications", { summary: "push · SMS · e-mail" });
  box("billing", "service", "Aeronautical billing", { summary: "landing · parking · passenger fees" });
  box("parking", "service", "Car parks", { summary: "11,000 spaces" });
  box("maintenanceService", "service", "Maintenance", { party: pty.maintenance });
  box("emergencyResponse", "service", "Emergency response", { party: pty.fire });
  box("irregularOps", "service", "Irregular operations desk", { party: pty.apoc });
  box("lostAndFound", "service", "Lost and found", { provenance: "proposed", summary: "replaces the paper log" });
  box("wayfinding", "service", "Wayfinding", { provenance: "legacy", confidence: "low", summary: "static signs only" });

  // What they keep.
  box("flights", "store", "Flights", { party: pty.aodb, summary: "≈1,300 movements a day" });
  box("bags", "store", "Bags", { party: pty.bhs, summary: "≈95,000 a day at peak" });
  box("passengers", "store", "Passengers", { summary: "journeys, not identities" });
  box("workOrders", "store", "Work orders", { party: pty.maintenance });

  // What travels.
  box("flightEvents", "queue", "Flight events", { summary: "Kafka · flight.* · 30 days" });
  box("bagMessages", "queue", "Bag messages", { summary: "BSM · BPM · BTM (IATA RP 1745)" });
  box("alertsQueue", "queue", "Alerts", { summary: "priority ordered" });

  const n = key => `nod_${key}`;
  const link = (from, to, kind, extra = {}) => b.edge(root, n(from), n(to), { kind, ...extra });

  const flightPublished = b.events("flight.updated", "flight.delayed", "flight.cancelled", "gate.changed");
  link("airlineOpsControl", "aodb", "command", {
    endpoint: b.endpoint("POST", "/flights", "Publish a schedule", { party: pty.airline })
  });
  link("slotCoordination", "aodb", "data", { label: "season slots" });
  link("networkManagerExt", "aodb", "event", { events: b.events("ctot.issued", "ctot.revised", "flow.measure") });
  link("airTrafficControl", "aodb", "event", {
    events: b.events("aircraft.landed", "aircraft.airborne", "aircraft.onBlock", "aircraft.offBlock")
  });
  link("weatherService", "aodb", "event", { events: b.events("weather.warning", "weather.observation") });
  link("aodb", "flights", "data");
  link("aodb", "flightEvents", "event", { events: flightPublished });
  link("flightEvents", "fids", "stream");
  link("flightEvents", "passengerApp", "stream");
  link("flightEvents", "resourceManagement", "stream");
  link("flightEvents", "turnaround", "stream");
  link("flightEvents", "billing", "stream", { label: "movements" });
  link("flightEvents", "baggageHandling", "stream", { label: "make-up times" });
  link("flightEvents", "boarding", "stream");
  link("flightEvents", "deIcing", "stream");
  link("flightEvents", "irregularOps", "stream");
  link("resourceManagement", "aodb", "command", {
    endpoint: b.endpoint("PUT", "/flights/{id}/stand", "Allocate a stand", { party: pty.apoc })
  });
  link("turnaround", "aodb", "command", {
    endpoint: b.endpoint("PUT", "/flights/{id}/milestones", "Record a milestone", { party: pty.apoc })
  });
  link("turnaround", "networkManagerExt", "event", { events: b.events("dpi.sent"), label: "departure planning info" });
  link("passengerActor", "passengerApp", "command", { label: "track · board pass" });
  link("passengerActor", "checkIn", "command");
  link("passengerActor", "securityScreening", "command");
  link("passengerActor", "borderControl", "command");
  link("passengerActor", "boarding", "command");
  link("passengerActor", "parking", "command");
  link("passengerActor", "lostAndFound", "command", { label: "report a lost item" });
  link("airlineAgent", "checkIn", "command");
  link("airlineAgent", "boarding", "command");
  link("checkIn", "airlineDcs", "command", {
    endpoint: b.endpoint("POST", "/dcs/checkin", "Check a passenger in", { party: pty.dcs })
  });
  link("checkIn", "baggageHandling", "data", { label: "tagged bags" });
  link("checkIn", "bagMessages", "event", { events: b.events("bag.sourceMessage") });
  link("airlineDcs", "bagMessages", "event", { events: b.events("bag.transferMessage") });
  link("bagMessages", "baggageHandling", "stream");
  link("baggageHandling", "bags", "data");
  link("baggageHandling", "bagMessages", "event", { events: b.events("bag.processed") });
  link("baggageHandling", "alertsQueue", "event", { events: b.events("bag.rush", "bag.jam") });
  link("securityScreening", "passengers", "data");
  link("securityScreening", "alertsQueue", "event", { events: b.events("screening.alarm") });
  link("borderControl", "passengers", "data");
  link("borderControl", "borderPoliceExt", "command", {
    endpoint: b.endpoint("POST", "/border/checks", "Check a traveller", { party: pty.border })
  });
  link("borderControl", "customsExt", "data", { label: "declarations" });
  link("boarding", "airlineDcs", "command", {
    endpoint: b.endpoint("POST", "/dcs/boarded", "Record a boarding", { party: pty.dcs })
  });
  link("boarding", "passengers", "data");
  link("groundCrew", "turnaround", "command", { label: "milestones" });
  link("groundCrew", "boarding", "command", { label: "door closed" });
  link("pilotActor", "turnaround", "command", { label: "ready" });
  link("pilotActor", "airTrafficControl", "command", { label: "start-up · pushback" });
  link("deIcing", "turnaround", "event", { events: b.events("deicing.completed") });
  link("fuelService", "turnaround", "event", { events: b.events("fuel.completed") });
  link("fuelSupplierExt", "fuelService", "command", {
    webhook: b.webhook("Fuel truck events", "in", { party: pty.fuel }),
    kind: "webhook"
  });
  link("cateringCompany", "turnaround", "webhook", {
    webhook: b.webhook("Catering events", "in", { party: pty.caterer })
  });
  link("cleaningService", "turnaround", "event", { events: b.events("cleaning.completed") });
  link("billing", "paymentProviderExt", "command", {
    endpoint: b.endpoint("POST", "/charges", "Charge an operator", { party: pty.payments })
  });
  link("paymentProviderExt", "billing", "webhook", {
    webhook: b.webhook("Payment events", "in", { party: pty.payments })
  });
  link("parking", "paymentProviderExt", "command", { label: "card at exit" });
  link("alertsQueue", "irregularOps", "stream");
  link("alertsQueue", "emergencyResponse", "stream");
  link("alertsQueue", "apocDuty", "stream");
  link("apocDuty", "irregularOps", "command");
  link("apocDuty", "emergencyResponse", "command", { label: "declare" });
  link("irregularOps", "aodb", "command", { label: "cancel · divert · combine" });
  link("irregularOps", "notifications", "command");
  link("notifications", "passengerApp", "event", { events: b.events("passenger.notified") });
  link("emergencyResponse", "airTrafficControl", "command", { label: "runway closed" });
  link("emergencyResponse", "alertsQueue", "event", { events: b.events("emergency.declared", "emergency.closed") });
  link("maintenanceService", "workOrders", "data");
  link("resourceManagement", "maintenanceService", "command", { label: "stand out of service" });
  link("maintenanceService", "resourceManagement", "event", { events: b.events("stand.returned") });
  link("fids", "wayfinding", "data", { provenance: "legacy" });
  link("lostAndFound", "bags", "data", { label: "unclaimed bags", provenance: "proposed" });
  link("passengerApp", "lostAndFound", "command", { provenance: "proposed" });

  b.note(
    root,
    "aodbNote",
    "Everything that knows a time of a flight writes it here first; nothing reads another system's copy.",
    { target: n("aodb"), tone: "info" }
  );
  b.note(root, "wayfindingNote", "Wayfinding still reads the old FIDS feed; it is the last legacy consumer.", {
    target: n("wayfinding"),
    tone: "warning"
  });
  return pty;
}
