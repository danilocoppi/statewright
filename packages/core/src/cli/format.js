/** Problem counts per severity. */
export function summarize(problems) {
  const summary = { error: 0, warning: 0, incomplete: 0 };
  for (const problem of problems) summary[problem.severity] += 1;
  return summary;
}

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "1 error · 2 warnings · 0 incomplete" */
export function formatSummary(summary) {
  return `${plural(summary.error, "error")} · ${plural(summary.warning, "warning")} · ${summary.incomplete} incomplete`;
}

/** Problems as aligned lines: severity, code, target, message. */
export function formatProblems(problems) {
  const width = key => Math.max(0, ...problems.map(problem => problem[key].length));
  const [severity, code, target] = [width("severity"), width("code"), width("target")];
  return problems
    .map(
      problem =>
        `  ${problem.severity.padEnd(severity)}  ${problem.code.padEnd(code)}  ${problem.target.padEnd(target)}  ${problem.message}\n`
    )
    .join("");
}

/** Argument names of a command's JSON Schema: required first as written, optional with "?", "…" for extra keys. */
export function argNames(schema) {
  const required = new Set(schema.required ?? []);
  const names = Object.keys(schema.properties ?? {}).map(name => (required.has(name) ? name : `${name}?`));
  if (schema.additionalProperties !== false) names.push("…");
  return names;
}

/** The level tree of `hierarchy()` as indented lines. */
export function formatTree(doc, tree, depth = 0) {
  const canvas = doc.canvases[tree.canvas];
  const steps = [tree.via, tree.definition, tree.canvas].filter(Boolean).join(" → ");
  const about = canvas ? `  ${canvas.name}  [${canvas.kind}]` : "  (missing)";
  const line = `${"  ".repeat(depth)}${steps}${about}${tree.cycle ? "  (cycle)" : ""}\n`;
  return line + tree.children.map(child => formatTree(doc, child, depth + 1)).join("");
}
