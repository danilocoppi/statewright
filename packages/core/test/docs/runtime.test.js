// The guide's runtime (source-of-truth spec §7, §8): its example runs as written against the bookings design, the
// section names the API, every reason a trigger is refused and what a changed design does, and the playbook and the
// root documents lead to it.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { format } from "node:util";
import { describe, expect, it } from "vitest";
import { workspace } from "../cli/helpers.js";

const ROOT = new URL("../../../../", import.meta.url);
const source = readFileSync(new URL("docs/guide/README.md", ROOT), "utf8");
const entry = path => pathToFileURL(fileURLToPath(new URL(`../../src/${path}`, import.meta.url))).href;

/** The code block that follows a `<!-- checked:name -->` marker in the guide. */
function checkedBlock(name) {
  const match = new RegExp(`<!-- checked:${name} -->\\s*\`\`\`[a-z]*\\n([\\s\\S]*?)\\n\`\`\``).exec(source);
  if (!match) throw new Error(`No checked:${name} block in the guide`);
  return match[1];
}

describe("the guide's runtime (source-of-truth spec §7, §8)", () => {
  it("shows an example that runs against the bookings design: started, refused, confirmed, its timer fired", async () => {
    const dir = await workspace();
    mkdirSync(join(dir, "design"));
    copyFileSync(new URL("examples/bookings.sttw", ROOT), join(dir, "design/bookings.sttw"));
    const code = checkedBlock("runtime")
      .replace('from "statewright/runtime"', `from "${entry("runtime/index.js")}"`)
      .replace('from "statewright"', `from "${entry("index.js")}"`);
    writeFileSync(join(dir, "example.mjs"), code);
    const run = spawnSync(process.execPath, ["example.mjs"], { cwd: dir, encoding: "utf8" });
    expect(run.stderr).toBe("");
    expect(run.stdout).toBe(
      [
        "requested",
        format({
          ok: false,
          reason: "noTransition",
          message: "Nothing in the design takes guest.arrived from requested"
        }),
        format("confirmed", [
          { timer: "grace period", kind: "after", state: "confirmed", due: "2026-01-09T19:35:00Z" }
        ]),
        format([
          { event: "guest.arrived", to: ["seated"] },
          { timer: "grace period", due: "2026-01-09T19:35:00Z", to: ["no-show"] }
        ]),
        "no-show",
        ""
      ].join("\n")
    );
  });

  it("names the API, every reason a trigger is refused, and what a changed design does", () => {
    const section = source.slice(source.indexOf("\n### The runtime\n"), source.indexOf("\n## Rules for AI agents\n"));
    const said = section.replace(/\s+/g, " ");
    for (const words of [
      "**`createRuntime(doc, { guards?, expect? })`** checks the design first and throws a `RuntimeError`",
      "`runtime.machine(key)` gives a machine that runs on its own, by its subject or its level's ID",
      "**`start({ entry?, at, context? })`**",
      "**`send(snapshot, { event | call | timer, payload?, at })`**",
      "`effects.timers`: the `after` timers to `schedule`, once per state, each with when it is `due`, and those to `cancel`",
      "one whose guards all fail is spent, and `send` answers with the state as it was",
      "synchronous), a function names a guard the design does not have, or one is asynchronous",
      "Neither ever throws for the design's sake",
      "**`can(snapshot, trigger)`**",
      "**`moves(snapshot)`**",
      "A snapshot is plain JSON: the engine's session, stamped with the design's content hash",
      "the records follow it with no change to the code, as long as the guards and actions it names exist"
    ]) {
      expect(said).toContain(words);
    }
    for (const reason of [
      "noTransition",
      "guard",
      "final",
      "unknownState",
      "needs",
      "notDue",
      "noEntry",
      "badInput",
      "error"
    ]) {
      expect(section).toContain(`\`${reason}\``);
    }
    expect(source).toContain("| Runtime    | `createRuntime(doc, { guards?, expect? })`");
    expect(source).toContain("`fire` (one armed timer)");
  });

  it("is the playbook's last step, and the root documents lead to it", () => {
    const playbook = source.slice(
      source.indexOf("\n### Build from the design\n"),
      source.indexOf("\n### Design a new flow (target)\n")
    );
    expect(playbook.replace(/\s+/g, " ")).toContain(
      "**6. Or run the design itself.** In JavaScript, `statewright/runtime` runs the machines from the design file ([The runtime](#the-runtime))"
    );
    const readme = readFileSync(new URL("README.md", ROOT), "utf8");
    expect(readme).toContain("[The runtime](docs/guide/README.md#the-runtime)");
    expect(readme).not.toContain("Next to come");
    expect(readFileSync(new URL("AGENTS.md", ROOT), "utf8")).toContain(
      "[The runtime](docs/guide/README.md#the-runtime) (`statewright/runtime`) runs the design itself in JavaScript."
    );
  });
});
