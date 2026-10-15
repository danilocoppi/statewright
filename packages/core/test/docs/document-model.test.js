import { describe, expect, it } from "vitest";
import { documentModel, toMarkdown } from "../../src/docs/document.js";
import { parse } from "../../src/serialize/parse.js";
import { readExample } from "../helpers.js";

const EXAMPLES = ["bookings", "get-paid-as-built", "payments", "payout-batch"];
const example = name => parse(readExample(`${name}.sttw`)).doc;

/** A row as the Markdown writes it. */
const markdownRow = cells =>
  `| ${cells.map(cell => cell.text.replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`;

describe("documentModel: the content the Markdown and the page share", () => {
  it.each(EXAMPLES)("%s: has the levels in the Markdown's order, with the Markdown's rows", name => {
    const doc = example(name);
    const model = documentModel(doc);
    const markdown = toMarkdown(doc);
    const headings = markdown
      .split("\n")
      .filter(line => line.startsWith("## ") && line !== "## Catalog" && line !== "## Findings")
      .map(line => line.slice(3));
    expect(model.levels.map(level => level.path.join(" › "))).toEqual(headings);
    for (const level of model.levels) {
      expect(level.depth).toBe(level.path.length - 1);
      for (const table of [level.nodes, level.edges])
        for (const row of table.rows) expect(markdown, `${level.id} ${row.id}`).toContain(markdownRow(row.cells));
    }
    for (const collection of model.catalog)
      for (const row of collection.rows) expect(markdown).toContain(markdownRow(row.cells));
  });

  it("counts the payments project's levels, states, transitions, scenarios and findings", () => {
    const model = documentModel(example("payments"));
    expect(model.project).toEqual({
      name: "Payments",
      description: expect.stringContaining("Reference project"),
      stage: "target",
      rootKind: "system"
    });
    expect(model.counts).toEqual({
      levels: { system: 1, machine: 4, flow: 0, mixed: 0 },
      states: 21,
      transitions: 29,
      scenarios: 2,
      findings: 0,
      severe: 0
    });
  });

  it("resolves a finding's targets to their level, and lists it on that level", () => {
    const model = documentModel(example("get-paid-as-built"));
    const finding = model.findings.find(item => item.id === "fnd_H1");
    expect(finding).toMatchObject({ code: "H1", severity: "high", title: "advanceStatus trusts its callers" });
    expect(finding.targets).toEqual([{ id: "nod_processing", name: "processing", canvasId: "cnv_transaction" }]);
    expect(model.levels.find(level => level.id === "cnv_transaction").findings).toEqual(["fnd_H1", "fnd_H3"]);
    expect(model.counts).toMatchObject({ findings: 2, severe: 1 });
  });

  it("names the IDs each cell refers to, in the order its text says them", () => {
    const model = documentModel(example("payments"));
    const clock = model.levels.find(level => level.id === "cnv_expiryClock");
    const refs = clock.edges.rows.flatMap(row => row.cells.flatMap(cell => cell.refs.map(ref => ref.id)));
    expect(refs).toContain("evt_payinDetected");
    for (const row of clock.edges.rows)
      for (const cell of row.cells) {
        let from = 0;
        for (const ref of cell.refs) {
          const at = cell.text.indexOf(ref.text, from);
          expect(at, `${row.id}: ${ref.text} in ${cell.text}`).toBeGreaterThanOrEqual(0);
          from = at + ref.text.length;
        }
      }
    const events = model.catalog.find(collection => collection.collection === "events");
    expect(events.headers).toEqual(["Event", "Payload", "Source", "Description"]);
    expect(events.rows.map(row => row.id)).toContain("evt_payinDetected");
  });

  it("tells each scenario after the level it runs, with its start and its steps", () => {
    const model = documentModel(example("payments"));
    const lifecycle = model.levels.find(level => level.id === "cnv_lifecycle");
    const scenario = lifecycle.scenarios.find(item => item.id === "scn_paysInTime");
    expect(scenario.name).toBeTruthy();
    expect(scenario.steps[0]).toEqual({ input: "payin.detected", caption: expect.any(String) });
  });

  it.each(EXAMPLES)("%s: toMarkdown still writes its rendered README", name => {
    expect(toMarkdown(example(name))).toBe(readExample(`rendered/${name}/README.md`));
  });
});
