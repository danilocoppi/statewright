// `statewright contract` (source-of-truth spec §5, §9): the contract written or printed, what changed since one, and a
// check for CI that exits 1 once the committed contract is no longer the design's.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyBatch, parse, sign, stringify } from "../../src/index.js";
import { cli, workspace } from "./helpers.js";
import { clashingDoc } from "../contract/fixtures.js";

const BOOKINGS = fileURLToPath(new URL("../../../../examples/bookings.statewright.json", import.meta.url));
const PINNED = new URL("../../../../examples/rendered/bookings/contract.json", import.meta.url);

/** A copy of bookings in a fresh directory, with the state `requested` renamed `pending`. */
async function renamed(dir) {
  const doc = parse(await readFile(BOOKINGS, "utf8")).doc;
  const changed = applyBatch(doc, [
    { type: "node.update", args: { id: "nod_requested", set: { name: "pending" } } }
  ]).doc;
  const file = join(dir, "bookings.statewright.json");
  await writeFile(file, stringify(await sign(changed, { channel: "cli" })));
  return file;
}

describe("statewright contract (source-of-truth spec §5)", () => {
  it("prints the design's contract, or writes it with -o", async () => {
    const pinned = await readFile(PINNED, "utf8");
    const printed = await cli(["contract", BOOKINGS]);
    expect(printed).toMatchObject({ code: 0, stdout: pinned, stderr: "" });
    const dir = await workspace();
    const written = await cli(["contract", BOOKINGS, "-o", "bookings.contract.json"], { cwd: dir });
    expect(written.code).toBe(0);
    expect(written.stdout).toBe(`Wrote the contract of ${BOOKINGS} to bookings.contract.json\n`);
    expect(await readFile(join(dir, "bookings.contract.json"), "utf8")).toBe(pinned);
    expect((await cli(["contract", BOOKINGS, "--json"])).json()).toMatchObject({
      ok: true,
      problems: [],
      contract: { contract: "1" }
    });
  });

  it("lists what changed since a contract, a renamed state among it", async () => {
    const dir = await workspace();
    const file = await renamed(dir);
    const since = await cli(["contract", file, "--since", fileURLToPath(PINNED)]);
    expect(since.code).toBe(0);
    expect(since.stdout).toMatch(/^# What changed in the design\n\n/);
    expect(since.stdout).toContain("- **Renamed** state `requested` → `pending` (`nod_requested`) in `cnv_booking`\n");
    const json = (await cli(["contract", file, "--since", fileURLToPath(PINNED), "--json"])).json();
    expect(json).toMatchObject({ ok: true, same: false });
    expect(json.changes).toContainEqual(
      expect.objectContaining({ change: "changed", kind: "state", id: "nod_requested" })
    );
  });

  it("checks a committed contract: exit 0 while it is the design's, exit 1 with the changes once it is not", async () => {
    const current = await cli(["contract", BOOKINGS, "--check", fileURLToPath(PINNED)]);
    expect(current).toMatchObject({ code: 0, stdout: `${fileURLToPath(PINNED)} is the contract of ${BOOKINGS}\n` });
    const dir = await workspace();
    const stale = await cli(["contract", await renamed(dir), "--check", fileURLToPath(PINNED)]);
    expect(stale.code).toBe(1);
    expect(stale.stdout).toContain("- **Renamed** state `requested` → `pending`");
  });

  it("refuses what is not a contract, and options that cannot go together (exit 2)", async () => {
    const dir = await workspace();
    await writeFile(join(dir, "nope.json"), '{ "contract": "9" }');
    const wrong = await cli(["contract", BOOKINGS, "--check", "nope.json"], { cwd: dir });
    expect(wrong).toMatchObject({
      code: 2,
      stderr: "statewright: nope.json is not a contract of format 1 (format 9)\n"
    });
    expect((await cli(["contract", BOOKINGS, "--check", "missing.json"], { cwd: dir })).stderr).toBe(
      "statewright: Cannot read missing.json: no such file\n"
    );
    expect((await cli(["contract", BOOKINGS, "--since", "a.json", "--check", "b.json"])).stderr).toBe(
      "statewright: Give --since or --check, not both\n"
    );
    expect((await cli(["contract", BOOKINGS, "-o", "c.json", "--check", "b.json"])).code).toBe(2);
  });

  it("says when two states share a name, still writes the contract, and exits 1", async () => {
    const dir = await workspace();
    await writeFile(join(dir, "orders.statewright.json"), stringify(await sign(clashingDoc(), { channel: "cli" })));
    const run = await cli(["contract", "orders.statewright.json"], { cwd: dir });
    expect(run.code).toBe(1);
    expect(run.stderr).toBe(
      'statewright: state "reserved" has the name of state "reserved" in the same level: code that holds the state by ' +
        "its name cannot tell them apart; rename one\n"
    );
    expect(JSON.parse(run.stdout).machines[0].states.filter(state => state.name === "reserved")).toHaveLength(2);
  });

  it("with --json, says ok only when it exits 0, a clash of names under --since and --check too", async () => {
    const dir = await workspace();
    await writeFile(join(dir, "orders.statewright.json"), stringify(await sign(clashingDoc(), { channel: "cli" })));
    await cli(["contract", "orders.statewright.json", "-o", "orders.contract.json"], { cwd: dir });
    for (const option of ["--since", "--check"]) {
      const run = await cli(["contract", "orders.statewright.json", option, "orders.contract.json", "--json"], {
        cwd: dir
      });
      expect(run.code).toBe(1);
      expect(run.json()).toMatchObject({ ok: false, same: true, against: "orders.contract.json" });
      expect(run.json().problems).toHaveLength(1);
    }
  });
});
