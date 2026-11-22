/**
 * E2E spec: Discreet routine notice
 * Feature: frontend/e2e/routine-notice.feature
 * 5 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-EVNT-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Discreet routine notice', () => {
  // TODO[FE-EVNT-P9]: implement assertions for this scenario
  test.skip('When the projection reports a routine event the system presents a discreet notice and does not promote it to the alarm', async ({ page }) => {
    await page.goto('/evnt');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-EVNT-P9]: implement assertions for this scenario
  test.skip('While an event urgency is not readable as emergency the system presents it as a routine notice', async ({ page }) => {
    await page.goto('/evnt');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-EVNT-P9]: implement assertions for this scenario
  test.skip('When the caregiver dismisses a routine notice the system marks it seen locally', async ({ page }) => {
    await page.goto('/evnt');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-EVNT-P9]: implement assertions for this scenario
  test.skip('When the caregiver marks a notice not real the system sends the false-positive verdict under the record authority', async ({ page }) => {
    await page.goto('/evnt');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-EVNT-P9]: implement assertions for this scenario
  test.skip('While the session lacks record authority the system hides the mark-not-real action', async ({ page }) => {
    await page.goto('/evnt');
    await expect(page).toHaveURL(/.*/);
  });

});
