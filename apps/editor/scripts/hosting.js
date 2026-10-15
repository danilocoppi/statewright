// Static hosting (spec §13 row E5, Core spec §6): where the app lives, and what a static host needs to serve it — every
// address that is not a file leads to the app (index.html), which reads it.
import { copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Where the platform lives, from VITE_BASE_URL: its address (written into /README.md and /llms.txt) and the path the
 * app is served under (Vite's `base`, the router's `basename`). Without one, the app is served at the root of its own
 * origin and its files are linked from there.
 * @param {string} [address] VITE_BASE_URL: an absolute http(s) address, such as https://example.com/statewright/
 * @returns {{ url: string, base: string }} `url` ends in "/" ("/" when not known); `base` starts and ends in "/".
 */
export function platformOf(address = "") {
  if (!address) return { url: "/", base: "/" };
  let parsed;
  try {
    parsed = new URL(address);
  } catch {
    parsed = null;
  }
  if (!parsed || !/^https?:$/.test(parsed.protocol))
    throw new Error(
      `VITE_BASE_URL must be an absolute address, like https://example.com/statewright/ (got "${address}").`
    );
  const base = parsed.pathname.replace(/\/?$/, "/");
  return { url: `${parsed.origin}${base}`, base };
}

/**
 * The files a static host reads to send every other address to the app: `_redirects` (Netlify, Cloudflare Pages —
 * files that exist are served first) and `404.html`, a copy of the app (GitHub Pages).
 * @param {string} base the path the app is served under
 * @returns {import("vite").Plugin}
 */
export function hostingPlugin(base = "/") {
  return {
    name: "statewright-hosting",
    apply: "build",
    async writeBundle({ dir }) {
      await writeFile(join(dir, "_redirects"), `${base}* ${base}index.html 200\n`);
      await copyFile(join(dir, "index.html"), join(dir, "404.html"));
    }
  };
}
