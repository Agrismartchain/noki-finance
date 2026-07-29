import { defineConfig, devices } from "@playwright/test";

const APP_PORT = Number(process.env.NOKI_FINANCE_E2E_PORT ?? 4500);
const API_PORT = Number(process.env.NOKI_FINANCE_E2E_API_PORT ?? 4701);
const appUrl = `http://localhost:${APP_PORT}`;
const apiUrl = `http://127.0.0.1:${API_PORT}`;

/**
 * CI-grade Playwright config: because noki-finance's BFF architecture means
 * every noki-api call happens server-side (never from the browser), "network
 * -level controlled APIs" (spec section 28) means pointing the real Next.js
 * server's NOKI_API_BASE_URL at a stub HTTP server (e2e/support/stub-api-server.mjs),
 * not browser-level page.route() interception -- Playwright drives the real
 * app against real (stubbed, deterministic) HTTP responses, and no mock
 * fixture is ever imported into application source.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: `node e2e/support/stub-api-server.mjs ${API_PORT}`,
      url: `${apiUrl}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static && NODE_ENV=production NOKI_API_BASE_URL=${apiUrl} HOSTNAME=0.0.0.0 PORT=${APP_PORT} node .next/standalone/server.js`,
      url: `${appUrl}/fr/login`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
