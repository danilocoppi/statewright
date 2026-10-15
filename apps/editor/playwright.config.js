// End-to-end tests (spec §11) against the production build, in Chromium. Each test gets a fresh browser context, so
// its own empty IndexedDB. The "hosted" project runs the same app built to live under a path (VITE_BASE_URL), as a
// static host would serve it; the "budgets" project times spec §9's targets after everything else, alone.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const HOSTED = 4174;
const HOSTED_URL = `http://localhost:${HOSTED}/statewright/`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      testIgnore: /(hosted|budgets)\.spec/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}` }
    },
    { name: "hosted", testMatch: /hosted\.spec/, use: { ...devices["Desktop Chrome"], baseURL: HOSTED_URL } },
    {
      name: "budgets",
      testMatch: /budgets\.spec/,
      dependencies: ["chromium", "hosted"],
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}`, trace: "off" }
    }
  ],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `npx vite build --outDir dist-hosted && npx vite preview --outDir dist-hosted --port ${HOSTED} --strictPort`,
      url: HOSTED_URL,
      env: { VITE_BASE_URL: HOSTED_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
