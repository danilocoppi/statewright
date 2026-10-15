// The guide, read by an agent a section at a time (AI interface plan A5): `guide_read` and `statewright guide
// <section>` answer from the README shipped with the package, offline.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { START, guideSection, readGuide, sectionsOf, slugOf } from "../../src/mcp/guide.js";

const MARKDOWN = [
  "# Title",
  "",
  "Opening.",
  "",
  "## AI agents: start here",
  "",
  "Do this first.",
  "",
  "## Setting up `statewright mcp`",
  "",
  "```sh",
  "## not a heading, inside code",
  "```",
  "",
  "### Pairing with the **Editor**",
  "",
  "Give the code.",
  "",
  "#### Annotations",
  "",
  "Deep.",
  "",
  "## Annotations",
  "",
  "Again."
].join("\n");

describe("the guide's sections (AI interface plan A5)", () => {
  it("names each heading as GitHub and the platform's page do, the same name twice apart", () => {
    expect(slugOf("Setting up statewright mcp")).toBe("setting-up-statewright-mcp");
    expect(slugOf("Design a system with the person, level by level")).toBe(
      "design-a-system-with-the-person-level-by-level"
    );
    expect(sectionsOf(MARKDOWN).map(({ id, title, level }) => ({ id, title, level }))).toEqual([
      { id: "ai-agents-start-here", title: "AI agents: start here", level: 2 },
      { id: "setting-up-statewright-mcp", title: "Setting up statewright mcp", level: 2 },
      { id: "pairing-with-the-editor", title: "Pairing with the Editor", level: 3 },
      { id: "annotations", title: "Annotations", level: 4 },
      { id: "annotations-1", title: "Annotations", level: 2 }
    ]);
  });

  it("holds a section's text down to the next heading of its level or above, its own subsections within", () => {
    const sections = Object.fromEntries(sectionsOf(MARKDOWN).map(section => [section.id, section.text]));
    expect(sections["ai-agents-start-here"]).toBe("## AI agents: start here\n\nDo this first.");
    expect(sections["setting-up-statewright-mcp"]).toContain("## not a heading, inside code");
    expect(sections["setting-up-statewright-mcp"]).toContain("#### Annotations\n\nDeep.");
    expect(sections["setting-up-statewright-mcp"]).not.toContain("Again.");
    expect(sections["annotations-1"]).toBe("## Annotations\n\nAgain.");
  });

  it("gives where to start and the list of sections when no section is asked", () => {
    const outcome = guideSection(MARKDOWN);
    expect(outcome).toEqual({
      ok: true,
      result: {
        id: START,
        title: "AI agents: start here",
        text: "## AI agents: start here\n\nDo this first.",
        sections: [
          { id: "ai-agents-start-here", title: "AI agents: start here", level: 2 },
          { id: "setting-up-statewright-mcp", title: "Setting up statewright mcp", level: 2 },
          { id: "pairing-with-the-editor", title: "Pairing with the Editor", level: 3 },
          { id: "annotations-1", title: "Annotations", level: 2 }
        ]
      }
    });
  });

  it("finds a section by its ID, by its title in any case, or by part of its name", () => {
    expect(guideSection(MARKDOWN, "pairing-with-the-editor").result.title).toBe("Pairing with the Editor");
    expect(guideSection(MARKDOWN, "Setting up `statewright mcp`").result.id).toBe("setting-up-statewright-mcp");
    expect(guideSection(MARKDOWN, "PAIRING WITH THE EDITOR").result.id).toBe("pairing-with-the-editor");
    expect(guideSection(MARKDOWN, "start here").result.id).toBe("ai-agents-start-here");
    // The heading named exactly comes before one that only contains the name.
    expect(guideSection(MARKDOWN, "annotations").result).toMatchObject({
      id: "annotations",
      text: "#### Annotations\n\nDeep."
    });
  });

  it("says which sections there are when it has none by that name", () => {
    const outcome = guideSection(MARKDOWN, "billing");
    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message:
          'The guide has no section "billing". Its sections: ai-agents-start-here, setting-up-statewright-mcp, ' +
          "pairing-with-the-editor, annotations-1",
        details: {
          sections: ["ai-agents-start-here", "setting-up-statewright-mcp", "pairing-with-the-editor", "annotations-1"]
        }
      }
    });
    expect(guideSection(MARKDOWN, "!!!").error.code).toBe("NOT_FOUND");
  });

  it("reads the README shipped with the package, where an agent starts and every section the guide links to", async () => {
    const markdown = await readGuide();
    expect(markdown).toBe(await readFile(new URL("../../README.md", import.meta.url), "utf8"));
    const start = guideSection(markdown).result;
    expect(start.id).toBe("ai-agents-start-here");
    expect(start.text).toContain("editor_pair");
    expect(start.sections.map(section => section.id)).toEqual(
      expect.arrayContaining([
        "rules-for-ai-agents",
        "design-a-system-with-the-person-level-by-level",
        "working-with-ai-agents",
        "format-reference"
      ])
    );
    const ids = new Set(sectionsOf(markdown).map(section => section.id));
    for (const [, id] of markdown.matchAll(/\]\(#([^)\s]+)\)/g)) expect(ids.has(id), id).toBe(true);
    expect(guideSection(markdown, "Rules for AI agents").result.text).toMatch(/^## Rules for AI agents\n/);
  });
});
