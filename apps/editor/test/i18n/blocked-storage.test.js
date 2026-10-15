// @vitest-environment jsdom
// Browsers that block site data (for example with "Block all cookies") throw on any use of localStorage; the app must
// still start, in the browser's language, and switch languages for the session.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("languages when the browser blocks storage", () => {
  let original;
  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      }
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });

  it("starts in the browser's language and switches without remembering", async () => {
    const { default: i18n } = await import("@/i18n/index");
    const { setLanguage } = await import("@/i18n/language");
    await vi.waitFor(() => expect(i18n.isInitialized).toBe(true));
    expect(i18n.language).toBe("en");
    await setLanguage("es");
    expect(i18n.language).toBe("es");
  });
});
