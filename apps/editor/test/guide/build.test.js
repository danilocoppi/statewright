import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { listRules } from "statewright";
import schema from "statewright/schema.json" with { type: "json" };
import { describe, expect, it } from "vitest";

import { buildGuide, FIGURES, guidePlugin, MODULE_ID, README, slug } from "../../scripts/guide.js";
import { sectionsOf } from "../../../../packages/core/src/mcp/guide.js";

const readme = readFileSync(README, "utf8");
const real = buildGuide(readme, { url: "https://statewright.dev/" });

describe("the guide built from Core's README", () => {
  it("names headings as GitHub does, so the README's own links lead somewhere", () => {
    expect(slug("Canvas: `system`".replace(/`/g, ""))).toBe("canvas-system");
    expect(slug("Rules for AI agents")).toBe("rules-for-ai-agents");
    expect(real.guide.title).toBe("Statewright");
    expect(real.guide.sections.map(section => section.text)).toEqual([
      "AI agents: start here",
      "What Statewright is for",
      "Concepts",
      "Reading a diagram",
      "Using the editor",
      "Simulating and scenarios",
      "Library and CLI",
      "Working with AI agents",
      "Building from the design",
      "Rules for AI agents",
      "Playbooks",
      "Format reference"
    ]);
    const reference = real.guide.sections.find(section => section.id === "format-reference");
    expect(reference.children.map(child => child.id)).toContain("common-fields");
  });

  it("gives a repeated heading its own id", () => {
    const { guide } = buildGuide("# T\n\n## Notes\n\n### Example\n\n## More\n\n### Example\n");
    expect(guide.blocks.filter(block => block.t === "h").map(block => block.id)).toEqual([
      "t",
      "notes",
      "example",
      "more",
      "example-1"
    ]);
  });

  it("refuses a link to a heading the README does not have", () => {
    expect(() => buildGuide("# T\n\nSee [the end](#the-end).\n")).toThrow("The guide links to #the-end");
  });

  it("gives every rule its own anchor and marks the legend's tables", () => {
    const tables = real.guide.blocks.filter(block => block.t === "table" && block.kind);
    expect(tables.map(table => table.kind)).toEqual(["rules", "nodes", "edges"]);
    expect(tables[0].rows.map(row => row.id)).toEqual(listRules().map(rule => `rule-${rule.code}`));
    expect(tables[1].rows[0].key).toBe("state.plain");
  });

  it("serves the figures from the app and links them at the platform's address in the raw Markdown", () => {
    const figure = "../../examples/rendered/payments/cnv_runtime.svg";
    const { guide, files, figures } = buildGuide(`# T\n\n![The runtime](${figure})\n`, {
      readme: README,
      url: "https://statewright.dev/"
    });
    expect(guide.blocks[1]).toEqual({ t: "figure", src: "guide/payments/cnv_runtime.svg", alt: "The runtime" });
    expect(figures).toEqual({ "guide/payments/cnv_runtime.svg": resolve(FIGURES, "payments/cnv_runtime.svg") });
    expect(files["README.md"]).toContain("![The runtime](https://statewright.dev/guide/payments/cnv_runtime.svg)");
    expect(() => buildGuide("# T\n\n![Elsewhere](../../logo.svg)\n")).toThrow("is not under examples/rendered");
  });

  it("writes llms.txt with the title, the README's first paragraph and links to the guide and the schema", () => {
    const llms = real.files["llms.txt"];
    expect(llms).toMatch(/^# Statewright\n\n> Statewright is a builder for layered specifications of systems: /);
    expect(llms).toContain("(https://statewright.dev/README.md)");
    expect(llms).toContain("(https://statewright.dev/schema/1.3.json)");
    expect(buildGuide(readme).files["llms.txt"]).toContain("(/README.md)");
  });

  it("lists in llms.txt the sections the README has, as it names them", () => {
    const llms = buildGuide("# T\n\nWhat T is.\n\n## Alpha\n\n### Inside\n\n## Beta and CLI\n").files["llms.txt"];
    expect(llms).toContain("- [T guide](/README.md): Alpha, Beta and CLI\n");
    expect(real.files["llms.txt"]).toContain(
      `(https://statewright.dev/README.md): ${real.guide.sections.map(section => section.text).join(", ")}\n`
    );
  });

  it("points agents in llms.txt to where they start, first (AI interface plan A5)", () => {
    const llms = real.files["llms.txt"];
    const start =
      "- [AI agents: start here](https://statewright.dev/README.md#ai-agents-start-here): set up statewright mcp in " +
      "your client, pair with the person's Editor, read the rules, then design with them level by level\n";
    expect(llms).toContain(start);
    expect(llms.indexOf(start)).toBeLessThan(llms.indexOf("- [Working with AI agents]"));
    expect(buildGuide("# T\n\nWhat T is.\n\n## Alpha\n").files["llms.txt"]).not.toContain("start here");
  });

  it("names each section as guide_read and statewright guide do, so an agent finds by ID what the page links to", () => {
    const headings = real.guide.blocks.filter(block => block.t === "h" && block.depth >= 2).map(block => block.id);
    expect(sectionsOf(readme).map(section => section.id)).toEqual(headings);
  });

  it("points agents in llms.txt to working with AI agents (AI interface spec §12)", () => {
    expect(real.files["llms.txt"]).toContain(
      "- [Working with AI agents](https://statewright.dev/README.md#working-with-ai-agents): statewright mcp, pairing " +
        "with the Editor, window.statewright, the operations and the hooks for testing the Editor\n"
    );
    expect(buildGuide("# T\n\nWhat T is.\n\n## Alpha\n").files["llms.txt"]).not.toContain("Working with AI agents");
  });

  it("serves Core's schema as it is, and format 1.0's as it was, for the files that still point to it", () => {
    expect(JSON.parse(real.files["schema/1.3.json"])).toEqual(schema);
    expect(JSON.parse(real.files["schema/1.0.json"]).title).toBe("Statewright document (format 1.0)");
  });
});

describe("the guide in the app", () => {
  it("gives the page its module", () => {
    const plugin = guidePlugin();
    const id = plugin.resolveId(MODULE_ID);
    const code = plugin.load.call({ addWatchFile: () => {} }, id);
    const guide = JSON.parse(code.replace(/^export default /, "").replace(/;$/, ""));
    expect(guide.sections).toHaveLength(12);
    expect(guide.markdown).toContain("## Reading a diagram");
  });

  it("serves the static files from the dev server, under the app's base", () => {
    const plugin = guidePlugin();
    plugin.configResolved({ base: "/statewright/" });
    let handler;
    plugin.configureServer({ middlewares: { use: fn => (handler = fn) } });
    const get = url => {
      const response = { headers: {}, setHeader: (name, value) => (response.headers[name] = value) };
      return new Promise(done => {
        response.end = body => done({ body, type: response.headers["Content-Type"] });
        handler({ url }, response, () => done(null));
      });
    };
    return Promise.all([
      get("/statewright/README.md"),
      get("/statewright/llms.txt"),
      get("/statewright/guide/payments/cnv_runtime.svg"),
      get("/statewright/p/prj_payments"),
      get("/README.md")
    ]).then(([markdown, llms, figure, page, outside]) => {
      expect(markdown.type).toBe("text/markdown; charset=utf-8");
      expect(markdown.body).toContain("# Statewright");
      expect(llms.body).toContain("## Docs");
      expect(figure.type).toBe("image/svg+xml");
      expect(page).toBeNull();
      expect(outside).toBeNull();
    });
  });

  it("passes over every other address, however it is written", () => {
    const plugin = guidePlugin();
    plugin.configResolved({ base: "/statewright/" });
    let handler;
    plugin.configureServer({ middlewares: { use: fn => (handler = fn) } });
    const get = url =>
      new Promise((done, fail) => {
        const response = { setHeader: () => {}, end: body => done(body) };
        try {
          handler({ url }, response, () => done(null));
        } catch (error) {
          fail(error);
        }
      });
    return Promise.all(
      ["/statewright/constructor", "/statewright/__proto__", "/statewright/toString", "/statewright/%E0%A4%A"].map(get)
    ).then(answers => expect(answers).toEqual([null, null, null, null]));
  });

  it("writes the static files and the figures into the build", () => {
    const plugin = guidePlugin();
    const emitted = [];
    plugin.generateBundle.call({ emitFile: file => emitted.push(file.fileName) });
    expect(emitted.sort()).toEqual([
      "README.md",
      "guide/get-paid-as-built/cnv_transaction.svg",
      "guide/payments/cnv_runtime.svg",
      "llms.txt",
      "schema/1.0.json",
      "schema/1.1.json",
      "schema/1.2.json",
      "schema/1.3.json"
    ]);
  });
});
