// Builds examples/airport-operations.sttw: an international airport, as large and as detailed as a real one — the
// example that shows every part of the format at once and that the Editor's performance is measured against. Every
// element is made with Core's commands (so the document is what the Editor and agents would make), the big levels are
// placed by hand in readable grids, the others by Core's auto-layout, and the scenarios are recorded by the simulator.
//
//   node scripts/airport/build.js        (then npm run examples:normalize, if the file changed)
import { writeFile } from "node:fs/promises";

import { applyBatch, check, createDocument, sign, stringify } from "statewright";
import { autoLayout } from "statewright/layout";

import { airfield } from "./airfield.js";
import { airside } from "./airside.js";
import { baggage } from "./baggage.js";
import { createBuilder } from "./builder.js";
import { flights } from "./flights.js";
import { landside } from "./landside.js";
import { overview } from "./overview.js";
import { review } from "./review.js";
import { stands } from "./stands.js";
import { recordScenarios } from "./scenarios.js";

const OUT = new URL("../../examples/airport-operations.sttw", import.meta.url);

const doc = createDocument({ name: "Airport operations" });
doc.project.id = "prj_airportOperations";
doc.project.description =
  "An international airport of four terminals: who works with whom, every flight from slot to on-block, each bag " +
  "from the drop to the hold, 120 stands, the turnaround at each of them, security, borders, de-icing and the desk " +
  "that handles what goes wrong.";

const build = createBuilder(doc);
overview(build);
flights(build);
baggage(build);
stands(build);
landside(build);
airside(build);
airfield(build);

let built = applyBatch(doc, build.commands).doc;

// Every level the builders did not place by hand is placed by Core's auto-layout, as the Editor would.
for (const id of Object.keys(built.canvases)) {
  if (build.placed.has(id)) continue;
  const commands = await autoLayout(built, id);
  if (commands.length) built = applyBatch(built, commands).doc;
}

built = recordScenarios(built);
built = applyBatch(built, review(built)).doc;

const problems = check(built);
const errors = problems.filter(problem => problem.severity === "error");
if (errors.length) {
  for (const problem of errors.slice(0, 40)) console.error(`${problem.code} ${problem.target}: ${problem.message}`);
  throw new Error(`${errors.length} errors`);
}

const counts = Object.values(built.canvases).reduce(
  (sum, canvas) => ({
    levels: sum.levels + 1,
    nodes: sum.nodes + Object.keys(canvas.nodes).length,
    edges: sum.edges + Object.keys(canvas.edges).length
  }),
  { levels: 0, nodes: 0, edges: 0 }
);
const catalog = Object.values(built.catalog).reduce((sum, items) => sum + Object.keys(items).length, 0);
await writeFile(OUT, stringify(await sign(built, { channel: "cli" })));
console.log(
  `airport-operations.sttw: ${counts.levels} levels, ${counts.nodes} boxes, ${counts.edges} arrows, ` +
    `${catalog} catalog items, ${Object.keys(built.definitions ?? {}).length} definitions, ` +
    `${problems.length} problems (${problems.filter(problem => problem.severity === "warning").length} warnings)`
);
