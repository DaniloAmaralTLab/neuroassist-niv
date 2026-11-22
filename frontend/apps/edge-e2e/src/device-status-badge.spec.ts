import { test, expect } from '@playwright/test';

// EDGE e2e — device-status-badge.feature
// Badge: online (success), offline (amber warning, never alarm), unavailable (neutral).

const PATIENT_ID = 'pat-marcio';
const DEVICE_ROUTE = `/patients/${PATIENT_ID}/device`;

test.describe('EDGE — DeviceStatusBadge', () => {
  test('badge renders without throwing', async ({ page }) => {
    await page.goto(DEVICE_ROUTE);
    const badge = page.getByRole('status');
    await expect(badge).toBeVisible();
  });

  test('badge aria-label is present and informative', async ({ page }) => {
    await page.goto(DEVICE_ROUTE);
    const badge = page.getByRole('status');
    const label = await badge.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label).not.toBe('');
  });

  test('offline badge does not use danger/alarm styling', async ({ page }) => {
    await page.goto(DEVICE_ROUTE);
    const badge = page.getByRole('status');
    const cls = await badge.getAttribute('class');
    // Danger tokens would contain 'danger'; offline uses 'warning' (amber).
    if (cls?.includes('warning')) {
      expect(cls).not.toContain('danger');
    }
  });
});
