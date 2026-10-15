import { z } from "zod";
import { Condition, Effect, Effective, Inner, Name, RetryPolicy, Summary, common } from "./blocks.js";
import { EVENT_GLOB_PATTERN, anyId, idOf, mapOf, obj } from "./helpers.js";

const OptionalName = Name.optional();
const Region = idOf("rgn").optional();
const Events = z.array(idOf("evt"));
const JsonArgs = z.record(z.string(), z.json());

/** Shortcut to another element; edges touching it are links (spec §12.1). */
const refNode = withRegion =>
  obj(
    {
      kind: z.literal("ref"),
      name: OptionalName,
      target: anyId(),
      ...(withRegion ? { region: Region } : {}),
      summary: Summary.optional(),
      ...common
    },
    { description: "A shortcut to another canvas, node, definition or catalog item." }
  );

// ── System canvas (spec §12.2) ────────────────────────────────────────────────

const systemNode = (kind, extra = {}) =>
  obj({
    kind: z.literal(kind),
    name: OptionalName,
    ...extra,
    summary: Summary.optional(),
    inner: Inner.optional(),
    ...common
  });

export const SystemNode = z.discriminatedUnion("kind", [
  systemNode("actor", { party: idOf("pty").optional() }),
  systemNode("service", { party: idOf("pty").optional() }),
  systemNode("store", { party: idOf("pty").optional() }),
  systemNode("queue", { party: idOf("pty").optional() }),
  systemNode("external", { party: idOf("pty").optional() }),
  refNode(false)
]);

export const SystemEdge = obj(
  {
    from: idOf("nod"),
    to: idOf("nod"),
    kind: z.enum(["command", "event", "webhook", "stream", "data", "link"]).optional(),
    name: OptionalName,
    events: Events.optional(),
    endpoint: idOf("ept").optional(),
    webhook: idOf("whk").optional(),
    by: idOf("pty").optional(),
    ...common
  },
  { description: "An interaction between system elements." }
);

// ── Guests (mixed levels spec §3–§5) ──────────────────────────────────────────

/** A party drawn on a machine or flow level: who sends events, receives actions or performs steps (role R1). */
const participantNode = withRegion =>
  obj(
    {
      kind: z.literal("participant"),
      party: idOf("pty"),
      ...(withRegion ? { region: Region } : {}),
      summary: Summary.optional(),
      ...common
    },
    { description: "A party on the level (role R1): it sends, receives or performs what its party does." }
  );

// ── Machine canvas (spec §12.3) ───────────────────────────────────────────────

const pseudo = (kind, extra = {}) =>
  obj({ kind: z.literal(kind), name: OptionalName, region: Region, ...extra, summary: Summary.optional(), ...common });

export const MachineNode = z.discriminatedUnion("kind", [
  pseudo("initial"),
  obj(
    {
      kind: z.literal("entry"),
      name: Name,
      region: Region,
      via: idOf("ept", "whk").optional(),
      on: Events.optional(),
      by: idOf("pty").optional(),
      guard: Condition.optional(),
      effective: Effective.optional(),
      summary: Summary.optional(),
      ...common
    },
    { description: "A named creation path." }
  ),
  obj(
    {
      kind: z.literal("state"),
      name: Name,
      region: Region,
      category: z.enum(["waiting", "processing", "hold"]).optional(),
      outcome: z.enum(["success", "failure", "stopped"]).optional(),
      terminal: z.boolean().optional(),
      statuses: z.array(idOf("sts")).optional(),
      onEntry: z.array(Effect).optional(),
      onExit: z.array(Effect).optional(),
      sla: idOf("tmr").optional(),
      summary: Summary.optional(),
      inner: Inner.optional(),
      ...common
    },
    { description: "A state; `outcome` colours it, `terminal` forbids exits." }
  ),
  pseudo("choice"),
  pseudo("history", { depth: z.enum(["shallow", "deep"]).optional() }),
  pseudo("any", { except: z.array(idOf("nod")).optional() }),
  participantNode(true),
  obj(
    {
      kind: z.literal("steps"),
      action: idOf("act", "ept", "whk"),
      region: Region,
      summary: Summary.optional(),
      ...common
    },
    { description: "The flow of an action, endpoint or webhook, drawn where it runs (role R2)." }
  ),
  refNode(true)
]);

