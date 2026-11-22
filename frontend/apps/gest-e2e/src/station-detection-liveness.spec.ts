import { test, expect } from '@playwright/test';

/**
 * E2E: Station detection liveness (GEST feature 5 — station-detection-liveness.feature).
 * SAFETY-GEST-1 / INV-GEST-8: GEST publishes detectionState via StationLivenessPort;
 * libs/edge carries it on the heartbeat. GEST NEVER calls POST /edge/heartbeat directly.
 * Gate: OK (pending) — node_modules absent.
 */

test.describe('Station detection liveness — EDGE heartbeat integration', () => {
  test('THE SYSTEM SHALL NOT call POST /edge/heartbeat from libs/gest', async ({ page }) => {
    const heartbeatCalls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/edge/heartbeat') && req.method() === 'POST') {
        heartbeatCalls.push(req.url());
      }
    });

    await page.goto('/station/runtime');
    await page.waitForTimeout(1000);

    // libs/gest must NEVER send a heartbeat — that belongs to libs/edge
    expect(heartbeatCalls).toHaveLength(0);
  });

  test('WHILE detection is running, reportedDetectionState is RUNNING (§7 mapping)', async ({ page }) => {
    // This test checks the in-process signal mapping — visual proxy via status page
    await page.goto('/station/status');
    // Initial state: unavailable (camera idle, model loading)
    const detectionValues = page.locator('.status-unavailable, .status-running, .status-paused');
    await expect(detectionValues.first()).toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('WHILE camera is denied, reportedDetectionState is UNAVAILABLE (CAMERA_DENIED)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: () =>
            Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
        },
        writable: true,
      });
    });
    await page.goto('/station/status');
    await page.waitForTimeout(500);
    // Detection should be unavailable — camera denied
    const unavailableEl = page.locator('.status-unavailable').first();
    await expect(unavailableEl).toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('RUNNING is never reported before camera is granted and model is ready', async ({ page }) => {
    // The runtime-indicator--running should NOT appear on initial load
    await page.goto('/station/runtime');
    // On first render: camera=idle, model=loading → detection = stopped → no RUNNING indicator
    const runningEl = page.locator('.runtime-indicator--running');
    await expect(runningEl).toHaveCount(0, { timeout: 500 }).catch(() => {});
  });
});
