import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

import { guidePlugin } from "./scripts/guide.js";
import { hostingPlugin, platformOf } from "./scripts/hosting.js";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig(({ mode }) => {
  // The platform's address (Core spec §6): the app is served under its path, and /README.md and /llms.txt link to it.
  const platform = platformOf(loadEnv(mode, import.meta.dirname, "VITE_").VITE_BASE_URL);
  return {
    base: platform.base,
    plugins: [react(), tailwindcss(), guidePlugin({ url: platform.url }), hostingPlugin(platform.base)],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    define: { __APP_VERSION__: JSON.stringify(version) },
    // ELK ships as one CommonJS bundle; pre-bundling turns it into an ES module for the browser.
    optimizeDeps: { include: ["elkjs/lib/elk.bundled.js"] },
    server: { port: 5173 },
    // ELK (about 1.4 MB) is one chunk of its own, loaded only when a diagram is first drawn.
    build: { target: "es2022", chunkSizeWarningLimit: 1600 },
    test: {
      include: ["test/**/*.test.{js,jsx}"],
      // Logic tests run in Node; component tests opt into jsdom with `// @vitest-environment jsdom`.
      environment: "node"
    }
  };
});
