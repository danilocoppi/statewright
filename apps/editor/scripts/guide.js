// The platform guide (spec §8.4), built from Core's README at build time: the page's content as data (no Markdown
// library reaches the browser), and the static files the platform serves — /README.md, /llms.txt, /schema/1.1.json
// (and format 1.0's, for the files that still point to it) and the README's figures.
import { readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { lexer } from "marked";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
/** Core's README: the npm README, built from docs/guide/README.md (npm run readme:build). */
export const README = resolve(ROOT, "packages/core/README.md");
/** Core's JSON Schema of the format it writes (1.1), and of format 1.0 as it was published. */
export const SCHEMA = resolve(ROOT, "packages/core/schema/1.1.json");
const SCHEMA_1_0 = resolve(ROOT, "packages/core/schema/1.0.json");
/** Where the README's figures come from; they are served under guide/ with the same sub-path. */
export const FIGURES = resolve(ROOT, "examples/rendered");

/** The module the guide page imports. */
export const MODULE_ID = "virtual:statewright-guide";

/**
 * A heading's id as GitHub writes it, so the README's own links (`#common-fields`) work in the page.
 * @param {string} text the heading's plain text
 * @returns {string}
 */
export function slug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

/** The plain text of inline tokens. */
const plain = tokens => tokens.map(token => (token.tokens ? plain(token.tokens) : (token.text ?? ""))).join("");

/** Inline tokens as the page's nodes: text, strong, em, code, link and image. */
function inline(tokens = []) {
  return tokens.flatMap(token => {
    switch (token.type) {
      case "strong":
      case "em":
        return [{ t: token.type, c: inline(token.tokens) }];
      case "codespan":
        return [{ t: "code", v: token.text }];
      case "link":
        return [{ t: "link", href: token.href, c: inline(token.tokens) }];
      case "image":
        return [{ t: "img", src: token.href, alt: token.text }];
      case "br":
        return [{ t: "br" }];
      case "html":
        return [];
      default:
        return token.tokens ? inline(token.tokens) : [{ t: "text", v: token.text }];
    }
  });
}

/** The tables the page draws in its own way: the rules, and the legend's node and edge styles. */
function tableKind(header) {
  const first = plain(header[0].tokens);
  if (first === "Code" && plain(header[1].tokens) === "Severity") return "rules";
  if (first === "Node style") return "nodes";
  if (first === "Edge style") return "edges";
  return null;
}

/**
 * Turn the README into the guide: the page's blocks and index, and the static files.
 * @param {string} markdown the README's text
 * @param {{ readme?: string, url?: string }} [options] `readme`: the README's path (its figures are relative to it);
 *   `url`: the platform's address, ending in "/" (absolute, or "/" when it is not known), written into /README.md
 *   and /llms.txt.
 * @returns {{ guide: { title: string, sections: object[], blocks: object[], markdown: string },
 *   files: Record<string, string>, figures: Record<string, string> }} `files`: the static files by their path under
 *   the base; `figures`: the figures' source paths by their path under the base.
 */
export function buildGuide(markdown, { readme = README, url = "/" } = {}) {
  const figures = {};
  const figure = href => {
    const source = resolve(dirname(readme), href);
    const inside = relative(FIGURES, source);
    if (inside.startsWith("..")) throw new Error(`The guide's figure ${href} is not under examples/rendered.`);
    const path = `guide/${inside.split(sep).join("/")}`;
    figures[path] = source;
    return path;
  };

  const ids = new Set();
  const unique = text => {
    const base = slug(text);
    let id = base;
    for (let n = 1; ids.has(id); n += 1) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };

  const sections = [];
  let title = "";
  const block = token => {
    switch (token.type) {
      case "heading": {
        const text = plain(token.tokens);
        if (token.depth === 1) {
          title = text;
          return [{ t: "h", depth: 1, id: unique(text), c: inline(token.tokens) }];
        }
        const id = unique(text);
        if (token.depth === 2) sections.push({ id, text, children: [] });
        if (token.depth === 3) sections.at(-1)?.children.push({ id, text });
        return [{ t: "h", depth: token.depth, id, c: inline(token.tokens) }];
      }
      case "paragraph": {
        const [only] = token.tokens;
        if (token.tokens.length === 1 && only.type === "image")
          return [{ t: "figure", src: figure(only.href), alt: only.text }];
        return [{ t: "p", c: inline(token.tokens) }];
      }
      case "text":
        return [{ t: "text", c: inline(token.tokens ?? [token]) }];
      case "list":
        return [
          {
            t: "list",
            ordered: token.ordered,
            start: token.ordered ? token.start : undefined,
            items: token.items.map(item => item.tokens.flatMap(block))
          }
        ];
      case "table": {
        const kind = tableKind(token.header);
        const rows = token.rows.map(row => {
          const cells = row.map(cell => inline(cell.tokens));
          const key = kind ? plain(row[0].tokens) : undefined;
          return { key, id: kind === "rules" ? `rule-${key}` : undefined, cells };
        });
        return [{ t: "table", kind, align: token.align, header: token.header.map(cell => inline(cell.tokens)), rows }];
      }
      case "code":
        return [{ t: "code", lang: token.lang || undefined, v: token.text }];
      default:
        return [];
    }
  };
  const tokens = lexer(markdown);
  const blocks = tokens.flatMap(block);

  // A link to a heading the README does not have is a build error, not a dead link.
  for (const [, id] of markdown.matchAll(/\]\(#([^)\s]+)\)/g)) {
    if (!ids.has(id)) throw new Error(`The guide links to #${id}, which is not a heading.`);
  }

  // Raw Markdown for people and AI agents: figures at their platform address.
  const raw = markdown.replace(/(!\[[^\]]*\]\()([^)\s]+)\)/g, (_, start, href) => `${start}${url}${figure(href)})`);
  const first = tokens.find(token => token.type === "paragraph");
  const llms = [
    `# ${title}`,
    "",
    ...(first ? [`> ${plain(first.tokens).replace(/\s+/g, " ")}`, ""] : []),
    "## Docs",
    "",
    // Its sections as the README names them, so a section added or renamed in Core is listed as it is.
    `- [${title} guide](${url}README.md): ${sections.map(section => section.text).join(", ")}`,
    // Where an agent starts: setting up, pairing, the rules, designing with the person (AI interface plan A5).
    ...(ids.has("ai-agents-start-here") ?
      [
        `- [AI agents: start here](${url}README.md#ai-agents-start-here): set up statewright mcp in your client, ` +
          "pair with the person's Editor, read the rules, then design with them level by level"
      ]
    : []),
    // For agents above all (AI interface spec §12: "llms.txt points to the section").
    ...(ids.has("working-with-ai-agents") ?
      [
        `- [Working with AI agents](${url}README.md#working-with-ai-agents): statewright mcp, pairing with the ` +
          "Editor, window.statewright, the operations and the hooks for testing the Editor"
      ]
    : []),
    `- [Format 1.1 JSON Schema](${url}schema/1.1.json): the JSON Schema every Statewright document follows`,
    ""
  ].join("\n");

  return {
    guide: { title, sections, blocks, markdown: raw },
    files: {
      "README.md": raw,
      "llms.txt": llms,
      "schema/1.1.json": readFileSync(SCHEMA, "utf8"),
      "schema/1.0.json": readFileSync(SCHEMA_1_0, "utf8")
    },
    figures
  };
}

