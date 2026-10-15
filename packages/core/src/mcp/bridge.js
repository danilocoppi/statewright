// The bridge between `statewright mcp` and an Editor tab (AI interface spec §6), on http://127.0.0.1 only. The tab
// registers the code it shows (`POST /pair`, answered once an agent pairs with it, or when the code expires); the
// agent pairs with `editor_pair { code }`; the tab then listens for calls (`GET /calls`, server-sent events) and
// answers each (`POST /results`). Only the Editor's origins are answered, and, once paired, only with the session's
// token. Node only: the `mcp` command loads it.
import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { EDITOR_ORIGIN } from "../constants.js";

/** Where the Editor is published, which the bridge answers without --origin. */
export { EDITOR_ORIGIN };

/** The port the bridge listens on unless told otherwise; the next free one when it is taken. */
export const BRIDGE_PORT = 47615;
/** How long a code the Editor shows is valid (spec §6: "valid five minutes"). */
export const CODE_MS = 5 * 60 * 1000;
/** How long a call waits for the Editor (spec §6: "A call waits at most 30 s"). */
export const CALL_MS = 30 * 1000;
/** The characters of a code: no 0 and O, no 1, I and L, so a code read aloud is not misheard. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
/** How many ports after the one asked the bridge tries. */
const TRIES = 10;
/** The largest request the bridge reads: a result may carry a whole document, or a PNG. */
const MAX_BODY = 64 * 1024 * 1024;
/** The largest registration: a code, from a page that needs no token to send it. */
const MAX_CODE_BODY = 1024;
/** What `readJson` answers for a body over its limit. */
const TOO_LARGE = Symbol("too large");

/**
 * A code as the bridge keeps it: six characters of the alphabet, upper case, without the hyphen or spaces the person
 * may type; null when it is not one.
 * @param {unknown} text
 * @returns {string | null}
 */
export function normalCode(text) {
  if (typeof text !== "string") return null;
  const code = text.toUpperCase().replace(/[\s-]/g, "");
  return code.length === 6 && [...code].every(char => CODE_ALPHABET.includes(char)) ? code : null;
}

/** A code as people read it: `K7Q-2MX`. */
export const shownCode = code => `${code.slice(0, 3)}-${code.slice(3)}`;

/** Whether a page at this origin is the Editor: the published one, one of `origins`, or a development server. */
function editorOrigin(origins, origin) {
  return (
    typeof origin === "string" &&
    (origin === EDITOR_ORIGIN || origins.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))
  );
}

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const fail = (code, message, details) => ({ ok: false, error: { code, message, ...(details ? { details } : {}) } });

/** Whether the Editor's answer is a result of the contract. */
const isOutcome = value =>
  isObject(value) &&
  ((value.ok === true && "result" in value) ||
    (value.ok === false && isObject(value.error) && typeof value.error.code === "string"));

/**
 * Read a request's JSON body: null when it is not JSON, `TOO_LARGE` over `max` bytes (the rest is read and dropped,
 * so the answer reaches the page).
 */
function readJson(request, max = MAX_BODY) {
  return new Promise(resolve => {
    const chunks = [];
    let size = 0;
    request.on("data", chunk => {
      size += chunk.length;
      if (size <= max) chunks.push(chunk);
    });
    request.on("end", () => {
      if (size > max) return resolve(TOO_LARGE);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        resolve(null);
      }
    });
    request.on("error", () => resolve(null));
  });
}

/**
 * The bridge of one MCP server: at most one Editor tab paired at a time.
 * @param {{ origins?: string[], log?: (line: string) => void, codeMs?: number, callMs?: number,
 *   heartbeatMs?: number }} [options] `origins`: where else the Editor is served, beside its published origin and
 *   localhost (`--origin`);
 *   `log`: the server's log (stderr).
 */
