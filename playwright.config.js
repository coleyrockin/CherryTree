import { defineConfig, devices } from "@playwright/test";

/**
 * Single-browser smoke config. The dev server boots once via webServer
 * (re-uses an already-running one when present) and tests share its port.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: "http://127.0.0.1:4178",
    trace: "retain-on-failure"
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],

  webServer: {
    command: "npm run build && npm run preview -- --port 4178 --strictPort",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
