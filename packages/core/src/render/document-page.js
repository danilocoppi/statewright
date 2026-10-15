// The documentation as a page (documentation page spec): the whole project as one self-contained HTML file to read,
// share and print. It says what the Markdown documentation says (`documentModel`), laid out to be read: the contents on
// the left, a cover with the project's numbers, the map, every level with its diagram (`toSVG`) and tables, the
// catalog and the findings. It makes no request; its small script only marks the contents.
import { cellParts, documentModel } from "../docs/document.js";
import { storyOf } from "../simulate/index.js";
import { DOCUMENT_PAGE_SCRIPT } from "./document-page-script.js";
import { DOCUMENT_PAGE_STYLE } from "./document-page-style.js";
import { fontFaces, inline, paragraphs, webAddress } from "./page-parts.js";
import { clockWords, inputWords, sentenceOf, stoppedWords } from "./story-words.js";
import { esc } from "./svg.js";

/** Severities, the most severe first, and how a heading names them. */
const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const capital = word => `${word[0].toUpperCase()}${word.slice(1)}`;
const STAGES = { target: "target", "as-built": "as built", reference: "reference" };
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The columns whose values are codes (written as chips), and those that are descriptions (inline Markdown). */
const CODE_COLUMNS = new Set(["Request", "When"]);
const TEXT_COLUMNS = new Set(["Description"]);

/** One table, or nothing without rows. Rows are already HTML. */
const tableOf = (kind, headers, rows) =>
  rows.length ?
    `<div class="table"><table class="${kind}">
<thead><tr>${headers.map(header => `<th scope="col">${esc(header)}</th>`).join("")}</tr></thead>
<tbody>
${rows.join("\n")}
</tbody>
</table></div>`
  : "";
const rowOf = (cells, id) =>
  `<tr${id ? ` id="${esc(id)}"` : ""}>${cells.map(cell => `<td>${cell}</td>`).join("")}</tr>`;

/** The page's words for one section: its number, its name in the contents and its heading. */
function sectionHead(number, id, name, heading, lead) {
  return `<header class="section-head">
<p class="eyebrow">${number} — ${name}</p>
<h2 id="${id}-title">${heading}</h2>
<p class="lead">${lead}</p>
</header>`;
}

/**
 * The documentation page. Deterministic: the same document and fonts give the same bytes.
 * @param {any} doc A valid document.
 * @param {{ fonts?: Array<{ family: string, weight: string, data: string }>, render: Function }} options `fonts`:
 *   WOFF2 files in base64, embedded with `@font-face` (without them the page uses the system's fonts); `render`:
 *   `toSVG`.
 * @returns {Promise<string>}
 */
