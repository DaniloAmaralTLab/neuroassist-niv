import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for GEST e2e (A5 e2e-validate gate — D-487 pattern).
 * 5 features (from docs/architecture/frontend/modules/gest/frontend/e2e/):
 *   - recognise-and-report
 *   - station-identity-and-runtime
 *   - offline-queue-and-retry
 *   - privacy-zero-egress
 *   - station-detection-liveness
 *
 * Harness: fake-getUserMedia + stub-classifier (deterministic recognition; no real model in CI).
 * Registered by /fe-architect-promote neuroassist-niv GEST (D-487 pattern).
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env['APP_URL'] ?? 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
