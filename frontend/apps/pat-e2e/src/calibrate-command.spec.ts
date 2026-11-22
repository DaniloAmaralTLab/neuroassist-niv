/**
 * E2E spec: Calibrate command
 * Feature: frontend/e2e/calibrate-command.feature
 * 3 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-PAT-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Calibrate command', () => {
  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Recalibrate an active command and replace the row after the server confirms', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Show an inline banner when a calibration save hits a retired command', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Map a validation error on calibration to the duration field without mutating the row', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

});
