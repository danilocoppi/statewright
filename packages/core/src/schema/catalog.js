import { z } from "zod";
import { Inner, Name, RetryPolicy, StatusTone, TypeRef, common } from "./blocks.js";
import { Duration, EVENT_NAME_PATTERN, SignedDuration, idOf, mapOf, obj } from "./helpers.js";

const TypeRefOrNull = idOf("typ").nullable();

const Field = obj(
  {
    name: Name,
    type: TypeRef,
    required: z.boolean().optional(),
    list: z.boolean().optional(),
    description: z.string().optional()
  },
  { description: "A field of an object type." }
);

const EnumValue = obj({ value: z.string().min(1), description: z.string().optional() });

/** Duplicate values of `key` in an array of objects. */
function duplicates(items, key) {
  const seen = new Set();
  const repeated = new Set();
  for (const item of items) (seen.has(item[key]) ? repeated : seen).add(item[key]);
  return [...repeated];
}

export const TypeDef = obj(
  {
    kind: z.enum(["object", "enum", "alias"]),
    name: Name,
    fields: z.array(Field).optional(),
    values: z.array(EnumValue).optional(),
    of: TypeRef.optional(),
    jsonSchema: z.json().optional().describe("Raw JSON Schema; authoritative for export when present."),
    ...common
  },
  {
    description: "A data type (spec §10.1).",
    check: (value, ctx) => {
      const misplaced = { fields: "object", values: "enum", of: "alias" };
      for (const [key, kind] of Object.entries(misplaced)) {
        if (value[key] !== undefined && value.kind !== kind) {
          ctx.addIssue({ code: "custom", path: [key], message: `"${key}" is only allowed on ${kind} types` });
        }
      }
      for (const name of duplicates(Array.isArray(value.fields) ? value.fields : [], "name")) {
        ctx.addIssue({ code: "custom", path: ["fields"], message: `Duplicate field "${name}"` });
      }
      for (const name of duplicates(Array.isArray(value.values) ? value.values : [], "value")) {
        ctx.addIssue({ code: "custom", path: ["values"], message: `Duplicate enum value "${name}"` });
      }
    }
  }
);

export const EventDef = obj(
  {
    name: z.string().regex(EVENT_NAME_PATTERN, "Event names are dotted lower-camel segments, e.g. payin.confirmed"),
    payload: TypeRefOrNull.optional(),
    source: z.union([z.literal("internal"), idOf("pty")]).optional(),
    ...common
  },
  { description: "An event (spec §10.2)." }
);

export const ActionDef = obj(
  {
    name: Name,
    input: TypeRefOrNull.optional(),
    output: TypeRefOrNull.optional(),
    emits: z.array(idOf("evt")).optional(),
    party: idOf("pty").optional(),
    inner: Inner.optional(),
    ...common
  },
  { description: "An action performed by the runtime (spec §10.3); `party` receives it." }
);

export const GuardDef = obj(
  { name: Name, expr: z.json().optional().describe("JSON Logic."), ...common },
  { description: "A named predicate (spec §10.4)." }
);

export const EndpointDef = obj(
  {
    name: Name,
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z.string().regex(/^\//, "Paths start with /"),
    request: TypeRefOrNull.optional(),
    responses: z
      .record(z.string().regex(/^[1-5](\d\d|XX)$/, 'Expected a status code such as "201" or "4XX"'), TypeRefOrNull)
      .optional(),
    auth: z.string().optional(),
    idempotent: z.boolean().optional(),
    emits: z.array(idOf("evt")).optional(),
    party: idOf("pty").optional(),
    inner: Inner.optional(),
    ...common
  },
  { description: "An HTTP endpoint (spec §10.5)." }
);

export const WebhookDef = obj(
  {
    name: Name,
    direction: z.enum(["in", "out"]),
    party: idOf("pty").optional(),
    payload: TypeRefOrNull.optional(),
    event: idOf("evt").optional(),
    signing: z.string().optional(),
    retry: RetryPolicy.optional(),
    inner: Inner.optional(),
    ...common
  },
  { description: "An inbound or outbound webhook (spec §10.6)." }
);

export const TimerDef = obj(
  {
    name: Name,
    duration: Duration.optional(),
    at: z
      .string()
      .regex(/^context\.[A-Za-z0-9_.]+$/, "Expected a context path such as context.expiresAt")
      .optional(),
    offset: SignedDuration.optional(),
    calendar: z.enum(["calendar", "business"]).optional(),
    reminders: z.array(SignedDuration).optional(),
    ...common
  },
  {
    description: "A timer (spec §10.7).",
    check: (value, ctx) => {
      for (const key of ["offset", "reminders"]) {
        if (value[key] !== undefined && value.at === undefined) {
          ctx.addIssue({ code: "custom", path: [key], message: `"${key}" requires "at"` });
        }
      }
    }
  }
);

export const StatusDef = obj(
  { name: Name, tone: StatusTone.optional(), ...common },
  { description: "A public status value (spec §10.8)." }
);

export const PartyDef = obj(
  { kind: z.enum(["human", "operator", "system", "external"]), name: Name, ...common },
  { description: "Who acts or emits (spec §10.9)." }
);

export const Catalog = obj(
  {
    types: mapOf("typ", TypeDef),
    events: mapOf("evt", EventDef),
    actions: mapOf("act", ActionDef),
    guards: mapOf("grd", GuardDef),
    endpoints: mapOf("ept", EndpointDef),
    webhooks: mapOf("whk", WebhookDef),
    timers: mapOf("tmr", TimerDef),
    statuses: mapOf("sts", StatusDef),
    parties: mapOf("pty", PartyDef)
  },
  { description: "Items referenced by ID from canvases (spec §10)." }
);
