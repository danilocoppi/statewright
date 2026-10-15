// How the Editor behaves with the airport example on a computer 1×, 4× and 6× slower than this one (Chrome's CPU
// throttling): opening it, showing its largest level, panning and zooming there, an edit, Problems after a change,
// typing a name, and the main thread's long tasks meanwhile. Prints one line per measure.
import { expect, test } from "@playwright/test";

const RATES = (process.env.RATES ?? "1,4,6").split(",").map(Number);
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const p95 = values => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
const results = [];
const report = (rate, what, value, unit = "ms") => {
  results.push({ rate, what, value: Math.round(value), unit });
  console.log(`${rate}× · ${what}: ${Math.round(value)} ${unit}`);
};

/** Long tasks on the main thread from now: their count and the longest. */
async function watchLongTasks(page) {
  await page.evaluate(() => {
    window.__long = [];
    new PerformanceObserver(list => window.__long.push(...list.getEntries().map(entry => entry.duration))).observe({
      type: "longtask",
      buffered: false
    });
  });
}
const longTasks = page => page.evaluate(() => window.__long ?? []);

/** Time from a key to the frame after `selector` changes. */
async function timeKey(page, key, selector) {
  await page.evaluate(selector => {
    const element = document.querySelector(selector);
    const before = element.outerHTML;
    window.__timed = new Promise(done => {
      let pressed = 0;
      addEventListener("keydown", event => (pressed = event.timeStamp), { once: true, capture: true });
      const observer = new MutationObserver(() => {
        if (element.outerHTML === before) return;
        observer.disconnect();
        requestAnimationFrame(() => done(performance.now() - pressed));
      });
      observer.observe(element, { attributes: true, childList: true, subtree: true, characterData: true });
    });
  }, selector);
  await page.keyboard.press(key);
  return page.evaluate(() => Promise.race([window.__timed, new Promise(done => setTimeout(() => done(-1), 30000))]));
}

/** Frame gaps while wheeling and dragging the pane. */
async function panAndZoom(page) {
  const pane = await page.locator(".react-flow__pane").boundingBox();
  const middle = { x: pane.x + pane.width / 2, y: pane.y + pane.height / 2 };
  // As the budgets do: one measure per input, the longer of the two gaps around the frame that first sees it.
  await page.evaluate(() => {
    window.__gaps = [];
    let last = 0;
    let moved = false;
    let before = null;
    const mark = () => (moved = true);
    addEventListener("wheel", mark, { capture: true, passive: true });
    addEventListener("pointermove", mark, { capture: true, passive: true });
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
  await page.mouse.move(middle.x, middle.y);
  for (let step = 0; step < 16; step += 1) await page.mouse.wheel(0, step < 8 ? -80 : 80);
  await page.mouse.down();
  await page.mouse.move(middle.x + 400, middle.y + 150, { steps: 40 });
  await page.mouse.up();
  return page.evaluate(() => ((window.__stop = true), window.__gaps));
}

for (const rate of RATES) {
  test(`the airport example at ${rate}× slower`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await page.goto("/");
    await page.getByRole("button", { name: /^Airport operations/ }).waitFor();
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await watchLongTasks(page);

    // Opening it: from the click to the first box of its top level drawn.
    const opened = Date.now();
    await page.getByRole("button", { name: /^Airport operations/ }).click();
    await page.locator('.react-flow__node[data-id="nod_aodb"]').waitFor({ timeout: 300000 });
    report(rate, "open the example (level 0)", Date.now() - opened);
    await expect(page.getByRole("button", { name: /^\d+ problems$/ })).toBeVisible({ timeout: 300000 });
    report(rate, "  … until its Problems are counted", Date.now() - opened);

    // The belt network: 524 boxes, 608 belts.
    const shown = Date.now();
    await page.goto("/p/prj_airportOperations/cnv_beltNetwork");
    await page.locator('.react-flow__node[data-id="nod_sorterA"]').waitFor({ timeout: 300000 });
    await page.waitForFunction(() => document.querySelectorAll(".react-flow__node").length > 500, null, {
      timeout: 300000
    });
    report(rate, "show the belt network (524 boxes)", Date.now() - shown);
    const heap = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    report(rate, "JS heap after showing it", heap / 1048576, "MB");
    await page.waitForTimeout(1500);
    await watchLongTasks(page);

    const gaps = await panAndZoom(page);
    report(rate, "pan and zoom: median frame", median(gaps));
    report(rate, "pan and zoom: 95th percentile frame", p95(gaps));
    report(rate, "pan and zoom: worst frame", Math.max(...gaps));

    // An edit: nudge a box on screen, from the key to the frame that shows it moved.
    const visible = await page.evaluate(() => {
      const pane = document.querySelector(".react-flow__pane").getBoundingClientRect();
      const inside = [...document.querySelectorAll(".react-flow__node-node")].find(node => {
        const box = node.getBoundingClientRect();
        return (
          box.left > pane.left + 40 &&
          box.right < pane.right - 300 &&
          box.top > pane.top + 80 &&
          box.bottom < pane.bottom - 120
        );
      });
      return inside?.dataset.id;
    });
    const box = `.react-flow__node[data-id="${visible}"]`;
    await page.locator(box).click({ timeout: 60000 });
    await timeKey(page, "ArrowRight", box);
    const nudges = [];
    for (let time = 0; time < 5; time += 1) nudges.push(await timeKey(page, "ArrowRight", box));
    report(rate, "nudge a box (edit shown)", median(nudges));

    // Problems after a change: delete a box whose open comment is a Problem, from the key to the count changing.
    const problems = "[data-area='actions'] button";
    await page.evaluate(() => window.statewright.call("view.select", { ids: ["nod_edsD5"] }));
    await page.waitForTimeout(500);
    report(rate, "delete a box → Problems updated", await timeKey(page, "Delete", problems));
    report(rate, "undo → Problems updated", await timeKey(page, "ControlOrMeta+z", problems));

    // Typing a name in the inspector: each key, to the frame that shows it on the canvas.
    await page.evaluate(id => window.statewright.call("view.select", { ids: [id] }), visible);
    const name = page.getByRole("textbox", { name: "Name", exact: true });
    await name.waitFor({ timeout: 60000 });
    await name.click();
    await name.press("End");
    const keys = [];
    for (const key of ["x", "y", "z", "w", "v"]) keys.push(await timeKey(page, key, box));
    report(rate, "type in the name (each key shown)", median(keys));

    const long = await longTasks(page);
    report(rate, "long tasks during the session", long.length, "tasks");
    report(rate, "longest task", long.length ? Math.max(...long) : 0);
    report(
      rate,
      "main thread blocked in long tasks",
      long.reduce((sum, value) => sum + value, 0)
    );
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  });
}

test.afterAll(() => {
  console.log("\nSUMMARY");
  for (const { rate, what, value, unit } of results) console.log(`${rate}×\t${what}\t${value} ${unit}`);
});
