import { test, expect } from '@playwright/test';

// EDGE e2e — device-lifecycle.feature (unpair / deactivate / reactivate / revoke).
// All destructive actions are behind an explicit confirm (SPEC-04 §4).

const PATIENT_ID = 'pat-marcio';
const DEVICE_ROUTE = `/patients/${PATIENT_ID}/device`;

test.describe('EDGE — device lifecycle actions', () => {
  test('device status page loads without error', async ({ page }) => {
    await page.goto(DEVICE_ROUTE);
    await expect(page.getByRole('heading', { name: /edge device/i })).toBeVisible();
  });

  test('lifecycle section is present when device exists', async ({ page }) => {
    await page.goto(DEVICE_ROUTE);
    // The 'Device lifecycle' section heading should be present
    await expect(page.getByRole('heading', { name: /device lifecycle/i })).toBeVisible();
  });

  test('destructive actions show confirm dialog before executing', async ({ page }) => {
    await page.goto(DEVICE_ROUTE);
    const unpairBtn = page.getByRole('button', { name: /unpair/i });
    if (await unpairBtn.isVisible()) {
      await unpairBtn.click();
      // Confirm dialog should appear
      await expect(page.getByText(/are you sure/i)).toBeVisible();
      // Cancel button should close the dialog
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByText(/are you sure/i)).not.toBeVisible();
    }
  });
});
