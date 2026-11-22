/**
 * E2E spec: Training session and LLM states
 * Feature: frontend/e2e/training-session-and-llm-states.feature
 * 5 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-TRN-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Training session and LLM states', () => {
  // TODO[FE-TRN-P9]: implement assertions for this scenario
  test.skip('Navigating to training renders the training-session authoring surface', async ({ page }) => {
    await page.goto('/trn');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-TRN-P9]: implement assertions for this scenario
  test.skip('A dialog turn in flight shows the responding state and renders no fabricated proposal', async ({ page }) => {
    await page.goto('/trn');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-TRN-P9]: implement assertions for this scenario
  test.skip('An llm-unavailable dialog turn shows assistant-unavailable with retry and preserves drafts', async ({ page }) => {
    await page.goto('/trn');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-TRN-P9]: implement assertions for this scenario
  test.skip('Ending a session with pending proposals persists them as ended-pending without discard', async ({ page }) => {
    await page.goto('/trn');
    await expect(page).toHaveURL(/.*/);
  });

  // TODO[FE-TRN-P9]: implement assertions for this scenario
  test.skip('Proposal state and dual-authorization are derived only from trn-service never a single side', async ({ page }) => {
    await page.goto('/trn');
    await expect(page).toHaveURL(/.*/);
  });

});
