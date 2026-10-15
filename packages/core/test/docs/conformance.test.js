// The guide's conformance (source-of-truth spec §6, §8, §10): the driver it shows is the fixture's, its JavaScript
// writes the results it shows, its report is what conform says of the planted bug, and its reference loop in Python
// runs against a Python twin of the booking service (when python3 is on the machine).
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { conformOf, runVectors, toConformReport } from "../../src/conform/index.js";
import { stringifyContract, toContract } from "../../src/contract/index.js";
import { parse } from "../../src/serialize/parse.js";
import { workspace } from "../cli/helpers.js";
import { bookingsDriver } from "../fixtures/bookings-api/driver.js";
import { readExample } from "../helpers.js";

const source = readFileSync(new URL("../../../../docs/guide/README.md", import.meta.url), "utf8");
const FIXTURE = fileURLToPath(new URL("../fixtures/bookings-api/", import.meta.url));
const PYTHON = spawnSync("python3", ["--version"]).status === 0;

/** The code block that follows a `<!-- checked:name -->` marker in the guide. */
function checkedBlock(name) {
  const match = new RegExp(`<!-- checked:${name} -->\\s*\`\`\`[a-z]*\\n([\\s\\S]*?)\\n\`\`\``).exec(source);
  if (!match) throw new Error(`No checked:${name} block in the guide`);
  return match[1];
}

const bookings = () => parse(readExample("bookings.sttw")).doc;

/** A system's directory: the bookings contract under design/, and the service beside its driver. */
async function system(files) {
  const dir = await workspace();
  mkdirSync(join(dir, "design"));
  writeFileSync(join(dir, "design/bookings.contract.json"), stringifyContract((await toContract(bookings())).contract));
  for (const file of files) copyFileSync(join(FIXTURE, file), join(dir, file));
  return dir;
}

