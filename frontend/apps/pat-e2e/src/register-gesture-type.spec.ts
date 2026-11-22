/**
 * E2E spec: Register gesture type
 * Feature: frontend/e2e/register-gesture-type.feature
 * 3 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-PAT-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Register gesture type', () => {
  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Register a new gesture type inline and select it in the open gesture slot', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Reject a duplicate gesture-type code with a field error not a global toast', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Surface the caveat that naming a gesture type does not imply engine support', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

});
