import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { documentModel } from "../../src/docs/document.js";
import { toDocumentPage } from "../../src/render/index.js";
import { parse } from "../../src/serialize/parse.js";
import { minimalDoc, readExample } from "../helpers.js";

const EXAMPLES = ["bookings", "get-paid-as-built", "payments", "payout-batch"];
const example = name => parse(readExample(`${name}.statewright.json`)).doc;

/** Every `id` the page defines, and every in-page link it makes. */
const idsOf = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
const anchorsOf = html => [...html.matchAll(/\shref="#([^"]*)"/g)].map(match => match[1]);
/** The section eyebrows, in order. */
const eyebrowsOf = html => [...html.matchAll(/<p class="eyebrow">([^<]+)<\/p>/g)].map(match => match[1]);
/** The HTML of one element, from its opening tag with `id` to its closing `</tag>` (no nesting of the same tag). */
function partOf(html, tag, id) {
  const start = html.indexOf(`<${tag} `, html.lastIndexOf(`<${tag} `, html.indexOf(` id="${id}"`)));
  expect(start, id).toBeGreaterThanOrEqual(0);
  return html.slice(start, html.indexOf(`</${tag}>`, start) + tag.length + 3);
}
/** The rows of a table's body. */
const rowsOf = (html, kind) => {
  const table = new RegExp(`<table class="${kind}">.*?<tbody>(.*?)</tbody>`, "s").exec(html);
  return table ? [...table[1].matchAll(/<tr[ >]/g)].length : 0;
};

