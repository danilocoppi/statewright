import { z } from "zod";
import { Evidence, Highlights, Name } from "./blocks.js";
import { Duration, anyId, idOf, mapOf, obj } from "./helpers.js";

export const Finding = obj(
  {
    code: z.string().min(1),
    title: z.string().min(1),
    severity: z.enum(["critical", "high", "medium", "low", "info"]),
    description: z.string().optional(),
    targets: z.array(anyId()).min(1),
    source: z.string().min(1).optional(),
    evidence: z.array(Evidence).optional()
  },
  { description: "A finding, usually written by an analysis engine." }
);

export const Note = obj(
  {
    text: z.string().min(1),
    canvas: idOf("cnv"),
    target: anyId().optional(),
    tone: z.enum(["info", "warning", "defect"]).optional(),
    highlights: Highlights.optional()
  },
  { description: "A note floating on a canvas or attached to an element." }
);

export const Lane = obj(
  { canvas: idOf("cnv"), label: z.string().min(1), nodes: z.array(idOf("nod")), party: idOf("pty").optional() },
  { description: "An unboxed caption above a row of nodes; `party` performs its steps (role R5)." }
);

/** What a person did in one step of a run (simulator spec §4.2). */
export const ScenarioInput = z
  .union([
    obj({ event: idOf("evt"), payload: z.json().optional() }),
    obj({ call: idOf("ept", "whk"), payload: z.json().optional() }),
    obj({ wait: z.union([Duration, z.literal("next")]) })
  ])
  .meta({
    id: "ScenarioInput",
    description: "An event, a call, or time passing (a duration, or next: the next timer)."
  });

/** An answer to a question the engine asked (simulator spec §5.4). */
export const ScenarioAnswer = obj(
  {
    kind: z.enum(["transition", "choice", "branch", "case", "outcome", "count"]),
    at: z.string().min(1),
    value: z.json()
  },
  { id: "ScenarioAnswer", description: "An answer, at the state or node path the question was asked at." }
);

/** Where a step got to: the active state paths (or flow token paths), sorted, and how the run ended, if it did. */
export const ScenarioReached = obj(
  { active: z.array(z.string().min(1)), ended: z.enum(["done", "success", "failure"]).optional() },
  { id: "ScenarioReached", description: "What a step reached, recorded to compare later runs with." }
);

export const Scenario = obj(
  {
    name: Name,
    description: z.string().optional(),
    canvas: idOf("cnv"),
    start: obj({
      at: z.iso.datetime(),
      entry: idOf("nod").optional(),
      context: z.record(z.string().min(1), z.record(z.string(), z.json())).optional(),
      input: z.json().optional(),
      answers: z.array(ScenarioAnswer).optional()
    }),
    steps: z.array(
      obj({
        do: ScenarioInput,
        answers: z.array(ScenarioAnswer).optional(),
        caption: z.string().min(1).optional(),
        reached: ScenarioReached
      })
    )
  },
  { description: "A recorded run of a machine or a flow (simulator spec §4)." }
);

/** One entry of a comment's thread: who said what, when. */
export const CommentEntry = obj(
  {
    author: z.enum(["person", "agent"]),
    name: z.string().min(1).optional(),
    text: z.string().min(1),
    at: z.iso.datetime()
  },
  { description: "What the person or the agent said in a comment's thread." }
);

export const Comment = obj(
  {
    canvas: idOf("cnv"),
    target: anyId().optional(),
    at: obj({ x: z.number(), y: z.number() }, { description: "A point of the level." }).optional(),
    status: z.enum(["open", "resolved"]),
    thread: z.array(CommentEntry).min(1)
  },
  {
    description:
      "A review comment on an element or a point of a level, open until resolved (collaboration spec §8.1); never " +
      "drawn in the figure or the documentation."
  }
);

export const Lock = obj(
  { target: idOf("nod", "edg", "rgn", "cnv"), note: z.string().min(1).optional() },
  { description: "Don't touch: the agent's changes to this element or level are only proposed (spec §8.2)." }
);

export const Annotations = obj(
  {
    findings: mapOf("fnd", Finding).optional(),
    notes: mapOf("nte", Note).optional(),
    focus: z.array(idOf("nod", "edg")).optional(),
    lanes: mapOf("lne", Lane).optional(),
    scenarios: mapOf("scn", Scenario).optional(),
    comments: mapOf("cmt", Comment).optional(),
    locks: mapOf("lck", Lock).optional()
  },
  { description: "Describes the specification without being part of it (spec §13)." }
);
