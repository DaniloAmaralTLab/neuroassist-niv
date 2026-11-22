/**
 * E2E spec: Retire command
 * Feature: frontend/e2e/retire-command.feature
 * 2 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-PAT-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Retire command', () => {
  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Retire an active command and drop it from the active catalog list', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-PAT-P9]: implement assertions for this scenario
  test.skip('Retiring an already-retired command is an idempotent no-op', async ({ page }) => {
    await page.goto('/pat');
    await expect(page).toHaveURL(/.*/);
  });

});
