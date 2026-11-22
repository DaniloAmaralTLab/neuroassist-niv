/**
 * E2E spec: Live webcam test
 * Feature: frontend/e2e/live-webcam-test.feature
 * 2 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-PAT-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Live webcam test', () => {
  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Start the live webcam test and show the active preview state', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('An unavailable webcam sets the live-test error state and keeps the save control enabled', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

});