const Transition = obj(
  {
    from: idOf("nod"),
    to: idOf("nod"),
    name: OptionalName,
    on: Events.optional(),
    onMatch: z.array(z.string().regex(EVENT_GLOB_PATTERN, "Expected an event-name glob such as leg.*")).optional(),
    after: idOf("tmr").optional(),
    always: z.literal(true).optional(),
    done: z.union([z.literal(true), idOf("rgn")]).optional(),
    via: idOf("ept", "whk").optional(),
    by: idOf("pty").optional(),
    guard: Condition.optional(),
    else: z.literal(true).optional(),
    actions: z.array(Effect).optional(),
    internal: z.literal(true).optional(),
    intent: z.enum(["happy", "failure"]).optional(),
    retry: RetryPolicy.optional(),
    effective: Effective.optional(),
    ...common
  },
  {
    description: "A transition between states (no kind key).",
    check: (value, ctx) => {
      if (value.internal && value.from !== value.to) {
        ctx.addIssue({ code: "custom", path: ["internal"], message: "Only self-transitions can be internal" });
      }
    }
  }
);

const Link = obj(
  { kind: z.literal("link"), from: idOf("nod"), to: idOf("nod"), name: OptionalName, on: Events.optional(), ...common },
  { description: "A non-executable link to or from a ref node." }
);

export const MachineEdge = z.union([Transition, Link]);

// ── Flow canvas (spec §12.4) ──────────────────────────────────────────────────

const step = (kind, extra = {}) =>
  obj({ kind: z.literal(kind), name: OptionalName, ...extra, summary: Summary.optional(), ...common });

export const FlowNode = z.discriminatedUnion("kind", [
  step("start"),
  step("end", { outcome: z.enum(["success", "failure"]).optional() }),
  step("action", { action: idOf("act"), args: JsonArgs.optional() }),
  step("if", { condition: Condition.optional() }),
  step("switch", { on: z.json().optional() }),
  step("while", { condition: Condition.optional(), inner: Inner.optional() }),
  step("forEach", {
    items: z.json().optional(),
    as: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .optional(),
    inner: Inner.optional()
  }),
  step("parallel"),
  step("join"),
  step("emit", { event: idOf("evt"), payload: JsonArgs.optional() }),
  step("wait", { on: Events.optional(), after: idOf("tmr").optional() }),
  step("call", {
    endpoint: idOf("ept").optional(),
    request: obj({ method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]), url: z.string().min(1) }).optional(),
    party: idOf("pty").optional()
  }),
  step("webhook", { webhook: idOf("whk") }),
  step("assign", { set: z.record(z.string().regex(/^(vars|context)\.[A-Za-z0-9_.]+$/), z.json()).optional() }),
  step("subflow", { inner: Inner.optional() }),
  participantNode(false),
  obj(
    { kind: z.literal("state"), target: idOf("nod"), summary: Summary.optional(), ...common },
    { description: "A state of a machine level, which steps lead to (role R4)." }
  ),
  refNode(false)
]);

export const FlowEdge = obj(
  {
    from: idOf("nod"),
    to: idOf("nod"),
    kind: z.enum(["next", "true", "false", "case", "default", "error", "link"]).optional(),
    case: z.json().optional(),
    name: OptionalName,
    ...common
  },
  {
    description: "A flow edge; `case` is required exactly when kind is case.",
    check: (value, ctx) => {
      if ((value.kind === "case") !== (value.case !== undefined)) {
        ctx.addIssue({
          code: "custom",
          path: ["case"],
          message: '"case" is required when kind is "case", and only then'
        });
      }
    }
  }
);

// ── Canvases ──────────────────────────────────────────────────────────────────

const header = {
  name: Name,
  code: z
    .string()
    .regex(/^[A-Za-z0-9.-]+$/)
    .optional(),
  kicker: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  caption: z.string().min(1).optional(),
  stage: z.enum(["target", "as-built", "reference"]).optional()
};

export const RegionDef = obj({ name: Name, description: z.string().optional() });

export const Canvas = z.discriminatedUnion("kind", [
  obj(
    {
      kind: z.literal("system"),
      ...header,
      nodes: mapOf("nod", SystemNode),
      edges: mapOf("edg", SystemEdge),
      ...common
    },
    { description: "Architecture: actors, services, stores and their interactions." }
  ),
  obj(
    {
      kind: z.literal("machine"),
      ...header,
      subject: z.string().min(1).optional(),
      context: idOf("typ").optional(),
      regions: mapOf("rgn", RegionDef).optional(),
      transitions: z.enum(["complete", "partial", "unknown"]).optional(),
      nodes: mapOf("nod", MachineNode),
      edges: mapOf("edg", MachineEdge),
      ...common
    },
    { description: "A state machine, optionally with orthogonal regions." }
  ),
  obj(
    {
      kind: z.literal("flow"),
      ...header,
      vars: idOf("typ").optional(),
      nodes: mapOf("nod", FlowNode),
      edges: mapOf("edg", FlowEdge),
      ...common
    },
    { description: "A procedure: steps, branches and loops." }
  )
]);
