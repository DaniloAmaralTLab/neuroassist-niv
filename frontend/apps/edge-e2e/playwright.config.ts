import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for EDGE e2e (A5 e2e-validate gate).
 * 5 features: pair-edge-device, pair-patient-phone, device-status-badge,
 * device-lifecycle, edge-navigation.
 * Registered by /fe-architect-promote neuroassist-niv EDGE (D-487 pattern).
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