describe("the documentation as a page (documentation page spec)", () => {
  it("needs nothing else: its style is in it, the fonts too when given, and it requests nothing", async () => {
    const doc = example("payments");
    const html = await toDocumentPage(doc, { fonts: [{ family: "Inter", weight: "100 900", data: "AAAA" }] });
    expect(html.startsWith('<!doctype html>\n<html lang="en">')).toBe(true);
    expect(html).toContain("<title>Payments · Documentation</title>");
    expect(html).toContain(
      '@font-face { font-family: "Inter"; font-weight: 100 900; font-style: normal; font-display: block; src: url(data:font/woff2;base64,AAAA) format("woff2"); }'
    );
    const plain = await toDocumentPage(doc);
    expect(plain).not.toContain("@font-face");
    for (const page of [html, plain]) expect(page).not.toMatch(/<link|<script src|<img|<iframe|url\(http|src="/);
  });

  it("carries its small script inline: it marks the contents, and everything reads without it", async () => {
    const html = await toDocumentPage(example("payments"));
    const scripts = [...html.matchAll(/<script>(.*?)<\/script>/gs)].map(match => match[1]);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain("IntersectionObserver");
    expect(scripts[0]).toContain("aria-current");
    expect(scripts[0]).toContain("contents-open");
    // Without it: the contents are links, every part is in the HTML, nothing is marked yet.
    const withoutScript = html.replace(/<script>.*?<\/script>/s, "");
    expect(withoutScript).toContain('<article class="part level" id="level-cnv_expiryClock"');
    expect(withoutScript).not.toMatch(/aria-current="/);
  });

  it("is deterministic: the same design gives the same bytes", async () => {
    const doc = example("get-paid-as-built");
    expect(await toDocumentPage(doc)).toBe(await toDocumentPage(doc));
  });

  it("opens on a cover: the root's kind and stage, the name, the description, pills and the numbers that are not 0", async () => {
    const html = await toDocumentPage(example("payments"));
    const cover = partOf(html, "header", "cover");
    expect(cover).toContain('<p class="kicker">system · target</p>');
    expect(cover).toContain("<h1>Payments</h1>");
    expect(cover).toContain("Reference project for a payments platform drawn as state machines");
    expect(cover).toMatch(/<span class="pill"><span>Stage<\/span><strong>target<\/strong><\/span>/);
    expect(cover).toMatch(/<span>Levels<\/span><strong>4 machines · 1 system<\/strong>/);
    expect(cover).toMatch(/<span>Written by<\/span><strong>Statewright 0\.1\.0<\/strong>/);
    const stats = [...cover.matchAll(/<strong class="number">(\d+)<\/strong><span class="label">([^<]+)<\/span>/g)];
    expect(stats.map(match => `${match[1]} ${match[2]}`)).toEqual([
      "5 levels",
      "21 states",
      "29 transitions",
      "2 scenarios"
    ]);
    const paid = partOf(await toDocumentPage(example("get-paid-as-built")), "header", "cover");
    expect(paid).toContain('<p class="kicker">machine · as built</p>');
    expect(paid).toContain('<strong class="number">2</strong><span class="label">findings, 1 high or critical</span>');
  });

  it("numbers the sections it has: a project without catalog or findings ends at 02", async () => {
    expect(eyebrowsOf(await toDocumentPage(example("payments")))).toEqual(["01 — Map", "02 — Levels", "03 — Catalog"]);
    expect(eyebrowsOf(await toDocumentPage(example("get-paid-as-built")))).toEqual([
      "01 — Map",
      "02 — Levels",
      "03 — Catalog",
      "04 — Findings"
    ]);
    const bare = await toDocumentPage(minimalDoc());
    expect(eyebrowsOf(bare)).toEqual(["01 — Map", "02 — Levels"]);
    expect(bare).not.toContain('id="catalog"');
    expect(bare).not.toContain('id="findings"');
  });

  it("lists the sections and every level in the contents, indented by depth", async () => {
    const doc = example("payments");
    const html = await toDocumentPage(doc);
    const nav = partOf(html, "nav", "contents");
    expect([...nav.matchAll(/<a class="section-link" href="#([^"]+)"/g)].map(match => match[1])).toEqual([
      "map",
      "levels",
      "catalog"
    ]);
    const levels = [...nav.matchAll(/<li style="--depth: (\d+)"><a href="#level-([^"]+)"/g)];
    expect(levels.map(match => [match[2], Number(match[1])])).toEqual(
      documentModel(doc).levels.map(level => [level.id, level.depth])
    );
    expect(nav).toContain('href="#catalog-events"');
  });

  it("gives each level a part: its path, its diagram with the legend, its tables, scenarios and findings", async () => {
    const doc = example("payments");
    const html = await toDocumentPage(doc);
    const model = documentModel(doc);
    for (const level of model.levels) {
      const part = partOf(html, "article", `level-${level.id}`);
      expect(part, level.id).toContain(`<svg xmlns="http://www.w3.org/2000/svg"`);
      for (const nodeId of Object.keys(doc.canvases[level.id].nodes))
        expect(part, nodeId).toContain(`data-id="${nodeId}"`);
      expect(part).toContain(`<figure class="diagram" id="figure-${level.id}"`);
      expect(part).toContain(`href="#figure-${level.id}"`);
      expect(rowsOf(part, level.kind === "machine" ? "states" : "elements")).toBe(level.nodes.rows.length);
      expect(rowsOf(part, level.kind === "machine" ? "transitions" : "connections")).toBe(level.edges.rows.length);
    }
    const clock = partOf(html, "article", "level-cnv_expiryClock");
    expect(clock).toContain('<p class="path"><a href="#level-cnv_runtime">Runtime</a>');
    expect(clock).toMatch(/<a class="chip" href="#catalog-evt_payinDetected"><code>payin\.detected<\/code><\/a>/);
    const lifecycle = partOf(html, "article", "level-cnv_lifecycle");
    expect(lifecycle).toContain("The payer's money is seen: the expiry clock stops.");
    expect(lifecycle).toContain('<h5 class="scenario-name">');
  });

  it("marks the steps a scenario no longer takes, after the one where it stops", async () => {
    const doc = example("payments");
    doc.annotations.scenarios.scn_paysInTime.steps[1].do = { event: "evt_nope" };
    const html = await toDocumentPage(doc);
    const start = html.indexOf('<div class="scenario" id="scenario-scn_paysInTime">');
    const scenario = html.slice(start, html.indexOf('<div class="scenario"', start + 1));
    expect([...scenario.matchAll(/<li class="untaken">/g)]).toHaveLength(3);
    expect(scenario).toContain('<span class="tag">not taken</span>');
    expect(scenario).toContain("The design no longer takes step 2");
    expect(scenario).not.toContain('<li class="untaken"><span class="number">1</span>');
  });

  it("has a table per catalog collection, each item with its anchor", async () => {
    const doc = example("payments");
    const html = await toDocumentPage(doc);
    for (const collection of documentModel(doc).catalog) {
      expect(html).toContain(`id="catalog-${collection.collection}"`);
      for (const row of collection.rows) expect(html).toContain(`<tr id="catalog-${row.id}">`);
    }
  });

  it("groups the findings by severity, most severe first, with links to their levels and their evidence", async () => {
    const doc = applyBatch(example("get-paid-as-built"), [
      {
        type: "finding.upsert",
        args: {
          finding: {
            code: "C1",
            title: "Money moves twice",
            severity: "critical",
            targets: ["nod_processing"],
            evidence: [{ kind: "code", path: "core.js", lines: "34-52" }]
          }
        }
      }
    ]).doc;
    const html = await toDocumentPage(doc);
    const findings = partOf(html, "section", "findings");
    const groups = [...findings.matchAll(/<h3 id="findings-([a-z]+)"/g)].map(match => match[1]);
    expect(groups).toEqual(["critical", "high", "medium"]);
    expect(findings).toContain('<tr id="finding-fnd_H1">');
    expect(findings).toContain('<a href="#level-cnv_transaction">processing</a>');
    expect(findings).toContain("<code>core.js:34-52</code>");
    const transaction = partOf(html, "article", "level-cnv_transaction");
    expect(transaction).toContain('href="#finding-fnd_H1"');
  });

  it("links a document's evidence only when it is on the web: other addresses are written as text", async () => {
    const doc = example("get-paid-as-built");
    doc.annotations.findings.fnd_H1.evidence = [
      { kind: "doc", url: "javascript:alert(1)", title: "Click" },
      { kind: "doc", url: "data:text/html,<b>x</b>" },
      { kind: "doc", url: "https://example.com/spec", title: "Spec" }
    ];
    const html = await toDocumentPage(doc);
    expect(html).not.toMatch(/href="(?:javascript|data):/i);
    expect(html).toContain("<code>Click</code>");
    expect(html).toContain("<code>data:text/html,&lt;b&gt;x&lt;/b&gt;</code>");
    expect(html).toContain('<a href="https://example.com/spec" rel="noopener noreferrer">Spec</a>');
  });

  it.each(EXAMPLES)("%s: every in-page link leads somewhere", async name => {
    const html = await toDocumentPage(example(name));
    const ids = idsOf(html);
    for (const anchor of anchorsOf(html)) expect(ids.has(anchor), anchor).toBe(true);
    expect(html).not.toMatch(/href="(?!#)/);
  });

  it("writes names and descriptions as text: nothing in them becomes markup", async () => {
    const doc = minimalDoc();
    doc.project.name = `<script>alert("x")</script> & 'q'`;
    doc.project.description = "Uses `a<b>` and **bold** and [a link](https://example.com/x?a=1&b=2).";
    doc.canvases.cnv_root.name = "Root <img src=x>";
    const html = await toDocumentPage(doc);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; 'q'");
    expect(html).toContain("<code>a&lt;b&gt;</code>");
    expect(html).toContain('<a href="https://example.com/x?a=1&amp;b=2">a link</a>');
    expect(html).toContain("Root &lt;img src=x&gt;");
  });
});