const TYPES = {
  md: "text/markdown; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  json: "application/json",
  svg: "image/svg+xml"
};

/**
 * The guide in the app: the page's module (`virtual:statewright-guide`), and the static files — served by the dev
 * server and written into the build.
 * @param {{ url?: string }} [options] see buildGuide
 * @returns {import("vite").Plugin}
 */
export function guidePlugin({ url = "/" } = {}) {
  const build = () => buildGuide(readFileSync(README, "utf8"), { url });
  let base = "/";
  return {
    name: "statewright-guide",
    configResolved(config) {
      base = config.base;
    },
    resolveId(id) {
      return id === MODULE_ID ? `\0${MODULE_ID}` : undefined;
    },
    load(id) {
      if (id !== `\0${MODULE_ID}`) return undefined;
      this.addWatchFile(README);
      return `export default ${JSON.stringify(build().guide)};`;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let path;
        try {
          path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        } catch {
          return next();
        }
        if (!path.startsWith(base)) return next();
        const { files, figures } = build();
        const name = path.slice(base.length);
        // Only the files and figures themselves: an address such as /constructor is not one of them.
        const body =
          Object.hasOwn(files, name) ? files[name]
          : Object.hasOwn(figures, name) ? readFileSync(figures[name], "utf8")
          : undefined;
        if (body === undefined) return next();
        response.setHeader("Content-Type", TYPES[name.split(".").pop()]);
        response.end(body);
      });
    },
    generateBundle() {
      const { files, figures } = build();
      for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: "asset", fileName, source });
      for (const [fileName, path] of Object.entries(figures))
        this.emitFile({ type: "asset", fileName, source: readFileSync(path) });
    }
  };
}
