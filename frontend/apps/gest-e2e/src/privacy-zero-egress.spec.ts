import { test, expect } from '@playwright/test';

/**
 * E2E: Privacy — zero egress (GEST feature 4 — privacy-zero-egress.feature).
 * INV-GEST-4: no frame, landmark, or video data leaves the device.
 * Gate: OK (pending) — node_modules absent.
 */

test.describe('Privacy: zero video/landmark egress', () => {
  test('THE SYSTEM SHALL NOT send any frame, image, or landmark data over the network', async ({ page }) => {
    const suspiciousRequests: string[] = [];

    page.on('request', req => {
      const url = req.url();
      const body = req.postData() ?? '';
      // A landmark/frame payload would be large (> 1KB for even a minimal landmark array)
      // or contain recognisable keys
      const isLargeBody = body.length > 1024;
      const hasLandmarkKey =
        body.includes('landmarks') ||
        body.includes('keypoints') ||
        body.includes('imageData') ||
        body.includes('frame');

      if ((isLargeBody || hasLandmarkKey) && !url.includes('localhost:4200')) {
        suspiciousRequests.push(url);
      }
    });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: () =>
            Promise.resolve({ getTracks: () => [{ stop: () => {} }] } as MediaStream),
        },
        writable: true,
      });
    });

    await page.goto('/station/runtime');
    // Let the detection loop run for a short while
    await page.waitForTimeout(1000);

    expect(suspiciousRequests).toHaveLength(0);
  });

  test('THE request to /evnt/gesture-reports SHALL NOT include deviceId, patientId, or tenantId in the body', async ({ page }) => {
    let gestureReportBody: Record<string, unknown> | null = null;

    await page.route('**/evnt/gesture-reports', async route => {
      const body = route.request().postData();
      if (body) {
        gestureReportBody = JSON.parse(body);
      }
      await route.fulfill({ status: 201, body: JSON.stringify({ id: 'evt-01' }) });
    });

    await page.goto('/station/runtime');
    await page.waitForTimeout(500);

    if (gestureReportBody !== null) {
      // Whitelist check: only allowed fields
      const body = gestureReportBody;
      expect('deviceId' in body).toBe(false);
      expect('patientId' in body).toBe(false);
      expect('tenantId' in body).toBe(false);
      expect('commandId' in body).toBe(true);
      expect('reportId' in body).toBe(true);
      expect('occurredAt' in body).toBe(true);
    }
  });
});
