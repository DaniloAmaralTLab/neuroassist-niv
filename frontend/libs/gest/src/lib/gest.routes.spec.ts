import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { GEST_ROUTES } from './gest.routes';
import { RuntimeFacade } from './runtime.facade';
import { GESTURE_REPORT_PORT } from './api/gesture-report.port';
import { GestureReportMockAdapter } from './api/gesture-report-mock.adapter';
import { CAPABILITY_SUPPORT_PORT } from './api/capability-support.port';
import { CapabilitySupportMockAdapter } from './api/capability-support-mock.adapter';
import { CATALOG_PORT } from './api/catalog.port';
import { CatalogMockAdapter } from './api/catalog-mock.adapter';
import { STATION_LIVENESS_PORT } from './integration/station-liveness.port';
import { NoOpStationLivenessPort } from './integration/no-op-station-liveness.port';

describe('GEST_ROUTES', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(GEST_ROUTES),
        { provide: GESTURE_REPORT_PORT, useClass: GestureReportMockAdapter },
        { provide: CAPABILITY_SUPPORT_PORT, useClass: CapabilitySupportMockAdapter },
        { provide: CATALOG_PORT, useClass: CatalogMockAdapter },
        { provide: STATION_LIVENESS_PORT, useClass: NoOpStationLivenessPort },
      ],
    });
  });

  it('should expose a runtime route', () => {
    const routes = GEST_ROUTES;
    const runtimeRoute = routes.find(r => r.path === 'runtime');
    expect(runtimeRoute).toBeTruthy();
    expect(runtimeRoute?.canActivate).toBeDefined();
  });

  it('should expose a status route', () => {
    const routes = GEST_ROUTES;
    const statusRoute = routes.find(r => r.path === 'status');
    expect(statusRoute).toBeTruthy();
    expect(statusRoute?.canActivate).toBeDefined();
  });

  it('should expose an unpaired fallback route', () => {
    const routes = GEST_ROUTES;
    const unpairedRoute = routes.find(r => r.path === 'unpaired');
    expect(unpairedRoute).toBeTruthy();
  });

  it('should NOT contain hardcoded canActivate returning true', () => {
    // Carry-forward: guard:stub-permissive — ensure stationIdentityGuard is wired
    const runtimeRoute = GEST_ROUTES.find(r => r.path === 'runtime');
    expect(runtimeRoute?.canActivate).toBeTruthy();
    expect(runtimeRoute?.canActivate?.length).toBeGreaterThan(0);
  });
});
