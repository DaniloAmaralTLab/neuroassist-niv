/**
 * E2E spec: Entry ownership and shell routing
 * Feature: frontend/e2e/entry-and-shell-routing.feature
 * 5 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-DASH-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Entry ownership and shell routing', () => {
  // TODO[FE-DASH-P9]: implement assertions for this scenario
  test.skip('entry is a shell route, not a DASH route', async ({ page }) => {
    await page.goto('/dash');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-DASH-P9]: implement assertions for this scenario
  test.skip('entry is promoted as a shell route into the ACS login flow', async ({ page }) => {
    await page.goto('/dash');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-DASH-P9]: implement assertions for this scenario
  test.skip('authGuard redirects an unauthenticated caregiver from home to the login flow', async ({ page }) => {
    await page.goto('/dash');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-DASH-P9]: implement assertions for this scenario
  test.skip('dashGuard denies home and redirects to a safe fallback', async ({ page }) => {
    await page.goto('/dash');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-DASH-P9]: implement assertions for this scenario
  test.skip('Shell pushes the active patient to the composed modules', async ({ page }) => {
    await page.goto('/dash');
    await expect(page).toHaveURL(/.*/);
  });

});
