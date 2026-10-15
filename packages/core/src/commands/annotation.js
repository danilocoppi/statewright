import { z } from "zod";
import { Comment, Finding, Lane, Lock, Note, Scenario } from "../schema/annotations.js";
import { executableOf } from "../simulate/executable.js";
import {
  allocateId,
  applyChange,
  changeArgs,
  changed,
  checkRefs,
  clone,
  ensure,
  refsOf,
  requireEntry,
  tidy,
  validate
} from "./context.js";
import { fail } from "./errors.js";
import { removeElements } from "./remove.js";

const ElementArg = z.record(z.string(), z.unknown());

/**
 * Finding IDs keep the finding code as written ("AS2" → fnd_AS2) so reports and badges match; a numeric suffix
 * resolves collisions.
 */
function findingIdFor(code, taken) {
  const root = `fnd_${String(code ?? "").replace(/[^A-Za-z0-9]/g, "") || "finding"}`;
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) if (!taken.has(`${root}${n}`)) return `${root}${n}`;
}

function checkFinding(ctx, id, finding) {
  validate(Finding, finding, ["annotations", "findings", id]);
  checkRefs(ctx, refsOf("finding", id, finding));
}

/** A note's target must be the canvas itself or something on it. */
function checkNote(ctx, id, note) {
  validate(Note, note, ["annotations", "notes", id]);
  checkRefs(ctx, refsOf("note", id, note));
  const target = note.target && ctx.index.get(note.target);
  if (target?.canvas !== undefined && target.canvas !== note.canvas) {
    fail("NOT_ALLOWED", `The note target "${note.target}" is not on canvas "${note.canvas}"`, { id });
  }
}

/** A comment's target must be on its level (or be the level). */
function checkComment(ctx, id, comment) {
  validate(Comment, comment, ["annotations", "comments", id]);
  checkRefs(ctx, refsOf("comment", id, comment));
  const target = comment.target && ctx.index.get(comment.target);
  if (target?.canvas !== undefined && target.canvas !== comment.canvas) {
    fail("NOT_ALLOWED", `The comment's target "${comment.target}" is not on canvas "${comment.canvas}"`, { id });
  }
}

/** One entry of a comment's thread: the person's unless said otherwise, now unless told when. */
const entryOf = ({ text, author = "person", name, time }) => ({
  author,
  ...(name !== undefined ? { name } : {}),
  text,
  at: time ?? new Date().toISOString()
});

const Said = {
  text: z.string().min(1),
  author: z.enum(["person", "agent"]).optional(),
  name: z.string().min(1).optional(),
  time: z.iso.datetime().optional().describe("When it was said (default: now)")
};

function checkLane(ctx, id, lane) {
  validate(Lane, lane, ["annotations", "lanes", id]);
  checkRefs(ctx, refsOf("lane", id, lane), { canvas: lane.canvas });
}

/**
 * A scenario starts from a top executable canvas (simulator spec §4.2), at one of its entries when it names one, and
 * refers to events and calls that exist.
 */
function checkScenario(ctx, id, scenario) {
  validate(Scenario, scenario, ["annotations", "scenarios", id]);
  checkRefs(ctx, refsOf("scenario", id, scenario));
  const top = executableOf(ctx.doc, scenario.canvas);
  const canvas = ctx.doc.canvases[scenario.canvas];
  if (top.canvas !== scenario.canvas) {
    const inside = top.canvas ? `; ${canvas.name} runs inside ${ctx.doc.canvases[top.canvas].name}` : "";
    fail("NOT_ALLOWED", `A scenario starts from a machine or flow that runs on its own${inside}`, { id });
  }
  const entry = scenario.start.entry;
  if (entry !== undefined && canvas.nodes[entry]?.kind !== "entry") {
    fail("NOT_ALLOWED", `A scenario starts at an entry of ${canvas.name}; ${entry} is not one`, { id });
  }
}

