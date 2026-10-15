import { describe, expect, it } from "vitest";

import { resolveLanguage } from "@/i18n/language";

describe("resolveLanguage", () => {
  it("picks an exact match, ignoring case", () => {
    expect(resolveLanguage(["pt-br"])).toBe("pt-BR");
    expect(resolveLanguage(["EN"])).toBe("en");
  });

  it("falls back to the same base language: pt-PT reads Brazilian Portuguese, es-MX reads Spanish", () => {
    expect(resolveLanguage(["pt-PT"])).toBe("pt-BR");
    expect(resolveLanguage(["es-MX", "en"])).toBe("es");
  });

  it("follows the order of the preferences", () => {
    expect(resolveLanguage(["fr", "es", "pt-BR"])).toBe("es");
  });

  it("uses English when nothing matches or there are no preferences", () => {
    expect(resolveLanguage(["fr", "de"])).toBe("en");
    expect(resolveLanguage([])).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
  });
});
