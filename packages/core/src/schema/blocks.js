import { z } from "zod";
import { PRIMITIVE_TYPES } from "../constants.js";
import { DateOrDateTime, Duration, idOf, obj } from "./helpers.js";

export const Provenance = z
  .enum(["built", "proposed", "fix", "defect", "legacy", "documented", "implied"])
  .describe("Relation of the element to reality (spec §9.1).");
export const Confidence = z.enum(["high", "medium", "low"]).describe("Default high; low is shown dimmed.");
export const Tone = z.enum(["neutral", "info", "success", "warning", "danger", "ops", "defect"]);
export const StatusTone = z.enum(["neutral", "info", "success", "warning", "danger"]);

export const Evidence = z
  .discriminatedUnion("kind", [
    obj(
      {
        kind: z.literal("code"),
        path: z.string().min(1),
        lines: z
          .string()
          .regex(/^\d+(-\d+)?$/, 'Expected "34" or "34-52"')
          .optional(),
        repo: z.string().min(1).optional(),
        commit: z.string().min(1).optional(),
        symbol: z.string().min(1).optional()
      },
      { description: "Where the element was observed in code." }
    ),
    obj(
      {
        kind: z.literal("doc"),
        url: z.url(),
        title: z.string().min(1).optional(),
        quote: z.string().min(1).optional()
      },
      { description: "Where the element was observed in documentation." }
    )
  ])
  .meta({ id: "Evidence" });

export const Tag = obj({ text: z.string().min(1), tone: Tone.optional() }, { id: "Tag", description: "A free chip." });

/** Fields every element accepts (spec §9.1), appended after the element's own fields. */
export const common = {
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  provenance: Provenance.optional(),
  confidence: Confidence.optional(),
  evidence: z.array(Evidence).optional(),
  tags: z.array(Tag).optional()
};

export const Name = z.string().min(1);

/** Monospace subtitle, up to 3 lines. */
export const Summary = z.string().refine(value => value.split("\n").length <= 3, "A summary has at most 3 lines");

/** A primitive type name or a type ID. */
export const TypeRef = z.union([z.enum(PRIMITIVE_TYPES), idOf("typ")]);

export const Condition = obj(
  {
    guard: idOf("grd").optional(),
    expr: z.json().optional().describe("JSON Logic over { event, context, vars }."),
    text: z.string().min(1).optional()
  },
  {
    id: "Condition",
    description: "A guard name, an executable expression and/or a plain-language condition (spec §9.4).",
    check: (value, ctx) => {
      if (value.guard === undefined && value.expr === undefined && value.text === undefined) {
        ctx.addIssue({ code: "custom", message: "A condition needs at least one of guard, expr or text" });
      }
    }
  }
);

const JsonArgs = z.record(z.string(), z.json());

export const Effect = z
  .union([
    obj({ action: idOf("act"), args: JsonArgs.optional() }),
    obj({ emit: idOf("evt"), payload: JsonArgs.optional() }),
    obj({ assign: z.record(z.string().regex(/^context\.[A-Za-z0-9_.]+$/), z.json()) })
  ])
  .meta({ id: "Effect", description: "An action call, an emitted event or a context assignment (spec §9.5)." });

export const RetryPolicy = obj(
  {
    maxAttempts: z.int().positive().optional(),
    backoff: obj({
      initial: Duration,
      factor: z.number().positive().optional(),
      max: Duration.optional()
    }).optional(),
    note: z.string().min(1).optional()
  },
  { id: "RetryPolicy", description: "Retry attempts and backoff (spec §9.6)." }
);

export const Effective = obj(
  {
    from: DateOrDateTime.optional(),
    until: DateOrDateTime.optional(),
    note: z.string().min(1).optional()
  },
  { id: "Effective", description: "Period in which a transition or entry applies (spec §9.7)." }
);

export const Inner = z
  .union([obj({ canvas: idOf("cnv") }), obj({ definition: idOf("def") })])
  .meta({ id: "Inner", description: "The interior of an enterable element (spec §9.8)." });
