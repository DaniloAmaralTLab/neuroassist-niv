import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  PatientSessionPort,
  PatientSessionWire,
  ProvisionSessionRequest,
} from './patient-session.port';

// Seed data from design-reference/shared/mock-data.ts (patientSessions).
const MOCK_SESSIONS: PatientSessionWire[] = [
  {
    id: 'sess-marcio-phone',
    patientId: 'pat-marcio',
    deviceId: 'edge-marcio-phone',
    status: 'active',
    provisionedBy: 'cg-jamilly',
    revokedBy: null,
    createdAt: '2026-08-30T09:00:00Z',
    revokedAt: null,
  },
];

@Injectable()
export class PatientSessionMockAdapter implements PatientSessionPort {
  private sessions: PatientSessionWire[] = [...MOCK_SESSIONS];

  get(id: string): Observable<PatientSessionWire> {
    const session = this.sessions.find(s => s.id === id);
    if (!session) {
      throw new Error(`PatientSession ${id} not found`);
    }
    return of(session).pipe(delay(400));
  }

  provision(req: ProvisionSessionRequest): Observable<PatientSessionWire> {
    const newSession: PatientSessionWire = {
      id: `sess-${req.patientId}-${Date.now()}`,
      patientId: req.patientId,
      deviceId: req.deviceId,
      status: 'active',
      provisionedBy: 'cg-jamilly', // resolved from auth session in production
      revokedBy: null,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    };
    this.sessions = [...this.sessions, newSession];
    return of(newSession).pipe(delay(400));
  }

  /** Pessimistic revoke (SEC-001): simulate server blacklist latency. */
  revoke(id: string): Observable<void> {
    this.sessions = this.sessions.map(s =>
      s.id === id
        ? { ...s, status: 'revoked' as const, revokedAt: new Date().toISOString() }
        : s,
    );
    return of(undefined).pipe(delay(400));
  }
}
