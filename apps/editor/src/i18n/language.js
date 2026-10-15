import i18n from "i18next";

import { APP, LANGUAGES } from "@/config/app";

/** Where the person's choice of language is remembered. */
export const LANGUAGE_KEY = `${APP.storagePrefix}:language`;

/**
 * The supported language closest to the browser's preferences, in order: an exact match first, then the same base
 * language (`pt-PT` → `pt-BR`, `es-MX` → `es`); without any match, the first supported language.
 * @param {readonly string[] | undefined} preferences Usually `navigator.languages`.
 * @param {readonly string[]} [supported]
 * @returns {string}
 */
export function resolveLanguage(preferences, supported = LANGUAGES) {
  const base = language => language.toLowerCase().split("-")[0];
  for (const preference of preferences ?? []) {
    const exact = supported.find(language => language.toLowerCase() === preference.toLowerCase());
    if (exact) return exact;
    const sameBase = supported.find(language => base(language) === base(preference));
    if (sameBase) return sameBase;
  }
  return supported[0];
}

/** The language chosen in the app before, if any. Browsers that block site data throw on any use of localStorage. */
export function rememberedLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

/** Switch the interface language and remember the choice (for this page only, when the browser blocks storage). */
export function setLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
  return i18n.changeLanguage(language);
}
