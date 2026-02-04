import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/ui-tests',
  fullyParallel: false, // Run serially for integration tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000,
  use: {
    baseURL: process.env.DASHBOARD_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start Dashboard before running tests
  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd ../../apps/dashboard && npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