describe("the guide's conformance (source-of-truth spec §6, §8)", () => {
  it("has its sections: Conformance beside the contract, and the playbook Build from the design", () => {
    for (const heading of ["### Conformance", "### Build from the design"]) expect(source).toContain(`\n${heading}\n`);
    const section = source.slice(source.indexOf("\n### Conformance\n"), source.indexOf("\n## Rules for AI agents\n"));
    const said = section.replace(/\s+/g, " ");
    for (const words of [
      "What connects the vectors to the code is a **driver**, written once per machine",
      "`expect((await runVector(vector, driver)).failure).toBeUndefined()`",
      "`steps[0]` at the start, `steps[n]` after step `n`, or `error` with the message of a step that threw",
      "npx statewright conform design/bookings.sttw design/bookings.results.json --write",
      "A step whose states differ is a `high` finding (`diverged`) on the transition the design fires there",
      "the Editor shows them as badges on the canvas",
      "The exit code is 1 when a step diverged or threw, when no vector ran, or when the results are for another version"
    ]) {
      expect(said).toContain(words);
    }
    expect(source).toContain("| Conform    | `conformOf(doc, results)`");
    expect(source).toMatch(
      /\| `conform <file> <results> \[--write\]` +\| Compares .* \(see \[Conformance\]\(#conformance\)\)/
    );
  });

  it("shows the fixture's driver, and a run that writes the results it shows", async () => {
    expect(checkedBlock("conform-driver")).toBe(readFileSync(join(FIXTURE, "driver.js"), "utf8").trimEnd());
    const dir = await system(["bookings.js", "driver.js"]);
    const entry = pathToFileURL(fileURLToPath(new URL("../../src/conform/index.js", import.meta.url))).href;
    writeFileSync(
      join(dir, "run.mjs"),
      checkedBlock("conform-run").replace('from "statewright/conform"', `from "${entry}"`)
    );
    const run = spawnSync(process.execPath, ["run.mjs"], { cwd: dir, encoding: "utf8" });
    expect(run.stderr).toBe("");
    const written = JSON.parse(readFileSync(join(dir, "design/bookings.results.json"), "utf8"));
    expect(written).toEqual(JSON.parse(checkedBlock("conform-results")));
    const { contract } = await toContract(bookings());
    expect(written).toEqual(await runVectors(contract, bookingsDriver(), { only: "booking.status", runner: "node" }));
  });

  it("shows the report conform gives when guest.arrived no longer seats the guest", async () => {
    const { contract } = await toContract(bookings());
    const results = await runVectors(contract, bookingsDriver({ plantedBug: true }), {
      only: "booking.status",
      runner: "node"
    });
    expect(checkedBlock("conform-report")).toBe(toConformReport(await conformOf(bookings(), results)).trimEnd());
  });

  it.skipIf(!PYTHON)("runs the reference loop in Python against the Python twin of the booking service", async () => {
    const dir = await system(["bookings.py", "driver.py"]);
    writeFileSync(join(dir, "run_vectors.py"), `${checkedBlock("conform-python")}\n`);
    const args = ["run_vectors.py", "design/bookings.contract.json", "design/bookings.results.json", "booking.status"];
    const run = spawnSync("python3", args, { cwd: dir, encoding: "utf8" });
    expect(run.stderr).toBe("");
    const results = JSON.parse(readFileSync(join(dir, "design/bookings.results.json"), "utf8"));
    expect({ ...results, runner: "node" }).toEqual(JSON.parse(checkedBlock("conform-results")));
    expect((await conformOf(bookings(), results)).summary).toMatchObject({ passed: 3, notRun: 2, diverged: 0 });
    expect(checkedBlock("conform-python").split("\n").length).toBeLessThanOrEqual(50);
  });

  it.skipIf(!PYTHON)(
    "takes one state name from a Python driver as JavaScript does, and refuses an only that names no level",
    async () => {
      const dir = await system(["bookings.py", "driver.py"]);
      writeFileSync(join(dir, "run_vectors.py"), `${checkedBlock("conform-python")}\n`);
      const driver = readFileSync(join(dir, "driver.py"), "utf8");
      writeFileSync(
        join(dir, "driver.py"),
        driver.replace(
          'return [handle["service"].status(handle["id"])]',
          'return handle["service"].status(handle["id"])'
        )
      );
      const args = ["run_vectors.py", "design/bookings.contract.json", "design/bookings.results.json"];
      expect(spawnSync("python3", [...args, "booking.status"], { cwd: dir, encoding: "utf8" }).stderr).toBe("");
      const results = JSON.parse(readFileSync(join(dir, "design/bookings.results.json"), "utf8"));
      expect({ ...results, runner: "node" }).toEqual(JSON.parse(checkedBlock("conform-results")));
      const typo = spawnSync("python3", [...args, "bookings.status"], { cwd: dir, encoding: "utf8" });
      expect(typo.status).toBe(1);
      expect(typo.stderr).toBe("bookings.status is no level ID or subject of the contract\n");
    }
  );

  it("builds from the design as its playbook says, and the map is proved the same way", () => {
    const playbook = source.slice(
      source.indexOf("\n### Build from the design\n"),
      source.indexOf("\n### Design a new flow (target)\n")
    );
    const said = playbook.replace(/\s+/g, " ");
    for (const words of [
      "**1. Keep the design and its contract beside the code.**",
      "statewright contract design/bookings.sttw -o design/bookings.contract.json",
      "**2. Read what changed, and implement it.** `statewright contract design/bookings.sttw --since design/bookings.contract.json`",
      "**3. Write the driver, once per machine.**",
      "**4. Run conformance, and show what differs.** `statewright conform design/bookings.sttw design/bookings.results.json --write`",
      "which the Editor shows on the canvas",
      "**5. Keep them aligned in CI.** Run `statewright contract <design> --check <contract>`"
    ]) {
      expect(said).toContain(words);
    }
    expect(source.replace(/\s+/g, " ")).toContain(
      "To prove it, run their vectors through the code, as [Conformance](#conformance) shows"
    );
  });
});
