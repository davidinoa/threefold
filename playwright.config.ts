import { defineConfig, devices } from "@playwright/test"

// Seam 1: the app, end to end, against the production build served by the
// Workers runtime with a local D1 (system design §5.10). `pnpm e2e` builds
// first.
const port = 4173

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    // Run Vite directly, not through `pnpm exec`, which starts it outside the
    // process group Playwright stops. SIGTERM lets Vite stop workerd too.
    command: `vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // The iPhone's engine, for the journeys that need no passkey.
    { name: "webkit", use: { ...devices["iPhone 17 Pro"] } },
    {
      name: "reduced motion",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: { reducedMotion: "reduce" },
      },
    },
  ],
})
