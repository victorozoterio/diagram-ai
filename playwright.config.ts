import { defineConfig, devices } from '@playwright/test';

const apiURL = 'http://127.0.0.1:3100';
const webURL = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: webURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node --env-file=apps/api/.env.e2e apps/api/scripts/e2e-start-api.mjs',
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${apiURL}/api/auth/providers`,
    },
    {
      command: 'pnpm --filter @diagram-ai/web exec vite --host 127.0.0.1 --port 5174',
      env: {
        VITE_API_URL: apiURL,
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${webURL}/login`,
    },
  ],
});
