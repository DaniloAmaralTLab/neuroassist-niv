import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  HistoryPort,
  HistoryPageWire,
  HistoryQueryParams,
} from './history.port';

// Base: ${ACCESS_HTTP_BASE}/hist  (NOT /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// Paths follow the FE API CONTRACT (BE api-contract §2).
// X-Tenant-Id is NEVER sent — tenant is derived from the JWT claim server-side (BE §0/§6).
// HIST is READ-ONLY: this adapter exposes ZERO write methods (ADR-005, SPEC-04 §3).

@Injectable({ providedIn: 'root' })
export class HistoryHttpAdapter implements HistoryPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/hist`;

  /**
   * GET /hist/patients/{patientId}/history
   * authority: hist.history.read
   * Params: period=today|week|month XOR from/to range; cursor (keyset); size (1..100).
   * First page (cursor absent) includes summary over the whole period (G-HIST-4 CLOSED).
   * carry-forward: `http-adapter:wrong-prefix` — base is ${ACCESS_HTTP_BASE}/hist, NOT /api/v1.
   */
  getHistory(patientId: string, params: HistoryQueryParams = {}): Observable<HistoryPageWire> {
    let httpParams = new HttpParams();

    if (params.from && params.to) {
      // Explicit range — both required together (BE §2: one alone → 400)
      httpParams = httpParams.set('from', params.from).set('to', params.to);
    } else if (params.period) {
      httpParams = httpParams.set('period', params.period);
    }
    // No default: the FE always sends period explicitly (default 'today' per BE; FE default is 'week')
    // — the FE sends its selection rather than relying on the server default (SPEC-04 §3).

    if (params.cursor) {
      httpParams = httpParams.set('cursor', params.cursor);
    }
    if (params.size != null) {
      httpParams = httpParams.set('size', String(params.size));
    }

    return this.http.get<HistoryPageWire>(
      `${this.base}/patients/${patientId}/history`,
      { params: httpParams },
    );
  }
}
