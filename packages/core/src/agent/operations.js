// The operations of the agent contract (AI interface spec §4.2): what an agent can ask of Statewright, in a paired
// Editor or on a file. Each has a name (`group.action`), one line saying what it does, the schema of its arguments and
// of its result, and whether it needs the Editor. The contract runs nothing: the hosts do.
import { z } from "zod";
import { ERROR_CODES } from "../commands/errors.js";

const Id = z.string().min(1);
const Ids = z.array(Id).min(1);
const Out = z.string().min(1).optional().describe("A path to write the result to (the MCP server writes it)");
const Nothing = z.strictObject({});
const Severity = z.enum(["error", "warning", "incomplete"]);
const Kind = z.enum(["system", "machine", "flow", "mixed"]);
const Instant = z.string().describe("A date and time in UTC, such as 2026-01-05T09:00:00Z");
const Problem = z.looseObject({ code: z.string(), severity: Severity, target: z.string(), message: z.string() });
const Point = z.looseObject({
  step: z.number().int(),
  active: z.array(z.string()),
  clock: z.string(),
  ended: z.string().optional()
});
const RunResult = z.looseObject({ point: Point.nullable(), question: z.looseObject({}).nullable() });
const Written = z.looseObject({ written: z.string().optional() });

/**
 * @typedef {{ name: string, group: string, summary: string, needs?: "editor", writes?: true,
 *   input: z.ZodType, result: z.ZodType, errors: readonly string[] }} Operation `writes`: the operation changes the
 *   document; `errors`: the codes it can answer besides CALL_ERRORS.
 */

/**
 * What any call can answer, whatever its operation: its arguments, the file or the Editor it runs on (`NOT_ALLOWED`: an
 * Editor with no project open), the unforeseen.
 */
export const CALL_ERRORS = Object.freeze([
  "BAD_ARGUMENTS",
  "FILE",
  "NOT_ALLOWED",
  "NEEDS_EDITOR",
  "NOT_PAIRED",
  "EDITOR_GONE",
  "TIMEOUT",
  "INTERNAL"
]);

/** What changing the document can meet: a project open read-only, or a run going on. */
const WRITING = ["READ_ONLY", "SIMULATING"];

/** The errors each operation can answer besides CALL_ERRORS (AI interface spec §4: "the error codes it can return"). */
const ERRORS = {
  "level.get": ["NOT_FOUND"],
  "query.usages": ["NOT_FOUND"],
  "query.path": ["NOT_FOUND"],
  "batch.apply": [...ERROR_CODES, ...WRITING],
  "history.undo": ["NOT_AI_CHANGE", ...WRITING],
  "history.redo": ["NOT_AI_CHANGE", ...WRITING],
  "layout.arrange": ["NOT_FOUND", ...WRITING],
  "view.open": ["NOT_FOUND", "BUSY"],
  "view.select": ["NOT_FOUND", "INVALID_ARGS", "BUSY"],
  "view.reveal": ["NOT_FOUND", "BUSY"],
  "view.fit": ["BUSY"],
  "view.point": ["NOT_FOUND", "INVALID_ARGS", "BUSY"],
  "run.start": ["NOT_FOUND", "INVALID_ARGS"],
  "run.moves": ["NOT_ALLOWED"],
  "run.step": ["NOT_ALLOWED"],
  "run.answer": ["NOT_ALLOWED"],
  "run.state": ["NOT_ALLOWED"],
  "run.back": ["NOT_ALLOWED"],
  "run.stop": ["NOT_ALLOWED"],
  "scenario.save": ["NOT_ALLOWED", "SCHEMA", "READ_ONLY"],
  "scenario.replay": ["NOT_FOUND"],
  "scenario.present": ["NOT_FOUND", "BUSY"],
  "export.svg": ["NOT_FOUND"],
  "export.png": ["NOT_FOUND"],
  "export.scenarioPage": ["NOT_FOUND"],
  "projects.open": ["NOT_FOUND"],
  "projects.import": ["SCHEMA", "BUSY"],
  "audit.report": ["NOT_FOUND"]
};

