import { PACKAGE_VERSION } from "../../constants.js";
import { BRIDGE_PORT, createBridge } from "../../mcp/bridge.js";
import { serveMcp } from "../../mcp/serve.js";
import { CliError } from "../io.js";
import { nodeFiles } from "../node-files.js";

/** `--port`: a port number, 0 for any free one. */
function portOf(text) {
  if (text === undefined) return BRIDGE_PORT;
  const port = /^\d{1,5}$/.test(text) ? Number(text) : NaN;
  if (!(port <= 65535)) throw new CliError(`--port must be a port number from 0 to 65535, not "${text}"`);
  return port;
}

/** `--origin`: where the Editor is published, as an origin (`https://editor.example.com`). */
function originOf(text) {
  try {
    const { origin } = new URL(text);
    if (origin !== "null") return origin;
  } catch {
    // Not an address.
  }
  throw new CliError(`--origin must be the address where the Editor is published, such as https://example.com`);
}

/** The lines read, then — once the client has gone — `ended()`. */
async function* until(lines, ended) {
  for await (const line of lines) yield line;
  await ended();
}

/**
 * `statewright mcp [--file <path>] [--port <n>] [--origin <url>]` (AI interface spec §5–§6): the agent contract over
 * MCP, on stdio, and the bridge on 127.0.0.1 that an Editor tab pairs with.
 */
export default {
  name: "mcp",
  usage: "mcp [--file <path>] [--port <n>] [--origin <url>]",
  summary:
    "Serve the agent contract to an AI agent over MCP (stdio): every operation a tool, on document files or in the " +
    "Editor tab paired through the bridge on 127.0.0.1.",
  args: [0, 0],
  options: { file: { type: "string" }, port: { type: "string" }, origin: { type: "string", multiple: true } },
  async run({ options, io }) {
    const port = portOf(options.port);
    const origins = (options.origin ?? []).map(originOf);
    const log = line => io.stderr(`statewright mcp: ${line}\n`);
    const bridge = createBridge({ origins, log });
    // The bridge starts beside the server, which lists its tools without waiting for it (spec §11).
    const listening = bridge.listen(port).catch(error => {
      log(`the bridge to the Editor did not start (${error.message}): tools work on files only`);
    });
    await serveMcp({
      files: nodeFiles({ cwd: io.cwd }),
      file: options.file,
      version: PACKAGE_VERSION,
      // Once the client has gone, nothing waits on the person; what the Editor is running is still answered.
      lines: until(io.lines(), () => bridge.stopWaiting()),
      write: line => io.stdout(`${line}\n`),
      log,
      editor: bridge
    });
    await listening;
    await bridge.close();
    return 0;
  }
};
