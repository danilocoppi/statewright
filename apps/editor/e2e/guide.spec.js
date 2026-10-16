// Plan E5 (spec §8.4): the guide and its static files, served beside the app as a static host serves them, and the
// way from a Problem to what its rule means.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const schema = version =>
  JSON.parse(readFileSync(resolve(import.meta.dirname, `../../../packages/core/schema/${version}.json`), "utf8"));

test("serves the guide's files beside the app, and sends every other address to the app", async ({ request }) => {
  const readme = await request.get("/README.md");
  expect(readme.headers()["content-type"]).toContain("text/markdown");
  const text = await readme.text();
  expect(text).toContain("## Reading a diagram");
  expect(text).toContain("](/guide/payments/cnv_runtime.svg)");
  const figure = await request.get("/guide/payments/cnv_runtime.svg");
  expect(figure.headers()["content-type"]).toContain("image/svg+xml");
  expect(await (await request.get("/llms.txt")).text()).toMatch(/^# Statewright\n\n> Statewright is a builder/);
  expect(await (await request.get("/schema/1.4.json")).json()).toEqual(schema("1.4"));
  expect(await (await request.get("/schema/1.3.json")).json()).toEqual(schema("1.3"));
  expect(await (await request.get("/schema/1.2.json")).json()).toEqual(schema("1.2"));
  expect(await (await request.get("/schema/1.1.json")).json()).toEqual(schema("1.1"));
  expect(await (await request.get("/schema/1.0.json")).json()).toEqual(schema("1.0"));
  expect(await (await request.get("/_redirects")).text()).toBe("/* /index.html 200\n");
  expect(await (await request.get("/404.html")).text()).toBe(await (await request.get("/index.html")).text());
});

test("opens what a Problem's rule means in the guide, in a new tab, at that rule", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.getByRole("button", { name: /problems$/ }).click();
  const panel = page.getByRole("dialog", { name: "Problems" });
  const line = panel.getByRole("listitem").filter({ hasText: 'State "compliance_hold" has no way out' });
  await line.hover();
  const [guide] = await Promise.all([
    context.waitForEvent("page"),
    line.getByRole("link", { name: "What machine.stuck means (opens in a new tab)" }).click()
  ]);
  await expect(guide).toHaveURL(/\/readme#rule-machine\.stuck$/);
  const rule = guide.locator('[id="rule-machine.stuck"]');
  await expect(rule).toHaveAttribute("aria-current", "location");
  await expect(rule).toBeInViewport();
  await expect(page.getByTestId("canvas")).toBeVisible();
});

// Plan A5: where an agent starts — first in the guide's index and in llms.txt, at its own address, with the command
// for each client.
test("gives an AI agent its start: first in the guide, at its address, and in llms.txt", async ({ page, request }) => {
  await page.goto("/readme#ai-agents-start-here");
  const heading = page.getByRole("heading", { level: 2, name: "AI agents: start here" });
  await expect(heading).toBeInViewport();
  const index = page.getByRole("navigation", { name: "Guide sections" });
  await expect(index.getByRole("link").first()).toHaveText("AI agents: start here");
  const clients = page.getByRole("table").filter({ hasText: "Kimi CLI" });
  await expect(clients.getByRole("row", { name: /Codex/ })).toContainText(
    "codex mcp add statewright -- npx statewright mcp"
  );
  expect(await (await request.get("/llms.txt")).text()).toContain("/README.md#ai-agents-start-here): set up");
});
