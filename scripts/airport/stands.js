// Stands and gates: 120 stands on five aprons, each an instance of one reusable lifecycle, and the 64 gates that board
// the contact stands — placed by hand, apron by apron.

const APRONS = [
  ["1", "Apron 1 · terminal A", "A", true],
  ["2", "Apron 2 · terminal B", "B", true],
  ["3", "Apron 3 · terminal C", "C", true],
  ["4", "Apron 4 · terminal D", "D", true],
  ["5", "Apron 5 · remote", null, false]
];
const PER_APRON = 24;
const COLUMN = 210;
const ROW = 620;

export function stands(b) {
  const P = key => `pty_${key}`;
  const plan = b.level("standPlan", "system", "Stands and gates", {
    owner: "nod_resourceManagement",
    caption: "120 stands on five aprons. Contact stands are boarded through their gate; remote ones by bus."
  });
  const planner = b.node(plan, "standPlanner", { kind: "actor", name: "Stand planner", party: P("apoc") });
  b.place(plan, planner, -900, 1200);
  const allocator = b.node(plan, "standAllocator", {
    kind: "service",
    name: "Stand allocator",
    summary: "rules · constraints · preferences",
    party: P("apoc")
  });
  b.place(plan, allocator, -560, 1200);
  b.edge(plan, planner, allocator, { kind: "command", endpoint: "ept_allocateAStand" });
  const buses = b.node(plan, "apronBuses", {
    kind: "service",
    name: "Apron buses",
    summary: "34 buses",
    party: P("groundHandler")
  });
  b.place(plan, buses, -160, 4 * ROW + 420);

  const standIds = [];
  APRONS.forEach(([apron, name, terminal, contact], row) => {
    const head = b.node(plan, `apron${apron}`, { kind: "service", name, summary: `${PER_APRON} stands` });
    b.place(plan, head, -160, row * ROW + 200);
    b.edge(plan, allocator, head, { kind: "command" });
    for (let index = 1; index <= PER_APRON; index += 1) {
      const number = `${apron}${String(index).padStart(2, "0")}`;
      const late = apron === "4" && index > 20;
      const stand = b.node(plan, `stand${number}`, {
        kind: "store",
        name: `Stand ${number}`,
        summary:
          late ? "code C · opens 2027"
          : index <= 6 ? "code E · wide-body"
          : "code C",
        ...(late ? { provenance: "proposed" } : {})
      });
      const column = (index - 1) % 12;
      const line = Math.floor((index - 1) / 12);
      b.place(plan, stand, 120 + column * COLUMN, row * ROW + line * 300 + 60);
      b.edge(plan, head, stand, { kind: "data" });
      standIds.push(stand);
      // Two of three contact stands have a gate above them; remote stands are boarded by bus.
      if (contact && index % 3 !== 0) {
        const gate = b.node(plan, `gate${terminal}${index}`, {
          kind: "service",
          name: `Gate ${terminal}${index}`,
          party: P("groundHandler")
        });
        b.place(plan, gate, 120 + column * COLUMN, row * ROW + line * 300 + 180);
        b.gates = { ...(b.gates ?? {}), [gate]: gate };
        b.edge(plan, gate, stand, { kind: "command", label: "jet bridge" });
      } else if (!contact) {
        b.edge(plan, buses, stand, { kind: "command" });
      }
    }
  });

  // The lifecycle every stand shares: built inside the first stand, made a definition, given to the other 119.
  const life = b.level("standLifecycle", "machine", "Stand lifecycle", {
    owner: standIds[0],
    subject: "stand.status",
    transitions: "complete"
  });
  const s = (key, name, extra = {}) => b.node(life, key, { kind: "state", name, ...extra });
  b.node(life, "standStart", { kind: "initial" });
  s("standFree", "free", { category: "waiting" });
  s("standPlanned", "planned", { category: "waiting" });
  s("standOccupied", "occupied", { category: "processing" });
  s("standClearing", "clearing", { category: "processing" });
  s("standBlocked", "out of service", { category: "hold" });
  b.node(life, "standAny", { kind: "any", except: ["nod_standBlocked"] });
  const on = (...names) => ({ on: b.events(...names) });
  const t = (from, to, fields = {}) => b.edge(life, `nod_${from}`, `nod_${to}`, fields);
  t("standStart", "standFree");
  t("standFree", "standPlanned", { ...on("stand.allocated"), intent: "happy" });
  t("standPlanned", "standFree", { ...on("stand.deallocated") });
  t("standPlanned", "standOccupied", { ...on("aircraft.onBlock"), intent: "happy" });
  t("standOccupied", "standClearing", { ...on("aircraft.offBlock"), intent: "happy" });
  t("standClearing", "standFree", { ...on("stand.inspected"), by: P("groundHandler"), intent: "happy" });
  t("standAny", "standBlocked", { ...on("stand.outOfService"), by: P("maintenance") });
  t("standBlocked", "standFree", { ...on("stand.returned"), by: P("maintenance") });
  b.commands.push({
    type: "definition.extract",
    args: { owner: standIds[0], name: "Stand lifecycle", id: "def_standLifecycle" }
  });
  for (const stand of standIds.slice(1)) {
    b.commands.push({ type: "definition.instantiate", args: { owner: stand, definition: "def_standLifecycle" } });
  }
}
