// @vitest-environment jsdom
// Connect an AI…, the island's agent and handing over to another tab (AI interface spec §7.4), on a pairing whose
// server the test plays: it answers the tab's registration, opens its stream of calls and sends what the bridge sends.
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { busy } from "@/agent/busy";
import { CONNECTED_MS, ConnectDialog } from "@/agent/ConnectDialog";
import { sayEnded } from "@/agent/connection";
import { HandOverDialog } from "@/agent/HandOverDialog";
import { PairedBadge } from "@/agent/PairedBadge";
import { RETRY_MS, createPairing } from "@/agent/pairing";
import { editorCommands } from "@/features/editor/commands";
import i18n from "@/i18n";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { readExample } from "../fixtures.js";

/** The bridge, as the test plays it: what the tab asked, and the answers the test gives. */
function playedServer() {
  const waiting = [];
  const requests = [];
  let stream = null;
  const encoder = new TextEncoder();
  const fetch = (url, init = {}) => {
    const { host, pathname } = new URL(url);
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ method, host, path: pathname, body });
    if (method === "POST" && pathname === "/pair") {
      return new Promise((resolve, reject) => {
        waiting.push({ resolve, reject, code: body.code });
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    }
    if (pathname === "/calls") {
      const body = new ReadableStream({ start: controller => (stream = controller) });
      return Promise.resolve(new Response(body, { status: 200 }));
    }
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  const reply = (status, body) => waiting.pop().resolve(new Response(JSON.stringify(body), { status }));
  return {
    fetch,
    requests,
    code: () => waiting.at(-1)?.code,
    pair: agent => reply(200, { token: "token", agent }),
    refuse: status => reply(status, { error: "no" }),
    unreachable: () => waiting.pop().reject(new TypeError("Failed to fetch")),
    send: (event, data) => stream.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)),
    end: () => stream.close()
  };
}

/** A pairing on the played server, as the Editor's own is on the real one. */
function pairingOn(server) {
  const storage = new Map();
  return createPairing({
    api: () => ({ hello() {}, call: async () => ({ ok: true, result: {} }) }),
    fetch: server.fetch,
    storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  });
}

/** Let the pairing's promises settle. */
const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));

const opened = [];
afterEach(() => {
  for (const pairing of opened.splice(0)) act(() => (pairing.disconnect(), pairing.cancel()));
  act(() => {
    useToastStore.setState({ items: [] });
    editorStore.getState().close();
  });
  vi.useRealTimers();
});

/** The dialog open on a pairing of the played server. */
async function connectDialog() {
  const server = playedServer();
  const pairing = pairingOn(server);
  opened.push(pairing);
  const onClose = vi.fn();
  render(<ConnectDialog pairing={pairing} onClose={onClose} />);
  await settle();
  return { server, pairing, onClose };
}

