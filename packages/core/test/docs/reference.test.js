import { describe, expect, it } from "vitest";
import { OPERATIONS, toolNameOf } from "../../src/agent/index.js";
import { listCommands } from "../../src/commands/index.js";
import {
  commandsReference,
  formatReference,
  legendReference,
  operationsReference,
  rulesReference
} from "../../src/docs/reference.js";
import { listRules } from "../../src/rules/index.js";
import { FlowNode, MachineNode, SystemNode } from "../../src/schema/canvas.js";
import { EDGE_STYLES, NODE_STYLES } from "../../src/style/palette.js";

const kinds = union => union.def.options.map(option => option.def.shape.kind.def.values[0]);

describe("formatReference", () => {
  const reference = formatReference();

  it("has a section for every catalog collection and every node kind", () => {
    for (const title of ["Type", "Event", "Action", "Guard", "Endpoint", "Webhook", "Timer", "Status", "Party"]) {
      expect(reference).toContain(`\n#### ${title}\n`);
    }
    for (const [title, union] of [
      ["System node", SystemNode],
      ["Machine node", MachineNode],
      ["Flow node", FlowNode]
    ]) {
      for (const kind of kinds(union)) expect(reference).toContain(`#### ${title}: \`${kind}\`\n`);
    }
  });

  it("describes fields with optionality and compact types", () => {
    expect(reference).toContain("| `payload?` | typ_* \\| null |");
    expect(reference).toContain("| `nodes` | map nod_* → Machine node |");
    expect(reference).toContain("| `done?` | true \\| rgn_* |");
    expect(reference).toContain("| `duration?` | duration (ISO 8601, e.g. PT30M) |");
  });

  it("says what patterned strings look like", () => {
    expect(reference).toContain("| `at?` | context path (context.expiresAt) |");
    expect(reference).toContain("| `onMatch?` | event-name glob (leg.*)[] |");
    expect(reference).toContain("| `path` | path (/payments/{id}) |");
  });

  it("documents the common fields once", () => {
    expect(reference).toContain("### Common fields");
    expect(reference.match(/\| `provenance\?` \|/g)).toHaveLength(1);
  });
});

describe("commandsReference / rulesReference", () => {
  it("lists every command with its arguments", () => {
    const table = commandsReference();
    for (const command of listCommands()) expect(table).toContain(`| \`${command.type}\` |`);
    expect(table).toContain("| `node.add` | `canvas`, `node`, `id?`, `at?` |");
    expect(table).toContain("| `canvas.create` | `kind`, `name`, `owner?`, `id?`, … |");
  });

  it("lists every rule with its severity", () => {
    const table = rulesReference();
    for (const rule of listRules()) expect(table).toContain(`| \`${rule.code}\` | ${rule.severity} |`);
  });
});

describe("operationsReference", () => {
  it("lists every operation of the agent contract with its MCP tool, its arguments and where it runs", () => {
    const table = operationsReference();
    for (const operation of OPERATIONS)
      expect(table).toContain(`| \`${operation.name}\` | \`${toolNameOf(operation.name)}\` |`);
    expect(table).toContain("| `view.point` | `view_point` | `ids`, `note?` | ");
    expect(table).toMatch(/\| `view\.point` .* \| the Editor \|$/m);
    expect(table).toMatch(/\| `batch\.apply` .* \| a file or the Editor \|$/m);
  });
});

describe("legendReference", () => {
  it("lists every node and edge style with its look and legend wording", () => {
    const table = legendReference();
    for (const [key, style] of Object.entries(NODE_STYLES))
      expect(table).toContain(`| \`${key}\` | fill ${style.fill}`);
    for (const key of Object.keys(EDGE_STYLES)) expect(table).toContain(`| \`${key}\` | stroke `);
    expect(table).toContain(
      "| `state.waiting` | fill #F6F7FA, stroke #878E91, chip WAITS | Waiting on another party |"
    );
    expect(table).toContain("| `edge.failure` | stroke #B42318, width 1.2, dashed 5,4 | Failure · reversal |");
  });
});
