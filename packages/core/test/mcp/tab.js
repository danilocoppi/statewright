// A fake Editor tab for the bridge's tests (AI interface spec §10: "against a fake tab"): it registers a code, listens
// for calls as the Editor does — server-sent events read through fetch — and answers them.

/** The events of a server-sent stream, as `{ event, data }`. */
export async function* eventsOf(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const fields = Object.fromEntries(
        block
          .split("\n")
          .filter(line => line && !line.startsWith(":"))
          .map(line => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trim()])
      );
      if (fields.event) yield { event: fields.event, data: JSON.parse(fields.data) };
    }
  }
}

/**
 * A tab of the Editor at `origin`, talking to the bridge at `address`.
 * @param {string} address `127.0.0.1:<port>`
 * @param {{ origin?: string, answer?: (call: { name: string, args: object }) => object | Promise<object> }} [options]
 *   `answer`: the outcome of each call (the default answers `{ ok: true, result: { name } }`).
 */
export function fakeTab(address, { origin = "http://localhost:5173", answer } = {}) {
  const base = `http://${address}`;
  const stopped = new AbortController();
  let token = null;
  const seen = [];
  const headers = () => ({
    origin,
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {})
  });
  const post = (path, body) =>
    fetch(`${base}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  let closedStream;
  const tab = {
    seen,
    get token() {
      return token;
    },
    /** Register a code and wait: `{ status, body }` once paired (200), expired (410) or refused. */
    async register(code) {
      const response = await fetch(`${base}/pair`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ code }),
        signal: stopped.signal
      });
      const body = await response.json().catch(() => null);
      if (response.status === 200) token = body.token;
      return { status: response.status, body };
    },
    /** Listen for calls and answer them; resolves when the stream opens. `closed` resolves when it ends. */
    async listen() {
      const response = await fetch(`${base}/calls`, { headers: headers(), signal: stopped.signal });
      if (response.status !== 200) return response.status;
      closedStream = (async () => {
        try {
          for await (const message of eventsOf(response.body)) {
            seen.push(message);
            if (message.event === "call") {
              const { id, name, args } = message.data;
              const outcome = answer ? await answer({ name, args }) : { ok: true, result: { name } };
              await post("/results", { id, outcome });
            }
          }
        } catch {
          // The tab went away.
        }
      })();
      return 200;
    },
    closed: () => closedStream,
    confirm: (id, accept) => post("/confirm", { id, accept }),
    /** Write to the agent (collaboration spec §3.2): `{ status, body }`. */
    async send(body) {
      const response = await post("/messages", body);
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    /** The events of a kind this tab has seen, their data in order. */
    events: kind => seen.filter(message => message.event === kind).map(message => message.data),
    disconnect: () => fetch(`${base}/pair`, { method: "DELETE", headers: headers() }),
    /** Close the tab: every request it has open ends. */
    close: () => stopped.abort()
  };
  return tab;
}
