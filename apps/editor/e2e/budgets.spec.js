// Plan E5 (spec §9): the performance targets, in a real browser, on the production build. Each is timed in the page
// itself (`performance.now`, the browser's frames, the moment the page changes), with Playwright's tracing off, after
// every other test and one test at a time (the "budgets" project), so what is timed is the editor alone.
import { expect, test } from "@playwright/test";

import { manyBoxes, manyElements, manyScenarios, manyStates } from "./fixtures/large.js";

test.describe.configure({ mode: "serial" });

/** Open a document from a file, as a person drops it on the Projects screen. */
async function openFile(page, text, name) {
  await page.goto("/");
  await page.getByLabel("Open file…").setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(text) });
  await page.waitForURL(/\/p\//);
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
}

/** The middle value. */
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/**
 * Time from the next key pressed to the next frame after `changed(element)` says the page shows it.
 * @returns {Promise<number>} milliseconds
 */
async function timeKey(page, key, selector, changedBy) {
  await page.evaluate(
    ([selector, changedBy]) => {
      const element = document.querySelector(selector);
      const before = element.textContent;
      window.__timed = new Promise(done => {
        let pressed = 0;
        addEventListener("keydown", event => (pressed = event.timeStamp), { once: true, capture: true });
        const observer = new MutationObserver(() => {
          if (changedBy === "text" && element.textContent === before) return;
          observer.disconnect();
          requestAnimationFrame(() => done(performance.now() - pressed));
        });
        observer.observe(element, { attributes: true, childList: true, subtree: true, characterData: true });
      });
    },
    [selector, changedBy]
  );
  await page.keyboard.press(key);
  return page.evaluate(() => window.__timed);
}

test("shows the payments example's top level within 1 s of opening it, the first time and again", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).waitFor();
  // The first time, its unplaced boxes are arranged in the layout worker before the level is whole.
  await page.evaluate(() => {
    window.__shown = new Promise(done => {
      let clicked = 0;
      document.addEventListener("click", () => (clicked = performance.now()), { capture: true, once: true });
      const observer = new MutationObserver(() => {
        const arranging = [...document.querySelectorAll("p")].some(p => p.textContent === "Arranging this level…");
        if (!arranging && document.querySelector('.react-flow__node[data-id="nod_commandApi"]')) {
          observer.disconnect();
          // Shown: the frame after the page holds it.
          requestAnimationFrame(() => done(performance.now() - clicked));
        }
      });
      observer.observe(document, { subtree: true, childList: true, characterData: true });
    });
  });
  await page.getByRole("button", { name: /^Payments/ }).click();
  expect(await page.evaluate(() => window.__shown)).toBeLessThan(1000);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Again, from its address, as stored.
  await page.addInitScript(() => {
    window.__shown = new Promise(done => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector(".react-flow__node-node")) return;
        observer.disconnect();
        requestAnimationFrame(() => done(performance.now()));
      });
      observer.observe(document, { subtree: true, childList: true });
    });
  });
  for (let time = 0; time < 3; time += 1) {
    await page.goto("/p/prj_payments");
    expect(await page.evaluate(() => window.__shown)).toBeLessThan(1000);
  }
});

