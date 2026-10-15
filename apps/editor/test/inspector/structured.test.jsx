// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { newProject } from "@/files/new-project";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

function inspect(doc, canvasId, id, { details = false } = {}) {
  act(() => useView.setState({ inspectorDetails: details }));
  act(() => editorStore.getState().open(doc, { canvasId }));
  const view = render(<Inspector />);
  act(() => inspectorStore.getState().show(id));
  return view;
}

const doc = () => editorStore.getState().doc;
const edge = id => doc().canvases.cnv_open.edges[id];
const field = name => screen.getByText(name, { selector: "span, label" }).parentElement;

/** A flow with an action step and a call step. */
function flow() {
  const project = newProject({ name: "Pay", kind: "flow", names: { state: "Open", end: "Done" } }, new Set());
  return applyBatch(project, [
    { type: "catalog.add", args: { collection: "actions", id: "act_charge", item: { name: "Charge" } } },
    {
      type: "node.add",
      args: { canvas: project.root, id: "nod_charge", node: { kind: "action", action: "act_charge" } }
    },
    { type: "node.add", args: { canvas: project.root, id: "nod_notify", node: { kind: "call", name: "Notify" } } }
  ]).doc;
}

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("conditions", () => {
  it("guards a transition in plain words, with a guard created by name and an expression", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "edg_createdAwaitingPayment");
    const only = field("Only if");
    await user.type(within(only).getByRole("textbox", { name: "In plain words" }), "the payer is known");
    expect(edge("edg_createdAwaitingPayment").guard).toEqual({ text: "the payer is known" });
    await user.click(within(only).getByRole("button", { name: "Guard" }));
    await user.keyboard("Payer known{Enter}");
    expect(doc().catalog.guards.grd_payerKnown).toEqual({ name: "Payer known" });
    expect(edge("edg_createdAwaitingPayment").guard).toEqual({ text: "the payer is known", guard: "grd_payerKnown" });
    await user.click(within(only).getByRole("button", { name: "Add an expression" }));
    const expression = within(only).getByRole("textbox", { name: "Expression (JSON Logic)" });
    fireEvent.change(expression, { target: { value: '{ "==": [{ "var": "context.payer" }, true] }' } });
    fireEvent.blur(expression);
    expect(edge("edg_createdAwaitingPayment").guard.expr).toEqual({ "==": [{ var: "context.payer" }, true] });
  });

  it("leaves the condition out when everything in it is emptied", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "edg_createdAwaitingPayment");
    const words = within(field("Only if")).getByRole("textbox", { name: "In plain words" });
    await user.type(words, "x");
    await user.clear(words);
    expect(edge("edg_createdAwaitingPayment")).not.toHaveProperty("guard");
  });
});

describe("effects", () => {
  it("adds what a state does on entry — an action created by name, an event emitted — and orders them", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "nod_created", { details: true });
    const entry = field("On entry");
    await user.click(within(entry).getByRole("button", { name: "Do an action" }));
    await user.keyboard("Issue instructions{Enter}");
    expect(doc().catalog.actions.act_issueInstructions).toEqual({ name: "Issue instructions" });
    await user.click(within(entry).getByRole("button", { name: "Emit an event" }));
    const event = Object.values(doc().catalog.events)[0].name;
    await user.keyboard(event);
    await user.click(screen.getByRole("option", { name: new RegExp(event.replace(".", "\\.")) }));
    const node = () => doc().canvases.cnv_open.nodes.nod_created;
    expect(node().onEntry.map(effect => Object.keys(effect)[0])).toEqual(["action", "emit"]);
    await user.click(within(entry).getAllByRole("button", { name: "Move up" })[0]);
    expect(node().onEntry.map(effect => Object.keys(effect)[0])).toEqual(["emit", "action"]);
    await user.click(within(entry).getAllByRole("button", { name: "Take out" })[0]);
    expect(node().onEntry).toEqual([{ action: "act_issueInstructions" }]);
  });

  it("lets values that cannot be read be discarded once the field is left, bringing the ways to add back", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "nod_created", { details: true });
    const entry = field("On entry");
    await user.click(within(entry).getByRole("button", { name: "Set a value" }));
    const values = within(entry).getByRole("textbox", { name: "Values" });
    fireEvent.change(values, { target: { value: "{" } });
    fireEvent.blur(values);
    expect(screen.getByRole("alert").textContent).toContain("JSON");
    await user.click(within(entry).getByRole("button", { name: "Discard these values" }));
    expect(within(entry).queryByRole("textbox", { name: "Values" })).toBeNull();
    expect(within(entry).getByRole("button", { name: "Set a value" })).toBeTruthy();
    expect(doc().canvases.cnv_open.nodes.nod_created).not.toHaveProperty("onEntry");
  });

  it("sets values only once they are written, leaving the document as it was until then", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "nod_created", { details: true });
    const node = () => doc().canvases.cnv_open.nodes.nod_created;
    const entry = field("On entry");
    await user.click(within(entry).getByRole("button", { name: "Set a value" }));
    expect(node()).not.toHaveProperty("onEntry");
    const values = within(entry).getByRole("textbox", { name: "Values" });
    expect(document.activeElement).toBe(values);
    await user.tab();
    expect(node()).not.toHaveProperty("onEntry");
    expect(within(entry).queryByRole("textbox", { name: "Values" })).toBeNull();

    await user.click(within(entry).getByRole("button", { name: "Set a value" }));
    fireEvent.change(within(entry).getByRole("textbox", { name: "Values" }), {
      target: { value: '{ "context.lockedAt": null }' }
    });
    fireEvent.blur(within(entry).getByRole("textbox", { name: "Values" }));
    expect(node().onEntry).toEqual([{ assign: { "context.lockedAt": null } }]);

    // Values Core refuses (a key outside the context) stay where they were written, with the reason.
    await user.click(within(entry).getByRole("button", { name: "Set a value" }));
    const refused = within(entry).getAllByRole("textbox", { name: "Values" }).at(-1);
    fireEvent.change(refused, { target: { value: '{ "lockedAt": null }' } });
    fireEvent.blur(refused);
    expect(screen.getByRole("alert").textContent).toContain("That would leave the document invalid.");
    // Core's own words stay English in every interface language, and say so (WCAG 3.1.2).
    expect(screen.getByRole("alert").querySelector('[lang="en"]').textContent).not.toBe("");
    expect(within(entry).getAllByRole("textbox", { name: "Values" }).at(-1).value).toBe('{ "lockedAt": null }');
    expect(node().onEntry).toHaveLength(1);
  });

  it("gives an action its arguments as an object, and says so when what is written is not one", () => {
    inspect(readExample("get-paid-as-built"), "cnv_open", "nod_created", { details: true });
    act(() =>
      editorStore.getState().dispatch(
        [
          { type: "catalog.add", args: { collection: "actions", id: "act_lock", item: { name: "Lock" } } },
          { type: "node.update", args: { id: "nod_created", set: { onEntry: [{ action: "act_lock" }] } } }
        ],
        { label: "Set up" }
      )
    );
    const args = within(field("On entry")).getByRole("textbox", { name: "Arguments" });
    fireEvent.change(args, { target: { value: "[1]" } });
    fireEvent.blur(args);
    expect(screen.getByRole("alert").textContent).toContain("Write an object");
    fireEvent.change(args, { target: { value: '{ "minutes": 30 }' } });
    fireEvent.blur(args);
    expect(doc().canvases.cnv_open.nodes.nod_created.onEntry).toEqual([{ action: "act_lock", args: { minutes: 30 } }]);
  });
});

