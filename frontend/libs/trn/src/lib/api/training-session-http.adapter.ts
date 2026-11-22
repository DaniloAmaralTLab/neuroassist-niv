import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { TrainingSessionPort } from './training-session.port';
import {
  TrainingSession,
  DialogTurnResult,
  TrainingSessionWire,
  DialogTurnWire,
  toSession,
  toProposal,
} from '../trn.model';

// Base: ${ACCESS_HTTP_BASE}/trn — NEVER /api/v1 (carry-forward `http-adapter:wrong-prefix`).
// X-Tenant-Id is derived server-side from the JWT tenantId claim; never sent by the FE (BE §0.1).

@Injectable({ providedIn: 'root' })
export class TrainingSessionHttpAdapter implements TrainingSessionPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/trn`;

  create(patientId: string): Observable<TrainingSession> {
    return this.http
      .post<TrainingSessionWire>(`${this.base}/sessions`, { patientId })
      .pipe(map(toSession));
  }

  get(sessionId: string): Observable<TrainingSession> {
    return this.http
      .get<TrainingSessionWire>(`${this.base}/sessions/${sessionId}`)
      .pipe(map(toSession));
  }

  postDialogTurn(sessionId: string, caregiverText: string): Observable<DialogTurnResult> {
    return this.http
      .post<DialogTurnWire>(`${this.base}/sessions/${sessionId}/dialog`, {
        message: caregiverText,
      })
      .pipe(
        map(w => ({
          messages: w.messages,
          newProposals: w.newProposals.map(toProposal),
        })),
      );
  }
}
