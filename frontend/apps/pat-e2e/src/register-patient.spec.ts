/**
 * E2E spec: Register patient
 * Feature: frontend/e2e/register-patient.feature
 * 2 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-PAT-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Register patient', () => {
  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Register a patient with a name and advance the onboarding wizard to the first command step', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Keep submit disabled while the patient name is blank', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

});
