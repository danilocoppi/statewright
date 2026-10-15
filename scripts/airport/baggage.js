// Baggage: the belt network of all four terminals on one level — every collector, merge, screening machine, sorter,
// diverter and make-up lateral, about 520 boxes and 600 belts, placed by hand in one band per terminal — the life of
// a bag, and lost and found.

const TERMINALS = ["A", "B", "C", "D"];
const ISLANDS = 6;
const COUNTERS = 12;
const STEP = 80;
const ISLAND = COUNTERS * STEP;
const EDS = 6;
const LATERALS = 16;

export function baggage(b) {
  const P = key => `pty_${key}`;
  const net = b.level("beltNetwork", "system", "Belt network", {
    owner: "nod_baggageHandling",
    caption: "Every belt of the four terminals. Bags flow left to right: drop, merge, screen, sort, make up."
  });
  const bagFlow = b.events("bag.moved");
  const belt = (from, to, extra = {}) => b.edge(net, from, to, { kind: "data", ...extra });

  // Columns of the band, left to right; rows inside each terminal's band.
  const X = { counter: 0, merge: 260, main: 520, eds: 820, level3: 1080, sorter: 1340, diverter: 1600, lateral: 1880 };
  const BAND = ISLANDS * ISLAND + 300;
  const shared = [];

  TERMINALS.forEach((terminal, t) => {
    const top = t * BAND;
    const sorter = b.node(net, `sorter${terminal}`, {
      kind: "service",
      name: `Sorter ${terminal}`,
      summary: "tilt-tray · 12,000 bags/h",
      party: P("bhs")
    });
    b.place(net, sorter, X.sorter, top + BAND / 2);

    // Check-in islands: eight collectors each, into one merge.
    const mainLine = [];
    for (let island = 1; island <= ISLANDS; island += 1) {
      const merge = b.node(net, `merge${terminal}${island}`, {
        kind: "queue",
        name: `Merge ${terminal}${island}`,
        summary: "accumulation · 40 bags"
      });
      const middle = top + (island - 1) * ISLAND + ISLAND / 2;
      b.place(net, merge, X.merge, middle);
      for (let counter = 1; counter <= COUNTERS; counter += 1) {
        const collector = b.node(net, `collector${terminal}${island}x${counter}`, {
          kind: "service",
          name: `Collector ${terminal}${island}-${counter}`,
          ...(counter === COUNTERS ? { summary: "out-of-gauge chute" } : {})
        });
        b.place(net, collector, X.counter, top + (island - 1) * ISLAND + (counter - 1) * STEP);
        belt(collector, merge, counter === 1 ? { events: bagFlow } : {});
      }
      const line = b.node(net, `mainLine${terminal}${island}`, {
        kind: "service",
        name: `Main line ${terminal}${island}`,
        summary: `${180 + island * 15} m`
      });
      b.place(net, line, X.main, middle);
      belt(merge, line);
      mainLine.push(line);
    }
    // Lines feed the next one as well: when one stops, bags take the other.
    mainLine.slice(1).forEach((line, index) => belt(mainLine[index], line, { label: "bypass" }));

    // Screening: every line reaches every machine of its pair; uncleared bags go to level 3.
    const level3 = b.node(net, `levelThree${terminal}`, {
      kind: "service",
      name: `Level 3 screening ${terminal}`,
      party: P("security"),
      summary: "operator review · CT"
    });
    b.place(net, level3, X.level3, top + BAND / 2 - 400);
    const reconcile = b.node(net, `reconcile${terminal}`, {
      kind: "store",
      name: `Reconciliation ${terminal}`,
      summary: "bags held for a decision"
    });
    b.place(net, reconcile, X.level3, top + BAND / 2 + 400);
    for (let machine = 1; machine <= EDS; machine += 1) {
      const eds = b.node(net, `eds${terminal}${machine}`, {
        kind: "service",
        name: `EDS ${terminal}${machine}`,
        party: P("security"),
        summary: machine % 3 === 0 ? "standard 3 · CT" : "standard 3 · CT\n1,800 bags/h",
        ...(terminal === "D" && machine > 4 ? { provenance: "proposed" } : {})
      });
      b.place(net, eds, X.eds, top + (machine - 1) * ISLAND + ISLAND / 2);
      belt(mainLine[machine - 1], eds);
      belt(mainLine[machine % ISLANDS], eds, { label: "alternate" });
      belt(eds, sorter, { label: "cleared" });
      belt(eds, level3, { label: "alarm", events: b.events("screening.alarm") });
    }
    belt(level3, sorter, { label: "cleared" });
    belt(level3, reconcile, { label: "rejected" });

    // Sorting: diverters to laterals, where bags are built into containers per flight.
    for (let lateral = 1; lateral <= LATERALS; lateral += 1) {
      const diverter = b.node(net, `diverter${terminal}${lateral}`, {
        kind: "service",
        name: `Diverter ${terminal}${lateral}`
      });
      b.place(net, diverter, X.diverter, top + (lateral - 1) * (BAND / LATERALS));
      const make = b.node(net, `lateral${terminal}${lateral}`, {
        kind: "store",
        name: `Make-up ${terminal}${lateral}`,
        summary: lateral <= 4 ? "wide-body · 6 ULDs" : "narrow-body · carts",
        party: P("groundHandler")
      });
      b.place(net, make, X.lateral, top + (lateral - 1) * (BAND / LATERALS));
      belt(sorter, diverter);
      belt(diverter, make, lateral === 1 ? { events: b.events("bag.sorted") } : {});
    }
    shared.push({ terminal, sorter, top });
  });

  // What all terminals share: the early bag store, transfer inputs, manual encoding, arrivals.
  const right = 2300;
  const ebs = b.node(net, "earlyBagStore", {
    kind: "store",
    name: "Early bag store",
    summary: "2,400 positions · bags more than 3 h early",
    party: P("bhs")
  });
  b.place(net, ebs, right, 9400);
  const encoding = b.node(net, "manualEncoding", {
    kind: "service",
    name: "Manual encoding",
    summary: "unread tags",
    party: P("baggageOps")
  });
  b.place(net, encoding, right, 9000);
  const problem = b.node(net, "problemBags", { kind: "store", name: "Problem bags", party: P("baggageOps") });
  b.place(net, problem, right, 9800);
  for (const { sorter, terminal, top } of shared) {
    belt(sorter, ebs, { label: "early" });
    belt(ebs, sorter, { label: "released" });
    belt(sorter, encoding, { label: "no read" });
    belt(encoding, sorter);
    belt(sorter, problem, { label: "no flight" });
    // Transfer inputs: bags from arriving flights go straight to a sorter.
    for (let input = 1; input <= 2; input += 1) {
      const transfer = b.node(net, `transfer${terminal}${input}`, {
        kind: "service",
        name: `Transfer input ${terminal}${input}`,
        summary: "from the apron"
      });
      b.place(net, transfer, X.eds, top + BAND - 220 + (input - 1) * 110);
      belt(transfer, sorter, { events: b.events("bag.transferred") });
    }
  }
  // Sorters reach each other through the tunnel loop.
  shared.forEach(({ sorter }, index) => belt(sorter, shared[(index + 1) % shared.length].sorter, { label: "tunnel" }));

  // Arrivals: twelve reclaim belts, fed from the apron.
  const apron = b.node(net, "arrivalsApron", { kind: "actor", name: "Arrivals crew", party: P("groundHandler") });
  b.place(net, apron, right + 380, 1300);
  for (let reclaim = 1; reclaim <= 12; reclaim += 1) {
    const carousel = b.node(net, `reclaim${reclaim}`, {
      kind: "service",
      name: `Reclaim ${reclaim}`,
      summary: reclaim > 10 ? "oversize" : "carousel"
    });
    b.place(net, carousel, right + 700, (reclaim - 1) * 240);
    belt(apron, carousel);
  }
  b.note(net, "beltNote", "Terminal D's last two screening machines are proposed: until then its bags take C's.", {
    target: "nod_edsD5",
    tone: "warning"
  });

  // ── A bag, from the drop to the hold ───────────────────────────────────────
  const bag = b.level("bagLifecycle", "machine", "Bag lifecycle", {
    owner: "nod_bags",
    subject: "bag.status",
    transitions: "complete",
    caption: "IATA Resolution 753: every bag is tracked at acceptance, loading, transfer and arrival."
  });
  const s = (key, name, extra = {}) => b.node(bag, key, { kind: "state", name, ...extra });
  b.node(bag, "bagStart", { kind: "initial" });
  b.node(bag, "dropBag", {
    kind: "entry",
    name: "POST /bags",
    via: b.endpoint("POST", "/bags", "Accept a bag", { party: P("bhs") }),
    by: P("passenger")
  });
  s("accepted", "accepted", { category: "waiting" });
  s("inSystem", "in the system", { category: "processing" });
  s("screening", "screening", { category: "processing" });
  b.node(bag, "screenResult", { kind: "choice", name: "cleared?" });
  s("levelThree", "level 3 review", { category: "hold" });
  s("rejectedBag", "rejected", { outcome: "failure", terminal: true });
  s("sorting", "sorting", { category: "processing" });
  s("stored", "in the early bag store", { category: "waiting" });
  s("unread", "manual encoding", { category: "hold" });
  s("madeUp", "in a container", { category: "waiting" });
  s("loaded", "loaded", { category: "waiting" });
  s("flown", "flown", { outcome: "success", terminal: true });
  s("offloadedBag", "offloaded", { category: "hold" });
  s("mishandled", "mishandled", { outcome: "failure", terminal: true });
  const bt = (from, to, fields = {}) => b.edge(bag, `nod_${from}`, `nod_${to}`, fields);
  const on = (...names) => ({ on: b.events(...names) });
  bt("bagStart", "accepted");
  bt("dropBag", "accepted", { actions: [{ emit: "evt_bagSourceMessage" }] });
  bt("accepted", "inSystem", { ...on("bag.inducted"), intent: "happy" });
  bt("inSystem", "screening", { ...on("bag.screened"), intent: "happy" });
  bt("screening", "screenResult", { always: true });
  bt("screenResult", "sorting", {
    guard: { guard: b.guard("Cleared", "The machine or an operator cleared the bag.") },
    intent: "happy"
  });
  bt("screenResult", "levelThree", { else: true });
  bt("levelThree", "sorting", { ...on("bag.cleared"), by: P("security") });
  bt("levelThree", "rejectedBag", { ...on("bag.rejected"), by: P("security"), intent: "failure" });
  bt("sorting", "madeUp", { ...on("bag.sorted"), intent: "happy" });
  bt("sorting", "stored", { ...on("bag.early") });
  bt("stored", "sorting", { ...on("bag.released") });
  bt("sorting", "unread", { ...on("bag.noRead") });
  bt("unread", "sorting", { ...on("bag.encoded"), by: P("baggageOps") });
  bt("madeUp", "loaded", { ...on("bag.loaded"), by: P("groundHandler"), intent: "happy" });
  bt("loaded", "flown", { ...on("aircraft.airborne"), intent: "happy" });
  bt("loaded", "offloadedBag", { ...on("bags.offloaded"), by: P("groundHandler") });
  bt("offloadedBag", "sorting", { ...on("bag.reflighted") });
  bt("offloadedBag", "mishandled", { after: b.timer("rush window", "PT2H"), intent: "failure" });
  b.node(bag, "bagPassenger", { kind: "participant", party: P("passenger") });
  b.node(bag, "bagHandler", { kind: "participant", party: P("groundHandler") });

  // ── Lost and found ─────────────────────────────────────────────────────────
  const lost = b.level("lostItem", "machine", "Lost item", {
    owner: "nod_lostAndFound",
    subject: "item.status",
    stage: "target"
  });
  b.chain(
    lost,
    [
      ["lostStart", { kind: "initial" }],
      ["reported", { kind: "state", name: "reported", category: "waiting" }],
      ["matched", { kind: "state", name: "matched", category: "processing" }],
      ["returned", { kind: "state", name: "returned", outcome: "success", terminal: true }]
    ],
    index => (index === 0 ? {} : { on: b.events(["item.matched", "item.collected"][index - 1]) })
  );
  b.node(lost, "unclaimed", { kind: "state", name: "unclaimed", outcome: "stopped", terminal: true });
  b.edge(lost, "nod_reported", "nod_unclaimed", { after: b.timer("keep for", "P90D") });
}
