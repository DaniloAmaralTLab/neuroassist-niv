import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { UsageSignalPort, UsageSignalRequest } from './usage-signal.port';

// Base: ${ACCESS_HTTP_BASE}/conv — NEVER /api/v1.
// POST /conv/usage-signals — 202/200 idempotent; phraseId + timestamp ONLY, no free text (INV-CONV-6).
// Opt-in: disabled by default (conv.usage-signal.enabled = off); never blocks playback.

@Injectable({ providedIn: 'root' })
export class UsageSignalHttpAdapter implements UsageSignalPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/conv`;

  record(signal: UsageSignalRequest): Observable<void> {
    return this.http
      .post(`${this.base}/usage-signals`, {
        phraseId: signal.phraseId,
        occurredAt: signal.occurredAt,
        idempotencyKey: signal.idempotencyKey,
      })
      .pipe(map(() => undefined));
  }
}
