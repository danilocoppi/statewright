import { migrate } from "../migrate.js";
import { documentSchema } from "../schema/document.js";

/** JSON Pointer (RFC 6901) for a path array. */
export function toPointer(path) {
  return path.map(segment => `/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`).join("");
}

/**
 * Flatten zod issues into `{ path, message }`. For a failed union, report the branch that got furthest
 * (fewest issues), which is the branch the author most likely meant.
 * @param {import("zod").core.$ZodIssue[]} issues
 * @param {Array<string|number>} [prefix] Path prepended to every issue path.
 * @returns {Array<{ path: string, message: string }>}
 */
export function flattenIssues(issues, prefix = []) {
  const out = [];
  for (const issue of issues) {
    const path = [...prefix, ...issue.path];
    if (issue.code === "invalid_union" && issue.errors?.length) {
      const best = issue.errors.reduce((a, b) => (b.length < a.length ? b : a));
      out.push(...flattenIssues(best, path));
      continue;
    }
    // A bad ID-map key: zod's own message is generic, the key schema's message says what an ID looks like.
    if (issue.code === "invalid_key" && issue.issues?.length) {
      out.push(...flattenIssues(issue.issues, path));
      continue;
    }
    const message =
      issue.code === "unrecognized_keys" ? `Unrecognized key(s): ${issue.keys.join(", ")}` : issue.message;
    out.push({ path: toPointer(path), message });
  }
  return out;
}

/**
 * Validate an already-parsed JSON value as a document, migrating older formats first.
 * Never throws. On success `doc` is the (migrated) input object, not a copy.
 * @param {unknown} raw
 * @returns {{ ok: true, doc: object, errors: [], migrations: string[] } | { ok: false, doc: null, errors: Array<{ path: string, message: string }>, migrations: string[] }}
 */
export function parseValue(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      doc: null,
      errors: [{ path: "", message: "A Statewright document must be a JSON object" }],
      migrations: []
    };
  }
  const migrated = migrate(raw);
  if (!migrated.ok) return { ok: false, doc: null, errors: migrated.errors, migrations: [] };
  const result = documentSchema.safeParse(migrated.doc);
  if (!result.success) {
    return { ok: false, doc: null, errors: flattenIssues(result.error.issues), migrations: migrated.log };
  }
  return { ok: true, doc: migrated.doc, errors: [], migrations: migrated.log };
}

/**
 * Parse document text. Never throws. A leading UTF-8 byte order mark is ignored.
 * @param {string} text
 */
export function parse(text) {
  let raw;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    return { ok: false, doc: null, errors: [{ path: "", message: `Invalid JSON: ${error.message}` }], migrations: [] };
  }
  return parseValue(raw);
}
