// The airfield: two runways, their taxiways, holding points and stop bars as the surface movement guidance system
// sees them — and the boarding every gate does, one definition for the 64 gates.

const RUNWAYS = [
  ["07L/25R", "rwy07L", 3900],
  ["07R/25L", "rwy07R", 3500]
];

export function airfield(b) {
  const P = key => `pty_${key}`;
  const field = b.node(b.root, "airfield", {
    kind: "service",
    name: "Airfield guidance",
    summary: "A-SMGCS · 2 runways · 64 taxiways",
    party: P("apoc")
  });
  b.edge(b.root, field, "nod_airTrafficControl", { kind: "data", label: "surface picture" });
  b.edge(b.root, "nod_airTrafficControl", field, { kind: "command", label: "stop bars · routes" });

  const level = b.level("airfieldSurface", "system", "Airfield surface", {
    owner: field,
    caption: "Every taxiway segment, holding point and stop bar the guidance system routes aircraft through."
  });
  const tower = b.node(level, "groundController", { kind: "actor", name: "Ground controller", party: P("atc") });
  const router = b.node(level, "routeService", { kind: "service", name: "Routing", summary: "conflict-free routes" });
  b.edge(level, tower, router, { kind: "command" });
  b.place(level, tower, -600, 1200);
  b.place(level, router, -300, 1200);
  RUNWAYS.forEach(([name, key, length], r) => {
    const runway = b.node(level, key, { kind: "store", name: `Runway ${name}`, summary: `${length} m · CAT III` });
    b.place(level, runway, 0, r * 2600 + 1200);
    b.edge(level, router, runway, { kind: "command" });
    // Parallel taxiway in 16 segments, each with a holding point and a stop bar onto the runway.
    let previous = null;
    for (let segment = 1; segment <= 16; segment += 1) {
      const letter = r === 0 ? "A" : "B";
      const taxiway = b.node(level, `taxi${letter}${segment}`, {
        kind: "service",
        name: `Taxiway ${letter}${segment}`,
        summary: segment % 4 === 0 ? "rapid exit" : "parallel"
      });
      const hold = b.node(level, `hold${letter}${segment}`, {
        kind: "queue",
        name: `Holding point ${letter}${segment}`,
        summary: segment % 4 === 0 ? "CAT III" : "CAT I"
      });
      const bar = b.node(level, `stopBar${letter}${segment}`, {
        kind: "service",
        name: `Stop bar ${letter}${segment}`,
        ...(segment === 9 && r === 1 ? { provenance: "defect", summary: "fails to clear · NOTAM" } : {})
      });
      const x = 300 + (segment - 1) * 230;
      const y = r * 2600;
      b.place(level, taxiway, x, y + 400);
      b.place(level, hold, x, y + 800);
      b.place(level, bar, x, y + 1100);
      if (previous) b.edge(level, previous, taxiway, { kind: "data" });
      b.edge(level, taxiway, hold, { kind: "data" });
      b.edge(level, hold, bar, { kind: "data" });
      b.edge(level, bar, runway, { kind: "data" });
      b.edge(level, router, bar, { kind: "command" });
      // Link taxiways to the aprons.
      if (segment % 2 === 1) {
        const link = b.node(level, `link${letter}${segment}`, {
          kind: "service",
          name: `Link ${letter}${segment}`,
          summary: "to the apron"
        });
        b.place(level, link, x, y);
        b.edge(level, link, taxiway, { kind: "data" });
      }
      previous = taxiway;
    }
  });
  // Cross-field taxiways join the two parallels.
  for (const segment of [3, 7, 11, 15]) {
    const cross = b.node(level, `cross${segment}`, { kind: "service", name: `Crossing ${segment}` });
    b.place(level, cross, 300 + (segment - 1) * 230 + 110, 1950);
    b.edge(level, `nod_taxiA${segment}`, cross, { kind: "data" });
    b.edge(level, cross, `nod_taxiB${segment}`, { kind: "data" });
  }

  // ── Boarding at a gate: one definition, given to every gate ────────────────
  const gates = Object.values(b.gates ?? {});
  const first = gates[0];
  const flow = b.level("gateBoarding", "flow", "Gate boarding", { owner: first });
  b.chain(flow, [
    ["gateStart", { kind: "start" }],
    ["gateBridge", { kind: "call", name: "dock the jet bridge", party: P("groundHandler") }],
    ["gateBoardingList", { kind: "call", name: "load the boarding list", endpoint: "ept_boardingList" }],
    ["gateGroups", { kind: "forEach", name: "each boarding group", items: { var: "vars.groups" }, as: "group" }],
    ["gateClose", { kind: "emit", name: "gate closed", event: "evt_gateClosed" }],
    ["gateRetract", { kind: "call", name: "retract the bridge", party: P("groundHandler") }],
    ["gateEnd", { kind: "end", outcome: "success" }]
  ]);
  const group = b.level("boardOneGroup", "flow", "Board one group", { owner: "nod_gateGroups" });
  b.chain(group, [
    ["groupStart", { kind: "start" }],
    ["callGroup", { kind: "call", name: "call the group", endpoint: "ept_announce" }],
    [
      "groupWait",
      { kind: "wait", name: "the group has boarded", on: ["evt_passengerBoarded"], after: "tmr_pagingInterval" }
    ],
    ["groupEnd", { kind: "end" }]
  ]);
  b.commands.push({
    type: "definition.extract",
    args: { owner: first, name: "Gate boarding", id: "def_gateBoarding" }
  });
  for (const gate of gates.slice(1)) {
    b.commands.push({ type: "definition.instantiate", args: { owner: gate, definition: "def_gateBoarding" } });
  }
}
