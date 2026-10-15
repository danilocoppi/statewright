// The guide, read by an agent a section at a time (AI interface plan A5): the platform README shipped with the
// package, offline — `guide_read` and `statewright guide <section>` answer from it. Its sections carry the IDs GitHub
// and the platform's /readme page give their headings, so a link in the guide names a section here too.
import { readFile } from "node:fs/promises";
import { failure, success } from "../agent/errors.js";

/** The section an agent reads first. */
export const START = "ai-agents-start-here";

/** The README shipped with the package. */
export const readGuide = () => readFile(new URL("../../README.md", import.meta.url), "utf8");

/**
 * A heading's ID as GitHub writes it.
 * @param {string} text The heading's plain text.
 * @returns {string}
 */
export function slugOf(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

/** A heading's plain text: without code marks, strong emphasis and link targets. */
const plainOf = text =>
  text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .trim();

/**
 * The guide's sections: every heading below the title, with its ID, and its text down to the next heading of its
 * level or above (its own subsections within). Headings inside code blocks are code.
 * @param {string} markdown
 * @returns {Array<{ id: string, title: string, level: number, text: string }>}
 */
export function sectionsOf(markdown) {
  const lines = markdown.split("\n");
  const ids = new Set();
  const headings = [];
  let code = false;
  lines.forEach((line, index) => {
    if (/^(```|~~~)/.test(line)) code = !code;
    const match = !code && /^(#{1,6}) (.+?)\s*$/.exec(line);
    if (!match) return;
    const title = plainOf(match[2]);
    const base = slugOf(title);
    let id = base;
    for (let n = 1; ids.has(id); n += 1) id = `${base}-${n}`;
    ids.add(id);
    headings.push({ id, title, level: match[1].length, line: index });
  });
  const sections = headings.filter(heading => heading.level >= 2);
  return sections.map(({ id, title, level, line }, index) => {
    const next = sections.slice(index + 1).find(other => other.level <= level);
    return {
      id,
      title,
      level,
      text: lines
        .slice(line, next?.line ?? lines.length)
        .join("\n")
        .trimEnd()
    };
  });
}

/**
 * A section of the guide, by its ID, its title or part of its name; without one, where an agent starts and the list
 * of sections (those of the first two levels below the title).
 * @param {string} markdown
 * @param {string} [wanted]
 * @returns {{ ok: true, result: { id: string, title: string, text: string, sections?: object[] } } |
 *   { ok: false, error: { code: "NOT_FOUND", message: string, details: { sections: string[] } } }}
 */
export function guideSection(markdown, wanted) {
  const sections = sectionsOf(markdown);
  const listed = sections.filter(section => section.level <= 3).map(({ id, title, level }) => ({ id, title, level }));
  if (wanted === undefined) {
    const { id, title, text } = sections.find(section => section.id === START) ?? sections[0];
    return success({ id, title, text, sections: listed });
  }
  const key = slugOf(plainOf(wanted));
  const found =
    key && (sections.find(section => section.id === key) ?? sections.find(section => section.id.includes(key)));
  if (!found) {
    const ids = listed.map(section => section.id);
    return failure("NOT_FOUND", `The guide has no section "${wanted}". Its sections: ${ids.join(", ")}`, {
      sections: ids
    });
  }
  return success({ id: found.id, title: found.title, text: found.text });
}