/** Annotation commands (spec §13, §21). */
export default [
  {
    type: "finding.upsert",
    description: "Add a finding, or replace the finding with the given ID. Shown as a badge on its targets.",
    args: z.strictObject({ finding: ElementArg, id: z.string().optional() }),
    run(ctx, { finding, id }) {
      const value = clone(finding);
      const existing = id === undefined ? undefined : ctx.index.get(id);
      if (existing && existing.type !== "finding") fail("WRONG_KIND", `"${id}" is not a finding`, { id });
      let findingId = id;
      if (!existing && id !== undefined) allocateId(ctx, "fnd", value.code, id);
      if (!existing && id === undefined) {
        findingId = findingIdFor(value.code, ctx.taken);
        ctx.claim(findingId);
      }
      checkFinding(ctx, findingId, value);
      ensure(ensure(ctx.doc, "annotations"), "findings")[findingId] = value;
    }
  },
  {
    type: "finding.remove",
    description: "Remove a finding.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["finding"]);
      removeElements(ctx.doc, [id], { index: ctx.index });
    }
  },
  {
    type: "findings.replace",
    description:
      "Replace every finding produced by `source` with a new list — what an analysis engine runs after each pass. " +
      "IDs come from the finding codes, so they stay stable between runs.",
    args: z.strictObject({ source: z.string().min(1), findings: z.array(ElementArg) }),
    run(ctx, { source, findings }) {
      const container = ensure(ensure(ctx.doc, "annotations"), "findings");
      const freed = new Set();
      for (const [id, finding] of Object.entries(container)) {
        if (finding.source === source) {
          delete container[id];
          freed.add(id);
        }
      }
      const taken = { has: id => !freed.has(id) && ctx.taken.has(id) };
      for (const finding of findings) {
        const value = { ...clone(finding), source };
        const id = findingIdFor(value.code, taken);
        freed.delete(id);
        ctx.claim(id);
        checkFinding(ctx, id, value);
        container[id] = value;
      }
      tidy(ctx.doc);
    }
  },
  {
    type: "note.add",
    description: "Add a note to a canvas, floating or attached to one of its nodes or edges.",
    args: z.strictObject({ note: ElementArg, id: z.string().optional() }),
    run(ctx, { note, id }) {
      const value = clone(note);
      const noteId = allocateId(ctx, "nte", "note", id);
      checkNote(ctx, noteId, value);
      ensure(ensure(ctx.doc, "annotations"), "notes")[noteId] = value;
    }
  },
  {
    type: "note.update",
    description: "Change a note's text, tone, target or canvas.",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["note"]);
      checkNote(ctx, id, changed(entry.value, change));
      applyChange(entry.value, change);
    }
  },
  {
    type: "note.remove",
    description: "Remove a note.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["note"]);
      removeElements(ctx.doc, [id], { index: ctx.index });
    }
  },
  {
    type: "comment.add",
    description:
      "Open a review comment on an element of a level, or at a point of it, with its first words (collaboration " +
      "spec §8.1). An open comment is a Problem (comment.open) until resolved; comments are never drawn in the figure.",
    args: z.strictObject({
      canvas: z.string(),
      target: z.string().optional(),
      at: z.strictObject({ x: z.number(), y: z.number() }).optional(),
      id: z.string().optional(),
      ...Said
    }),
    run(ctx, { canvas, target, at, id, ...said }) {
      const commentId = allocateId(ctx, "cmt", "comment", id);
      const value = {
        canvas,
        ...(target !== undefined ? { target } : {}),
        ...(at !== undefined ? { at } : {}),
        status: "open",
        thread: [entryOf(said)]
      };
      checkComment(ctx, commentId, value);
      ensure(ensure(ctx.doc, "annotations"), "comments")[commentId] = value;
    }
  },
  {
    type: "comment.reply",
    description: "Answer in a comment's thread.",
    args: z.strictObject({ id: z.string(), ...Said }),
    run(ctx, { id, ...said }) {
      const entry = requireEntry(ctx, id, ["comment"]);
      entry.value.thread.push(entryOf(said));
      checkComment(ctx, id, entry.value);
    }
  },
  {
    type: "comment.resolve",
    description: "Resolve a comment: it stays, no longer a Problem.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["comment"]).value.status = "resolved";
    }
  },
  {
    type: "comment.reopen",
    description: "Open a resolved comment again.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["comment"]).value.status = "open";
    }
  },
  {
    type: "comment.remove",
    description: "Remove a comment and its thread.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["comment"]);
      removeElements(ctx.doc, [id], { index: ctx.index });
    }
  },
  {
    type: "lock.add",
    description:
      "Lock a box, an arrow, a region or a level (collaboration spec §8.2): an agent's change to it is only proposed.",
    args: z.strictObject({ target: z.string(), note: z.string().min(1).optional(), id: z.string().optional() }),
    run(ctx, { target, note, id }) {
      const lockId = allocateId(ctx, "lck", "lock", id);
      const value = { target, ...(note !== undefined ? { note } : {}) };
      validate(Lock, value, ["annotations", "locks", lockId]);
      checkRefs(ctx, refsOf("lock", lockId, value));
      ensure(ensure(ctx.doc, "annotations"), "locks")[lockId] = value;
    }
  },
  {
    type: "lock.remove",
    description: "Unlock what a lock held.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["lock"]);
      removeElements(ctx.doc, [id], { index: ctx.index });
    }
  },
  {
    type: "focus.set",
    description: "Replace the list of highlighted nodes and edges (an empty list clears it).",
    args: z.strictObject({ ids: z.array(z.string()) }),
    run(ctx, { ids }) {
      if (new Set(ids).size !== ids.length) fail("INVALID_ARGS", "focus.set ids must not repeat");
      for (const id of ids) requireEntry(ctx, id, ["node", "edge"]);
      ensure(ctx.doc, "annotations").focus = [...ids];
      tidy(ctx.doc);
    }
  },
  {
    type: "lane.add",
    description: "Add a lane: an unboxed caption above a row of nodes of one canvas.",
    args: z.strictObject({ lane: ElementArg, id: z.string().optional() }),
    run(ctx, { lane, id }) {
      const value = clone(lane);
      const laneId = allocateId(ctx, "lne", value.label ?? "lane", id);
      checkLane(ctx, laneId, value);
      ensure(ensure(ctx.doc, "annotations"), "lanes")[laneId] = value;
    }
  },
  {
    type: "lane.update",
    description: "Change a lane's label or nodes.",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["lane"]);
      checkLane(ctx, id, changed(entry.value, change));
      applyChange(entry.value, change);
    }
  },
  {
    type: "lane.remove",
    description: "Remove a lane.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["lane"]);
      removeElements(ctx.doc, [id], { index: ctx.index });
    }
  },
  {
    type: "scenario.add",
    description:
      "Add a scenario: a recorded run of a machine or flow — where it starts, each step's input and answers, and what " +
      "each step reached — that is run again to see whether the design still behaves the same.",
    args: z.strictObject({ scenario: ElementArg, id: z.string().optional() }),
    run(ctx, { scenario, id }) {
      const value = clone(scenario);
      const scenarioId = allocateId(ctx, "scn", value.name ?? "scenario", id);
      checkScenario(ctx, scenarioId, value);
      ensure(ensure(ctx.doc, "annotations"), "scenarios")[scenarioId] = value;
    }
  },
  {
    type: "scenario.update",
    description: "Change a scenario: its name, description, start, or steps (replaced whole, as a recording is).",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["scenario"]);
      checkScenario(ctx, id, changed(entry.value, change));
      applyChange(entry.value, change);
    }
  },
  {
    type: "scenario.remove",
    description: "Remove a scenario.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      requireEntry(ctx, id, ["scenario"]);
      removeElements(ctx.doc, [id], { index: ctx.index });
    }
  }
];
