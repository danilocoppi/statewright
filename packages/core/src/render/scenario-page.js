// A scenario as a page anyone can open (simulator spec §7.2, mockup 06): one self-contained HTML file — its style, a
// small script, the fonts when given, one figure per level the scenario visits and its story as data — that makes no
// request. Each step only marks the run on figures `toSVG` drew, through the `data-id` of their elements.
import { storyOf } from "../simulate/index.js";
import { PAGE_STYLE } from "./page-style.js";
import { PAGE_SCRIPT } from "./page-script.js";
import { fontFaces, paragraphs } from "./page-parts.js";
import { answerWords, clockWords, inputWords, pathWords, sentenceOf, stoppedWords } from "./story-words.js";
import { esc } from "./svg.js";

const ICONS = {
  present:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.75" y="2.25" width="12.5" height="8.75" rx="1.5"/><path d="M8 11v2.75M5.25 13.75h5.5"/><path d="M6.75 4.9 9.6 6.6 6.75 8.35z" fill="currentColor"/></svg>',
  previous:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4"/></svg>',
  next: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>'
};

/** The last ID of a run's path: the node it ends on. */
const lastOf = path => path.slice(path.lastIndexOf("/") + 1);

/**
 * A scenario page (simulator spec §7.2). Deterministic: the same document, scenario and fonts give the same bytes.
 * @param {any} doc A valid document.
 * @param {string} scenarioId
 * @param {{ fonts?: Array<{ family: string, weight: string, data: string }>, render: Function }} options `fonts`:
 *   WOFF2 files in base64, embedded with `@font-face` (the Editor passes Inter and Geist Mono; without them the page
 *   uses the system's fonts); `render`: `toSVG`.
 * @returns {Promise<string>}
 */
export async function scenarioPageOf(doc, scenarioId, { fonts = [], render }) {
  const scenario = doc.annotations?.scenarios?.[scenarioId];
  if (!scenario) throw new Error(`No scenario "${scenarioId}"`);
  const top = scenario.canvas;
  const story = storyOf(doc, scenario);
  const total = scenario.steps.length;
  const frames = story.frames.map(frame => ({
    number: frame.step ? String(frame.step) : "",
    input: inputWords(doc, frame.do),
    text: frame.caption ?? sentenceOf(doc, top, frame),
    generated: !frame.caption,
    answers: frame.answers.map(answer => answerWords(doc, top, answer)),
    clock: clockWords(frame.clock),
    level: frame.level,
    trail: frame.trail.map(id => doc.canvases[id].name),
    run: frame.active.map(path => ({ ids: path.split("/"), name: pathWords(doc, top, path) })),
    fired: frame.taken.map(item => ({
      edge: item.edge,
      from: lastOf(item.from),
      to: lastOf(item.to),
      initial: item.initial
    }))
  }));

  const levels = [...new Set(frames.length ? frames.map(frame => frame.level) : [top])];
  const figures = [];
  for (const [index, level] of levels.entries()) {
    const svg = (await render(doc, level, { header: false, legend: false, idPrefix: `sw-${level}` })).trim();
    const [, width, height] = /width="([\d.]+)" height="([\d.]+)"/.exec(svg);
    figures.push(
      `<figure class="level" data-level="${esc(level)}" style="--width: ${width}; --height: ${height}"${index ? " hidden" : ""}>${svg}</figure>`
    );
  }

  const faces = fontFaces(fonts);
  const steps = frames
    .map((frame, index) => {
      // A button holds phrasing content only: its answers are lines of spans.
      const answers =
        frame.answers.length ?
          `<span class="answers">${frame.answers.map(words => `<span>${esc(words)}</span>`).join("")}</span>`
        : "";
      return `<li><button type="button" class="step"${index ? "" : ' aria-current="step"'}><span class="number">${frame.number}</span><span class="input">${esc(frame.input)}</span><span class="text${frame.generated ? " generated" : ""}">${esc(frame.text)}</span>${answers}</button></li>`;
    })
    .join("\n");
  const trail = (frames[0]?.trail ?? [doc.canvases[top].name]).map(name => `<span>${esc(name)}</span>`).join("");
  // Where the story stops before its end, said in the story and on the stage layout's card.
  const stopped = story.stopped ? stoppedWords(doc, top, story.stopped) : null;
  const data = JSON.stringify({ total, frames, stopped }).replaceAll("<", "\\u003c");
  const progress = Array.from({ length: total + 1 }, () => "<span></span>").join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Statewright">
<title>${esc(scenario.name)} · ${esc(doc.project.name)}</title>
<style>
${faces}${PAGE_STYLE}</style>
</head>
<body>
<main class="page">
<article class="story" aria-labelledby="sw-title">
<p class="kicker">${esc(doc.project.name)} · Scenario</p>
<h1 id="sw-title">${esc(scenario.name)}</h1>
${scenario.description ? `<div class="description">${paragraphs(scenario.description)}</div>\n` : ""}<ol class="steps" aria-label="Steps">
${steps}
</ol>
${stopped ? `<p class="stopped">${esc(stopped)}</p>\n` : ""}</article>
<section class="view" aria-label="Diagram">
<header class="top">
<div class="heading">
<p class="crumbs">${esc(doc.project.name)} / <strong>${esc(scenario.name)}</strong></p>
<p class="trail">${trail}</p>
</div>
<button type="button" class="ghost present">${ICONS.present}Present</button>
<button type="button" class="ghost exit"><kbd>Esc</kbd>Exit</button>
</header>
<div class="figure">
${figures.join("\n")}
</div>
<div class="card">
<div class="card-head"><span class="counter">Start</span><span class="pill"></span><span class="clock">${esc(frames[0]?.clock ?? "")}</span></div>
<p class="caption">${esc(frames[0]?.text ?? "")}</p>
<ul class="answers"></ul>
<p class="stops" role="status"></p>
<div class="card-foot"><div class="progress" aria-hidden="true">${progress}</div><div class="arrows"><button type="button" class="key" data-go="-1" aria-label="Previous step">${ICONS.previous}</button><button type="button" class="key" data-go="1" aria-label="Next step">${ICONS.next}</button></div></div>
</div>
<footer class="foot">
<span class="made">Made with Statewright</span>
<button type="button" class="key" data-go="-1" aria-label="Previous step">${ICONS.previous}</button>
<button type="button" class="key" data-go="1" aria-label="Next step">${ICONS.next}</button>
<span>step through</span>
</footer>
</section>
</main>
<p class="live sr-only" aria-live="polite"></p>
<script type="application/json" id="sw-story">${data}</script>
<script>
${PAGE_SCRIPT}(JSON.parse(document.getElementById("sw-story").textContent));
</script>
</body>
</html>
`;
}
