// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { moveToArea } from "@/features/editor/areas";

/** Areas as the editor marks them, in the page's order (which is not F6's); the zoom is drawn inside the level. */
function page() {
  document.body.innerHTML = `
    <div data-area="canvas">
      <div class="react-flow__node" data-id="a" tabindex="0"></div>
      <div class="react-flow__node selected" data-id="b" tabindex="0"></div>
      <div data-area="zoom"><button>Zoom out</button></div>
    </div>
    <div data-area="project"><a href="/">Back to projects</a><button>Menu</button></div>
    <nav data-area="levels"><button disabled>Runtime</button></nav>
    <div data-area="tools"><button>Select</button></div>
    <div data-area="actions"><button>Problems</button></div>
    <section data-area="inspector"><input aria-label="Name" /></section>`;
}
const focused = () =>
  document.activeElement.textContent ||
  document.activeElement.getAttribute("aria-label") ||
  document.activeElement.dataset.id;

afterEach(() => (document.body.innerHTML = ""));

describe("moving between areas", () => {
  it("visits the islands across the top, the panels, the tools, the level and its zoom, then starts again", () => {
    page();
    const visited = Array.from({ length: 7 }, () => (moveToArea(), focused()));
    // The level of breadcrumbs has nothing to focus (its one button is disabled): it is passed over.
    expect(visited).toEqual(["Back to projects", "Problems", "Name", "Select", "b", "Zoom out", "Back to projects"]);
  });

  it("lands on the level's selected box, and goes back with Shift", () => {
    page();
    document.querySelector('[data-area="tools"] button').focus();
    moveToArea();
    expect(document.activeElement.dataset.id).toBe("b");
    moveToArea(true);
    expect(focused()).toBe("Select");
    moveToArea(true);
    expect(focused()).toBe("Name");
  });

  it("passes over an area the window has no room to show", () => {
    page();
    const levels = document.querySelector('[data-area="levels"]');
    levels.innerHTML = "<a href='/p/x'>Runtime</a>";
    levels.checkVisibility = () => false;
    document.querySelector('[data-area="project"] button').focus();
    moveToArea();
    expect(focused()).toBe("Problems");
  });

  it("starts from the last area going back from nowhere, and does nothing when no area is shown", () => {
    page();
    moveToArea(true);
    expect(focused()).toBe("Zoom out");
    document.body.innerHTML = "";
    expect(moveToArea()).toBe(false);
  });
});
