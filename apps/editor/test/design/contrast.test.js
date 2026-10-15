// Spec §9: the shell meets WCAG 2.2 AA contrast in both themes — text at 4.5:1 on every surface it is set on.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../src/globals.css", import.meta.url), "utf8");

/** The colour tokens of a theme's block (`:root` or `.dark`). */
function tokens(selector) {
  const body = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css)[1];
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map(([, name, hex]) => [name, hex]));
}

const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(at => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

describe.each([
  ["light", ":root"],
  ["dark", ".dark"]
])("the %s theme", (_, selector) => {
  const theme = tokens(selector);

  it.each(["ink", "sub", "muted", "accent"])("sets %s text at AA contrast on the canvas, islands and fills", text => {
    for (const surface of ["canvas", "surface", "subtle", "accent-soft"]) {
      expect(contrast(theme[text], theme[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("sets each tone's text at AA contrast on its own fill, and the primary button's", () => {
    for (const [text, fill] of [
      ["danger", "danger-soft"],
      ["warning", "warning-soft"],
      ["success", "success-soft"],
      ["primary-foreground", "primary"]
    ]) {
      expect(contrast(theme[text], theme[fill]), `${text} on ${fill}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
