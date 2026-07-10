import { defineConfig, devices } from "@playwright/test";

const baseURL = "https://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    channel: "chrome",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    command:
      "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
