/* global __APP_VERSION__ */

/** Identity and settings of the Editor. */
export const APP = {
  /** Display name. */
  name: "Statewright",
  /** Prefix of localStorage keys and of the IndexedDB database name. */
  storagePrefix: "statewright",
  /** Base URL of the platform (Core spec §6), from VITE_BASE_URL; empty means the page's own origin. */
  baseUrl: import.meta.env.VITE_BASE_URL ?? "",
  /** The Editor's version, written into the `generator` of every document it signs. */
  version: __APP_VERSION__
};

/** Interface languages; the first is the fallback for missing keys (spec §8.3). */
export const LANGUAGES = ["en", "pt-BR", "es"];

/** Translation namespaces: one JSON file per namespace and language (src/i18n/locales/<language>/). */
export const I18N_NAMESPACES = ["common", "projects", "files", "editor", "inspector", "simulate", "agent"];

/** Where the source is published, and its issues (`${REPOSITORY}/issues`). */
export const REPOSITORY = "https://github.com/danilocoppi/statewright";

/**
 * The wallets that take donations (the support badge), each with the networks it takes. The addresses are published
 * exactly as they are here: a test pins them.
 * @type {{ id: string, network: string, address: string }[]}
 */
export const WALLETS = [
  { id: "solana", network: "Solana", address: "DCA31TRz39qmKPseSRMjANN7cGYoWGUbtkC582oMRyWy" },
  { id: "evm", network: "ETH · BSC · Polygon (EVM)", address: "0x54636195948915f091466f027025973328813a3a" }
];
