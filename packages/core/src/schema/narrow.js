// What a batch must validate (performance spec §3 P1): only the parts of the document its patches touched. The
// document schema has no rule across parts, and documents are valid when a batch starts, so validating each touched
// part — down to the first ID map on its way, one entry of it — finds exactly what validating the whole document
// would.
import { flattenIssues } from "../serialize/parse.js";
import { documentSchema } from "./document.js";

const defOf = schema => schema._zod.def;

/** A schema without its optional wrapper. */
function bare(schema) {
  let found = schema;
  while (defOf(found).type === "optional") found = defOf(found).innerType;
  return found;
}

const valueAt = (doc, path) => path.reduce((value, key) => (value == null ? undefined : value[key]), doc);

/**
 * What to validate for one patch: descend the schema along its path through objects until an ID map (validate the
 * one entry the path names), the path's end, or a key the object does not declare (validate the object, which
 * reports unknown keys).
 * @returns {{ at: Array<string|number>, schema: any, entry?: string }}
 */
function targetOf(path) {
  let schema = documentSchema;
  const at = [];
  for (const key of path) {
    const shape = bare(schema);
    const { type } = defOf(shape);
    if (type === "record") return { at, schema: shape, entry: key };
    if (type !== "object" || !Object.hasOwn(defOf(shape).shape, key)) return { at, schema };
    schema = defOf(shape).shape[key];
    at.push(key);
  }
  return { at, schema };
}

/**
 * The validation errors of the parts a batch's patches touched, as full validation would report them.
 * @param {any} doc The document after the batch.
 * @param {Array<{ path: Array<string|number> }>} patches
 * @returns {Array<{ path: string, message: string }>}
 */
export function validateChanged(doc, patches) {
  const targets = new Map();
  for (const { path } of patches) {
    const target = targetOf(path);
    const where = target.entry === undefined ? target.at : [...target.at, target.entry];
    targets.set(JSON.stringify(where), { ...target, where });
  }
  // A part inside another part validated anyway is not validated twice.
  const chosen = [...targets.values()].filter(
    ({ where }) =>
      !where.some((_, length) => length < where.length && targets.has(JSON.stringify(where.slice(0, length))))
  );
  const errors = [];
  for (const { at, schema, entry } of chosen) {
    let result;
    if (entry !== undefined) {
      const value = valueAt(doc, [...at, entry]);
      if (value === undefined) continue;
      result = schema.safeParse({ [entry]: value });
    } else {
      result = schema.safeParse(valueAt(doc, at));
    }
    if (!result.success) errors.push(...flattenIssues(result.error.issues, at));
  }
  return errors;
}
