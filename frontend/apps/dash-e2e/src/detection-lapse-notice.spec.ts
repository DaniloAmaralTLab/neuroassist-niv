/**
 * E2E spec: Online but not detecting notice
 * Feature: frontend/e2e/detection-lapse-notice.feature
 * 2 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-DASH-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Online but not detecting notice', () => {
  // TODO[FE-DASH-P9]: implement assertions for this scenario
  test.skip('Online but not detecting shows an amber notice, never emergency', async ({ page }) => {
    await page.goto('/dash');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-DASH-P9]: implement assertions for this scenario
  test.skip('Missing evnt.detection-lapse.read keeps the not-detecting source unknown and blocks all clear', async ({ page }) => {
    await page.goto('/dash');
    await expect(page).toHaveURL(/.*/);
  });

});