describe("retries, periods, requests, responses and done", () => {
  it("retries a transition and limits when it is in effect", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "edg_createdAwaitingPayment", { details: true });
    const retries = field("Retries");
    await user.type(within(retries).getByRole("textbox", { name: "Attempts" }), "3{Enter}");
    await user.type(within(retries).getByRole("textbox", { name: "First wait" }), "1 min{Enter}");
    await user.type(within(retries).getByRole("textbox", { name: "Then × each time" }), "2{Enter}");
    expect(edge("edg_createdAwaitingPayment").retry).toEqual({
      maxAttempts: 3,
      backoff: { initial: "PT1M", factor: 2 }
    });
    const effect = field("In effect");
    await user.type(within(effect).getByRole("textbox", { name: "From" }), "2026-01-01{Enter}");
    expect(edge("edg_createdAwaitingPayment").effective).toEqual({ from: "2026-01-01" });
    await user.type(within(effect).getByRole("textbox", { name: "Until" }), "soon{Enter}");
    expect(screen.getByRole("alert").textContent).toContain("That would leave the document invalid.");
    expect(edge("edg_createdAwaitingPayment").effective).toEqual({ from: "2026-01-01" });
  });

  it("keeps a part it cannot read when the field is left, and says why", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "edg_createdAwaitingPayment", { details: true });
    const attempts = within(field("Retries")).getByRole("textbox", { name: "Attempts" });
    await user.type(attempts, "three");
    await user.tab();
    expect(attempts.value).toBe("three");
    expect(screen.getByRole("alert").textContent).toContain("That cannot be read.");
    expect(edge("edg_createdAwaitingPayment")).not.toHaveProperty("retry");
  });

  it("sets a call's own request, and an endpoint's responses", async () => {
    const user = userEvent.setup();
    const source = flow();
    const first = inspect(source, source.root, "nod_notify", { details: true });
    const request = field("Request");
    await user.type(within(request).getByRole("textbox", { name: "URL" }), "https://example.com/hooks{Enter}");
    await user.selectOptions(within(request).getByRole("combobox", { name: "Method" }), "POST");
    expect(doc().canvases[source.root].nodes.nod_notify.request).toEqual({
      method: "POST",
      url: "https://example.com/hooks"
    });

    first.unmount();
    const payments = readExample("payments");
    const endpoint = Object.keys(payments.catalog.endpoints)[0];
    inspect(payments, "cnv_runtime", endpoint, { details: true });
    await user.type(screen.getByRole("textbox", { name: "Add a status code: 201, 4XX" }), "4xx{Enter}");
    expect(doc().catalog.endpoints[endpoint].responses["4XX"]).toBeNull();
  });

  it("makes a transition wait until what is inside the state it leaves is done, or one of its regions", async () => {
    const user = userEvent.setup();
    const source = applyBatch(readExample("get-paid-as-built"), [
      { type: "region.add", args: { canvas: "cnv_open", id: "rgn_payer", name: "Payer" } },
      { type: "region.add", args: { canvas: "cnv_open", id: "rgn_bank", name: "Bank" } }
    ]).doc;
    inspect(source, "cnv_transaction", "edg_openExpired", { details: true });
    const done = screen.getByRole("radiogroup", { name: "When done" });
    await user.click(within(done).getByRole("radio", { name: "When everything inside is done" }));
    expect(doc().canvases.cnv_transaction.edges.edg_openExpired.done).toBe(true);
    await user.click(within(done).getByRole("radio", { name: "When Bank is done" }));
    expect(doc().canvases.cnv_transaction.edges.edg_openExpired.done).toBe("rgn_bank");
    await user.click(within(done).getByRole("radio", { name: "No" }));
    expect(doc().canvases.cnv_transaction.edges.edg_openExpired).not.toHaveProperty("done");
  });
});
