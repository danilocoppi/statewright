// Plan E5 (spec §11: "screenshots of each example level in light and dark — bundled fonts make them stable"): every
// level of the two examples as the editor shows it, in both themes, and a box at the right edge with the inspector
// open beside it, as it opens and widened from its edge. Plan S3 (simulator spec §10: "visual snapshots of mockups
// 02–06's states"): the simulation's states of mockups 01 to 04; plan S4, the stage (mockup 05) and a scenario's page
// (mockup 06); plan D1, the documentation page's cover and a level's part; plan A3, an agent's toast and note (AI
// interface spec §7.3); plan A4, Connect an AI… (§7.4); a finding badge's details, beside it; a Problems marker's
// details, beside it; the level's kind under the tool dock, its menu open; the support popover above its badge; and
// plan M2, a machine's roles; plan M3, a lifecycle framed on a system; plan M4, a flow's roles; plan M5, a mixed level.
// After a deliberate change of look, update the pictures with
// `npm run e2e -w @statewright/editor -- e2e/visual.spec.js --update-snapshots=all` and look at every one before
// committing it.
import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { getPaidWithFindings } from "./fixtures/findings.js";
import { paymentsWithProblems } from "./fixtures/problems.js";
import { startMcp } from "./mcp.js";

const EXAMPLES = [
  {
    button: /^Payments/,
    project: "prj_payments",
    levels: ["cnv_runtime", "cnv_lifecycle", "cnv_crossBorderSend", "cnv_complianceHold", "cnv_expiryClock"]
  },
  { button: /^Get paid/, project: "prj_getPaid", levels: ["cnv_transaction", "cnv_open"] }
];

/** An order's lifecycle with the customer who pays, the payment service that charges, and the charge's steps. */
const ROLES = canvas => [
  { type: "catalog.add", args: { collection: "events", id: "evt_pay", item: { name: "order.pay" } } },
  {
    type: "catalog.add",
    args: { collection: "parties", id: "pty_customer", item: { kind: "human", name: "Customer" } }
  },
  {
    type: "catalog.add",
    args: { collection: "parties", id: "pty_payments", item: { kind: "system", name: "Payments" } }
  },
  {
    type: "catalog.add",
    args: { collection: "actions", id: "act_charge", item: { name: "Charge card", party: "pty_payments" } }
  },
  { type: "canvas.create", args: { kind: "flow", name: "Charge card", owner: "act_charge", id: "cnv_charge" } },
  { type: "node.add", args: { canvas: "cnv_charge", id: "nod_chargeStart", node: { kind: "start" } } },
  { type: "node.add", args: { canvas: "cnv_charge", id: "nod_charged", node: { kind: "end", name: "Charged" } } },
  {
    type: "edge.add",
    args: { canvas: "cnv_charge", id: "edg_charge", edge: { from: "nod_chargeStart", to: "nod_charged" } }
  },
  { type: "node.add", args: { canvas, id: "nod_paid", node: { kind: "state", name: "Paid", terminal: true } } },
  { type: "node.add", args: { canvas, id: "nod_customer", node: { kind: "participant", party: "pty_customer" } } },
  { type: "node.add", args: { canvas, id: "nod_service", node: { kind: "participant", party: "pty_payments" } } },
  { type: "node.add", args: { canvas, id: "nod_steps", node: { kind: "steps", action: "act_charge" } } },
  {
    type: "edge.add",
    args: {
      canvas,
      id: "edg_pay",
      edge: {
        from: "nod_firstState",
        to: "nod_paid",
        on: ["evt_pay"],
        by: "pty_customer",
        actions: [{ action: "act_charge" }]
      }
    }
  }
];

