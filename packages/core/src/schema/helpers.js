import { z } from "zod";
import { ID_PATTERN, idPatternFor } from "../ids.js";

/** Metadata marker turned into `additionalProperties: false` + `patternProperties: { "^x-": {} }` in JSON Schema. */
export const EXTENSIBLE = "statewrightExtensible";

/**
 * A strict object that also accepts extension keys starting with "x-" (spec §7.6).
 * Unknown keys are reported as `unrecognized_keys`.
 * @param {Record<string, import("zod").ZodType>} shape Key order here is the serialization order.
 * @param {{ id?: string, description?: string, check?: (value: any, ctx: import("zod").RefinementCtx) => void }} [options]
 *   `id` names the schema in JSON Schema `$defs`; `check` adds cross-field validation for this object.
 */
export function obj(shape, { id, description, check } = {}) {
  const meta = { [EXTENSIBLE]: true };
  if (id) meta.id = id;
  if (description) meta.description = description;
  return z
    .object(shape)
    .catchall(z.unknown())
    .superRefine((value, ctx) => {
      const extra = Object.keys(value).filter(key => !Object.hasOwn(shape, key) && !key.startsWith("x-"));
      if (extra.length) {
        ctx.addIssue({ code: "unrecognized_keys", keys: extra, message: `Unrecognized key(s): ${extra.join(", ")}` });
      }
      check?.(value, ctx);
    })
    .meta(meta);
}

/** Any Statewright ID. */
export const anyId = () => z.string().regex(ID_PATTERN, "Expected a Statewright ID");

/**
 * An ID with one of the given prefixes.
 * @param {...string} prefixes
 */
export const idOf = (...prefixes) =>
  z
    .string()
    .regex(idPatternFor(...prefixes), `Expected an ID starting with ${prefixes.map(p => `${p}_`).join(" or ")}`);

/**
 * A map keyed by IDs of one prefix.
 * @param {string} prefix
 * @param {import("zod").ZodType} value
 */
export const mapOf = (prefix, value) => z.record(idOf(prefix), value);

/** Unsigned ISO 8601 duration such as "PT30M" or "P10D". */
export const DURATION_PATTERN = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

export const Duration = z.string().regex(DURATION_PATTERN, "Expected an ISO 8601 duration such as PT30M");

/** Signed ISO 8601 duration, e.g. "-P60D" (relative to a deadline). */
export const SignedDuration = z
  .string()
  .refine(
    value => DURATION_PATTERN.test(value.replace(/^[-+]/, "")),
    "Expected a signed ISO 8601 duration such as -P7D"
  );

/** ISO 8601 date or date-time. */
export const DateOrDateTime = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

/** Event names: dotted lower-camel segments (spec §10.2). */
export const EVENT_NAME_PATTERN = /^[a-z][A-Za-z0-9_]*(\.[a-z][A-Za-z0-9_]*)*$/;

/** Event-name globs where a segment may be "*" (spec §12.3 `onMatch`). */
export const EVENT_GLOB_PATTERN = /^(\*|[a-z][A-Za-z0-9_]*)(\.(\*|[a-z][A-Za-z0-9_]*))*$/;
