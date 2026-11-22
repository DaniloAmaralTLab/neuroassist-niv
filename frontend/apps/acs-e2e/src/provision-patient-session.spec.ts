/**
 * E2E spec: Provision a patient session
 * Feature: frontend/e2e/provision-patient-session.feature
 * 3 scenarios (BDD -> Playwright stubs)
 * Gate: A5 e2e-validate (structural). Prototype-first (D-484), registered by
 * fe-nx-register-module.py (D-487).
 * TODO[FE-ACS-P9]: implement with real selectors after fe-implement.
 */
import { test, expect } from '@playwright/test';

test.describe('Provision a patient session', () => {
  // TODO[FE-ACS-P9]: implement assertions for this scenario
  test.fixme('Confirm the persistent-session warning then provision the patient phone sending patientId and deviceId', async ({ page }) => {
    await page.goto('/acs');
    throw new Error('TODO[FE-ACS-P9]: implement assertions for this scenario');
  });

  // TODO[FE-ACS-P9]: implement assertions for this scenario
  test.fixme('While a patient session is active the system displays active since and never a countdown', async ({ page }) => {
    await page.goto('/acs');
    throw new Error('TODO[FE-ACS-P9]: implement assertions for this scenario');
  });

  // TODO[FE-ACS-P9]: implement assertions for this scenario
  test.fixme('Hide the provision action when the session lacks provision authority', async ({ page }) => {
    await page.goto('/acs');
    throw new Error('TODO[FE-ACS-P9]: implement assertions for this scenario');
  });

});
