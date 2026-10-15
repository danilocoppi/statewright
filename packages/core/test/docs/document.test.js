import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { toAIPack, toMarkdown } from "../../src/docs/document.js";
import { paymentsDoc } from "../helpers.js";
import { cleanDoc } from "../rules/fixtures.js";

/** The clean document with a scenario on its machine: go, then an hour passes. */
function withScenario() {
  const scenario = {
    name: "Goes busy",
    description: "What happens on go.",
    canvas: "cnv_m",
    start: { at: "2026-01-05T09:00:00Z" },
    steps: [
      { do: { event: "evt_go" }, caption: "The engine starts.", reached: { active: ["nod_busy"] } },
      { do: { wait: "PT1H" }, reached: { active: ["nod_busy"] } }
    ]
  };
  return applyBatch(cleanDoc(), [{ type: "scenario.add", args: { scenario } }]).doc;
}

describe("toMarkdown", () => {
  it("walks the levels depth-first with a breadcrumb per canvas", () => {
    const markdown = toMarkdown(paymentsDoc());
    const headings = markdown.split("\n").filter(line => line.startsWith("## "));
    expect(headings).toEqual([
      "## Catalog",
      "## Runtime",
      "## Runtime › Lifecycle engine",
      "## Runtime › Lifecycle engine › Compliance hold",
      "## Runtime › Lifecycle engine › Expiry clock",
      "## Runtime › Lifecycle engine › Cross-border send"
    ]);
  });

  it("has catalog tables, state and transition tables, and findings", () => {
    const doc = applyBatch(cleanDoc(), [
      {
        type: "finding.upsert",
        args: { finding: { code: "A1", title: "Busy never times out", severity: "high", targets: ["nod_busy"] } }
      }
    ]).doc;
    const markdown = toMarkdown(doc);
    expect(markdown).toContain(
      "| Event | Payload | Source | Description |\n| --- | --- | --- | --- |\n| go | none |  |  |"
    );
    expect(markdown).toContain("| done |  | success, terminal |  |");
    expect(markdown).toContain("| idle | busy | go |  |  |");
    expect(markdown).toContain(
      "## Findings\n\n| Code | Severity | Finding | On |\n| --- | --- | --- | --- |\n| A1 | high | Busy never times out | busy |"
    );
    expect(toMarkdown(doc)).toBe(markdown);
  });

  it("tells each scenario after the canvas it runs: its start and its steps with their captions", () => {
    expect(toMarkdown(withScenario())).toContain(
      "### Scenario: Goes busy\n\nWhat happens on go.\n\nStarts 2026-01-05T09:00:00Z.\n\n1. go — The engine starts.\n2. wait PT1H\n"
    );
  });
});

describe("toAIPack", () => {
  it("starts with a preamble that sends the reader to the guide and to commands", () => {
    const pack = toAIPack(cleanDoc());
    expect(pack.split("\n")[0]).toBe("# Demo — Statewright AI pack");
    expect(pack).toContain("Read the Statewright guide (`npx statewright guide`)");
    expect(toAIPack(cleanDoc(), { guideUrl: "https://example.com/README.md" })).toContain(
      "(<https://example.com/README.md>)"
    );
  });

  it("lists a glossary, the levels and one transition table per canvas, by ID", () => {
    const pack = toAIPack(cleanDoc());
    expect(pack).toContain("| `nod_busy` | state node | busy | `cnv_m` |");
    expect(pack).toContain('## Levels\n\n- `cnv_root` "Root" [system]\n  - `nod_engine` → `cnv_m` "Machine" [machine]');
    expect(pack).toContain("| `edg_idleBusy` | `nod_idle` | `nod_busy` | on:evt_go |  |  |");
    expect(pack).toContain("machine · transitions complete");
  });

  it("ends with findings and the current Problems", () => {
    const doc = cleanDoc();
    delete doc.catalog.events.evt_go.payload;
    const pack = toAIPack(doc);
    expect(pack).toContain("## Findings\n\nNone.");
    expect(pack).toContain('| incomplete | `spec.unspecified` | `evt_go` | event "go" does not specify payload |');
    expect(toAIPack(cleanDoc())).toContain("## Problems\n\nNone.\n");
  });

  it("lists each scenario with its start, inputs, answers and the paths each step reached", () => {
    expect(toAIPack(cleanDoc())).toContain("## Scenarios\n\nNone.\n");
    expect(toAIPack(withScenario())).toContain(
      [
        "## Scenarios",
        "",
        '### `scn_goesBusy` "Goes busy" on `cnv_m`',
        "",
        "start 2026-01-05T09:00:00Z",
        "",
        "| Step | Input | Answers | Reached |",
        "| --- | --- | --- | --- |",
        "| 1 | `event:evt_go` |  | `nod_busy` |",
        "| 2 | `wait:PT1H` |  | `nod_busy` |"
      ].join("\n")
    );
  });

  it("gives each step's payload, and the input and answers a run starts with (simulator spec §4.7)", () => {
    const doc = structuredClone(withScenario());
    const scenario = doc.annotations.scenarios.scn_goesBusy;
    scenario.start.input = { amount: 3 };
    scenario.start.answers = [{ kind: "choice", at: "nod_pick", value: "edg_left" }];
    scenario.steps[0].do.payload = { amount: 120 };
    const pack = toAIPack(doc);
    expect(pack).toContain('start 2026-01-05T09:00:00Z · input `{"amount":3}` · answers `choice@nod_pick="edg_left"`');
    expect(pack).toContain('| 1 | `event:evt_go` payload `{"amount":120}` |  | `nod_busy` |');
  });
});