export async function documentPageOf(doc, { fonts = [], render }) {
  const model = documentModel(doc);
  const levelIds = new Set(model.levels.map(level => level.id));
  const catalogIds = new Set(model.catalog.flatMap(collection => collection.rows.map(row => row.id)));

  /** A name a cell says: a link to its level, a chip linking to its catalog item, or a chip. */
  const refHtml = ref =>
    levelIds.has(ref.id) ? `<a href="#level-${esc(ref.id)}">${esc(ref.text)}</a>`
    : catalogIds.has(ref.id) ? `<a class="chip" href="#catalog-${esc(ref.id)}"><code>${esc(ref.text)}</code></a>`
    : `<code>${esc(ref.text)}</code>`;
  const cellHtml = cell =>
    cellParts(cell)
      .map(part => (typeof part === "string" ? esc(part) : refHtml(part)))
      .join("");
  /** Where a finding's target is: its level, or its catalog item; its name otherwise. */
  const targetHtml = target =>
    target.canvasId && levelIds.has(target.canvasId) ?
      `<a href="#level-${esc(target.canvasId)}">${esc(target.name)}</a>`
    : catalogIds.has(target.id) ? `<a href="#catalog-${esc(target.id)}">${esc(target.name)}</a>`
    : esc(target.name);
  const severityHtml = severity => `<span class="severity severity-${esc(severity)}">${esc(severity)}</span>`;
  const findingsById = new Map(model.findings.map(finding => [finding.id, finding]));

  // The sections present, numbered in order: a project without catalog or findings ends sooner.
  const sections = [
    { id: "map", name: "Map" },
    { id: "levels", name: "Levels" },
    ...(model.catalog.length ? [{ id: "catalog", name: "Catalog" }] : []),
    ...(model.findings.length ? [{ id: "findings", name: "Findings" }] : [])
  ].map((section, index) => ({ ...section, number: String(index + 1).padStart(2, "0") }));
  const numberOf = id => sections.find(section => section.id === id).number;

  // The cover: the root's kind and stage, the name, the description, pills and the numbers that are not 0.
  const { project, counts } = model;
  const stage = project.stage ? STAGES[project.stage] : null;
  const kinds = [
    counts.levels.machine ? plural(counts.levels.machine, "machine") : null,
    counts.levels.flow ? plural(counts.levels.flow, "flow") : null,
    counts.levels.system ? plural(counts.levels.system, "system") : null
  ].filter(Boolean);
  const pills = [
    stage ? ["Stage", stage] : null,
    ["Levels", kinds.join(" · ")],
    doc.generator ? ["Written by", `Statewright ${doc.generator.version}`] : null
  ]
    .filter(Boolean)
    .map(([label, value]) => `<span class="pill"><span>${esc(label)}</span><strong>${esc(value)}</strong></span>`);
  const levelCount = model.levels.length;
  const stats = [
    [levelCount, levelCount === 1 ? "level" : "levels"],
    [counts.states, counts.states === 1 ? "state" : "states"],
    [counts.transitions, counts.transitions === 1 ? "transition" : "transitions"],
    [counts.scenarios, counts.scenarios === 1 ? "scenario" : "scenarios"],
    [
      counts.findings,
      `${counts.findings === 1 ? "finding" : "findings"}${counts.severe ? `, ${counts.severe} high or critical` : ""}`
    ]
  ]
    .filter(([count]) => count)
    .map(
      ([count, label]) =>
        `<li class="stat"><strong class="number">${count}</strong><span class="label">${esc(label)}</span></li>`
    );
  const cover = `<header class="cover" id="cover">
<p class="kicker">${esc([project.rootKind, stage].filter(Boolean).join(" · "))}</p>
<h1>${esc(project.name)}</h1>
${project.description ? `<div class="lead">${paragraphs(project.description)}</div>\n` : ""}<p class="pills">${pills.join("")}</p>
<ul class="stats">${stats.join("")}</ul>
</header>`;

  // 01 — Map: the root level's diagram, then the levels as a tree.
  const root = model.levels[0];
  const rootSvg = (await render(doc, root.id, { header: false, legend: false, idPrefix: "sw-map" })).trim();
  let tree = "";
  let depth = -1;
  for (const level of model.levels) {
    if (level.depth > depth) tree += "<ol>".repeat(level.depth - depth);
    else tree += `</li>${"</ol></li>".repeat(depth - level.depth)}`;
    const about = level.caption || level.title;
    tree += `<li><a href="#level-${esc(level.id)}">${esc(level.path.at(-1))}</a><span class="kind">${esc(level.kind)}</span>${about ? `<span class="about">${inline(about)}</span>` : ""}`;
    depth = level.depth;
  }
  tree += `</li>${"</ol></li>".repeat(depth)}</ol>`;
  const map = `<section class="section" id="map" aria-labelledby="map-title">
${sectionHead(numberOf("map"), "map", "Map", "How the levels fit", `${esc(root.path.at(-1))}, the top level, as the Editor draws it; then every level, each a link to its part below.`)}
<figure class="diagram map-figure">${rootSvg}</figure>
<p class="figure-foot"><a href="#figure-${esc(root.id)}">Open full size</a></p>
<nav class="tree" aria-label="Levels">${tree.replace(/^<ol>/, '<ol class="tree-root">')}</nav>
</section>`;

  // 02 — Levels: one part per level, depth first.
  const parts = [];
  for (const level of model.levels) {
    const svg = (await render(doc, level.id, { header: false, legend: true, idPrefix: `sw-${level.id}` })).trim();
    const [, width] = /width="([\d.]+)"/.exec(svg);
    const facts = [
      level.kind,
      level.stage ? STAGES[level.stage] : null,
      level.subject ? `subject ${level.subject}` : null,
      level.transitions ? `transitions ${level.transitions}` : null
    ].filter(Boolean);
    const path =
      level.depth ?
        `<p class="path">${level.pathIds
          .slice(0, -1)
          .map((id, index) => `<a href="#level-${esc(id)}">${esc(level.path[index])}</a>`)
          .join('<span class="sep">›</span>')}<span class="sep">›</span><span>${esc(level.path.at(-1))}</span></p>`
      : "";
    const nodes = tableOf(
      level.kind === "machine" ? "states" : "elements",
      level.nodes.headers,
      level.nodes.rows.map(row => rowOf(row.cells.map(cellHtml)))
    );
    const edges = tableOf(
      level.kind === "machine" ? "transitions" : "connections",
      level.edges.headers,
      level.edges.rows.map(row => rowOf(row.cells.map(cellHtml)))
    );
    const scenarios = level.scenarios.map(scenario => {
      const story = storyOf(doc, doc.annotations.scenarios[scenario.id]);
      const start = story.frames[0];
      const steps = [
        start ? { number: "", input: "Start", text: sentenceOf(doc, level.id, start), generated: true } : null,
        // The steps from the one the design no longer takes are told as recorded, marked as not taken.
        ...doc.annotations.scenarios[scenario.id].steps.map((item, index) => {
          const frame = story.frames[index + 1];
          return frame ?
              {
                number: String(index + 1),
                input: inputWords(doc, frame.do),
                text: frame.caption ?? sentenceOf(doc, level.id, frame),
                generated: !frame.caption
              }
            : { number: String(index + 1), input: inputWords(doc, item.do), text: item.caption ?? "", untaken: true };
        })
      ]
        .filter(Boolean)
        .map(
          step =>
            `<li${step.untaken ? ' class="untaken"' : ""}><span class="number">${step.number}</span><span class="input">${esc(step.input)}</span><span class="text${step.generated ? " generated" : ""}">${step.untaken ? '<span class="tag">not taken</span>' : ""}${esc(step.text)}</span></li>`
        );
      const starts = `Starts ${clockWords(scenario.start.at)}${scenario.start.entry ? ` at ${scenario.start.entry}` : ""}`;
      const stopped = story.stopped ? stoppedWords(doc, level.id, story.stopped) : null;
      return `<div class="scenario" id="scenario-${esc(scenario.id)}">
<h5 class="scenario-name">${esc(scenario.name)}</h5>
<p class="scenario-start">${esc(starts)}</p>
${scenario.description ? `<div class="description">${paragraphs(scenario.description)}</div>\n` : ""}<ol class="steps">
${steps.join("\n")}
</ol>
${stopped ? `<p class="stopped">${esc(stopped)}</p>\n` : ""}</div>`;
    });
    const findings = tableOf(
      "level-findings",
      ["Finding", "Severity", "On"],
      level.findings.map(id => {
        const finding = findingsById.get(id);
        return rowOf([
          `<a class="chip" href="#finding-${esc(id)}"><code>${esc(finding.code)}</code></a> ${esc(finding.title)}`,
          severityHtml(finding.severity),
          finding.targets.map(targetHtml).join(", ")
        ]);
      })
    );
    parts.push(`<article class="part level" id="level-${esc(level.id)}" aria-labelledby="level-${esc(level.id)}-title">
<header class="part-head">
<h3 id="level-${esc(level.id)}-title">${esc(level.path.at(-1))}</h3>
${path}</header>
<div class="figure-card">
<p class="figure-eyebrow">${esc(facts.join(" · "))}</p>
${level.title ? `<p class="figure-title">${esc(level.title)}</p>\n` : ""}${level.caption ? `<p class="caption">${inline(level.caption)}</p>\n` : ""}<figure class="diagram" id="figure-${esc(level.id)}" style="--width: ${width}px">${svg}<a class="close" href="#level-${esc(level.id)}">Close</a></figure>
<p class="figure-foot"><a href="#figure-${esc(level.id)}">Open full size</a></p>
</div>
${nodes ? `<h4>${level.kind === "machine" ? "States" : "Elements"}</h4>\n${nodes}\n` : ""}${edges ? `<h4>${level.kind === "machine" ? "Transitions" : "Connections"}</h4>\n${edges}\n` : ""}${scenarios.length ? `<h4>Scenarios</h4>\n${scenarios.join("\n")}\n` : ""}${findings ? `<h4>Findings</h4>\n${findings}\n` : ""}</article>`);
  }
  const levels = `<section class="section" id="levels" aria-labelledby="levels-title">
${sectionHead(numberOf("levels"), "levels", "Levels", "Every level, in reading order", "Depth first from the top level: each with its diagram and legend, its tables, the scenarios that run it and the findings on it.")}
${parts.join("\n")}
</section>`;

  // 03 — Catalog: one table per collection that has items, each item with its anchor.
  const catalog =
    model.catalog.length ?
      `<section class="section" id="catalog" aria-labelledby="catalog-title">
${sectionHead(numberOf("catalog"), "catalog", "Catalog", "What the levels refer to", `Declared once and named by the levels: ${esc(model.catalog.map(collection => collection.collection).join(", "))}.`)}
${model.catalog
  .map(
    collection => `<div class="part" id="catalog-${collection.collection}">
<h3>${esc(collection.title)}</h3>
${tableOf(
  "catalog-table",
  collection.headers,
  collection.rows.map(row =>
    rowOf(
      row.cells.map((cell, index) => {
        const header = collection.headers[index];
        if (index === 0) return `<span class="item">${cellHtml(cell)}</span><code class="id">${esc(row.id)}</code>`;
        if (CODE_COLUMNS.has(header)) return cell.text ? `<code>${esc(cell.text)}</code>` : "";
        if (TEXT_COLUMNS.has(header)) return inline(cell.text);
        return cellHtml(cell);
      }),
      `catalog-${row.id}`
    )
  )
)}
</div>`
  )
  .join("\n")}
</section>`
    : "";

  // 04 — Findings: grouped by severity, the most severe first.
  const groups = SEVERITIES.map(severity => ({
    severity,
    items: model.findings.filter(finding => finding.severity === severity)
  })).filter(group => group.items.length);
  const findingsSection =
    model.findings.length ?
      `<section class="section" id="findings" aria-labelledby="findings-title">
${sectionHead(numberOf("findings"), "findings", "Findings", "What analysis found", `${esc(plural(counts.findings, "finding"))}, the most severe first${counts.severe ? `; ${counts.severe} high or critical` : ""}.`)}
${groups
  .map(
    group => `<div class="part">
<h3 id="findings-${group.severity}">${capital(group.severity)} <span class="count">${group.items.length}</span></h3>
${tableOf(
  "findings",
  ["Finding", "Detail", "Where"],
  group.items.map(finding =>
    rowOf(
      [
        `<code class="code">${esc(finding.code)}</code>${severityHtml(finding.severity)}<span class="title">${esc(finding.title)}</span>`,
        `${finding.description ? paragraphs(finding.description) : ""}${finding.source ? `<p class="source">Source: ${esc(finding.source)}</p>` : ""}`,
        [
          `<p>${finding.targets.map(targetHtml).join(", ")}</p>`,
          finding.evidence.length ?
            `<p class="evidence">${finding.evidence
              .map(item =>
                webAddress(item.url) ?
                  `<a href="${esc(item.url)}" rel="noopener noreferrer">${esc(item.text)}</a>`
                : `<code>${esc(item.text)}</code>`
              )
              .join(" ")}</p>`
          : ""
        ].join("")
      ],
      `finding-${finding.id}`
    )
  )
)}
</div>`
  )
  .join("\n")}
</section>`
    : "";

  // The contents: the sections and, under each, its parts.
  const partsOf = {
    levels: model.levels.map(
      level =>
        `<li style="--depth: ${level.depth}"><a href="#level-${esc(level.id)}">${esc(level.path.at(-1))}</a></li>`
    ),
    catalog: model.catalog.map(
      collection => `<li><a href="#catalog-${collection.collection}">${esc(collection.title)}</a></li>`
    ),
    findings: groups.map(group => `<li><a href="#findings-${group.severity}">${capital(group.severity)}</a></li>`)
  };
  const contents = sections
    .map(section => {
      const items = partsOf[section.id] ?? [];
      return `<li><a class="section-link" href="#${section.id}"><span class="number">${section.number}</span>${section.name}</a>${items.length ? `<ol class="parts">\n${items.join("\n")}\n</ol>` : ""}</li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Statewright">
<title>${esc(project.name)} · Documentation</title>
<style>
${fontFaces(fonts)}${DOCUMENT_PAGE_STYLE}</style>
</head>
<body>
<button type="button" class="contents-toggle" aria-controls="contents" aria-expanded="false">Contents</button>
<div class="shell">
<nav class="contents" id="contents" aria-label="Contents">
<a class="brand" href="#cover">${esc(project.name)}</a>
<ol class="sections">
${contents}
</ol>
</nav>
<main class="content">
${[cover, map, levels, catalog, findingsSection].filter(Boolean).join("\n")}
<footer class="foot">Made with Statewright</footer>
</main>
</div>
<script>
${DOCUMENT_PAGE_SCRIPT}();
</script>
</body>
</html>
`;
}
