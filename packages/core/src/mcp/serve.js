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
  let host = null;
  // The host is made at the first call, once the client has said its name: the documents it writes are signed with it.
  // Its modules load then too, so the server lists its tools as soon as it starts (spec §11: within 100 ms).
  const hostNow = async () => {
    if (!host) {
      const [{ createFileHost }, { route }] = await Promise.all([
        import("../agent/file-host.js"),
        import("./route.js")
      ]);
      // A name the client gave, as text; anything else would make the documents it signs invalid.
      const name = server.client()?.name;
      const agent = typeof name === "string" && name.trim() ? name.trim() : undefined;
      const made = createFileHost({ files, file, agent });
      host = { call: (tool, args) => route({ host: made, editor, files, agent, guide }, tool, args) };
    }
    return host;
  };
  // Tool calls run one after the other, in the order they came: one may open the document the next works on.
  let calls = Promise.resolve();
  const call = (tool, args) => {
    const done = calls.then(async () => (await hostNow()).call(tool, args));
    calls = done.catch(() => {});
    return done;
  };
  const server = createMcpServer({ version, tools, log, call });
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
}
