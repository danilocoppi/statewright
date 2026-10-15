// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GuidePage from "@/guide/GuidePage";

const scrolled = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scrolled;
});
afterEach(() => {
  scrolled.mockReset();
  vi.restoreAllMocks();
});

function renderGuide(address = "/readme") {
  render(
    <MemoryRouter initialEntries={[address]}>
      <Routes>
        <Route path="/readme" element={<GuidePage />} />
      </Routes>
    </MemoryRouter>
  );
}

/** Headings at these distances from the top of the window; the rest far below. */
function placeHeadings(tops) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function rect() {
    return { top: tops[this.id] ?? 5000 };
  });
}

describe("the guide", () => {
  it("shows Core's README in English, with an index of its sections", () => {
    placeHeadings({});
    renderGuide();
    const index = screen.getByRole("navigation", { name: "Guide sections" });
    expect(
      within(index)
        .getAllByRole("link")
        .map(link => link.textContent)
    ).toEqual([
      "AI agents: start here",
      "What Statewright is for",
      "Concepts",
      "Reading a diagram",
      "Using the editor",
      "Simulating and scenarios",
      "Library and CLI",
      "Working with AI agents",
      "Building from the design",
      "Rules for AI agents",
      "Playbooks",
      "Format reference",
      "Back to projects"
    ]);
    expect(within(index).getByRole("link", { name: "Concepts" }).getAttribute("href")).toBe("#concepts");
    const article = screen.getByRole("article");
    expect(article.getAttribute("lang")).toBe("en");
    expect(within(article).getByRole("heading", { level: 1, name: "Statewright" })).toBeTruthy();
    expect(within(article).getByRole("heading", { level: 4, name: "Flow node: if" }).getAttribute("id")).toBe(
      "flow-node-if"
    );
  });

  it("offers support, as every screen does", async () => {
    placeHeadings({});
    renderGuide();
    await userEvent.setup().click(screen.getByRole("button", { name: "Support" }));
    expect(screen.getByRole("dialog", { name: "Support Statewright" })).toBeTruthy();
  });

  it("follows the section being read, and lists that section's parts", async () => {
    placeHeadings({ "what-statewright-is-for": -900, concepts: 40 });
    renderGuide();
    const index = screen.getByRole("navigation", { name: "Guide sections" });
    expect(within(index).getByRole("link", { name: "Concepts" }).getAttribute("aria-current")).toBe("location");
    expect(within(index).getByRole("link", { name: "The catalog" })).toBeTruthy();
    expect(within(index).queryByRole("link", { name: "Install" })).toBeNull();

    placeHeadings({ "what-statewright-is-for": -9000, concepts: -8000, "library-and-cli": 10, install: 90 });
    await act(async () => {
      dispatchEvent(new Event("scroll"));
      await new Promise(done => requestAnimationFrame(done));
    });
    expect(within(index).getByRole("link", { name: "Library and CLI" }).getAttribute("aria-current")).toBe("location");
    expect(within(index).getByRole("link", { name: "Install" }).getAttribute("aria-current")).toBe("location");
    expect(within(index).queryByRole("link", { name: "The catalog" })).toBeNull();
  });

  it("goes to the rule an address points at, and marks it", () => {
    renderGuide("/readme#rule-machine.stuck");
    const row = document.getElementById("rule-machine.stuck");
    expect(row.getAttribute("aria-current")).toBe("location");
    expect(row.textContent).toContain("A non-terminal state has no way out");
    expect(scrolled.mock.contexts[0]).toBe(row);
    expect(document.querySelectorAll("tr[aria-current]")).toHaveLength(1);
  });

  it("links the raw Markdown, and copies the whole guide for an AI agent", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderGuide();
    const raw = screen.getByRole("link", { name: "Raw Markdown (opens in a new tab)" });
    expect(raw.getAttribute("href")).toBe("/README.md");
    expect(raw.getAttribute("target")).toBe("_blank");
    await userEvent.click(screen.getByRole("button", { name: "Copy for an AI agent" }));
    expect(writeText.mock.calls[0][0]).toMatch(/^<!-- The npm README[\s\S]*## Format reference/);
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("draws the legend's styles as the diagram draws them, in the theme's colours", () => {
    renderGuide();
    const waiting = screen.getByRole("img", { name: "fill #F6F7FA, stroke #878E91, chip WAITS" });
    expect(waiting.querySelector("rect").getAttribute("fill")).toBe("var(--sw-f6f7fa)");
    expect(waiting.closest("tr").textContent).toContain("Waiting on another partyWAITSstate.waiting");
    const happy = screen.getByRole("img", { name: "stroke #0A66C2, width 1.6, solid" });
    expect(happy.querySelector("line").getAttribute("stroke")).toBe("var(--sw-0a66c2)");
  });

  it("shows the README's figures from the app, each opening at full size", () => {
    renderGuide();
    const caption = screen.getByText("The payments runtime: actors, services, a store and a queue");
    const figure = caption.closest("figure");
    expect(figure.querySelector("img").getAttribute("src")).toBe("/guide/payments/cnv_runtime.svg");
    expect(within(figure).getByRole("link", { name: "Open the figure at full size" }).getAttribute("href")).toBe(
      "/guide/payments/cnv_runtime.svg"
    );
  });
});
