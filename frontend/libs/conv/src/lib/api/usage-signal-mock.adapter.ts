import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { UsageSignalPort, UsageSignalRequest } from './usage-signal.port';

/**
 * UsageSignalMockAdapter — no-op stub for dev / e2e.
 * Consumes the signal and responds as a 202 would. No persistence.
 * Opt-in feature (conv.usage-signal.enabled = off by default, INV-CONV-6).
 */
@Injectable()
export class UsageSignalMockAdapter implements UsageSignalPort {
  record(_signal: UsageSignalRequest): Observable<void> {
    return of(undefined).pipe(delay(100));
  }
}
