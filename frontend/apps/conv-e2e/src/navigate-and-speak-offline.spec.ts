/**
 * E2E spec: Navigate the speech tree and speak offline
 * Feature: frontend/e2e/navigate-and-speak-offline.feature
 * 3 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-CONV-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Navigate the speech tree and speak offline', () => {
  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('Navigating to the converse route renders the speech-tree navigator', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('Navigation and playback are served entirely from the local cache with zero network', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-CONV-P9]: implement assertions for this scenario
  test.skip('Only dual-authorized phrases render while categories always render', async ({ page }) => {
    await page.goto('/conv');
    await expect(page).toHaveURL(/.*/);
  });

});