describe("Connect an AI… (AI interface spec §7.4)", () => {
  it("shows the code to give the agent, the address it looks at, what pairing allows and the browser's question", async () => {
    const { server } = await connectDialog();
    const code = screen.getByTestId("connect-code").textContent;
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{3}-[2-9A-HJKMNP-Z]{3}$/);
    expect(server.code()).toBe(code);
    expect(server.requests[0]).toMatchObject({ method: "POST", host: "127.0.0.1:47615", path: "/pair" });
    expect(screen.getByRole("dialog", { name: "Connect an AI" })).toBeTruthy();
    expect(screen.getByTestId("connect-status").textContent).toBe("Waiting for the agent…");
    expect(screen.getByText("Valid for 5 minutes.")).toBeTruthy();
    expect(screen.getByTestId("connect-address").value).toBe("127.0.0.1:47615");
    expect(screen.getByText(/^The agent reads and changes this project\./)).toBeTruthy();
    expect(screen.getByText(/^Your browser may ask to let this page reach your local network/)).toBeTruthy();

    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await settle();
    expect(writeText).toHaveBeenCalledWith(
      `Pair with my Statewright Editor: call editor_pair with the code ${code}. The Editor reaches the statewright ` +
        "MCP server at 127.0.0.1:47615; if it is not running there, start it with: npx statewright mcp --port 47615"
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("says when the agent has connected, then gives the page back to its calls", async () => {
    const { server, onClose } = await connectDialog();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    server.pair("claude-code");
    // The tab's answer and its stream arrive as promises settle, without waiting for any timer.
    await act(async () => {
      for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
    });
    expect(screen.getByTestId("connect-status").textContent).toBe("Connected to claude-code");
    expect(screen.queryByTestId("connect-code")).toBe(null);
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(CONNECTED_MS - 1));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the code to copy while nothing answers, and looks again by itself", async () => {
    const { server } = await connectDialog();
    const first = server.code();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    server.unreachable();
    await act(async () => {
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
    });
    expect(screen.getByTestId("connect-status").textContent).toBe("Nothing answers at 127.0.0.1:47615 yet.");
    expect(screen.getByText(/^Start statewright mcp in your agent/)).toBeTruthy();
    expect(screen.getByTestId("connect-code").textContent).toBe(first);
    expect(screen.getByTestId("connect-code").className).not.toContain("line-through");
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBe(null);
    const asked = server.requests.length;
    act(() => vi.advanceTimersByTime(RETRY_MS));
    expect(server.requests.length).toBe(asked + 1);
    expect(server.code()).toBe(first);
  });

  it("offers Update once another address is typed, and looks there with the same code", async () => {
    const { server } = await connectDialog();
    const first = server.code();
    expect(screen.queryByRole("button", { name: "Update" })).toBe(null);
    fireEvent.change(screen.getByTestId("connect-address"), { target: { value: "http://127.0.0.1:47620/" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await settle();
    expect(server.requests.at(-1)).toMatchObject({ method: "POST", host: "127.0.0.1:47620", path: "/pair" });
    expect(server.code()).toBe(first);
    expect(screen.getByTestId("connect-code").textContent).toBe(first);
    expect(screen.queryByRole("button", { name: "Update" })).toBe(null);

    server.refuse(403);
    await settle();
    expect(screen.getByTestId("connect-status").textContent).toBe(
      "The server at 127.0.0.1:47620 does not accept this Editor."
    );
    expect(screen.getByText(`Start it with --origin ${location.origin}; the Editor keeps looking.`)).toBeTruthy();
  });

  it("says when the code expired, and gives a new one", async () => {
    const { server } = await connectDialog();
    server.refuse(410);
    await settle();
    expect(screen.getByTestId("connect-status").textContent).toBe("This code expired before an agent used it.");
    expect(screen.getByTestId("connect-code").className).toContain("line-through");
    fireEvent.click(screen.getByRole("button", { name: "New code" }));
    await settle();
    expect(screen.getByTestId("connect-status").textContent).toBe("Waiting for the agent…");
  });

  it("lets the agent's first calls through while it says the agent has connected", async () => {
    const { server } = await connectDialog();
    server.pair("claude-code");
    await vi.waitFor(() => expect(screen.getByTestId("connect-status").textContent).toBe("Connected to claude-code"));
    expect(() => busy()).not.toThrow();
  });

  it("looks for the server on this computer only", async () => {
    const { server } = await connectDialog();
    server.unreachable();
    await settle();
    fireEvent.change(screen.getByTestId("connect-address"), { target: { value: "evil.example:80" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await settle();
    expect(screen.getByTestId("connect-status").textContent).toBe("evil.example:80 is not on this computer.");
    expect(screen.getByText("Type 127.0.0.1 or localhost with the port the server gives.")).toBeTruthy();
    expect(server.requests.filter(request => request.host === "evil.example:80")).toEqual([]);
  });

  it("shows a new code when the pairing ends while it is open", async () => {
    const { server } = await connectDialog();
    server.pair("claude-code");
    await vi.waitFor(() => expect(screen.getByTestId("connect-status").textContent).toBe("Connected to claude-code"));
    act(() => server.end());
    await vi.waitFor(() => expect(screen.getByTestId("connect-status").textContent).toBe("Waiting for the agent…"));
    expect(screen.getByTestId("connect-code").textContent).toBe(server.code());
    expect(server.requests.at(-1)).toMatchObject({ method: "POST", path: "/pair" });
  });

  it("closes without a new code when the person disconnects from it", async () => {
    const server = playedServer();
    const pairing = pairingOn(server);
    opened.push(pairing);
    function Page() {
      const [open, setOpen] = useState(true);
      return open && <ConnectDialog pairing={pairing} onClose={() => setOpen(false)} />;
    }
    render(<Page />);
    await settle();
    server.pair("claude-code");
    await vi.waitFor(() => expect(pairing.store.getState().status).toBe("connected"));
    const registered = server.requests.filter(request => request.path === "/pair" && request.method === "POST").length;
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    await settle();
    expect(screen.queryByTestId("connect-dialog")).toBe(null);
    expect(pairing.store.getState().status).toBe("off");
    expect(server.requests.filter(request => request.path === "/pair" && request.method === "POST")).toHaveLength(
      registered
    );
  });

  it("withdraws the code when the person closes it before an agent comes", async () => {
    const { pairing, onClose } = await connectDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await settle();
    expect(onClose).toHaveBeenCalledOnce();
    expect(pairing.store.getState()).toMatchObject({ status: "off", code: null });
  });

  it("is among the commands (⌘K)", () => {
    act(() => editorStore.getState().open(readExample("payments")));
    const onConnect = vi.fn();
    const commands = editorCommands({ t: i18n.t, mac: true, repository: {}, onLevels() {}, onConnect });
    const connect = commands.find(command => command.id === "connect");
    expect(connect.name).toBe("Connect an AI…");
    connect.run();
    expect(onConnect).toHaveBeenCalledOnce();
  });
});

describe("the agent paired, in the actions island (AI interface spec §7.4)", () => {
  it("shows the agent's name beside the run's accent dot, with Disconnect", async () => {
    const server = playedServer();
    const pairing = pairingOn(server);
    opened.push(pairing);
    render(<PairedBadge pairing={pairing} />);
    expect(screen.queryByTestId("actions-agent")).toBe(null);
    pairing.begin();
    await settle();
    server.pair("claude-code");
    await vi.waitFor(() => expect(screen.getByTestId("actions-agent").textContent).toContain("claude-code"));
    expect(screen.getByText("Paired with claude-code")).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.getByTestId("actions-agent")).toBeTruthy();
    fireEvent.click(screen.getByTestId("actions-disconnect"));
    expect(screen.queryByTestId("actions-agent")).toBe(null);
    expect(server.requests.at(-1)).toMatchObject({ method: "DELETE", path: "/pair" });
  });

  it("tells the person why the pairing ended, unless they ended it", () => {
    sayEnded("person", "claude-code");
    expect(useToastStore.getState().items).toEqual([]);
    sayEnded("agent", "claude-code");
    sayEnded("replaced", null);
    sayEnded("server", "claude-code");
    expect(useToastStore.getState().items.map(item => item.message)).toEqual([
      "claude-code disconnected.",
      "an agent now works in another tab.",
      "The server stopped: claude-code is disconnected."
    ]);
  });
});

describe("handing over to another tab (AI interface spec §6)", () => {
  it("asks the person, and hands over only when they agree", async () => {
    const server = playedServer();
    const pairing = pairingOn(server);
    opened.push(pairing);
    render(<HandOverDialog pairing={pairing} />);
    pairing.begin();
    await settle();
    server.pair("claude-code");
    await vi.waitFor(() => expect(pairing.store.getState().status).toBe("connected"));

    act(() => server.send("confirm", { id: "first", agent: "codex" }));
    const dialog = await screen.findByRole("dialog", { name: "Hand over to another tab?" });
    expect(dialog.textContent).toContain("codex asks to work in another Statewright tab.");
    fireEvent.click(screen.getByRole("button", { name: "Keep here" }));
    await settle();
    expect(server.requests.at(-1)).toMatchObject({ path: "/confirm", body: { id: "first", accept: false } });
    expect(screen.queryByRole("dialog")).toBe(null);

    act(() => server.send("confirm", { id: "second", agent: "codex" }));
    fireEvent.click(await screen.findByRole("button", { name: "Hand over" }));
    await settle();
    expect(server.requests.at(-1)).toMatchObject({ path: "/confirm", body: { id: "second", accept: true } });
  });
});
