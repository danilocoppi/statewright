// The audit of a design (AI interface spec §8): its Problems, every scenario run again, and how much the scenarios
// cover — as data, and as a Markdown report for people and agents.
import { check } from "../rules/index.js";
import { replay } from "../simulate/index.js";
import { coverageOf } from "./coverage.js";

const SEVERITIES = ["error", "warning", "incomplete"];

const cell = value =>
  String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
const table = (headers, rows) =>
  [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${row.map(cell).join(" | ")} |`)
  ].join("\n");
const code = value => `\`${value}\``;
const plural = (count, word, words = `${word}s`) => `${count} ${count === 1 ? word : words}`;

/**
 * A scenario run again (Core's `replay`), summed up: `same`, or `diverged` at `step` (0: the start) and why; `replay`
 * is Core's result, step by step.
 * @param {any} doc
 * @param {string} id
 * @param {object} scenario
 */
export function replayed(doc, id, scenario) {
  const result = replay(doc, scenario);
  const at =
    result.first === null ? null
    : result.first === 0 ? result.start
    : result.steps[result.first - 1];
  return {
    id,
    name: scenario.name,
    canvas: scenario.canvas,
    status: result.first === null ? "same" : "diverged",
    ...(result.first === null ? {} : { step: result.first, reason: at.reason }),
    replay: result
  };
}

/**
 * Audit a design (AI interface spec §8): its Problems by severity — reachability and dead ends among them, from the
 * rules — every scenario run again, and the coverage of its levels by the scenarios.
 * @param {any} doc
 * @param {{ canvas?: string }} [options] `canvas`: only what concerns that level (its Problems, the scenarios that
 *   start there, its coverage).
 * @returns {{ summary: { error: number, warning: number, incomplete: number, scenarios: number, diverged: number,
 *   coverage: number | null }, problems: object[], scenarios: Array<{ id: string, name: string, canvas: string,
 *   status: "same" | "diverged", step?: number, reason?: string }>, coverage: ReturnType<typeof coverageOf> }}
 */
export function auditOf(doc, { canvas } = {}) {
  const problems = check(doc).filter(problem => !canvas || problem.canvas === canvas);
  const scenarios = Object.entries(doc.annotations?.scenarios ?? {})
    .filter(([, scenario]) => !canvas || scenario.canvas === canvas)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([id, scenario]) => {
      const outcome = replayed(doc, id, scenario);
      delete outcome.replay;
      return outcome;
    });
  const everything = coverageOf(doc);
  const levels = everything.levels.filter(level => !canvas || level.canvas === canvas);
  const coverage = canvas ? { ...everything, levels, percent: levels[0]?.percent ?? null } : everything;
  const count = severity => problems.filter(problem => problem.severity === severity).length;
  return {
    summary: {
      error: count("error"),
      warning: count("warning"),
      incomplete: count("incomplete"),
      scenarios: scenarios.length,
      diverged: scenarios.filter(scenario => scenario.status === "diverged").length,
      coverage: coverage.percent
    },
    problems,
    scenarios,
    coverage
  };
}

/** The scenarios in a sentence: how many, and how many go elsewhere now. */
function scenariosLine(summary, level) {
  if (!summary.scenarios) return level ? "No scenario starts on this level." : "No scenario.";
  const where = level ? " starting on this level" : "";
  const elsewhere = summary.diverged ? `${summary.diverged} going elsewhere now` : "none going elsewhere";
  return `${plural(summary.scenarios, "scenario")}${where}, ${elsewhere}.`;
}

/**
 * The audit as Markdown (AI interface spec §8): a summary, then the Problems, the scenarios and the coverage, with
 * IDs and names, in a stable order so two reports can be compared.
 * @param {any} doc
 * @param {{ canvas?: string }} [options]
 */
export function toAuditReport(doc, options = {}) {
  const audit = auditOf(doc, options);
  const { summary } = audit;
  const level = options.canvas ? doc.canvases[options.canvas]?.name : null;
  const out = [
    `# Audit of ${doc.project.name}${level ? ` — ${level}` : ""}`,
    "",
    `${plural(summary.error, "error")}, ${plural(summary.warning, "warning")} and ${summary.incomplete} incomplete. ` +
      scenariosLine(summary, level) +
      (summary.coverage === null ? " Nothing to cover."
      : level ? ` The document's scenarios cover ${summary.coverage} % of this level's states, nodes and transitions.`
      : ` The scenarios cover ${summary.coverage} % of the states, nodes and transitions.`),
    "",
    "## Problems",
    ""
  ];
  if (!audit.problems.length) out.push("None.", "");
  for (const severity of SEVERITIES) {
    const some = audit.problems.filter(problem => problem.severity === severity);
    if (!some.length) continue;
    out.push(
      `### ${severity[0].toUpperCase()}${severity.slice(1)}`,
      "",
      table(
        ["Code", "Target", "Level", "Message"],
        some.map(problem => [
          code(problem.code),
          code(problem.target),
          problem.canvas ? code(problem.canvas) : "",
          problem.message
        ])
      ),
      ""
    );
  }
  out.push("## Scenarios", "");
  out.push(
    audit.scenarios.length ?
      table(
        ["Scenario", "Name", "Level", "Result"],
        audit.scenarios.map(scenario => [
          code(scenario.id),
          scenario.name,
          code(scenario.canvas),
          scenario.status === "same" ?
            "same as recorded"
          : `goes elsewhere at step ${scenario.step} (${scenario.reason})`
        ])
      )
    : "None: record runs as scenarios to pin their behaviour and measure coverage.",
    "",
    "## Coverage",
    ""
  );
  out.push(
    audit.coverage.levels.length ?
      table(
        ["Level", "Kind", "States or nodes", "Transitions", "Covered", "Not reached"],
        audit.coverage.levels.map(item => [
          `${item.name} (${code(item.canvas)})`,
          item.kind,
          `${item.nodes.covered} / ${item.nodes.total}`,
          `${item.edges.covered} / ${item.edges.total}`,
          item.percent === null ? "—" : `${item.percent} %`,
          [...item.nodes.missed, ...item.edges.missed].map(code).join(" ")
        ])
      )
    : "No machine or flow level.",
    ""
  );
  return `${out.join("\n").trimEnd()}\n`;
}
