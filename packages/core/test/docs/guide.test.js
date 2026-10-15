import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { operationOfTool } from "../../src/agent/contract.js";
import { createFileHost } from "../../src/agent/file-host.js";
import { memoryFiles } from "../../src/agent/memory-files.js";
import { auditOf } from "../../src/audit/index.js";
import { toContract } from "../../src/contract/index.js";
import { guideSection } from "../../src/mcp/guide.js";
import { applyBatch } from "../../src/commands/index.js";
import { createDocument } from "../../src/create.js";
import { renderGuide } from "../../src/docs/guide.js";
import { check } from "../../src/rules/index.js";
import { parse } from "../../src/serialize/parse.js";
import { readExample } from "../helpers.js";

const source = readFileSync(new URL("../../../../docs/guide/README.md", import.meta.url), "utf8");

/** A section of the guide: from its heading to the next heading of the same or a higher level. */
function sectionOf(heading) {
  const start = source.indexOf(`\n${heading}`);
  if (start < 0) return "";
  const depth = heading.match(/^#+/)[0].length;
  const rest = source.slice(start + heading.length + 1);
  const next = rest.search(new RegExp(`\n#{1,${depth}} `));
  return next < 0 ? rest : rest.slice(0, next);
}
const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

/** The code block that follows a `<!-- checked:name -->` marker in the guide. */
function checkedBlock(name) {
  const match = new RegExp(`<!-- checked:${name} -->\\s*\`\`\`[a-z]*\\n([\\s\\S]*?)\\n\`\`\``).exec(source);
  if (!match) throw new Error(`No checked:${name} block in the guide`);
  return match[1];
}

describe("renderGuide", () => {
  it("fills generated blocks between their markers and keeps the markers", () => {
    const out = renderGuide("a\n<!-- generated:rules -->\nSTALE TEXT\n<!-- /generated:rules -->\nb");
    expect(out).toMatch(/^a\n<!-- generated:rules -->\n\n\| Code \| Severity \| Reported when \|\n/);
    expect(out).toMatch(/\n\n<!-- \/generated:rules -->\nb$/);
    expect(out).not.toContain("STALE TEXT");
  });

  it("refuses unknown blocks", () => {
    expect(() => renderGuide("<!-- generated:nope -->\n<!-- /generated:nope -->")).toThrow(/Unknown generated block/);
  });

  it("refuses a block without its closing marker, which would publish stale text", () => {
    expect(() => renderGuide("a\n<!-- generated:rules -->\nSTALE TEXT\nb")).toThrow(
      /<!-- generated:rules --> has no closing <!-- \/generated:rules -->/
    );
  });
});

describe("the platform guide", () => {
  it("is what packages/core/README.md contains (run npm run readme:build after changes)", () => {
    expect(readme).toBe(renderGuide(source));
  });

  it("has the sections of spec §23, and the simulator's", () => {
    for (const heading of [
      "## AI agents: start here",
      "## What Statewright is for",
      "## Concepts",
      "## Reading a diagram",
      "## Simulating and scenarios",
      "## Library and CLI",
      "## Working with AI agents",
      "## Building from the design",
      "### The contract",
      "## Rules for AI agents",
      "## Playbooks",
      "### Design a system with the person, level by level",
      "### Map your system, level by level",
      "### Design a new flow (target)",
      "### Review conformity",
      "### Write findings as an engine",
      "## Format reference"
    ]) {
      expect(source).toContain(`\n${heading}\n`);
    }
  });

  it("names a document a .sttw, says files saved before 0.1.5 still open, and starts the quick start with one", () => {
    const section = source
      .slice(source.indexOf("\n### Documents\n"), source.indexOf("\n## Reading a diagram\n"))
      .replace(/\s+/g, " ");
    expect(section).toContain(
      "A document is one JSON file, by convention named `*.sttw`. Files saved before 0.1.5 end in `.statewright.json`; " +
        "they open as they are."
    );
    expect(source).toContain('npx statewright new orders.sttw --name "Orders"');
    // The old name, only to say that such files still open.
    expect(source.match(/\.statewright\.json/g)).toHaveLength(1);
  });

  it("tells how a flow runs: its tokens, the questions only a flow asks, how it ends, and the example that shows it", () => {
    const section = source.slice(
      source.indexOf("\n## Simulating and scenarios\n"),
      source.indexOf("\n## Library and CLI\n")
    );
    for (const words of [
      "token",
      "`branch`",
      "`case`",
      "`outcome`",
      "`count`",
      "`success`",
      "`failure`",
      "`vars.input`"
    ]) {
      expect(section).toContain(words);
    }
    expect(section).toContain("examples/payout-batch.sttw");
  });

  it("tells how to simulate in the editor: the panel, its keys, and scenarios saved, followed and accepted", () => {
    const section = source.slice(
      source.indexOf("\n## Simulating and scenarios\n"),
      source.indexOf("\n## Library and CLI\n")
    );
    for (const words of [
      "**In the editor**",
      "Simulate",
      "keys 1 to 9",
      "⌘Z",
      "Save as scenario…",
      "Accept the new path"
    ]) {
      expect(section).toContain(words);
    }
    expect(source).toContain("| 1 to 9         | While simulating, answer the question the run asks.");
  });

  it("tells how to present a scenario and save it as a page anyone can open", () => {
    const section = source.slice(
      source.indexOf("\n## Simulating and scenarios\n"),
      source.indexOf("\n## Library and CLI\n")
    );
    for (const words of ["**Presenting.**", "Present", "Esc returns to the panel", "Export as page…", "offline"]) {
      expect(section).toContain(words);
    }
    expect(section).toContain("`toScenarioPage(doc, scenarioId)` from `statewright/render`");
    expect(source).toContain("| ← →, Space");
    const rendered = new URL(
      "../../../../examples/rendered/payments/scn_verificationPausesTheClock.html",
      import.meta.url
    );
    expect(existsSync(rendered)).toBe(true);
  });

  it("tells how a level holds elements of other kinds as guests, and what each stands for (mixed levels spec §3, §6)", () => {
    const section = sectionOf("### Guests: elements of other kinds");
    for (const words of [
      "`participant`",
      "`steps`",
      "a `state` on a flow",
      "lifecycle",
      "procedure",
      "System, Machine and Flow tabs",
      "1, 2 and 3",
      "format 1.2"
    ]) {
      expect(section).toContain(words);
    }
  });

  it("tells how a machine's roles are drawn, run and handed to code (mixed levels plan M2)", () => {
    const section = sectionOf("### Guests: elements of other kinds");
    for (const words of [
      "drag a participant onto a transition",
      "which of its actions",
      "Delete",
      "runs the action's flow",
      "`receivedBy`",
      "`flows`",
      "`within`",
      "examples/order-lifecycle.sttw"
    ]) {
      expect(section).toContain(words);
    }
  });

  it("tells how a system's boxes drive a lifecycle framed there (mixed levels plan M3)", () => {
    const section = sectionOf("### Guests: elements of other kinds");
    for (const words of ["drives", "inside the frame", "whom it acts for"]) expect(section).toContain(words);
  });

  it("tells how a flow's steps lead to a state, who performs them, and lanes of a party (mixed levels plan M4)", () => {
    const section = sectionOf("### Guests: elements of other kinds");
    for (const words of ["leads to", "drag an emit step onto a state guest", "performed by", "`performedBy`", "band"]) {
      expect(section).toContain(words);
    }
  });

  it("tells what a mixed level is, how it connects, what it runs as, and how a level becomes one (mixed levels plan M5)", () => {
    const section = sectionOf("### Mixed levels");
    for (const words of [
      "`mixed`",
      '`kind: "transition"`',
      "what its ends make it",
      "runs as a machine",
      "Change to mixed",
      "`canvas.mix`",
      "Returns desk"
    ]) {
      expect(section).toContain(words);
    }
  });

  it("tells where the findings on an edge are drawn (source-of-truth spec §6)", () => {
    const section = source.slice(source.indexOf("\n## Reading a diagram\n"), source.indexOf("\n## Using the editor\n"));
    expect(section).toContain("The codes of the\nfindings on an edge are a badge under its label");
  });

  it("lists the audit of a design: its command and its library entry", () => {
    expect(source).toContain("| `audit <file> [--format md\\|json]` ");
    expect(source).toContain(
      "`coverageOf(doc)`, `auditOf(doc, { canvas? })`, `toAuditReport(doc, { canvas? })` from `statewright/audit`"
    );
  });

  it("lists the documentation as a page: its command format, its library entry, its Export item and its test ID", () => {
    expect(source).toContain("| `docs <file> [--format md\\|ai\\|html] [-o <file>]` ");
    expect(source).toContain("`toDocumentPage(doc, { fonts? })`");
    expect(source).toContain("`documentModel(doc)`");
    expect(source).toContain("**Export → Documentation (HTML)**");
    expect(source).toContain("| `actions-export-documentPage` ");
    expect(readme).toContain("`toDocumentPage(doc, { fonts? })`");
    const rendered = new URL("../../../../examples/rendered/payments/documentation.html", import.meta.url);
    expect(existsSync(rendered)).toBe(true);
  });

  it("lists the agent contract in the library", () => {
    expect(source).toContain("`validateCall(name, args)`, `inputSchemaOf(name)`, `checkResult(name, result)`");
  });

  it("lists the file host and the kinds of a new document in the library", () => {
    expect(source).toContain("`createFileHost({ files, agent?, file? })` runs the contract on document files");
    expect(source).toContain("`createDocument({ name, kind? })`");
  });

  it("lists the MCP server among the commands, and how to set it up", () => {
    expect(source).toContain("| `mcp [--file <path>] [--port <n>] [--origin <url>]` ");
    expect(source).toContain("`claude mcp add statewright -- npx statewright mcp`");
  });

  it("lists conformance among the commands, and among those that refuse a document changed by hand (source-of-truth spec §6)", () => {
    expect(source).toMatch(/\n\| `conform <file> <results> \[--write\]` +\| Compares the results /);
    expect(source).toContain("(`apply`, `layout`, `migrate`, `conform --write`)");
  });

  it("lists the contract among the commands (source-of-truth spec §5)", () => {
    expect(source).toContain("| `contract <file> [-o <out>] [--since <contract>] [--check <contract>]` ");
  });

  it("tells how to build from the design: the contract, how to keep it, what it holds, its example as bookings gives it (source-of-truth spec §5, §8)", async () => {
    const section = source.slice(
      source.indexOf("\n## Building from the design\n"),
      source.indexOf("\n## Rules for AI agents\n")
    );
    const said = section.replace(/\s+/g, " ");
    for (const words of [
      "npx statewright contract design/bookings.sttw -o design/bookings.contract.json",
      "npx statewright contract design/bookings.sttw --since design/bookings.contract.json",
      "npx statewright contract design/bookings.sttw --check design/bookings.contract.json",
      "Commit the contract beside the design: it is the version of the design the code was last aligned with.",
      "`--check` belongs in CI: it exits 1 once the design has changed and the committed contract has not.",
      "Agents get the same contract from `export_contract`; in the Editor it is **Export → Contract**",
      "a state's name, or `<kind>:<id>` for other nodes",
      "A state inside another is named by its path, `open/created`",
      "Statewright reports them (`machine.sameName`), and `statewright contract` exits 1 until one is renamed."
    ]) {
      expect(said).toContain(words);
    }
    for (const key of ["**`source`**", "**`machines`**", "**`flows`**", "**`vectors`**", "**`stale`**"]) {
      expect(section).toContain(key);
    }
    const { contract } = await toContract(parse(readExample("bookings.sttw")).doc);
    expect(JSON.parse(checkedBlock("contract-vector"))).toEqual(
      contract.vectors.find(vector => vector.id === "scn_aGuestDoesNotCome")
    );
    expect(source).toContain(
      "| Contract   | `toContract(doc)` (the contract and the Problems that make it ambiguous), `stringifyContract(contract)`"
    );
    expect(source.replace(/\s+/g, " ")).toContain(
      "its contract (`export_contract`, or `statewright contract`) gives them with the names code holds, and `--since` what changed since the contract the code was built from; its scenarios, run through the code, prove it — [Build from the design](#build-from-the-design)."
    );
  });

  it("lists the guide's sections among the commands, and guide_read among the MCP server's tools (AI interface plan A5)", () => {
    expect(source).toContain("| `guide [section]` ");
    expect(source).toContain("(`statewright guide start-here`)");
    expect(source.replace(/\s+/g, " ")).toContain(
      "plus `editor_pair` and `editor_disconnect`, the conversation's `editor_wait`, `editor_inbox` and `editor_reply` " +
        "([Working with the person in the Editor](#working-with-the-person-in-the-editor)), and `guide_read`, which " +
        "reads this guide a section at a time, offline."
    );
    // The conversation (collaboration spec §10): how an agent listens, reads, answers and stops.
    const conversation = guideSection(source, "working-with-the-person-in-the-editor");
    for (const said of [
      "editor_wait",
      "inbox: { unread }",
      "editor_reply { text, to, point }",
      "STOPPED",
      "--dangerously-load-development-channels server:statewright",
      "editor_ask { question, options?, multiple?, pick?, seconds? }",
      "answers: { question, … }",
      "| `review`    |",
      "| `fill`      |",
      "propose: true, title, why",
      'forced: "deletes"'
    ]) {
      expect(conversation.ok && conversation.result.text, said).toContain(said);
    }
  });

  it("tells how to work with AI agents: the server, pairing with the Editor, window.statewright, the operations, the hooks and auditing (AI interface spec §12)", () => {
    for (const heading of [
      "### Setting up `statewright mcp`",
      "### Pairing with the Editor",
      "### `window.statewright`",
      "### Operations",
      "### Testing the Editor",
      "### Auditing"
    ]) {
      expect(source).toContain(`\n${heading}\n`);
    }
    expect(source).toContain(
      '{ "mcpServers": { "statewright": { "command": "npx", "args": ["statewright", "mcp"] } } }'
    );
    expect(source.replace(/\s+/g, " ")).toContain(
      "1. In the Editor (https://statewright.cpss.com.br), **Connect an AI…** (on the Projects screen, or a project's menu or ⌘K) shows a code " +
        "such as `K7Q-2MX`"
    );
    expect(source).toContain("it calls `editor_pair { code }`");
    // The guide wraps its lines: what it says, read as one line.
    const said = source.replace(/\s+/g, " ");
    expect(said).toContain(
      "The bridge listens on 127.0.0.1 alone and answers only the Editor's pages: at https://statewright.cpss.com.br, " +
        "on `http://localhost` (where the Editor runs while it is developed) and at the addresses `--origin` names"
    );
    expect(said).toContain("When the bridge takes another port (`47616`), the server says so");
    expect(source).toContain('statewright.hello({ agent: "my-agent" });');
    expect(source).toContain("| `actions-agent` ");
    for (const tool of ["batch_apply", "view_point", "scenario_present", "audit_report"]) {
      expect(readme).toContain(`| \`${tool}\` |`);
    }
  });

  it("says before its sections where its source is and where problems are reported", () => {
    const intro = source.slice(0, source.indexOf("\n## AI agents: start here\n")).replace(/\s+/g, " ");
    expect(intro).toContain(
      "The source is at https://github.com/danilocoppi/statewright (MIT); report a problem or ask for a feature in " +
        "its issues, https://github.com/danilocoppi/statewright/issues."
    );
  });

  it("tells an agent where to start, before anything else: the MCP server in each client, the Editor's address, pairing, reading, building level by level", () => {
    const start = source.indexOf("\n## AI agents: start here\n");
    expect(start).toBeGreaterThan(-1);
    expect(start).toBeLessThan(source.indexOf("\n## What Statewright is for\n"));
    expect(source).toContain("- [AI agents: start here](#ai-agents-start-here)\n- [What Statewright is for]");
    const section = source.slice(start, source.indexOf("\n## What Statewright is for\n"));
    for (const line of [
      "| Claude Code       | `claude mcp add statewright -- npx statewright mcp`",
      "| Codex             | `codex mcp add statewright -- npx statewright mcp`",
      "| Kimi CLI          | `kimi mcp add --transport stdio statewright -- npx statewright mcp`",
      "| Gemini CLI        | `gemini mcp add statewright npx statewright mcp`",
      '| Cursor            | `{ "mcpServers": { "statewright": { "command": "npx", "args": ["statewright", "mcp"] } } }` in `.cursor/mcp.json`'
    ]) {
      expect(section).toContain(line);
    }
    // The guide wraps its lines: what it says, read as one line.
    const said = section.replace(/\s+/g, " ");
    for (const words of [
      "start a new session (or reload the client's MCP servers) so its tools appear",
      "open the Editor at https://statewright.cpss.com.br",
      // Connect an AI… is on the Projects screen too: nothing needs to be open before pairing.
      "choose **Connect an AI…** on the Projects screen, before any project is open",
      "Once paired, `projects_create` makes the project you design in, in their tab",
      // A client that waits only seconds for a server would give up while npx downloads the package the first time.
      "run `npx statewright --version` once before you register it",
      "(it is also in a project's menu, and ⌘K)",
      '`editor_pair { "code": "K7Q-2MX", "agent": "<your name>" }`',
      "with `guide_read` (or `npx statewright guide <section>`)",
      "[Design a system with the person, level by level](#design-a-system-with-the-person-level-by-level)",
      "Build level 0 alone and ask the person to confirm it",
      "`view_point`",
      "`scenario_present`",
      "`audit_report`"
    ]) {
      expect(said).toContain(words);
    }
  });

  it("designs a system level by level as its playbook shows: every block runs as written, and leaves no errors", async () => {
    const host = createFileHost({ files: memoryFiles(), agent: "guide" });
    const call = async (tool, args) => {
      const outcome = await host.call(operationOfTool(tool).name, args);
      expect(outcome, `${tool} ${JSON.stringify(args)}`).toMatchObject({ ok: true });
      return outcome.result;
    };
    expect(await call("projects_create", { name: "Bookings", path: "bookings.sttw" })).toMatchObject({
      project: { id: "prj_bookings" }
    });
    expect((await call("batch_apply", JSON.parse(checkedBlock("level-0")))).created).toContain("nod_bookingApi");
    expect((await call("batch_apply", JSON.parse(checkedBlock("booking-api")))).created).toContain("cnv_booking");
    expect((await call("batch_apply", JSON.parse(checkedBlock("notifier")))).created).toContain("cnv_textGuest");
    const results = [];
    for (const { tool, arguments: args } of JSON.parse(checkedBlock("scenario"))) results.push(await call(tool, args));
    expect(results[2].point).toMatchObject({ active: ["nod_seated"], ended: "done" });
    expect(results[3]).toEqual({ id: "scn_aConfirmedGuestIsSeated" });

    // Each level is inside a box of the one above: the person opens them from level 0.
    expect((await call("document_summary", {})).levels).toEqual([
      { id: "cnv_bookings", name: "Bookings", kind: "system", depth: 0 },
      { id: "cnv_booking", name: "Booking lifecycle", kind: "machine", depth: 1, via: "nod_bookingApi" },
      { id: "cnv_textGuest", name: "Text the guest", kind: "flow", depth: 1, via: "nod_notifier" }
    ]);
    const { problems } = await call("problems_list", {});
    expect(problems.filter(problem => problem.severity !== "incomplete")).toEqual([]);
    expect((await call("audit_report", {})).summary).toMatchObject({ error: 0, warning: 0, scenarios: 1, diverged: 0 });
    // What the prose names exists: the boxes it points at, and the scenario it presents.
    for (const id of ["cnv_bookings", "nod_bookingApi", "cnv_booking", "nod_book", "scn_aConfirmedGuestIsSeated"]) {
      expect(source).toContain(`"${id}"`);
    }
  });

  it("keeps the playbook's design as examples/bookings.sttw, its scenarios covering every level (source-of-truth spec §11)", async () => {
    const { doc } = applyBatch(
      applyBatch(
        applyBatch(createDocument({ name: "Bookings" }), JSON.parse(checkedBlock("level-0")).commands).doc,
        JSON.parse(checkedBlock("booking-api")).commands
      ).doc,
      JSON.parse(checkedBlock("notifier")).commands
    );
    const example = parse(readExample("bookings.sttw")).doc;
    for (const part of ["project", "root", "catalog", "definitions", "canvases"]) {
      expect(example[part], part).toEqual(doc[part]);
    }
    expect(Object.values(example.annotations.scenarios).map(scenario => scenario.name)).toEqual([
      "A booking is declined",
      "A confirmed guest is seated",
      "A guest does not come",
      "The guest is told it is confirmed",
      "The guest is told it is declined"
    ]);
    expect(source.replace(/\s+/g, " ")).toContain(
      "the design it builds, with five scenarios, is in the repository as `examples/bookings.sttw`"
    );
    const { summary } = auditOf(example);
    expect(summary).toMatchObject({ error: 0, warning: 0, scenarios: 5, diverged: 0, coverage: 100 });
  });

  it("asks the person which of the three ways they want, and leads to its playbook (source-of-truth spec §8)", () => {
    const start = source.slice(
      source.indexOf("\n## AI agents: start here\n"),
      source.indexOf("\n## What Statewright is for\n")
    );
    const said = start.replace(/\s+/g, " ");
    for (const words of [
      "**3. Ask which way, then read.** People work with an agent in three ways: ask which one the person wants",
      "**Map the system they have:** read their code and draw what it does, level by level — [Map your system, level by level](#map-your-system-level-by-level)",
      "**Design together:** a new system, or a new part of one — [Design a system with the person, level by level](#design-a-system-with-the-person-level-by-level)",
      "**Build from a design they have:** read it (`document_summary`, `level_get`, or the AI pack, `export_aiPack`)",
      "The design is the source of truth: when the code must differ, change the design with the person first."
    ]) {
      expect(said).toContain(words);
    }
    expect(source).not.toContain("#model-existing-code-as-built");
    // Steps 4 and 5 serve the three ways: the interview belongs to designing together, the code comes first in mapping.
    for (const words of [
      "**4. Work level by level, with the person.** Whatever the way, go top-down.",
      "To design together, interview the person first:",
      "To map their system, read the code first (the playbook's survey);",
      "to build from a design, read it level by level and implement it in the same order."
    ]) {
      expect(said).toContain(words);
    }
  });

  it("maps a system level by level as its playbook shows: every block runs, cites the lines it came from, and leaves no errors", async () => {
    const code = checkedBlock("map-code").split("\n");
    const host = createFileHost({ files: memoryFiles(), agent: "guide" });
    const call = async (tool, args) => {
      const outcome = await host.call(operationOfTool(tool).name, args);
      expect(outcome, `${tool} ${JSON.stringify(args)}`).toMatchObject({ ok: true });
      return outcome.result;
    };
    await call("projects_create", { name: "Bookings as built", path: "bookings-as-built.sttw" });
    for (const name of ["map-level-0", "map-machine", "map-findings"])
      await call("batch_apply", JSON.parse(checkedBlock(name)));
    const saved = [];
    for (const { tool, arguments: args } of JSON.parse(checkedBlock("map-scenarios"))) {
      const result = await call(tool, args);
      if (tool === "scenario_save") saved.push(result.id);
    }
    expect(saved).toEqual(["scn_aGuestIsSeated", "scn_aSeatedGuestIsDeclined"]);

    expect((await call("document_summary", {})).levels).toEqual([
      { id: "cnv_bookingsAsBuilt", name: "Bookings as built", kind: "system", depth: 0 },
      { id: "cnv_booking", name: "Booking, as built", kind: "machine", depth: 1, via: "nod_bookingApi" }
    ]);
    const doc = (await call("document_get", {})).document;
    const machine = doc.canvases.cnv_booking;
    expect(machine).toMatchObject({ stage: "as-built", subject: "booking.status", transitions: "complete" });
    // The root is marked too: the Editor shows a project as built by its root level's stage.
    expect(doc.canvases.cnv_bookingsAsBuilt.stage).toBe("as-built");

    // Every citation is a line of the code the playbook maps.
    const cited = [
      ...Object.values(doc.catalog).flatMap(collection => Object.values(collection)),
      ...Object.values(doc.canvases).flatMap(canvas => [...Object.values(canvas.nodes), ...Object.values(canvas.edges)])
    ].flatMap(element => element.evidence ?? []);
    expect(cited.length).toBeGreaterThan(20);
    for (const evidence of cited) {
      expect(evidence.path).toBe("src/bookings.js");
      if (evidence.lines === undefined) continue;
      const [first, last = first] = evidence.lines.split("-").map(Number);
      expect(first).toBeGreaterThanOrEqual(1);
      expect(last).toBeLessThanOrEqual(code.length);
    }
    // Each state and each transition into one cites the line that writes its value.
    for (const [id, node] of Object.entries(machine.nodes).filter(([, node]) => node.kind === "state")) {
      const into = Object.values(machine.edges).filter(edge => edge.to === id);
      for (const element of [node, ...into]) {
        const [first, last = first] = element.evidence[0].lines.split("-").map(Number);
        expect(code.slice(first - 1, last).join("\n"), `${id} ${element.evidence[0].lines}`).toContain(
          `"${node.name}"`
        );
      }
    }
    expect(
      Object.values(machine.edges)
        .filter(edge => edge.provenance === "defect")
        .map(edge => edge.from)
    ).toEqual(["nod_anyAnswered", "nod_anyAnswered"]);
    expect(
      Object.values(doc.annotations.findings).map(finding => [finding.code, finding.severity, finding.targets])
    ).toEqual([
      ["BK1", "high", ["edg_anyConfirmed", "edg_anyDeclined"]],
      ["BK2", "low", ["edg_confirmedNoShow"]]
    ]);
    // findings.replace replaces every finding of its source: each mapped level has its own, so mapping the next
    // service keeps this one's.
    expect(Object.values(doc.annotations.findings).map(finding => finding.source)).toEqual([
      "mapping:cnv_booking",
      "mapping:cnv_booking"
    ]);
    expect(source.replace(/\s+/g, " ")).toContain(
      "`findings.replace` replaces every finding of its `source`: give each level you map its own (`mapping:<level>`)"
    );
    const { problems } = await call("problems_list", {});
    expect(problems.filter(problem => problem.severity !== "incomplete")).toEqual([]);
    expect((await call("audit_report", {})).summary).toMatchObject({ error: 0, warning: 0, scenarios: 2, diverged: 0 });
  });

  it("names the MCP tool beside the command line in the rules and the playbooks", () => {
    const said = source.replace(/\s+/g, " ");
    for (const words of [
      "Change documents only through commands (`batch_apply`, `statewright apply` or `applyBatch`)",
      "Read the Problems (`problems_list`, `statewright validate` or `check`)",
      "lay out the canvases you changed (`layout_arrange`, `statewright layout`)",
      "drawn (`export_svg`, `statewright render`)",
      "keep them with `scenario_save`",
      "`projects_create` (or `statewright new`)",
      "`export_aiPack` (`statewright docs <file> --format ai`)"
    ]) {
      expect(said).toContain(words);
    }
  });

  it("gives agents the AI interface's rules: audit, show what changed, present scenarios", () => {
    expect(source).toContain("10. **Audit after a batch of work.**");
    expect(source).toContain("11. **Show the person what changed.**");
    expect(source).toContain("12. **Present scenarios when explaining behaviour.**");
  });

  it("lists the errors of each operation in the library", () => {
    expect(source).toContain("`errorsOf(name)` (the codes a call can answer)");
  });

  it("shows rendered examples that exist (run npm run examples:render)", () => {
    const images = [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
    expect(images.length).toBeGreaterThanOrEqual(2);
    for (const image of images)
      expect(existsSync(new URL(image, new URL("../../../../docs/guide/", import.meta.url))), image).toBe(true);
  });

  it("shows a quick-start batch that applies cleanly", () => {
    const { doc, created } = applyBatch(createDocument({ name: "Orders" }), JSON.parse(checkedBlock("batch")));
    expect(created).toContain("edg_pendingPaid");
    expect(check(doc)).toEqual([]);
  });

  it("shows a simulation example that runs, on the quick start's order", async () => {
    const { doc } = applyBatch(createDocument({ name: "Orders" }), JSON.parse(checkedBlock("batch")));
    const entry = pathToFileURL(new URL("../../src/simulate/index.js", import.meta.url).pathname).href;
    const file = join(tmpdir(), `statewright-guide-simulate-${process.pid}.mjs`);
    const code = checkedBlock("simulate").replace('from "statewright/simulate"', `from "${entry}"`);
    writeFileSync(file, `${code}\n`.replace(/^(import .*\n)/, `$1const doc = ${JSON.stringify(doc)};\n`));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await import(pathToFileURL(file).href);
      expect(log.mock.calls).toEqual([
        [["nod_pending"]],
        [["payment.confirmed", "payment window"]],
        [["nod_paid"]],
        [["nod_expired"], "done"]
      ]);
    } finally {
      log.mockRestore();
    }
  });

  it("shows a library example that runs", async () => {
    const entry = pathToFileURL(new URL("../../src/index.js", import.meta.url).pathname).href;
    const file = join(tmpdir(), `statewright-guide-${process.pid}.mjs`);
    writeFileSync(file, checkedBlock("library").replace('from "statewright"', `from "${entry}"`));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await import(pathToFileURL(file).href);
      expect(log.mock.calls[0]).toEqual([["nod_orderApi"]]);
      expect(log.mock.calls[2]).toEqual([{ content: "ok", annotations: "ok", layout: "ok" }]);
    } finally {
      log.mockRestore();
    }
  });
});