/** @type {Operation[]} */
export const OPERATIONS = [
  // Read and query
  {
    name: "document.summary",
    summary: "The project, its levels as a tree, how many elements of each kind, and the format version.",
    input: Nothing,
    result: z.looseObject({
      project: z.looseObject({ id: Id, name: z.string() }),
      format: z.string(),
      levels: z.array(z.looseObject({ id: Id, name: z.string(), kind: Kind, depth: z.number().int() })),
      counts: z.record(z.string(), z.number().int())
    })
  },
  {
    name: "document.get",
    summary: "The whole document, as JSON.",
    input: Nothing,
    result: z.looseObject({ document: z.looseObject({ statewright: z.string() }) })
  },
  {
    name: "level.get",
    summary: "A level's nodes, edges and regions with their IDs, names and kinds, triggers, guards and effects.",
    input: z.strictObject({ canvas: Id }),
    result: z.looseObject({
      canvas: Id,
      name: z.string(),
      kind: Kind,
      nodes: z.array(z.looseObject({ id: Id, kind: z.string() })),
      edges: z.array(z.looseObject({ id: Id, from: Id, to: Id })),
      regions: z.array(z.looseObject({ id: Id, name: z.string() }))
    })
  },
  {
    name: "query.find",
    summary: "Elements whose name or label contains the text, with where each one is.",
    input: z.strictObject({ text: z.string().min(1), kind: z.string().optional() }),
    result: z.looseObject({
      found: z.array(
        z.looseObject({
          id: Id,
          kind: z.string(),
          name: z.string(),
          canvas: Id.optional(),
          path: z.string().optional()
        })
      )
    })
  },
  {
    name: "query.usages",
    summary: "Where an element is used: the references to it, as the inspector lists them.",
    input: z.strictObject({ id: Id }),
    result: z.looseObject({ usages: z.array(z.looseObject({ source: z.string().nullable() })) })
  },
  {
    name: "query.path",
    summary: "The levels from the root down to an element.",
    input: z.strictObject({ id: Id }),
    result: z.looseObject({ path: z.array(z.looseObject({ canvas: Id })) })
  },
  {
    name: "problems.list",
    summary: "The document's Problems (the rules' findings), by severity and level when asked.",
    input: z.strictObject({ severity: Severity.optional(), canvas: Id.optional() }),
    result: z.looseObject({ problems: z.array(Problem) })
  },
  {
    name: "editor.state",
    needs: "editor",
    summary: "What the Editor shows: the project, the level, the selection, what is open, and a run when there is one.",
    input: Nothing,
    result: z.looseObject({
      route: z.string(),
      project: z.looseObject({ id: Id, name: z.string(), readOnly: z.boolean() }).nullable(),
      selection: z.array(Id),
      open: z.looseObject({ simulation: z.boolean(), stage: z.boolean() }),
      run: z.looseObject({ canvas: Id }).nullable()
    })
  },
  // Edit
  {
    name: "batch.apply",
    writes: true,
    summary:
      "Apply a batch of document commands atomically, as one change named by its label — or, in the Editor, propose it.",
    input: z.strictObject({
      commands: z.array(z.looseObject({ type: z.string().min(1), args: z.looseObject({}).optional() })).min(1),
      label: z.string().min(1).describe("What the change does, in a few words; shown in the history"),
      propose: z
        .boolean()
        .optional()
        .describe(
          "Propose it instead of making it (the person accepts or rejects it in the Editor; the answer comes as a " +
            "message). Anything that removes is always proposed, unless the person lets you work without asking " +
            "(editor_state.autonomous), when a proposal is applied too. Only with the Editor."
        ),
      title: z.string().min(1).optional().describe("A proposal's title, as the person reads it"),
      why: z.string().min(1).optional().describe("Why you propose it, in a sentence")
    }),
    result: z.union([
      z.looseObject({
        created: z.array(Id),
        problems: z.looseObject({ added: z.array(Problem), removed: z.array(Problem) })
      }),
      z.looseObject({
        proposed: z.string(),
        forced: z.enum(["deletes", "locked"]).optional(),
        reason: z.string().optional()
      })
    ])
  },
  {
    name: "history.undo",
    writes: true,
    summary: "Undo the last change, when it is the agent's own.",
    input: Nothing,
    result: z.looseObject({ label: z.string() })
  },
  {
    name: "history.redo",
    writes: true,
    summary: "Redo the change the agent last undid.",
    input: Nothing,
    result: z.looseObject({ label: z.string() })
  },
  {
    name: "layout.arrange",
    writes: true,
    summary: "Place a level's boxes: those without a position, or all of them.",
    input: z.strictObject({ canvas: Id, scope: z.enum(["missing", "all"]).default("missing") }),
    result: z.looseObject({ placed: z.array(Id) })
  },
  // Navigate and show
  {
    name: "view.open",
    needs: "editor",
    summary: "Show a level in the Editor.",
    input: z.strictObject({ canvas: Id }),
    result: z.looseObject({ canvas: Id })
  },
  {
    name: "view.select",
    needs: "editor",
    summary: "Select elements in the Editor, on their level.",
    input: z.strictObject({ ids: Ids }),
    result: z.looseObject({ canvas: Id, selected: z.array(Id) })
  },
  {
    name: "view.reveal",
    needs: "editor",
    summary: "Open an element's level and bring it into view.",
    input: z.strictObject({ id: Id }),
    result: z.looseObject({ canvas: Id })
  },
  {
    name: "view.fit",
    needs: "editor",
    summary: "Frame the level shown whole.",
    input: Nothing,
    result: z.looseObject({ canvas: Id })
  },
  {
    name: "view.point",
    needs: "editor",
    summary: "Point the person to elements: highlighted, with a note, until they click elsewhere.",
    input: z.strictObject({ ids: Ids, note: z.string().optional() }),
    result: z.looseObject({ canvas: Id })
  },
  // Simulate and scenarios
  {
    name: "run.start",
    summary: "Start a run of a machine or flow level: its first point, or the question it asks while starting.",
    input: z.strictObject({
      canvas: Id,
      at: Instant,
      context: z.record(z.string(), z.looseObject({})).optional(),
      entry: Id.optional(),
      input: z.unknown().optional()
    }),
    result: RunResult
  },
  {
    name: "run.moves",
    summary: "What can happen from the point shown: each event, call and timer, with where it leads.",
    input: Nothing,
    result: z.looseObject({ moves: z.array(z.looseObject({ do: z.looseObject({}), label: z.string() })) })
  },
  {
    name: "run.step",
    summary: "Take a step: an event, a call or time passing. Returns the new point, or the question the step asks.",
    input: z.strictObject({
      do: z
        .looseObject({})
        .describe(
          'One of { "event": "evt_…", "payload"? }, { "call": "ept_…", "payload"? }, { "wait": "PT2H" | "next" }'
        )
    }),
    result: RunResult
  },
  {
    name: "run.answer",
    summary: "Answer the question the run asks; the step goes on with every answer so far.",
    input: z.strictObject({ value: z.unknown() }),
    result: RunResult
  },
  {
    name: "run.state",
    summary: "The run: its points (inputs and where each led), the point shown, a question or failure pending.",
    input: Nothing,
    result: z.looseObject({
      canvas: Id,
      points: z.array(z.looseObject({})),
      question: z.looseObject({}).nullable(),
      failure: z.looseObject({}).nullable()
    })
  },
  {
    name: "run.back",
    summary: "Go back one step (a pending question is left first).",
    input: Nothing,
    result: RunResult
  },
  {
    name: "run.stop",
    summary: "Stop the run. Steps no scenario holds are kept unless `discard` is true.",
    input: z.strictObject({ discard: z.boolean().optional() }),
    result: z.looseObject({ stopped: z.boolean() })
  },
  {
    name: "scenario.save",
    writes: true,
    summary: "Save the run as a scenario of the document.",
    input: z.strictObject({ name: z.string().min(1), description: z.string().optional() }),
    result: z.looseObject({ id: Id })
  },
  {
    name: "scenario.replay",
    summary: "Run a scenario again (or every one) and say, step by step, whether it does what it recorded.",
    input: z.strictObject({ id: Id.optional() }),
    result: z.looseObject({
      scenarios: z.array(z.looseObject({ id: Id, status: z.enum(["same", "diverged"]) }))
    })
  },
  {
    name: "scenario.present",
    needs: "editor",
    summary: "Present a scenario on the Editor's stage, at a step.",
    input: z.strictObject({ id: Id, step: z.number().int().min(0).optional() }),
    result: z.looseObject({ step: z.number().int() })
  },
  // Export
  {
    name: "export.document",
    summary: "The signed .sttw: as text, written to `out`, or in the Editor saved to its file or downloaded.",
    input: z.strictObject({ out: Out, to: z.enum(["text", "file", "download"]).optional() }),
    result: Written.extend({ name: z.string(), text: z.string().optional() })
  },
  {
    name: "export.svg",
    summary: "A level as SVG, as the image export and `statewright render` draw it.",
    input: z.strictObject({ canvas: Id, out: Out }),
    result: Written.extend({ name: z.string(), text: z.string().optional() })
  },
  {
    name: "export.png",
    needs: "editor",
    summary: "A level as PNG at 2×, drawn by the Editor (base64).",
    input: z.strictObject({ canvas: Id, out: Out }),
    result: Written.extend({ name: z.string(), base64: z.string().optional() })
  },
  {
    name: "export.markdown",
    summary: "The documentation for people, in Markdown.",
    input: z.strictObject({ out: Out }),
    result: Written.extend({ name: z.string(), text: z.string().optional() })
  },
  {
    name: "export.aiPack",
    summary: "The AI pack: the document as one compact Markdown file for language models.",
    input: z.strictObject({ out: Out }),
    result: Written.extend({ name: z.string(), text: z.string().optional() })
  },
  {
    name: "export.contract",
    summary:
      "The design's contract for code: its machines by the names code holds, its flows, its scenarios as test vectors.",
    input: z.strictObject({ out: Out }),
    result: Written.extend({
      name: z.string(),
      text: z.string().optional(),
      problems: z.array(z.looseObject({ code: z.string(), message: z.string() }))
    })
  },
  {
    name: "export.scenarioPage",
    summary: "A scenario as a page anyone can open offline: its story beside each level it visits.",
    input: z.strictObject({ id: Id, out: Out }),
    result: Written.extend({ name: z.string(), text: z.string().optional() })
  },
  // Projects
  {
    name: "projects.list",
    needs: "editor",
    summary: "The projects the Editor keeps in this browser.",
    input: Nothing,
    result: z.looseObject({ projects: z.array(z.looseObject({ id: Id, name: z.string() })) })
  },
  {
    name: "projects.open",
    summary: "Open a project: by its ID in the Editor, or a document file by its path.",
    input: z
      .strictObject({ id: Id.optional(), path: z.string().min(1).optional() })
      .refine(args => Boolean(args.id) !== Boolean(args.path), { message: "Give either id or path" }),
    result: z.looseObject({ project: z.looseObject({ id: Id, name: z.string() }) })
  },
  {
    name: "projects.create",
    summary: "Create a project whose root level is a system, a machine or a flow, without errors to start with.",
    input: z.strictObject({
      name: z.string().min(1),
      kind: Kind.default("system"),
      path: z.string().min(1).optional()
    }),
    result: z.looseObject({ project: z.looseObject({ id: Id, name: z.string() }), written: z.string().optional() })
  },
  {
    name: "projects.import",
    needs: "editor",
    summary: "Import a document into the Editor, from its text or a path the MCP server reads.",
    input: z
      .strictObject({ text: z.string().optional(), path: z.string().min(1).optional() })
      .refine(args => (args.text === undefined) !== (args.path === undefined), { message: "Give either text or path" }),
    result: z.looseObject({ project: z.looseObject({ id: Id, name: z.string() }) })
  },
  // Test and audit
  {
    name: "audit.report",
    summary: "Audit the design: its Problems by severity, every scenario run again, and how much they cover.",
    input: z.strictObject({ canvas: Id.optional(), format: z.enum(["json", "md"]).default("json") }),
    result: z.looseObject({ summary: z.looseObject({}).optional(), markdown: z.string().optional() })
  }
].map(operation => ({
  ...operation,
  group: operation.name.split(".")[0],
  errors: Object.freeze((ERRORS[operation.name] ?? []).filter(code => !CALL_ERRORS.includes(code)))
}));
