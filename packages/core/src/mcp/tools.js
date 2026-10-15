// The contract's operations as MCP tools (AI interface spec §5): one tool per operation, named `group_action`, with its
// description, the errors it can answer, and its arguments' JSON Schema — plus `file`, the document it works on, and
// `acceptChanges` on the tools that change the document; then the bridge's own tools, `editor_pair` and
// `editor_disconnect`; then `guide_read`, the guide a section at a time (AI interface plan A5).
import { inputSchemaOf, toolNameOf } from "../agent/contract.js";
import { OPERATIONS } from "../agent/operations.js";
import { EDITOR_ORIGIN } from "../constants.js";

/** The groups whose operations only read: an MCP client may call them without asking. */
const READING = new Set(["document", "level", "query", "problems", "editor", "audit"]);
const ALSO_READING = new Set(["run.moves", "run.state", "scenario.replay"]);

const FILE = {
  type: "string",
  minLength: 1,
  description:
    "The .sttw to work on (or a .statewright.json saved before 0.1.5), a path the server reads and writes. " +
    "Without it, the server's --file or the document opened last (projects_open, projects_create)."
};

const ACCEPT_CHANGES = {
  type: "boolean",
  description: "Write the file even though it was changed outside Statewright (review the change first)."
};

/** A tool's description: what the operation does, whether it needs the Editor, and the errors of its own. */
function describe(operation) {
  const editor = operation.needs === "editor" ? " Needs a paired Editor." : "";
  const errors = operation.errors.length ? ` Errors: ${operation.errors.join(", ")}.` : "";
  return `${operation.summary}${editor}${errors}`;
}

/** The bridge's own tools (spec §5: "Also tools of its own"): pairing with the person's Editor, and ending it. */
const BRIDGE_TOOLS = [
  {
    name: "editor_pair",
    description:
      `Pair with the person's Statewright Editor: they open the Editor (${EDITOR_ORIGIN}) and its Connect an AI… ` +
      "(on the Projects screen, or a project's menu or ⌘K) and read you its code. Calls without file then run in that tab, and the person sees " +
      "your changes as yours. " +
      "Errors: BAD_ARGUMENTS, NOT_FOUND, NOT_ALLOWED, TIMEOUT.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The code the Editor shows, such as K7Q-2MX." },
        agent: {
          type: "string",
          description: "Your name, as the person sees it on your changes (default: your MCP client's name)."
        }
      },
      required: ["code"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, openWorldHint: false }
  },
  {
    name: "editor_disconnect",
    description: "End the pairing with the Editor: calls without file run on the server's --file again.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, openWorldHint: false }
  },
  {
    name: "editor_wait",
    description:
      "Wait for the person to write to you from the paired Editor (collaboration spec §3.2): answers their unread " +
      "messages, now read, as soon as there are some — at once when some wait — or { messages: [] } when the time is " +
      "up. Call it whenever you have finished what they asked, so you are listening; other calls go on meanwhile. " +
      "A message has text, and may carry the level, the selection and what they marked. Errors: BAD_ARGUMENTS, " +
      "NOT_PAIRED, EDITOR_GONE.",
    inputSchema: {
      type: "object",
      properties: {
        seconds: {
          type: "integer",
          minimum: 1,
          maximum: 600,
          description: "How long to wait at most (default 50); call it again to go on listening."
        }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: "editor_inbox",
    description:
      "Read the person's unread messages from the paired Editor, now read, without waiting. Read them when an answer " +
      "carries inbox, and when a call answers STOPPED (the person asked you to stop: their message says why). " +
      "Errors: NOT_PAIRED, EDITOR_GONE.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: "editor_reply",
    description:
      "Answer the person in the paired Editor's conversation: your text, the message it answers (to: msg_…), and the " +
      "elements you mean (point: their IDs, which the person can click to see them). Errors: BAD_ARGUMENTS, " +
      "NOT_FOUND, NOT_PAIRED, EDITOR_GONE.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", minLength: 1, description: "What you say." },
        to: { type: "string", description: "The message you answer: msg_…" },
        point: { type: "array", items: { type: "string" }, description: "IDs of the elements you mean." }
      },
      required: ["text"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, openWorldHint: false }
  },
  {
    name: "editor_ask",
    description:
      "Ask the person in the paired Editor instead of guessing (collaboration spec §6.1): your question, and choices " +
      "as buttons (options; multiple: several at once), a free answer always, or elements they mark on the canvas " +
      '(pick: "elements"). Answers as soon as they do: { answered: true, values?, text?, elements? }; when the time ' +
      "is up, { answered: false } and the question stays open — their later answer reaches you as a message with " +
      "answers. Other calls go on meanwhile. Errors: BAD_ARGUMENTS, NOT_PAIRED, EDITOR_GONE.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", minLength: 1, maxLength: 500, description: "What you ask." },
        options: {
          type: "array",
          maxItems: 8,
          description: "Choices shown as buttons.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", minLength: 1, maxLength: 80, description: "What the button says." },
              value: { type: "string", description: "What you get back; one of its own." },
              point: { type: "array", items: { type: "string" }, description: "IDs of the elements it means." },
              description: { type: "string", description: "A line more, shown under the label." }
            },
            required: ["label", "value"],
            additionalProperties: false
          }
        },
        multiple: { type: "boolean", description: "Several options may be chosen." },
        pick: { enum: ["elements"], description: "The person marks elements on the canvas as the answer." },
        seconds: {
          type: "integer",
          minimum: 1,
          maximum: 600,
          description: "How long to wait for the answer (default 120)."
        }
      },
      required: ["question"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, openWorldHint: false }
  }
];

/** The guide, offline: where to start, then any section an agent needs (AI interface plan A5). */
const GUIDE_TOOL = {
  name: "guide_read",
  description:
    "Read the Statewright guide, offline: without section, where to start (AI agents: start here) and the list of " +
    'sections; with section, that section, by its ID or title (rules-for-ai-agents, "Design a system with the ' +
    'person, level by level"). Errors: BAD_ARGUMENTS, NOT_FOUND, FILE.',
  inputSchema: {
    type: "object",
    properties: {
      section: {
        type: "string",
        minLength: 1,
        description: "A section's ID or title, or part of its name; without it, where to start and the list."
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, openWorldHint: false }
};

/**
 * The tools the MCP server lists (`tools/list`): the contract's operations in its order, then the bridge's own, then
 * the guide.
 * @returns {Array<{ name: string, description: string, inputSchema: object, annotations: object }>}
 */
export function toolsOf() {
  const operations = OPERATIONS.map(operation => {
    const schema = inputSchemaOf(operation.name);
    const properties = {
      ...schema.properties,
      file: FILE,
      ...(operation.writes ? { acceptChanges: ACCEPT_CHANGES } : {})
    };
    const reads = READING.has(operation.group) || ALSO_READING.has(operation.name);
    return {
      name: toolNameOf(operation.name),
      description: describe(operation),
      inputSchema: { ...schema, properties },
      annotations: { readOnlyHint: reads, openWorldHint: false }
    };
  });
  return [...operations, ...BRIDGE_TOOLS, GUIDE_TOOL];
}

/**
 * Split a tool's arguments into the operation's own and where the call runs.
 * @param {object} args
 * @returns {{ args: object, file?: unknown, acceptChanges?: unknown }}
 */
export function splitArguments({ file, acceptChanges, ...args } = {}) {
  return { args, file, acceptChanges };
}