test("pans and zooms a level of 300 boxes, all on screen, at 60 frames a second", async ({ page }) => {
  await openFile(page, await manyBoxes(300), "many-boxes.sttw");
  await expect(page.locator(".react-flow__node-node")).toHaveCount(300);
  const pane = await page.locator(".react-flow__pane").boundingBox();
  const middle = { x: pane.x + pane.width / 2, y: pane.y + pane.height / 2 };
  // One measure per wheel turn or move, not the idle frames between Playwright's events: the longer of the two gaps
  // around the frame that first sees it — the browser hands such events to the start of a frame (its cost shows in the
  // gap after) or between frames (in the gap before). Gaps are timed when each frame runs, not when it was due.
  await page.evaluate(() => {
    window.__gaps = [];
    let last = 0;
    let moved = false;
    let before = null;
    const mark = () => (moved = true);
    addEventListener("wheel", mark, { capture: true, passive: true });
    addEventListener("pointermove", mark, { capture: true, passive: true });
    const frame = () => {
      const time = performance.now();
      if (before !== null) window.__gaps.push(Math.max(before, time - last));
      before = moved && last ? time - last : null;
      moved = false;
      last = time;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.mouse.move(middle.x, middle.y);
  for (let step = 0; step < 20; step += 1) await page.mouse.wheel(0, step < 10 ? -60 : 60);
  await page.mouse.down();
  await page.mouse.move(middle.x + 300, middle.y + 100, { steps: 40 });
  await page.mouse.up();
  const gaps = await page.evaluate(() => window.__gaps);
  expect(gaps.length).toBeGreaterThan(30);
  // At 60 frames a second the longer of two gaps is about 18 ms (16.7 and the browser's own jitter); a frame dropped
  // makes it 33. Most inputs drop none, and hardly any drop one.
  expect(median(gaps)).toBeLessThan(25);
  expect([...gaps].sort((a, b) => a - b)[Math.floor(gaps.length * 0.95)]).toBeLessThan(34);
});

test("shows an edit on a level of 300 boxes within 50 ms", async ({ page }) => {
  await openFile(page, await manyBoxes(300), "many-boxes.sttw");
  const box = '.react-flow__node[data-id="nod_box150"]';
  await page.locator(box).click();
  // The first edits of a page warm it up; then each nudge is timed from the key to the frame that shows it moved.
  for (let time = 0; time < 2; time += 1) await timeKey(page, "ArrowRight", box, "style");
  const times = [];
  for (let time = 0; time < 7; time += 1) times.push(await timeKey(page, "ArrowRight", box, "style"));
  expect(median(times)).toBeLessThan(50);
});

test("shows a step of a machine of 300 states within 50 ms (simulator spec §11)", async ({ page }) => {
  await openFile(page, await manyStates(300), "many-states.sttw");
  await page.getByRole("button", { name: "Simulate" }).click();
  await page.getByRole("dialog", { name: "Simulation" }).getByRole("button", { name: "Start" }).click();
  // The focus is on the run's one move; each Enter takes it, timed from the key to the frame that shows where it led.
  const move = page.getByRole("dialog", { name: "Simulation" }).getByRole("button", { name: /^go\.next/ });
  await expect(move).toBeFocused();
  const now = '[aria-labelledby="simulate-now"]';
  for (let time = 0; time < 2; time += 1) await timeKey(page, "Enter", now, "text");
  const times = [];
  for (let time = 0; time < 7; time += 1) times.push(await timeKey(page, "Enter", now, "text"));
  expect(median(times)).toBeLessThan(50);
  await expect(page.getByRole("region", { name: "Now" })).toContainText("s9");
});

test("updates the Problems of 2,000 elements within 300 ms of a change", async ({ page }) => {
  await openFile(page, await manyElements(10, 100), "many-elements.sttw");
  await page.goto(`${new URL(page.url()).pathname}/cnv_machine0`);
  const button = page.getByRole("button", { name: /problems?$/ });
  await expect(button).toHaveText(/^\d+ problems$/);
  await page.locator('.react-flow__node[data-id="nod_m0s50"]').click();
  const problems = "[data-area='actions'] button";
  expect(await timeKey(page, "Delete", problems, "text")).toBeLessThan(300);
  expect(await timeKey(page, "ControlOrMeta+z", problems, "text")).toBeLessThan(300);
});

test("updates the Problems of 2,000 elements, every scenario run again, within 300 ms of a change (simulator spec §11)", async ({
  page
}) => {
  await openFile(page, await manyScenarios(10, 100, 30), "many-scenarios.sttw");
  await page.goto(`${new URL(page.url()).pathname}/cnv_machine0`);
  const button = page.getByRole("button", { name: /problems?$/ });
  await expect(button).toHaveText(/^\d+ problems$/);
  // A state the scenario of this machine goes through: it now goes elsewhere at that step.
  await page.locator('.react-flow__node[data-id="nod_m0s10"]').click();
  const problems = "[data-area='actions'] button";
  expect(await timeKey(page, "Delete", problems, "text")).toBeLessThan(300);
  await page.getByRole("button", { name: /problems?$/ }).click();
  await expect(page.getByText(/Machine 0 goes on.*goes elsewhere at step/)).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await timeKey(page, "ControlOrMeta+z", problems, "text")).toBeLessThan(300);
});

test("loads ELK only in the layout worker, and only for a level that needs arranging", async ({ page }) => {
  const workers = [];
  const inPage = [];
  page.on("worker", worker => workers.push(worker.url()));
  page.on("request", request => /\/assets\/layout-[^/]*\.js$/.test(request.url()) && inPage.push(request.url()));
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // A level whose boxes are all placed draws without the layout worker.
  workers.length = 0;
  await page.reload();
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
  await expect(page.getByText(/problems?$/)).toBeVisible();
  expect(workers.filter(url => url.includes("layout.worker"))).toEqual([]);

  // A level with boxes to arrange starts it; ELK never comes into the page itself.
  await page.goto("/p/prj_payments/cnv_crossBorderSend");
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  expect(workers.some(url => url.includes("layout.worker"))).toBe(true);
  expect(inPage).toEqual([]);
});

/** Frame gaps during `gesture`: one measure per input, the longer of the two gaps around the frame that first sees it. */
async function framesDuring(page, gesture) {
  await page.evaluate(() => {
    window.__gaps = [];
    let last = 0;
    let moved = false;
    let before = null;
    const mark = () => (moved = true);
    addEventListener("wheel", mark, { capture: true, passive: true });
    window.__stop = false;
    const frame = () => {
      const time = performance.now();
      if (before !== null) window.__gaps.push(Math.max(before, time - last));
      before = moved && last ? time - last : null;
      moved = false;
      last = time;
      if (!window.__stop) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await gesture();
  return page.evaluate(() => ((window.__stop = true), window.__gaps));
}

const p95 = values => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];

test("edits the airport's belt network, 524 boxes, on a computer four times slower (performance spec §2)", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Airport operations/ }).click();
  await page.locator('.react-flow__node[data-id="nod_aodb"]').waitFor();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    window.__long = [];
    new PerformanceObserver(list => window.__long.push(...list.getEntries().map(entry => entry.duration))).observe({
      type: "longtask"
    });
  });

  // Opening it from the project.
  const opened = await page.evaluate(async () => {
    const start = performance.now();
    await window.statewright.call("view.open", { canvas: "cnv_beltNetwork" });
    await new Promise(done => {
      const wait = () =>
        document.querySelectorAll(".react-flow__node-node").length > 50 ? done() : requestAnimationFrame(wait);
      wait();
    });
    return performance.now() - start;
  });
  expect(opened).toBeLessThan(1500);

  // Scrolling and zooming the whole level.
  const pane = await page.locator(".react-flow__pane").boundingBox();
  await page.mouse.move(pane.x + pane.width / 2, pane.y + pane.height / 2);
  const scrolled = await framesDuring(page, async () => {
    for (let step = 0; step < 48; step += 1) await page.mouse.wheel(step % 2 ? 60 : 0, step < 24 ? -40 : 40);
  });
  const zoomed = await framesDuring(page, async () => {
    await page.keyboard.down("Control");
    for (let step = 0; step < 48; step += 1) await page.mouse.wheel(0, step < 24 ? -20 : 20);
    await page.keyboard.up("Control");
  });
  // Enough inputs that the 95th percentile is not the single worst frame.
  expect(scrolled.length).toBeGreaterThan(40);
  expect(zoomed.length).toBeGreaterThan(40);
  expect(p95(scrolled)).toBeLessThan(50);
  expect(p95(zoomed)).toBeLessThan(50);

  // An edit, then typing a name: each shown within its budget, no task longer than 200 ms meanwhile.
  await page.evaluate(() => window.statewright.call("view.reveal", { id: "nod_mainLineA3" }));
  const box = '.react-flow__node[data-id="nod_mainLineA3"]';
  await page.locator(box).waitFor();
  await page.evaluate(() => window.statewright.call("view.select", { ids: ["nod_mainLineA3"] }));
  await page.waitForTimeout(500);
  await page.evaluate(() => (window.__long.length = 0));
  await page.locator(box).focus();
  for (let time = 0; time < 2; time += 1) await timeKey(page, "ArrowRight", box, "style");
  const nudges = [];
  for (let time = 0; time < 5; time += 1) nudges.push(await timeKey(page, "ArrowRight", box, "style"));
  expect(median(nudges)).toBeLessThan(100);
  const name = page.getByRole("textbox", { name: "Name", exact: true });
  await name.click();
  await name.press("End");
  for (const key of ["a", "b"]) await timeKey(page, key, box, "any");
  const keys = [];
  for (const key of ["c", "d", "e", "f", "g"]) keys.push(await timeKey(page, key, box, "any"));
  expect(median(keys)).toBeLessThan(150);
  // Autosave (signing and writing the document) runs a second after the last key: its task counts too.
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(300);
  const longest = await page.evaluate(() => Math.max(0, ...window.__long));
  expect(longest).toBeLessThan(200);
});