/** A shop whose Orders store shows the order's lifecycle as a frame, driven by the customer's Web and by Payments. */
const LIFECYCLE = shop => [
  {
    type: "catalog.add",
    args: { collection: "parties", id: "pty_customer", item: { kind: "human", name: "Customer" } }
  },
  {
    type: "catalog.add",
    args: { collection: "parties", id: "pty_payments", item: { kind: "system", name: "Payments" } }
  },
  { type: "catalog.add", args: { collection: "events", id: "evt_placed", item: { name: "order.placed" } } },
  { type: "catalog.add", args: { collection: "events", id: "evt_paid", item: { name: "payment.captured" } } },
  {
    type: "node.add",
    args: { canvas: shop, id: "nod_web", node: { kind: "service", name: "Web", party: "pty_customer" } }
  },
  {
    type: "node.add",
    args: { canvas: shop, id: "nod_payments", node: { kind: "service", name: "Payments", party: "pty_payments" } }
  },
  { type: "node.add", args: { canvas: shop, id: "nod_orders", node: { kind: "store", name: "Orders" } } },
  { type: "canvas.create", args: { kind: "machine", name: "Order", owner: "nod_orders", id: "cnv_order" } },
  { type: "node.add", args: { canvas: "cnv_order", id: "nod_init", node: { kind: "initial" } } },
  { type: "node.add", args: { canvas: "cnv_order", id: "nod_created", node: { kind: "state", name: "created" } } },
  { type: "node.add", args: { canvas: "cnv_order", id: "nod_charging", node: { kind: "state", name: "charging" } } },
  {
    type: "node.add",
    args: {
      canvas: "cnv_order",
      id: "nod_paid",
      node: { kind: "state", name: "paid", terminal: true, outcome: "success" }
    }
  },
  { type: "edge.add", args: { canvas: "cnv_order", id: "edg_start", edge: { from: "nod_init", to: "nod_created" } } },
  {
    type: "edge.add",
    args: {
      canvas: "cnv_order",
      id: "edg_placed",
      edge: { from: "nod_created", to: "nod_charging", on: ["evt_placed"], by: "pty_customer" }
    }
  },
  {
    type: "edge.add",
    args: {
      canvas: "cnv_order",
      id: "edg_paid",
      edge: { from: "nod_charging", to: "nod_paid", on: ["evt_paid"], by: "pty_payments" }
    }
  },
  { type: "layout.node.set", args: { canvas: shop, id: "nod_orders", x: 0, y: 0, display: "frame" } }
];

/** A checkout flow in two lanes, Shop and Payments; its call performed by Payments, its emit leading to `paid`. */
const FLOW_ROLES = flow => [
  {
    type: "catalog.add",
    args: { collection: "parties", id: "pty_customer", item: { kind: "human", name: "Customer" } }
  },
  {
    type: "catalog.add",
    args: { collection: "parties", id: "pty_payments", item: { kind: "system", name: "Payments" } }
  },
  { type: "catalog.add", args: { collection: "events", id: "evt_paid", item: { name: "order.paid" } } },
  {
    type: "catalog.add",
    args: { collection: "endpoints", id: "ept_pay", item: { name: "Pay", method: "POST", path: "/pay" } }
  },
  { type: "canvas.create", args: { kind: "machine", name: "Order", id: "cnv_life" } },
  { type: "node.add", args: { canvas: "cnv_life", id: "nod_open", node: { kind: "state", name: "open" } } },
  {
    type: "node.add",
    args: { canvas: "cnv_life", id: "nod_paid", node: { kind: "state", name: "paid", outcome: "success" } }
  },
  {
    type: "edge.add",
    args: { canvas: "cnv_life", id: "edg_paid", edge: { from: "nod_open", to: "nod_paid", on: ["evt_paid"] } }
  },
  {
    type: "node.add",
    args: { canvas: flow, id: "nod_call", node: { kind: "call", endpoint: "ept_pay", party: "pty_payments" } }
  },
  { type: "node.add", args: { canvas: flow, id: "nod_tell", node: { kind: "emit", event: "evt_paid" } } },
  {
    type: "node.add",
    args: { canvas: flow, id: "nod_payments", node: { kind: "participant", party: "pty_payments" } }
  },
  { type: "node.add", args: { canvas: flow, id: "nod_paidHere", node: { kind: "state", target: "nod_paid" } } },
  { type: "edge.remove", args: { id: "edg_startEnd" } },
  { type: "edge.add", args: { canvas: flow, id: "edg_toCall", edge: { from: "nod_start", to: "nod_call" } } },
  { type: "edge.add", args: { canvas: flow, id: "edg_toTell", edge: { from: "nod_call", to: "nod_tell" } } },
  { type: "edge.add", args: { canvas: flow, id: "edg_toEnd", edge: { from: "nod_tell", to: "nod_end" } } },
  {
    type: "lane.add",
    args: {
      id: "lne_shop",
      lane: { canvas: flow, label: "Shop", nodes: ["nod_start", "nod_tell", "nod_end"], party: "pty_customer" }
    }
  },
  {
    type: "lane.add",
    args: { id: "lne_payments", lane: { canvas: flow, label: "Payments", nodes: ["nod_call"], party: "pty_payments" } }
  }
];

