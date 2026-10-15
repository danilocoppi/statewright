// A conformance report in Markdown (source-of-truth spec §6): what the code's results say, the findings and the
// transitions no passing vector proves, for a person or an agent to act on.

/** How many of each outcome, in a sentence. */
function countsOf({ summary }) {
  const parts = [`${summary.passed} of ${summary.vectors} vectors passed`];
  if (summary.diverged) parts.push(`${summary.diverged} diverged`);
  if (summary.threw) parts.push(`${summary.threw} threw`);
  if (summary.incomplete) parts.push(`${summary.incomplete} stopped early`);
  if (summary.notRun) parts.push(`${summary.notRun} not run`);
  if (summary.unknown) parts.push(`${summary.unknown} not among the design's`);
  return parts.join(", ");
}

/**
 * A conformance report as Markdown.
 * @param {Awaited<ReturnType<typeof import("./compare.js").conformOf>>} report
 * @returns {string}
 */
export function toConformReport(report) {
  const runner = report.results.runner ? ` (${report.results.runner})` : "";
  const lines = [`# Conformance of ${report.design.name}`, ""];
  if (!report.same) {
    lines.push(`The results${runner} are for another version of the design: nothing was compared.`);
  } else {
    lines.push(`The results${runner} are for this version of the design: ${countsOf(report)}.`);
  }
  if (report.findings.length) {
    lines.push("", "## Findings", "");
    for (const finding of report.findings) {
      lines.push(`- **${finding.severity}** ${finding.title} (${finding.targets.map(id => `\`${id}\``).join(", ")})`);
    }
  }
  if (report.same) {
    const missed = report.coverage.filter(machine => machine.missed.length);
    lines.push("", "## Transitions no passing vector proves", "");
    if (!missed.length) lines.push("None: every transition of the machines is proved by a vector the code passed.");
    for (const machine of missed) {
      const list = machine.missed.map(({ id, from, to }) => `\`${from} → ${to}\` (\`${id}\`)`).join(", ");
      lines.push(`- ${machine.name} (\`${machine.machine}\`), ${machine.proved} of ${machine.transitions}: ${list}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
