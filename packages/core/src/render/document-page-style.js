// The look of the documentation page (documentation page spec §4): the reference document's layout — contents on the
// left, numbered sections in white cards on a grey page, tables of facts with code chips — in the Editor's light
// theme (its tokens and type, Editor spec §5.2), as the scenario page wears it.
import { BADGE, TONES } from "../style/palette.js";

/** Each severity in a tone of the diagram's palette, the most severe in the badge's own colours (as the Editor). */
const SEVERITY_TONES = {
  critical: BADGE,
  high: TONES.danger,
  medium: TONES.warning,
  low: TONES.info,
  info: TONES.neutral
};
const severities = Object.entries(SEVERITY_TONES)
  .map(([severity, tone]) => `.severity-${severity} { background: ${tone.fill}; color: ${tone.color}; }`)
  .join("\n");

/** The page's style sheet. */
export const DOCUMENT_PAGE_STYLE = `
:root {
  --page: #f6f7fa;
  --canvas: #fbfbfc;
  --dot: #d8dbe1;
  --surface: #ffffff;
  --faint: #f8f9fb;
  --subtle: #f1f3f6;
  --ink: #05060f;
  --sub: #464849;
  --muted: #696f72;
  --hairline: #e6e7ee;
  --rule: #eceef2;
  --control-border: #d9dce2;
  --accent: #0a66c2;
  --accent-deep: #074a77;
  --accent-soft: #eef4fb;
  --warning: #b45309;
  --warning-soft: #fffbeb;
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SF Mono", Consolas, monospace;
  color-scheme: light;
}
* { box-sizing: border-box; }
html { scroll-padding-top: 24px; }
body {
  margin: 0;
  background: var(--page);
  color: var(--ink);
  font: 400 14px/1.55 var(--sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-deep); text-decoration: underline; text-underline-offset: 2px; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
button { font: inherit; color: inherit; }
code { font-family: var(--mono); }

.shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); }

/* The contents: the sections and their parts, the one in view marked. */
.contents {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 32px 16px 40px 24px;
  border-right: 1px solid var(--hairline);
}
.brand {
  display: block;
  margin: 0 0 20px 10px;
  font: 500 11px/1.5 var(--mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.brand:hover { color: var(--ink); text-decoration: none; }
.contents ol { margin: 0; padding: 0; list-style: none; }
.sections > li + li { margin-top: 6px; }
.contents a:not(.brand) {
  display: block;
  padding: 5px 10px;
  border-radius: 6px;
  color: var(--sub);
  font-size: 13.5px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  transition: background-color 160ms var(--ease), color 160ms var(--ease);
}
.contents a:not(.brand):hover { background: var(--surface); color: var(--ink); text-decoration: none; }
.section-link { font-weight: 500; }
.section-link .number { display: inline-block; min-width: 24px; font: 500 12px/1 var(--mono); color: var(--muted); }
.contents .parts { margin-top: 2px; }
.contents .parts a { padding-left: calc(34px + var(--depth, 0) * 12px); font-size: 12.5px; color: var(--muted); }
.contents a[aria-current] { background: var(--accent-soft); color: var(--accent-deep); }
.contents a[aria-current] .number { color: var(--accent); }
.contents-toggle { display: none; }

/* The content: the cover, then each section in its card. */
.content { width: 100%; max-width: 1140px; margin: 0 auto; padding: 40px 40px 96px; min-width: 0; }
.cover, .section {
  margin: 0 0 32px;
  padding: 40px 44px 44px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(5 6 15 / 0.03);
}
.kicker, .eyebrow, .figure-eyebrow {
  margin: 0;
  font: 500 11.5px/1.5 var(--mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.kicker { color: var(--accent); }
h1 {
  max-width: 22em;
  margin: 12px 0 0;
  font-size: 34px;
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.cover .lead { max-width: 52em; margin-top: 14px; font-size: 16px; line-height: 1.6; color: var(--sub); }
.cover .lead p { margin: 0 0 8px; }
.lead code, .caption code, .about code, .description code, td code {
  padding: 1px 5px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  background: var(--faint);
  font-size: 0.86em;
  color: var(--ink);
}
.pills { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 0; }
.pill {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 11px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--faint);
  font-size: 12.5px;
  color: var(--muted);
}
.pill strong { font-weight: 500; color: var(--ink); }
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 12px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}
.stat { display: grid; gap: 4px; padding: 14px 16px 15px; border: 1px solid var(--hairline); border-radius: 10px; background: var(--faint); }
.stat .number { font-size: 26px; line-height: 1.1; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.stat .label { font-size: 12.5px; line-height: 1.4; color: var(--muted); }

.section-head { margin-bottom: 28px; }
h2 { margin: 8px 0 0; font-size: 26px; line-height: 1.2; font-weight: 600; letter-spacing: -0.015em; }
.section-head .lead { max-width: 52em; margin: 8px 0 0; font-size: 15px; line-height: 1.6; color: var(--sub); }
h3 { margin: 0; font-size: 20px; line-height: 1.3; font-weight: 600; letter-spacing: -0.01em; overflow-wrap: anywhere; }
h4 { margin: 28px 0 10px; font-size: 13px; font-weight: 600; letter-spacing: 0.01em; color: var(--sub); }

/* The map: the top level, then the levels as a tree. */
.tree { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--rule); }
.tree ol { margin: 0; padding: 0 0 0 22px; list-style: none; }
.tree .tree-root { padding: 0; }
.tree li { margin: 0; }
.tree li > a { font-weight: 500; }
.tree ol ol { border-left: 1px solid var(--hairline); margin-left: 6px; padding-left: 16px; }
.tree li { padding: 4px 0; }
.tree .kind {
  margin-left: 8px;
  font: 500 10.5px/1 var(--mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.tree .about { display: block; max-width: 60em; font-size: 13px; color: var(--sub); }

/* A level: its heading and path, its diagram in a card, its tables, scenarios and findings. */
.part + .part { margin-top: 44px; padding-top: 40px; border-top: 1px solid var(--rule); }
.part > h3 { margin-bottom: 14px; }
#catalog .part + .part, #findings .part + .part { margin-top: 32px; padding-top: 0; border-top: 0; }
.part-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; margin-bottom: 16px; }
.path { margin: 0; font: 400 12px/1.5 var(--mono); color: var(--muted); overflow-wrap: anywhere; }
.path a { color: var(--muted); }
.path a:hover { color: var(--accent); }
.path .sep { margin: 0 6px; }
.figure-card { padding: 20px 22px 14px; border: 1px solid var(--hairline); border-radius: 12px; background: var(--surface); }
.figure-title { margin: 6px 0 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
.caption { max-width: 60em; margin: 4px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--sub); }
.diagram { position: relative; margin: 14px 0 0; }
.diagram svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
/* Core draws a figure on a white card; in the page's card it needs no second one. */
.diagram svg > rect:first-of-type { fill: none; stroke: none; }
.map-figure { margin-top: 0; padding: 12px 0; }
.diagram .close { display: none; }
.figure-foot { display: flex; justify-content: flex-end; margin: 6px 0 0; font-size: 12.5px; }
/* "Open full size": the diagram alone over the page, at its own size, without a script (on screens: paper prints the
   document). */
@media screen {
  .diagram:target {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    margin: 0;
    padding: 64px 32px 32px;
    overflow: auto;
    background-color: var(--canvas);
    background-image: radial-gradient(circle, var(--dot) 1.2px, transparent 1.4px);
    background-size: 18px 18px;
  }
  .diagram:target svg > rect:first-of-type { fill: var(--surface); stroke: var(--hairline); }
  .diagram:target svg { flex: none; max-width: none; margin: auto; box-shadow: 0 1px 2px rgb(5 6 15 / 0.06), 0 12px 40px rgb(5 6 15 / 0.08); border-radius: 12px; }
  .diagram:target .close {
    position: fixed;
    top: 16px;
    right: 20px;
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 14px;
    border: 1px solid var(--control-border);
    border-radius: 8px;
    background: var(--surface);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
}

/* Tables of facts: a faint header row, hairline rules, names as code chips. */
.table { overflow-x: auto; border: 1px solid var(--hairline); border-radius: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.5; }
th {
  padding: 9px 12px;
  border-bottom: 1px solid var(--hairline);
  background: var(--faint);
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--sub);
  white-space: nowrap;
}
/* Words stay whole; codes and IDs, often long and unbroken, break anywhere so a table fits its column. */
td { padding: 9px 12px; border-bottom: 1px solid var(--rule); vertical-align: top; overflow-wrap: break-word; }
tbody tr:last-child td { border-bottom: 0; }
td p { margin: 0; }
td p + p { margin-top: 6px; }
td code { display: inline-block; padding: 0 5px; font-size: 11.5px; line-height: 18px; white-space: normal; overflow-wrap: anywhere; }
a.chip { text-decoration: none; }
a.chip code { color: var(--accent-deep); }
a.chip:hover code { border-color: var(--accent); background: var(--accent-soft); }
tr:target td { background: var(--accent-soft); }
.catalog-table td:first-child { min-width: 200px; }
.item { font-weight: 500; }
.item + .id { display: block; width: fit-content; margin-top: 3px; border: 0; background: none; padding: 0; color: var(--muted); font-size: 11px; }
.states td:first-child, .elements td:first-child { font-weight: 500; }

/* Scenarios: each step in words, as the scenario page tells it. */
.scenario { padding: 16px 20px 14px; border: 1px solid var(--hairline); border-radius: 10px; }
.scenario + .scenario { margin-top: 12px; }
.scenario-name { margin: 0; font-size: 14.5px; font-weight: 600; }
.scenario-start { margin: 2px 0 0; font-size: 12.5px; color: var(--muted); }
.scenario .description { margin-top: 6px; font-size: 13.5px; color: var(--sub); }
.scenario .description p { margin: 0 0 4px; }
.steps {
  display: grid;
  grid-template-columns: 22px minmax(0, max-content) minmax(0, 1fr);
  gap: 6px 12px;
  margin: 12px 0 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--rule);
  list-style: none;
}
.steps li { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; align-items: baseline; }
.steps .number { font: 500 12px/1.5 var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); }
.steps .input { max-width: 260px; font: 400 12.5px/1.5 var(--mono); overflow-wrap: anywhere; }
.steps .text { font-size: 13.5px; line-height: 1.5; text-wrap: pretty; }
.steps .generated { color: var(--sub); }
.untaken :is(.number, .input, .text) { color: var(--muted); }
.tag {
  margin-right: 8px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--warning-soft);
  font: 500 10.5px/1.5 var(--mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warning);
}
.stopped { margin: 10px 0 0; padding: 8px 12px; border-radius: 8px; background: var(--warning-soft); color: var(--warning); font-size: 13px; }

/* Findings: by severity, each with its detail, where it is and its evidence. */
.count { margin-left: 6px; font: 500 12px/1 var(--mono); color: var(--muted); vertical-align: 2px; }
.severity {
  display: inline-block;
  padding: 0 8px;
  border-radius: 999px;
  font: 500 10.5px/18px var(--mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}
${severities}
.findings td:first-child { width: 30%; }
.findings td:last-child { width: 28%; }
.findings .code { margin-right: 6px; }
.findings .title { display: block; margin-top: 6px; font-weight: 500; }
.source { color: var(--muted); font-size: 12.5px; }
.evidence { display: flex; flex-wrap: wrap; gap: 4px; }
.level-findings td:nth-child(2) { width: 1%; }

.foot { padding: 8px 4px; font-size: 12.5px; color: var(--muted); }

/* Narrow windows: the contents behind a button (with the script), else above the content. */
@media (max-width: 900px) {
  .shell { display: block; }
  .contents { position: static; height: auto; padding: 24px 20px; border-right: 0; border-bottom: 1px solid var(--hairline); }
  .js .contents {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 30;
    width: min(320px, 86vw);
    height: 100vh;
    height: 100dvh;
    padding-top: 64px;
    background: var(--page);
    border-right: 1px solid var(--hairline);
    box-shadow: 0 12px 40px rgb(5 6 15 / 0.12);
    transform: translateX(-102%);
    visibility: hidden;
    transition: transform 160ms var(--ease), visibility 0s linear 160ms;
  }
  .js.contents-open .contents { transform: none; visibility: visible; transition: transform 160ms var(--ease); }
  .js .contents-toggle {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 35;
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--control-border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: 0 1px 2px rgb(5 6 15 / 0.06);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .js .content { padding-top: 60px; }
  .content { padding: 16px 12px 64px; }
  .cover, .section { padding: 28px 20px 32px; }
  h1 { font-size: 28px; }
  .figure-card { padding: 16px 14px 10px; }
  .steps { grid-template-columns: 22px minmax(0, 1fr); }
  .steps .text { grid-column: 2; }
}
@media (prefers-reduced-motion: reduce) {
  .contents a, .js .contents { transition: none !important; }
}

/* Paper: no contents, cards without shadows, a page break before each level. */
@page { margin: 16mm 14mm; }
@media print {
  body { background: #ffffff; font-size: 12px; }
  .contents, .contents-toggle, .figure-foot, .diagram .close { display: none !important; }
  .shell { display: block; }
  .content { max-width: none; padding: 0; }
  .cover, .section { margin: 0 0 24px; padding: 0; border: 0; box-shadow: none; border-radius: 0; }
  .section { break-before: page; }
  .level { break-before: page; }
  .section > .level:first-of-type { break-before: avoid; }
  .part + .part { margin-top: 0; padding-top: 0; border-top: 0; }
  .figure-card, .scenario, .stat, tr { break-inside: avoid; }
  .table { overflow: visible; }
  /* Paper cannot scroll: a long name breaks rather than push a column off the page. */
  td { overflow-wrap: anywhere; }
  thead { display: table-header-group; }
  a { color: inherit; }
  .diagram svg { max-width: 100%; }
}
`;