/** One mixed level: Order's states, the charge's steps and the shop's boxes, with who sends and what leads where. */
const MIXED = root => [
  {
    type: "catalog.add",
    args: { collection: "parties", id: "pty_customer", item: { kind: "human", name: "Customer" } }
  },
  { type: "catalog.add", args: { collection: "events", id: "evt_pay", item: { name: "order.pay" } } },
  {
    type: "catalog.add",
    args: { collection: "endpoints", id: "ept_pay", item: { name: "Pay", method: "POST", path: "/pay" } }
  },
  { type: "node.add", args: { canvas: root, id: "nod_init", node: { kind: "initial" } } },
  { type: "node.add", args: { canvas: root, id: "nod_open", node: { kind: "state", name: "open" } } },
  {
    type: "node.add",
    args: { canvas: root, id: "nod_paid", node: { kind: "state", name: "paid", outcome: "success", terminal: true } }
  },
  {
    type: "edge.add",
    args: { canvas: root, id: "edg_init", edge: { from: "nod_init", to: "nod_open", kind: "transition" } }
  },
  {
    type: "edge.add",
    args: {
      canvas: root,
      id: "edg_pay",
      edge: { from: "nod_open", to: "nod_paid", kind: "transition", on: ["evt_pay"], by: "pty_customer" }
    }
  },
  { type: "node.add", args: { canvas: root, id: "nod_start", node: { kind: "start" } } },
  { type: "node.add", args: { canvas: root, id: "nod_call", node: { kind: "call", endpoint: "ept_pay" } } },
  { type: "node.add", args: { canvas: root, id: "nod_tell", node: { kind: "emit", event: "evt_pay" } } },
  { type: "node.add", args: { canvas: root, id: "nod_end", node: { kind: "end" } } },
  { type: "edge.add", args: { canvas: root, id: "edg_s1", edge: { from: "nod_start", to: "nod_call" } } },
  { type: "edge.add", args: { canvas: root, id: "edg_s2", edge: { from: "nod_call", to: "nod_tell" } } },
  { type: "edge.add", args: { canvas: root, id: "edg_s3", edge: { from: "nod_tell", to: "nod_end" } } },
  {
    type: "node.add",
    args: { canvas: root, id: "nod_web", node: { kind: "service", name: "Web", party: "pty_customer" } }
  },
  { type: "node.add", args: { canvas: root, id: "nod_db", node: { kind: "store", name: "Orders" } } },
  { type: "edge.add", args: { canvas: root, id: "edg_db", edge: { from: "nod_web", to: "nod_db", kind: "data" } } },
  { type: "node.add", args: { canvas: root, id: "nod_paidHere", node: { kind: "state", target: "nod_paid" } } }
];

