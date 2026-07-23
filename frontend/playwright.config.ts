// playwright.config.ts
// Configuration for Playwright E2E tests
// Defines browser settings, test directory, web server

import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration
 *
 * Purpose:
 * - Define which browsers to test (Chromium, Firefox, WebKit)
 * - Configure local development server
 * - Set timeout and retry settings
 * - Enable screenshots and videos on failure
 */

export default defineConfig({
  // Directory containing E2E tests
  testDir: './tests/E2E',
  testIgnore: ['**/debug-*.spec.ts'],

  // Maximum time one test can run (30 seconds)
  timeout: 30 * 1000,

  // E2E tests hit a real API and bcrypt/Redis, so serial execution is more stable.
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests once on CI
  retries: process.env.CI ? 1 : 0,

  // Number of parallel workers
  workers: 1,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL for navigation (e.g., page.goto('/'))
    baseURL: 'http://localhost:5173',

    // Collect trace on first retry of failed test
    trace: 'on-first-retry',

    // Take screenshots on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Uncomment to test on WebKit (Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Uncomment to test on mobile browsers
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: [
    {
      command: 'npm run dev --prefix ../backend',
      url: 'http://localhost:3001/health/ready',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes to start dev server
      env: {
        PORT: '3001',
        CORS_ORIGINS: 'http://localhost:5173',
        RATE_LIMIT_MAX_REQUESTS: '1000',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes to start dev server
      env: {
        VITE_SOCKET_URL: 'http://localhost:3001',
      },
    },
  ],
})
