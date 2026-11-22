/**
 * E2E spec: Register caregiver
 * Feature: frontend/e2e/register-caregiver.feature
 * 4 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-ACS-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Register caregiver', () => {
  // TODO[FE-ACS-P9]: implement assertions for this scenario
  test.fixme('Register caregiver sends username password and role and appends the new caregiver row', async ({ page }) => {
    await page.goto('/acs');
    throw new Error('TODO[FE-ACS-P9]: implement assertions for this scenario');
  });

  // TODO[FE-ACS-P9]: implement assertions for this scenario
  test.fixme('Duplicate username shows a field error on the username input not a global toast', async ({ page }) => {
    await page.goto('/acs');
    throw new Error('TODO[FE-ACS-P9]: implement assertions for this scenario');
  });

  // TODO[FE-ACS-P9]: implement assertions for this scenario
  test.fixme('Validation error maps each field detail to its form field', async ({ page }) => {
    await page.goto('/acs');
    throw new Error('TODO[FE-ACS-P9]: implement assertions for this scenario');
  });

  // TODO[FE-ACS-P9]: implement assertions for this scenario
  test.fixme('Hide register caregiver action when the session lacks create authority and canRegister is false', async ({ page }) => {
    await page.goto('/acs');
    throw new Error('TODO[FE-ACS-P9]: implement assertions for this scenario');
  });

});