export function createBridge({
  origins = [],
  log = () => {},
  codeMs = CODE_MS,
  callMs = CALL_MS,
  heartbeatMs = 15000
} = {}) {
  /** The codes tabs wait on, by code: `{ response, timer }`. */
  const waiting = new Map();
  /** Codes that expired, so an agent that brings one late is told so. */
  const expired = new Set();
  /** The paired tab: `{ token, agent, stream, calls, opened, confirming }`, or null. */
  let session = null;
  /** What waits on the person: a hand-over question, a pairing waiting for its tab to listen. */
  const waits = new Set();
  /** How the last session ended, while no tab is paired: `{ reason, agent }` (spec §6: "EDITOR_GONE until paired"). */
  let gone = null;
  let nextCall = 0;
  let port = null;

  const server = createServer({ requestTimeout: 60000 }, (request, response) => {
    handle(request, response).catch(error => {
      log(`the bridge failed on ${request.method} ${request.url}: ${error?.stack ?? error}`);
      if (!response.headersSent) send(response, 500, { error: "internal" });
    });
  });

  function send(response, status, body) {
    response.writeHead(status, body === undefined ? {} : { "content-type": "application/json" });
    response.end(body === undefined ? undefined : JSON.stringify(body));
  }

  /** Write an event to the paired tab. */
  function emit(event, data) {
    session?.stream?.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  /** End the session: calls still waiting answer EDITOR_GONE, and the tab is told why (`bye`). */
  function end(ended, reason) {
    if (!ended || session !== ended) return;
    session = null;
    gone = reason === "agent" ? null : { reason, agent: ended.agent };
    for (const resolve of ended.calls.values()) resolve(goneOutcome());
    ended.calls.clear();
    ended.confirming?.resolve("gone");
    if (ended.stream && !ended.stream.writableEnded) {
      ended.stream.write(`event: bye\ndata: ${JSON.stringify({ reason })}\n\n`);
      ended.stream.end();
    }
    clearInterval(ended.heartbeat);
    log(`the Editor tab of ${ended.agent ?? "the agent"} is no longer paired (${reason})`);
  }

  /** What a call answers once the tab has gone. */
  function goneOutcome() {
    const why =
      gone?.reason === "person" ? "The person disconnected the Editor"
      : gone?.reason === "server" ? "The server is stopping"
      : "The paired Editor tab was closed or lost its connection";
    return fail(
      "EDITOR_GONE",
      `${why}: ask the person to pair again (Connect an AI… in the Editor), pass file, or call editor_disconnect to ` +
        "work without the Editor"
    );
  }

  /** The session a request's token opens, or null. */
  function sessionOf(request) {
    const token = /^Bearer (\S+)$/.exec(request.headers.authorization ?? "")?.[1];
    return token && session?.token === token ? session : null;
  }

  async function handle(request, response) {
    const origin = request.headers.origin;
    if (!editorOrigin(origins, origin)) {
      return send(response, 403, { error: "This bridge answers the Statewright Editor only" });
    }
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
    if (request.method === "OPTIONS") {
      response.setHeader("access-control-allow-methods", "GET, POST, DELETE");
      response.setHeader("access-control-allow-headers", "authorization, content-type");
      response.setHeader("access-control-max-age", "600");
      // Chrome asks a public page before it reaches the local network (spec §6).
      if (request.headers["access-control-request-private-network"] === "true") {
        response.setHeader("access-control-allow-private-network", "true");
      }
      return send(response, 204);
    }
    const route = `${request.method} ${new URL(request.url, "http://127.0.0.1").pathname}`;
    if (route === "POST /pair") return register(request, response);
    const own = sessionOf(request);
    if (!["DELETE /pair", "GET /calls", "POST /results", "POST /confirm"].includes(route)) {
      return send(response, 404, { error: "unknown" });
    }
    if (!own) return send(response, 401, { error: "Not paired, or paired no more" });
    if (route === "DELETE /pair") {
      end(own, "person");
      return send(response, 204);
    }
    if (route === "GET /calls") return listen(own, response);
    const body = await readJson(request);
    if (body === TOO_LARGE) return send(response, 413, { error: "Too large" });
    if (!isObject(body)) return send(response, 400, { error: "Not a JSON object" });
    if (route === "POST /results") {
      const resolve = own.calls.get(body.id);
      if (!resolve) return send(response, 404, { error: "No call is waiting with this id" });
      own.calls.delete(body.id);
      resolve(
        isOutcome(body.outcome) ?
          body.outcome
        : fail("INTERNAL", "The Editor answered something that is not a result of the contract")
      );
      return send(response, 204);
    }
    if (own.confirming?.id !== body.id) return send(response, 404, { error: "Nothing waits on this answer" });
    own.confirming.resolve(body.accept === true);
    return send(response, 204);
  }

  /** A tab registers the code it shows, and waits for an agent to bring it. */
  async function register(request, response) {
    const body = await readJson(request, MAX_CODE_BODY);
    if (body === TOO_LARGE) return send(response, 413, { error: "A registration holds a code, nothing more" });
    const code = normalCode(body?.code);
    if (!code) return send(response, 400, { error: "A code is six characters of the Editor's alphabet" });
    if (waiting.has(code)) return send(response, 409, { error: "This code is already waiting" });
    const timer = setTimeout(() => {
      waiting.delete(code);
      expired.add(code);
      send(response, 410, { error: "expired" });
    }, codeMs);
    waiting.set(code, { response, timer });
    // A tab that stops waiting (its dialog closed, the tab gone) withdraws its code.
    response.on("close", () => {
      if (waiting.get(code)?.response !== response) return;
      clearTimeout(timer);
      waiting.delete(code);
    });
  }

  /** The paired tab listens for calls: the session works from now on. */
  function listen(own, response) {
    if (own.stream) return send(response, 409, { error: "This session already has a listener" });
    response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
    response.write(": paired\n\n");
    own.stream = response;
    own.heartbeat = setInterval(() => response.write(": ping\n\n"), heartbeatMs);
    own.opened();
    response.on("close", () => end(own, "closed"));
  }

  /** Ask the paired tab whether another may take its place: true, false, "timeout", or "gone" (the tab went away). */
  function askToHandOver(own, agent) {
    return new Promise(resolve => {
      const id = randomBytes(8).toString("hex");
      const finish = answer => {
        clearTimeout(timer);
        waits.delete(withdraw);
        own.confirming = null;
        resolve(answer);
      };
      // Nobody answered: the tab puts its question away, as a late answer would do nothing.
      const withdraw = () => {
        own.stream?.write(`event: withdrawn\ndata: ${JSON.stringify({ id })}\n\n`);
        finish("timeout");
      };
      const timer = setTimeout(withdraw, callMs);
      waits.add(withdraw);
      own.confirming = { id, resolve: finish };
      emit("confirm", { id, agent });
    });
  }

  return {
    /**
     * Listen on 127.0.0.1 at `asked`, or the next free port.
     * @param {number} [asked] 0: any free port.
     * @returns {Promise<{ port: number }>}
     */
    async listen(asked = BRIDGE_PORT) {
      for (let tried = 0; tried < TRIES; tried += 1) {
        const candidate = asked === 0 ? 0 : asked + tried;
        try {
          await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen({ host: "127.0.0.1", port: candidate }, () => {
              server.off("error", reject);
              resolve();
            });
          });
          port = server.address().port;
          log(`bridge on http://127.0.0.1:${port}${asked && port !== asked ? ` (${asked} was taken)` : ""}`);
          return { port };
        } catch (error) {
          if (error.code !== "EADDRINUSE" || asked === 0) throw error;
        }
      }
      throw new Error(`ports ${asked} to ${asked + TRIES - 1} are taken`);
    },

    /** Where the Editor finds the bridge: `127.0.0.1:47615`; null before it listens. */
    address: () => (port === null ? null : `127.0.0.1:${port}`),

    /**
     * Whether a tab is paired: `none`, `paired` (with the agent's name), or `gone` (the tab closed or the person
     * disconnected; until an agent pairs again).
     * @returns {{ status: "none" } | { status: "paired", agent?: string } |
     *   { status: "gone", reason: string, outcome: object }}
     */
    state() {
      if (session?.stream) return { status: "paired", agent: session.agent };
      if (gone) return { status: "gone", reason: gone.reason, outcome: goneOutcome() };
      return { status: "none" };
    },

    /**
     * Pair with the tab that shows this code (`editor_pair`).
     * @param {unknown} code What the person read: `K7Q-2MX`, `k7q2mx`, …
     * @param {string} [agent] The name the agent's changes carry in the Editor.
     */
    async pair(code, agent) {
      if (port === null) {
        return fail("NOT_PAIRED", "The bridge to the Editor is not running (the server's log says why): pass file");
      }
      const normal = normalCode(code);
      if (!normal) {
        return fail("BAD_ARGUMENTS", "code must be the six characters the Editor shows, such as K7Q-2MX", {
          path: "code"
        });
      }
      if (!waiting.has(normal)) {
        // The tab may look for another server: the person can type this one's address (spec §6: the port "said in
        // editor_pair's answers").
        const address = `127.0.0.1:${port}`;
        const here = `this server's bridge is at ${address}: if Connect an AI… looks at another address, ask the person to type this one`;
        if (expired.has(normal)) {
          return fail(
            "NOT_FOUND",
            `The code ${shownCode(normal)} has expired: ask the person for the code Connect an AI… shows now; ${here}`,
            { expired: true, address }
          );
        }
        return fail(
          "NOT_FOUND",
          `No Editor tab shows the code ${shownCode(normal)}: ask the person to open Connect an AI… in the Editor ` +
            `(the project menu, or ⌘K) and read you the code it shows; ${here}`,
          { address }
        );
      }
      let asked = null;
      if (session?.stream) {
        asked = session;
        const accepted = await askToHandOver(asked, agent);
        if (accepted === "timeout") {
          return fail(
            "TIMEOUT",
            "Nobody answered within 30 s whether the Editor tab already paired hands over: ask the person to answer " +
              "in the tab already paired, then call editor_pair again"
          );
        }
        if (accepted === false) {
          return fail("NOT_ALLOWED", "The person kept the Editor tab already paired: work there, or ask them why");
        }
      }
      // Handed over, or the tab asked went away meanwhile: the tab waiting is paired — if it still waits.
      const entry = waiting.get(normal);
      if (!entry) {
        const kept = asked && session === asked ? ", so the Editor tab already paired stays paired" : "";
        return fail("NOT_FOUND", `The tab that showed ${shownCode(normal)} stopped waiting${kept}: ask for a new code`);
      }
      waiting.delete(normal);
      clearTimeout(entry.timer);
      // A pairing that takes an Editor's place and then fails leaves the Editor gone, not files (spec §9).
      const hadEditor = Boolean(session || gone);
      end(session, "replaced");
      let opened;
      const listening = new Promise(resolve => (opened = resolve));
      const own = { token: randomBytes(24).toString("hex"), agent, stream: null, calls: new Map(), opened };
      session = own;
      gone = null;
      send(entry.response, 200, { token: own.token, agent: agent ?? null });
      let timer;
      let stop;
      const connected = await Promise.race([
        listening.then(() => true),
        new Promise(resolve => {
          stop = () => resolve(false);
          timer = setTimeout(stop, callMs);
          waits.add(stop);
        })
      ]);
      clearTimeout(timer);
      waits.delete(stop);
      if (!connected || session !== own) {
        if (session === own) {
          session = null;
          if (hadEditor) gone = { reason: "closed", agent };
        }
        return fail("TIMEOUT", "The Editor tab did not connect within 30 s: ask the person to try again");
      }
      log(`paired with an Editor tab${agent ? ` for ${agent}` : ""}`);
      return { ok: true, result: { paired: true, agent: agent ?? null, address: `127.0.0.1:${port}` } };
    },

    /** End the pairing (`editor_disconnect`). */
    disconnect() {
      const paired = Boolean(session);
      end(session, "agent");
      gone = null;
      return { ok: true, result: { disconnected: paired } };
    },

    /**
     * Run an operation in the paired tab: its answer, `TIMEOUT` after 30 s, or `EDITOR_GONE`.
     * @param {string} name
     * @param {object} args
     */
    call(name, args) {
      const own = session;
      if (!own?.stream) return Promise.resolve(goneOutcome());
      const id = (nextCall += 1);
      return new Promise(resolve => {
        const timer = setTimeout(() => {
          own.calls.delete(id);
          resolve(
            fail(
              "TIMEOUT",
              `The Editor did not answer ${name} within ${callMs / 1000} s; it may still finish it: editor_state and ` +
                "history tell what it did"
            )
          );
        }, callMs);
        own.calls.set(id, outcome => {
          clearTimeout(timer);
          resolve(outcome);
        });
        emit("call", { id, name, args });
      });
    },

    /**
     * Stop waiting on the person (the agent's client has gone): a hand-over question is taken back, and a pairing
     * waiting for its tab to listen ends. Calls the paired tab is running go on, and are answered.
     */
    stopWaiting() {
      for (const stop of [...waits]) stop();
    },

    /** Stop: the paired tab is told, the codes waiting are answered, and the port is free again. */
    async close() {
      end(session, "server");
      for (const { response, timer } of waiting.values()) {
        clearTimeout(timer);
        send(response, 503, { error: "stopped" });
      }
      waiting.clear();
      if (!server.listening) return;
      await new Promise(resolve => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    }
  };
}
