// The MCP server at work (AI interface spec §5): it reads JSON-RPC lines, answers each as soon as its answer is ready,
// and runs the tools on document files through the file host — signed with the name of the client that connected —
// or in the Editor tab paired through the bridge (§6).
// It ends when its input ends, once every answer is written; a document never ends it.
import { createMcpServer } from "./server.js";
import { toolsOf } from "./tools.js";

/**
 * Serve MCP over lines.
 * @param {{ files: import("../agent/memory-files.js").Files, file?: string, version: string,
 *   lines: AsyncIterable<string>, write: (line: string) => void, log?: (line: string) => void,
 *   editor?: ReturnType<typeof import("./bridge.js").createBridge> | null, guide?: () => Promise<string> }} options
 *   `files`: where documents are read and written; `file`: the document of calls without one (--file); `lines`: the
 *   messages read; `write`: writes one answer (a line, without its newline); `editor`: the bridge to an Editor tab;
 *   `guide`: reads the guide (by default, the README shipped with the package).
 * @returns {Promise<void>} When the input has ended and every answer is written.
 */
export async function serveMcp({ files, file, version, lines, write, log = () => {}, editor = null, guide }) {
  const tools = toolsOf();
  let hostMade = null;
  // The host is made at the first call, once the client has said its name: the documents it writes are signed with it.
  // Its modules load then too, so the server lists its tools as soon as it starts (spec §11: within 100 ms). Made once,
  // even when calls come together (editor_wait runs beside the queue).
  const hostNow = () => {
    hostMade ??= (async () => {
      const [{ createFileHost }, { route }] = await Promise.all([
        import("../agent/file-host.js"),
        import("./route.js")
      ]);
      // A name the client gave, as text; anything else would make the documents it signs invalid.
      const name = server.client()?.name;
      const agent = typeof name === "string" && name.trim() ? name.trim() : undefined;
      const made = createFileHost({ files, file, agent });
      return { call: (tool, args, options) => route({ host: made, editor, files, agent, guide }, tool, args, options) };
    })();
    return hostMade;
  };
  /** What a cancelled request stops: the wait of each editor_wait, by its request's id. */
  const cancelling = new Map();
  // Tool calls run one after the other, in the order they came: one may open the document the next works on. Waiting
  // for the person (editor_wait, editor_ask) runs beside them, so it never holds the agent's other calls
  // (collaboration spec §3.2, §6.1).
  let calls = Promise.resolve();
  const call = (tool, args, id) => {
    if (tool === "editor_wait" || tool === "editor_ask") {
      const stop = new AbortController();
      if (id !== undefined) cancelling.set(id, stop);
      return hostNow()
        .then(made => made.call(tool, args, { signal: stop.signal }))
        .finally(() => cancelling.delete(id));
    }
    const done = calls.then(async () => (await hostNow()).call(tool, args));
    calls = done.catch(() => {});
    return done;
  };
  const server = createMcpServer({ version, tools, log, call, cancel: id => cancelling.get(id)?.abort() });
  // Each message the person writes reaches Claude Code started with the Channel as a turn of its own.
  const unhear = editor?.onMessage?.(message =>
    write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/claude/channel", params: channelOf(message) }))
  );
  log(`ready: ${tools.length} tools${file ? `, on ${file} by default` : ""}`);
  const pending = new Set();
  for await (const line of lines) {
    const answered = server.receive(line).then(text => {
      if (text) write(text);
    });
    pending.add(answered);
    answered.finally(() => pending.delete(answered));
  }
  await Promise.all(pending);
  unhear?.();
}

/** Elements by name and ID: "running (nod_r), paused (nod_p)". */
const namesOf = items => items.map(item => `${item.name} (${item.id})`).join(", ");

/** A mark of the person's in words (collaboration spec §5.4). */
function markInWords(mark) {
  if (mark.kind === "element") return `For you on ${mark.level}: ${namesOf([mark.element])}`;
  const colour = mark.meaning ? `${mark.colour}, ${mark.meaning}` : mark.colour;
  if (mark.kind === "label") {
    return `Label (${colour}) on ${mark.level}: "${mark.text}"${mark.near ? ` near ${namesOf([mark.near])}` : ""}`;
  }
  if (mark.from && mark.to)
    return `Arrow (${colour}) on ${mark.level}: ${namesOf([mark.from])} → ${namesOf([mark.to])}`;
  const parts = [
    ...(mark.encloses?.length ? [`encloses ${namesOf(mark.encloses)}`] : []),
    ...(mark.touches?.length ? [`touches ${namesOf(mark.touches)}`] : [])
  ];
  return `Marked (${colour}) on ${mark.level}: ${parts.join("; ") || "nothing on the level"}`;
}

/**
 * A message as the Channel carries it: its text, then the level and the selection it was written on; meta keys are
 * letters, digits and underscores (Claude Code's contract).
 * @param {import("./inbox.js").Message} message
 * @returns {{ content: string, meta: Record<string, string> }}
 */
export function channelOf(message) {
  const { id, text, stop, answers, proposal, context = {} } = message;
  if (proposal) {
    const name = `Proposal ${proposal.id}${proposal.title ? ` (${proposal.title})` : ""}`;
    const content =
      proposal.accepted ? `${name} was accepted.`
      : proposal.stale ? `${name} no longer applies: ${proposal.stale}.`
      : `${name} was rejected${proposal.reason ? `: ${proposal.reason}` : ""}.`;
    return { content, meta: { message: id, proposal: proposal.id } };
  }
  if (stop) {
    return {
      content: "The person asked you to stop: read editor_inbox, then go on only as they say.",
      meta: { message: id, stop: "true" }
    };
  }
  if (answers) {
    const said = [
      ...(answers.values ?? []),
      ...(answers.text ? [`"${answers.text}"`] : []),
      ...(answers.elements ?? []).map(item => `${item.name} (${item.id})${item.level ? ` on ${item.level}` : ""}`)
    ];
    return {
      content: `Answer to ${answers.question}: ${said.join("; ")}`,
      meta: { message: id, question: answers.question }
    };
  }
  const lines = [];
  if (context.level) lines.push(`Level: ${context.level.name} (${context.level.id})`);
  if (context.selection?.length) {
    lines.push(`Selected: ${context.selection.map(item => `${item.name} (${item.id})`).join(", ")}`);
  }
  for (const mark of message.marks ?? []) lines.push(markInWords(mark));
  if (message.image) lines.push("An image of the marks waits in editor_inbox.");
  return {
    content: lines.length ? `${text}\n\n${lines.join("\n")}` : text,
    meta: { message: id, ...(context.level ? { level: context.level.id } : {}) }
  };
}
