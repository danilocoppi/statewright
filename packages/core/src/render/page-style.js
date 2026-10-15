// The look of a scenario page (simulator spec §7.2, mockup 06): the Editor's light theme — its tokens, type and
// motion — on one self-contained page: the story on the left, the figure on the dotted ground on the right, and the
// stage layout (mockup 05) when it is presented.

/** The page's style sheet. The run's marks share the Editor's: the accent ring with its halo, receding the rest. */
export const PAGE_STYLE = `
:root {
  --canvas: #fbfbfc;
  --dot: #d8dbe1;
  --surface: #ffffff;
  --subtle: #f1f3f6;
  --ink: #05060f;
  --sub: #464849;
  --muted: #696f72;
  --hairline: #eceef2;
  --control-border: #d9dce2;
  --accent: #0a66c2;
  --accent-soft: #eef4fb;
  --halo: rgb(10 102 194 / 0.14);
  --warning: #b45309;
  --warning-soft: #fffbeb;
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SF Mono", Consolas, monospace;
  color-scheme: light;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--canvas);
  color: var(--ink);
  font: 400 14px/1.5 var(--sans);
  -webkit-font-smoothing: antialiased;
}
button { font: inherit; color: inherit; }
button:not(:disabled) { cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

.page {
  display: grid;
  grid-template-columns: minmax(320px, 26rem) minmax(0, 1fr);
  height: 100vh;
  height: 100dvh;
}

/* The story: the scenario and its steps, each as it is told. */
.story {
  overflow-y: auto;
  padding: 56px 32px 48px 40px;
  background: var(--surface);
  border-right: 1px solid var(--hairline);
}
.kicker {
  margin: 0;
  font: 500 10.5px/1.4 var(--mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
h1 {
  margin: 12px 0 0;
  font-size: 30px;
  line-height: 1.16;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.description { margin-top: 14px; font-size: 15px; line-height: 1.55; color: var(--sub); }
.description p { margin: 0 0 8px; }
.description code { font: 0.92em var(--mono); }
.description a { color: var(--accent); }
.steps {
  display: grid;
  gap: 2px;
  margin: 28px 0 0;
  padding: 20px 0 0;
  list-style: none;
  border-top: 1px solid var(--hairline);
}
.step {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  column-gap: 12px;
  align-items: baseline;
  width: calc(100% + 32px);
  margin: 0 -16px;
  padding: 12px 16px 14px;
  border: 0;
  border-radius: 12px;
  background: none;
  text-align: left;
  transition: background-color 160ms var(--ease);
}
.step:hover { background: var(--subtle); }
.step[aria-current="step"] { background: var(--accent-soft); }
.number { font: 500 13px/1.5 var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); }
.input { min-width: 0; overflow-wrap: anywhere; font: 400 13.5px/1.5 var(--mono); color: var(--ink); }
.step[aria-current="step"] :is(.number, .input) { color: var(--accent); }
.text { grid-column: 2; margin-top: 4px; font-size: 15px; line-height: 1.5; text-wrap: pretty; }
.generated { color: var(--sub); }
.answers { grid-column: 2; margin: 6px 0 0; padding: 0; list-style: none; font-size: 13px; color: var(--sub); }
.step .answers { display: grid; }
.stopped {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 13.5px;
}

/* The figure: the level the step is seen on, on the dotted ground, with the levels above it. */
.view {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  background-color: var(--canvas);
  background-image: radial-gradient(circle, var(--dot) 1.2px, transparent 1.4px);
  background-size: 18px 18px;
}
.top { display: flex; align-items: flex-start; gap: 16px; padding: 28px 32px 0; }
.heading { min-width: 0; margin-right: auto; }
.crumbs { display: none; margin: 0 0 6px; font-size: 18px; letter-spacing: -0.01em; color: var(--muted); }
.crumbs strong { font-weight: 600; color: var(--ink); }
.trail { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; margin: 0; font-size: 15px; color: var(--sub); }
.trail span:last-child { color: var(--ink); }
.trail span + span::before { content: "›"; margin-right: 8px; color: var(--muted); }
.ghost {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--control-border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 13px;
  font-weight: 500;
}
.ghost:hover { background: var(--subtle); }
.ghost svg { width: 15px; height: 15px; }
kbd {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 20px;
  padding: 0 5px;
  border: 1px solid var(--control-border);
  border-radius: 4px;
  background: var(--surface);
  font: 500 11px/1 var(--mono);
  color: var(--sub);
}
.exit { display: none; }
.figure { position: relative; min-height: 0; padding: 20px 32px; }
.level { display: grid; place-items: center; width: 100%; height: 100%; margin: 0; }
.level[hidden] { display: none; }
.level svg {
  display: block;
  width: 100%;
  height: 100%;
  max-width: calc(var(--width) * 1.8px);
  max-height: calc(var(--height) * 1.8px);
}
/* Core draws a figure on a white card; on the page it sits on the dotted ground. */
.level svg > rect:first-of-type { fill: none; stroke: none; }
.foot { display: flex; align-items: center; gap: 12px; padding: 0 32px 24px; font-size: 13px; color: var(--muted); }
.foot .made { margin-right: auto; }
.key {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--control-border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--sub);
}
.key:hover:not(:disabled) { background: var(--subtle); color: var(--ink); }
.key:disabled { opacity: 0.4; }
.key svg { width: 14px; height: 14px; }

/* The run on the figure: what is not part of it recedes; its marks are drawn over the figure, which stays Core's. */
.figure [data-id] { transition: opacity 160ms var(--ease); }
.figure.run [data-id]:not(.on) { opacity: 0.38; }
.mark-halo { fill: none; stroke: var(--halo); stroke-width: 4; }
.mark-ring { fill: none; stroke: var(--accent); stroke-width: 2; }
.mark-ring.inside { stroke-width: 1.5; }
.mark-left { fill: none; stroke: var(--accent); stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.45; }
.mark-dot { fill: var(--accent); }
.mark-count rect { fill: var(--accent); }
.mark-count text { fill: var(--surface); font: 600 10px var(--mono); }
.mark-pill rect { fill: var(--surface); stroke: var(--accent); }
.mark-pill circle { fill: var(--accent); }
.mark-pill text { fill: var(--accent); font: 400 11px var(--mono); }
.mark-fired { fill: none; stroke: var(--accent); stroke-width: 1.6; }
.mark-pulse { fill: none; stroke: var(--accent); stroke-width: 4; stroke-linecap: round; opacity: 0; }
.mark-label rect { fill: var(--accent); }
.mark-label text { fill: var(--surface); font: 500 10px var(--mono); }
.mark-travel { fill: none; stroke: var(--accent); stroke-width: 2; }

/* The caption card of the stage (mockup 05), shown while the page is presented. */
.card {
  position: absolute;
  left: 50%;
  bottom: 32px;
  display: none;
  width: min(760px, calc(100% - 48px));
  padding: 22px 28px 18px;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1px solid rgb(5 6 15 / 0.08);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgb(5 6 15 / 0.06), 0 12px 40px rgb(5 6 15 / 0.1);
}
.card-head { display: flex; align-items: center; gap: 12px; min-height: 28px; font-size: 14px; color: var(--sub); }
.counter { font-variant-numeric: tabular-nums; }
.pill {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  font: 400 14px/1.3 var(--mono);
  color: var(--accent);
}
.pill:empty { display: none; }
.clock { margin-left: auto; font-variant-numeric: tabular-nums; }
.caption { margin: 14px 0 0; font-size: 23px; line-height: 1.42; letter-spacing: -0.012em; text-wrap: pretty; }
.card .answers { margin-top: 8px; font-size: 14px; }
.card .stops { margin: 12px 0 0; padding: 8px 12px; border-radius: 8px; background: var(--warning-soft); color: var(--warning); font-size: 13.5px; }
.card .stops:empty { display: none; }
.card-foot { display: flex; align-items: center; gap: 16px; margin-top: 20px; }
.progress { display: flex; flex: 1; gap: 4px; }
.progress span { flex: 1; height: 3px; border-radius: 2px; background: var(--hairline); transition: background-color 250ms var(--ease); }
.progress span.done { background: var(--accent); }
.arrows { display: flex; gap: 6px; }

body.presenting .page { grid-template-columns: minmax(0, 1fr); }
body.presenting .story, body.presenting .foot, body.presenting .present { display: none; }
body.presenting .crumbs { display: block; }
body.presenting .exit { display: inline-flex; }
body.presenting .card { display: block; }
body.presenting .top { padding: 36px 48px 0; }
body.presenting .figure { padding: 24px 48px calc(var(--card, 200px) + 56px); }

@media (max-width: 860px) {
  .page { display: flex; flex-direction: column-reverse; height: auto; }
  .story { overflow: visible; padding: 32px 24px 40px; border-right: 0; border-top: 1px solid var(--hairline); }
  .view { height: 64vh; }
  .top { padding: 20px 20px 0; }
  .figure { padding: 12px 16px; }
  .foot { padding: 0 20px 16px; }
  body.presenting .view { height: 100vh; height: 100dvh; }
  body.presenting .top { padding: 20px 20px 0; }
  body.presenting .figure { padding: 12px 16px calc(var(--card, 200px) + 32px); }
  .card { bottom: 16px; width: calc(100% - 24px); padding: 18px 20px 14px; }
  .caption { font-size: 19px; }
}
@media (prefers-reduced-motion: reduce) {
  .figure [data-id], .step, .progress span { transition: none; }
}
`;
