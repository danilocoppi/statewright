// Where a tool call runs (AI interface spec §5, routing): with `file`, on that file; without it, in the paired Editor
// tab; without either, on the server's --file or the document opened last; otherwise `NOT_PAIRED`, which says how to
// pair or to pass `file`. A call never moves from the Editor to a file or back (§9): once the paired tab has gone,
// calls answer `EDITOR_GONE` until an agent pairs again or disconnects. `guide_read` needs no document at all.
import { Buffer } from "node:buffer";
import { operationOfTool } from "../agent/contract.js";
import { failure, success } from "../agent/errors.js";
import { EDITOR_ORIGIN } from "../constants.js";
import { guideSection, readGuide } from "./guide.js";
import { splitArguments } from "./tools.js";

/**
 * How an agent pairs with the person's Editor, for the messages that need it: where the Editor is, and where this
 * server's bridge is too.
 */
function howToPair(editor) {
  const address = editor?.address?.();
  return (
    `ask the person to open the Statewright Editor (${EDITOR_ORIGIN}) and its Connect an AI… (on the Projects screen, or a project's menu or ⌘K)` +
    `${address ? `, at the address ${address},` : ""} and call editor_pair with the code it shows`
  );
}

/** `editor_pair { code, agent? }`: the name the agent's changes carry is its own, else its MCP client's. */
function pair(editor, { code, agent } = {}, client) {
  if (!editor) return failure("NOT_PAIRED", "This server has no bridge to the Editor: pass file instead");
  const name = typeof agent === "string" && agent.trim() ? agent.trim() : client;
  return editor.pair(code, name);
}

/** `guide_read { section? }`: where to start and the list, or a section; the guide is read at each call. */
async function readSection(guide, { section } = {}) {
  if (section !== undefined && (typeof section !== "string" || !section.trim())) {
    return failure("BAD_ARGUMENTS", "Invalid arguments for guide_read: section must be a section's ID or title", {
      path: "section"
    });
  }
  let markdown;
  try {
    markdown = await guide();
  } catch (error) {
    return failure("FILE", `Cannot read the guide: ${error?.message ?? error}`);
  }
  return guideSection(markdown, section);
}

/**
 * Run an operation in the paired tab. The server reads and writes the files the Editor cannot: `projects.import`'s
 * `path` goes to the tab as the file's text, and an export's `out` is written here from what the tab returns.
 */
async function inEditor(editor, files, name, args) {
  let sent = args;
  if (name === "projects.import" && args.path !== undefined) {
    let read;
    try {
      read = await files.read(args.path);
    } catch (error) {
      return failure("FILE", `Cannot read ${args.path}: ${error?.message ?? error}`, { file: args.path });
    }
    if (!read) return failure("FILE", `Cannot read ${args.path}: no such file`, { file: args.path });
    sent = { text: read.text };
  }
  const { out, ...rest } = sent;
  const outcome = await editor.call(name, out === undefined ? sent : rest);
  if (out === undefined || !outcome.ok) return outcome;
  const { text, base64, ...result } = outcome.result;
  if (text === undefined && base64 === undefined) return outcome;
  try {
    await files.write(out, base64 === undefined ? text : Buffer.from(base64, "base64"));
  } catch (error) {
    return failure("FILE", `Cannot write ${out}: ${error?.message ?? error}`, { file: out });
  }
  return success({ ...result, written: out });
}

/**
 * Run a tool: an operation of the contract, the bridge's own (`editor_pair`, `editor_disconnect`), or `guide_read`.
 * @param {{ host: ReturnType<typeof import("../agent/file-host.js").createFileHost>,
 *   editor?: ReturnType<typeof import("./bridge.js").createBridge> | null,
 *   files: import("../agent/memory-files.js").Files, agent?: string, guide?: () => Promise<string> }} where `host`:
 *   the file host; `editor`: the bridge to a paired tab; `files`: what the server reads and writes for the Editor;
 *   `agent`: the client's name; `guide`: reads the guide (the README shipped with the package).
 * @param {string} tool A listed tool's name.
 * @param {object} toolArgs The tool's arguments, `file` and `acceptChanges` among them.
 * @returns {Promise<{ ok: true, result: any } | { ok: false, error: object }>}
 */
export async function route({ host, editor, files, agent, guide = readGuide }, tool, toolArgs) {
  if (tool === "guide_read") return readSection(guide, toolArgs);
  if (tool === "editor_pair") return pair(editor, toolArgs, agent);
  if (tool === "editor_disconnect") return editor ? editor.disconnect() : success({ disconnected: false });
  const operation = operationOfTool(tool);
  const { name } = operation;
  const { args, file, acceptChanges } = splitArguments(toolArgs);
  if (file !== undefined && (typeof file !== "string" || file === "")) {
    return failure("BAD_ARGUMENTS", `Invalid arguments for ${name}: file must be the path of a .statewright.json`, {
      path: "file"
    });
  }
  if (acceptChanges !== undefined && typeof acceptChanges !== "boolean") {
    return failure("BAD_ARGUMENTS", `Invalid arguments for ${name}: acceptChanges must be true or false`, {
      path: "acceptChanges"
    });
  }
  if (file) return host.call(name, args, { file, acceptChanges });
  // A path names a file, as `file` does: opening or creating one runs on the file host, paired or not.
  if (["projects.open", "projects.create"].includes(name) && args.path !== undefined) {
    return host.call(name, args, { acceptChanges });
  }
  const state = editor?.state() ?? { status: "none" };
  if (state.status === "paired") return inEditor(editor, files, name, args);
  if (state.status === "gone") return state.outcome;
  if (operation.needs === "editor")
    return failure("NOT_PAIRED", `${name} needs the person's Editor: ${howToPair(editor)}`);
  if (host.current() || host.runsWithoutFile(name)) return host.call(name, args, { acceptChanges });
  return failure(
    "NOT_PAIRED",
    `${name} has no document to work on: pass file (the path of a .statewright.json), start the server with --file, ` +
      `or ${howToPair(editor)}`
  );
}
