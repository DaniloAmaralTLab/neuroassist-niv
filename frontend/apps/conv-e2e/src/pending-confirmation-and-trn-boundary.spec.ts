/**
 * E2E spec: Pending-confirmation banner and the TRN authoring boundary
 * Feature: frontend/e2e/pending-confirmation-and-trn-boundary.feature
 * 5 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-CONV-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Pending-confirmation banner and the TRN authoring boundary', () => {
  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('Caregiver-confirmed phrases awaiting patient confirmation show the link-out banner', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('The confirm-training surface is a link-out, not a CONV route', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('CONV registers exactly one route and no publish, retire or erase route', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('The CONV UI exposes no publish, retire or erase affordance', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('The permission map holds only the three patient-session authorities', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

});
