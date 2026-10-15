// The performance audit (not part of `npm run e2e`): the largest example on a slowed-down CPU, as a slow computer
// would run it. Run with `npx playwright test -c playwright.audit.config.js` (RATES=1,4,6 by default); it prints a
// table, it does not fail. AUDIT_URL points it at a build already served (then no server is started).
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const URL = process.env.AUDIT_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e/audit",
  testMatch: /\.audit\.js$/,
  workers: 1,
  timeout: 600_000,
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: URL, trace: "off" },
  webServer:
    process.env.AUDIT_URL ?
      undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 180_000
      }
});
