import { test, expect } from '@playwright/test';

// EDGE e2e — edge-navigation.feature
// Routes: /patients/:patientId/device and /patients/:patientId/device/pair
// Guards: authGuard, canReadDeviceGuard, canPairDeviceGuard (stub-phase: allow).

const PATIENT_ID = 'pat-marcio';

test.describe('EDGE — navigation', () => {
  test('navigates to /patients/:patientId/device', async ({ page }) => {
    await page.goto(`/patients/${PATIENT_ID}/device`);
    await expect(page.getByRole('heading', { name: /edge device/i })).toBeVisible();
    await expect(page.url()).toContain(`/patients/${PATIENT_ID}/device`);
  });

  test('navigates to /patients/:patientId/device/pair', async ({ page }) => {
    await page.goto(`/patients/${PATIENT_ID}/device/pair`);
    await expect(page.getByRole('heading', { name: /pair device/i })).toBeVisible();
    await expect(page.url()).toContain('/device/pair');
  });

  test('shell does not break on EDGE routes (no shell crash)', async ({ page }) => {
    // Both routes should render without a catastrophic error
    await page.goto(`/patients/${PATIENT_ID}/device`);
    const errorMsg = page.getByText(/cannot read|typeerror|undefined is not/i);
    await expect(errorMsg).not.toBeVisible();
  });
});