/** Wait until the level is drawn and still: arranged and stored, its fonts in, its view no longer moving. */
async function settled(page) {
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  await expect(page.getByText("Saving…")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const viewport = page.locator(".react-flow__viewport");
  let last = null;
  await expect
    .poll(
      async () => {
        const now = await viewport.getAttribute("style");
        const still = now === last;
        last = now;
        return still;
      },
      { intervals: [150] }
    )
    .toBe(true);
}

for (const theme of ["light", "dark"]) {
  test.describe(`in the ${theme} theme`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

    for (const example of EXAMPLES) {
      test(`shows every level of ${example.project} as it did`, async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: example.button }).click();
        await page.waitForURL(new RegExp(`/p/${example.project}$`));
        // Every level is arranged and stored once; then each is opened afresh, as a person finds it.
        for (const level of example.levels) {
          await page.goto(`/p/${example.project}/${level}`);
          await settled(page);
        }
        for (const level of example.levels) {
          await page.goto(`/p/${example.project}/${level}`);
          await settled(page);
          await expect(page).toHaveScreenshot(`${example.project}-${level}-${theme}.png`, { maxDiffPixelRatio: 0.001 });
        }
      });
    }

    test("shows the simulation as its mockups do: the Start panel, a run, its levels, a question", async ({ page }) => {
      // The clock starts on the hour of a fixed now; the level's arrangement is stored first, as above.
      await page.clock.setFixedTime(new Date("2026-01-05T09:12:00Z"));
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      for (const level of ["cnv_crossBorderSend", "cnv_complianceHold", "cnv_expiryClock", "cnv_lifecycle"]) {
        await page.goto(`/p/prj_payments/${level}`);
        await settled(page);
      }
      const panel = page.getByRole("dialog", { name: "Simulation" });
      const take = name => panel.getByRole("button", { name: new RegExp(`^${name.replace(/\./g, "\\.")}`) }).click();
      // The pointer rests away from the panel and the level, so no row is shown under it.
      const shot = async name => {
        await page.mouse.move(8, 892);
        await settled(page);
        await expect(page).toHaveScreenshot(`simulate-${name}-${theme}.png`, { maxDiffPixelRatio: 0.001 });
      };

      // Mockup 02: the Start panel, its scenarios and the deadline typed in.
      await page.getByRole("button", { name: "Simulate" }).click();
      await panel.getByLabel(/^expiresAt/).fill("2026-01-15 09:00");
      await shot("start");

      // Mockup 04: the run across the lifecycle's regions, each box with the state active inside it.
      await panel.getByRole("button", { name: "Start" }).click();
      await shot("levels");

      // Mockup 01: down in the expiry clock, three steps taken: paused, two days, running again.
      await page.locator('.react-flow__node[data-id="nod_expiryClock"]').getByText("running").click();
      await expect(page).toHaveURL(/\/cnv_expiryClock$/);
      await take("verify.started");
      await panel.getByRole("button", { name: "Let time pass…" }).click();
      await panel.getByLabel("Or a duration, or a date and time").fill("2 days");
      await panel.getByRole("button", { name: "Wait" }).click();
      await take("verify.ended");
      await shot("run");

      // Mockup 03: in the cross-border send, the question payout.completed asks, numbered on the canvas.
      await page.getByRole("link", { name: "Lifecycle engine" }).click();
      await page.locator('.react-flow__node[data-id="nod_sendCrossBorder"]').getByText("awaiting_funds").click();
      await expect(page).toHaveURL(/\/cnv_crossBorderSend$/);
      await take("payin.confirmed");
      await take("leg.completed");
      await page.keyboard.press("1");
      await take("payout.completed");
      await expect(panel.getByRole("region", { name: "Question" })).toBeVisible();
      await shot("question");
    });

    test("shows a step presented on the stage as mockup 05 does", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      for (const level of ["cnv_crossBorderSend", "cnv_complianceHold", "cnv_expiryClock", "cnv_lifecycle"]) {
        await page.goto(`/p/prj_payments/${level}`);
        await settled(page);
      }
      await page.getByRole("button", { name: "Simulate" }).click();
      await page.getByRole("button", { name: "Present Verification pauses the clock" }).click();
      await page.keyboard.press("ArrowRight");
      await expect(page).toHaveURL(/\/cnv_expiryClock$/);
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`present-stage-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows an agent's change in its toast, and its note over what it points out", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      await page.goto("/p/prj_payments/cnv_expiryClock");
      await settled(page);
      await page.evaluate(() => globalThis.statewright.hello({ agent: "claude-code" }));
      // A change of the catalog: its toast, and nothing glowing that would move the picture.
      await page.evaluate(() =>
        globalThis.statewright.batch.apply({
          label: "An event for late payers",
          commands: [{ type: "catalog.add", args: { collection: "events", item: { name: "late.notice" } } }]
        })
      );
      await page.evaluate(() =>
        globalThis.statewright.view.point({
          ids: ["nod_running", "nod_paused"],
          note: "Verification pauses the clock here"
        })
      );
      // What is pointed out rings for 2 s (the beacon), then keeps its still glow: that is the picture.
      await expect(page.locator(".sw-beacon")).toHaveCount(0, { timeout: 4000 });
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`agent-note-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows Connect an AI…, waiting for the agent with its code", async ({ page }) => {
      // The code the Editor shows, always the same (K7Q-2MX), and a server that has not answered yet.
      await page.addInitScript(() => {
        const random = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = bytes =>
          bytes.length === 6 ? (bytes.set([17, 5, 21, 0, 18, 28]), bytes) : random(bytes);
      });
      await page.route("http://127.0.0.1:47615/pair", () => {});
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      await settled(page);
      await page.getByTestId("project-menu").click();
      await page.getByTestId("project-menu-connect").click();
      await expect(page.getByTestId("connect-code")).toHaveText("K7Q-2MX");
      await page.mouse.move(8, 892);
      await expect(page).toHaveScreenshot(`connect-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows the level's kind under the dock, its menu open for a service with nothing inside", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_scheduler"]').click();
      await page.getByRole("button", { name: "Level kind: System" }).click();
      await expect(page.getByRole("menu", { name: "Levels inside a box" })).toBeVisible();
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`level-kind-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a machine's roles: who sends, who receives, the steps an action runs", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^State machine/ }).click();
      const dialog = page.getByRole("dialog", { name: "New project" });
      await dialog.getByRole("textbox", { name: "Name" }).fill("Orders");
      await dialog.getByRole("button", { name: "Create project" }).click();
      await settled(page);
      const call = (name, args) =>
        page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);
      const { canvas } = (await call("editor.state")).result.level;
      await call("batch.apply", { label: "Roles", commands: ROLES(canvas) });
      await page.getByRole("button", { name: "Auto-layout" }).click();
      // What the agent added glows for 2 s: the picture is the level after it.
      await expect(page.locator(".react-flow__node.sw-ai")).toHaveCount(0, { timeout: 5000 });
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`roles-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a lifecycle framed on a system, driven by its services", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^System/ }).click();
      const dialog = page.getByRole("dialog", { name: "New project" });
      await dialog.getByRole("textbox", { name: "Name" }).fill("Shop");
      await dialog.getByRole("button", { name: "Create project" }).click();
      await expect(page.getByTestId("canvas")).toBeVisible();
      const call = (name, args) =>
        page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);
      const shop = (await call("document.get")).result.document.root;
      await call("batch.apply", { label: "Lifecycle", commands: LIFECYCLE(shop) });
      // The editor places what the agent added first; Auto-layout then arranges the whole level.
      const webAt = async () =>
        (await call("document.get")).result.document.layout?.canvases?.[shop]?.nodes?.nod_web?.x;
      await expect.poll(webAt).toBeGreaterThan(0);
      await settled(page);
      await page.getByRole("button", { name: "Auto-layout" }).click();
      // Laid out: the services that drive the lifecycle stand before it; then the view fits the level.
      await expect.poll(webAt).toBe(0);
      await expect(page.locator(".react-flow__node.sw-ai")).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByTestId("toast")).toHaveCount(0, { timeout: 8000 });
      await page.keyboard.press("Shift+F");
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`lifecycle-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a flow's roles: a step performed by a participant, a step that leads to a state, lanes of parties", async ({
      page
    }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Flow/ }).click();
      const dialog = page.getByRole("dialog", { name: "New project" });
      await dialog.getByRole("textbox", { name: "Name" }).fill("Checkout");
      await dialog.getByRole("button", { name: "Create project" }).click();
      await expect(page.getByTestId("canvas")).toBeVisible();
      const call = (name, args) =>
        page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);
      const flow = (await call("document.get")).result.document.root;
      await call("batch.apply", { label: "Roles", commands: FLOW_ROLES(flow) });
      const callAt = async () => (await call("document.get")).result.document.layout?.canvases?.[flow]?.nodes?.nod_call;
      await expect.poll(callAt).toBeTruthy();
      await settled(page);
      await page.getByRole("button", { name: "Auto-layout" }).click();
      await expect(page.locator(".react-flow__node.sw-ai")).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByTestId("toast")).toHaveCount(0, { timeout: 8000 });
      await page.keyboard.press("Shift+F");
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`flow-roles-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a mixed level: states, steps and boxes together, each connection by what it is", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Mixed/ }).click();
      const dialog = page.getByRole("dialog", { name: "New project" });
      await dialog.getByRole("textbox", { name: "Name" }).fill("Shop floor");
      await dialog.getByRole("button", { name: "Create project" }).click();
      await expect(page.getByTestId("canvas")).toBeVisible();
      const call = (name, args) =>
        page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);
      const root = (await call("document.get")).result.document.root;
      await call("batch.apply", { label: "Mixed", commands: MIXED(root) });
      const placed = async () => (await call("document.get")).result.document.layout?.canvases?.[root]?.nodes?.nod_db;
      await expect.poll(placed).toBeTruthy();
      await settled(page);
      await page.getByRole("button", { name: "Auto-layout" }).click();
      await expect(page.locator(".react-flow__node.sw-ai")).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByTestId("toast")).toHaveCount(0, { timeout: 8000 });
      await page.keyboard.press("Shift+F");
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`mixed-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a badge's findings beside it", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Open file…").setInputFiles(await getPaidWithFindings());
      await expect(page).toHaveURL(/\/p\/prj_getPaid$/);
      await page.goto("/p/prj_getPaid/cnv_transaction");
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_processing"] .badge').hover();
      await expect(page.getByTestId("canvas-finding")).toBeVisible();
      await expect(page).toHaveScreenshot(`finding-popover-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a marker's Problems beside it, saying what incomplete means", async ({ page }) => {
      // The compliance hold both stuck, on a level that shows only some of its transitions, and to verify.
      await page.goto("/");
      await page.getByLabel("Open file…").setInputFiles(await paymentsWithProblems());
      await expect(page).toHaveURL(/\/p\/prj_payments$/);
      await page.goto("/p/prj_payments/cnv_lifecycle");
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_complianceHold"] .problem-marker').hover();
      await expect(page.getByTestId("canvas-problem").getByRole("listitem")).toHaveCount(2);
      await expect(page).toHaveScreenshot(`problem-popover-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows the Problems panel with a group of catalog items opened", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await expect(page).toHaveURL(/\/p\/prj_payments$/);
      await settled(page);
      await page.getByRole("button", { name: /problems$/ }).click();
      const panel = page.getByRole("dialog", { name: "Problems" });
      await panel.getByRole("button", { name: /^\d+ events do not specify payload/ }).click();
      await expect(panel.getByTestId("problems-item").first()).toBeVisible();
      await page.mouse.move(8, 892);
      await expect(panel).toHaveScreenshot(`problems-group-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows the Levels map with a level's elements open", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await expect(page).toHaveURL(/\/p\/prj_payments$/);
      await settled(page);
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.getByRole("menuitem", { name: "Levels…" }).click();
      const levels = page.getByRole("dialog", { name: "Levels" });
      await levels.getByRole("button", { name: "Show the elements of Lifecycle engine" }).click();
      await page.mouse.move(8, 892);
      await expect(levels).toHaveScreenshot(`levels-map-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows the conversation with a paired agent, its history open", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await expect(page).toHaveURL(/\/p\/prj_payments$/);
      await page.goto("/p/prj_payments/cnv_lifecycle");
      await settled(page);
      const mcp = await startMcp({ agent: "claude-code" });
      try {
        await page.getByTestId("project-menu").click();
        await page.getByTestId("project-menu-connect").click();
        await page.getByTestId("connect-address").fill(mcp.address);
        await page.getByTestId("connect-address").press("Enter");
        await expect(page.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
        await mcp.pair(await page.getByTestId("connect-code").textContent());
        await expect(page.getByTestId("connect-dialog")).toBeHidden();
        await page.locator('.react-flow__node[data-id="nod_expiryClock"]').click();
        await page.getByTestId("conversation-field").fill("The expiry clock should pause while the payer verifies.");
        await page.getByTestId("conversation-field").press("Enter");
        const { messages } = await mcp.tool("editor_inbox");
        await mcp.tool("editor_reply", {
          text: "It does: verify.started pauses it, and verify.ended resumes it with the time given back.",
          to: messages[0].id,
          point: ["nod_paused"]
        });
        const bar = page.getByTestId("conversation-bar");
        await bar.getByRole("button", { name: "Conversation history" }).click();
        await expect(bar.locator("[data-status]")).toHaveAttribute("data-status", "away", { timeout: 8000 });
        await page.mouse.move(8, 892);
        await expect(bar).toHaveScreenshot(`conversation-${theme}.png`, { maxDiffPixelRatio: 0.001 });
      } finally {
        await mcp.stop();
      }
    });

    test("shows the person's marks for the agent, a drawing tool in hand", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await expect(page).toHaveURL(/\/p\/prj_payments$/);
      await page.goto("/p/prj_payments/cnv_expiryClock");
      await settled(page);
      const mcp = await startMcp({ agent: "claude-code" });
      try {
        await page.getByTestId("project-menu").click();
        await page.getByTestId("project-menu-connect").click();
        await page.getByTestId("connect-address").fill(mcp.address);
        await page.getByTestId("connect-address").press("Enter");
        await expect(page.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
        await mcp.pair(await page.getByTestId("connect-code").textContent());
        await expect(page.getByTestId("connect-dialog")).toBeHidden();
        const tool = name => page.locator(`[data-testid="conversation-tool"][data-tool="${name}"]`);
        const box = async id => page.locator(`.react-flow__node[data-id="${id}"]`).boundingBox();
        const running = await box("nod_running");
        await tool("ellipse").click();
        await page.mouse.move(running.x - 24, running.y - 20);
        await page.mouse.down();
        await page.mouse.move(running.x + running.width + 24, running.y + running.height + 20, { steps: 6 });
        await page.mouse.up();
        await tool("pencil").click();
        await page.getByTestId("marks-colour").getByRole("radio", { name: "Amber: a question" }).click();
        const paused = await box("nod_paused");
        await page.keyboard.down("Alt");
        await page.mouse.click(paused.x + paused.width + 12, paused.y + paused.height / 2);
        await page.keyboard.up("Alt");
        await page.getByRole("textbox", { name: "A label" }).fill("needs a timeout?");
        await page.getByRole("textbox", { name: "A label" }).press("Enter");
        await tool("mark").click();
        await page.locator('.react-flow__node[data-id="nod_elapsed"]').click();
        await tool("rectangle").click();
        await page.mouse.move(8, 892);
        await expect(page).toHaveScreenshot(`marks-${theme}.png`, { maxDiffPixelRatio: 0.001 });
      } finally {
        await mcp.stop();
      }
    });

    test("shows the support popover open above its badge, on the Projects screen", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("button", { name: /^Payments/ })).toBeVisible();
      await page.getByRole("button", { name: "Support" }).click();
      await expect(page.getByRole("dialog", { name: "Support Statewright" })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(8, 892);
      await expect(page).toHaveScreenshot(`support-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("keeps a box at the right edge clear of the inspector", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await settled(page);
      await page.reload();
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_providers"]').click();
      await expect(page.getByRole("dialog", { name: "Inspector" })).toBeVisible();
      await settled(page);
      await expect(page).toHaveScreenshot(`inspector-right-edge-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a widened inspector, its edge under the pointer, a box at the right edge clear of it", async ({
      page
    }) => {
      await page.goto("/");
      await page.evaluate(() =>
        localStorage.setItem("statewright:inspector", JSON.stringify({ state: { width: 560 }, version: 0 }))
      );
      await page.getByRole("button", { name: /^Payments/ }).click();
      await settled(page);
      await page.reload();
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_providers"]').click();
      const edge = page.getByRole("separator", { name: "Resize the inspector" });
      await edge.hover();
      await settled(page);
      await expect(page).toHaveScreenshot(`inspector-wide-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });
  });
}

test.describe("the documentation page", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  test("shows the documentation page's cover and a level's part, its diagram in its card", async ({
    page,
    context
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Payments/ }).click();
    await page.waitForURL(/\/p\/prj_payments$/);
    await page.getByRole("button", { name: "Export" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: /^Documentation \(HTML\)/ }).click()
    ]);
    const reader = await context.newPage();
    await reader.setContent(readFileSync(await download.path(), "utf8"));
    await reader.evaluate(() => document.fonts.ready);
    await expect(reader).toHaveScreenshot("documentation-cover-light.png", { maxDiffPixelRatio: 0.001 });
    await reader.evaluate(() => document.getElementById("level-cnv_expiryClock").scrollIntoView());
    await expect(reader.locator('#contents a[aria-current="true"]')).toHaveText("Expiry clock");
    await expect(reader).toHaveScreenshot("documentation-level-light.png", { maxDiffPixelRatio: 0.001 });
  });
});

test.describe("a scenario's page", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  test("shows a step of a scenario's page as mockup 06 does: its story beside the level", async ({ page, context }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Payments/ }).click();
    await page.waitForURL(/\/p\/prj_payments$/);
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: /^Scenario page…/ }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("dialog", { name: "Scenario page" })
        .getByRole("button", { name: /^Verification pauses the clock/ })
        .click()
    ]);
    const reader = await context.newPage();
    await reader.setContent(readFileSync(await download.path(), "utf8"));
    await reader.keyboard.press("ArrowRight");
    await reader.evaluate(() => document.fonts.ready);
    await reader.mouse.move(8, 892);
    await expect(reader).toHaveScreenshot("present-page-light.png", { maxDiffPixelRatio: 0.001 });
  });
});
