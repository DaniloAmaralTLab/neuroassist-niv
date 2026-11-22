import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  CapabilitySupportPort,
  GestEngineWire,
  SupportCheckRequestWire,
  SupportCheckResultWire,
} from './capability-support.port';

/**
 * Mock adapter for CapabilitySupportPort.
 * Returns all submitted codes as 'supported' + a single mock engine entry.
 * Delay 400 ms (carry-forward: mock-adapter-delay-400ms).
 *
 * Used ONLY under an explicit mock provider in tests / offline dev.
 */
@Injectable()
export class CapabilitySupportMockAdapter implements CapabilitySupportPort {
  checkSupport(req: SupportCheckRequestWire): Observable<SupportCheckResultWire> {
    const result: SupportCheckResultWire = {
      engineVersion: req.engineVersion,
      results: req.codes.map(code => ({
        code,
        supportStatus: 'supported' as const,
        detectable: true,
      })),
    };
    return of(result).pipe(delay(400));
  }

  listEngines(): Observable<GestEngineWire[]> {
    const engines: GestEngineWire[] = [
      {
        id: 'mock-engine-01',
        version: 'mock-v1.0.0',
        status: 'active',
        releaseDate: '2026-01-01T00:00:00Z',
      },
    ];
    return of(engines).pipe(delay(400));
  }
}
