// Shared setup for component tests (files that start with `// @vitest-environment jsdom`).
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no modal dialogs; enough of <dialog> for components that call showModal() and close().
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom has no media queries; the theme store asks whether the system is dark.
window.matchMedia ??= query => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {}
});

afterEach(() => cleanup());
