import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CatalogPort, EdgeCatalogWire } from './catalog.port';

/**
 * Mock adapter for CatalogPort.
 * Returns a minimal catalog with one stub command.
 * Delay 400 ms (carry-forward: mock-adapter-delay-400ms).
 *
 * Used ONLY under an explicit mock provider in tests / offline dev.
 */
@Injectable()
export class CatalogMockAdapter implements CatalogPort {
  read(): Observable<EdgeCatalogWire> {
    const catalog: EdgeCatalogWire = {
      deviceId: 'mock-device-01',
      commands: [
        {
          id: 'mock-cmd-01',
          label: 'Help',
          urgency: 'emergency',
          sensitivity: 'medium',
          primaryPrimitive: { id: 'pp-01', code: 'BROW_RAISE', displayName: 'Raise eyebrow' },
          secondaryPrimitive: null,
          minGestureTimeMs: 0,
          maxGestureTimeMs: 2000,
          status: 'active',
        },
      ],
      fetchedAt: new Date().toISOString(),
      etag: 'mock-etag-001',
    };
    return of(catalog).pipe(delay(400));
  }
}
