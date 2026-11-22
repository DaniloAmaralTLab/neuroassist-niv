import {
  Injectable,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import {
  PATIENT_SESSION_PORT,
  PatientSessionWire,
  ProvisionSessionRequest,
} from './api/patient-session.port';

/** View-model for a patient-session row (SPEC-03 §5). */
export interface PatientSessionRow {
  id: string;
  patientId: string;
  deviceId: string;
  status: 'active' | 'revoked';
  provisionedBy: string;
  revokedBy: string | null;
  createdAt: string;
  revokedAt: string | null;
}

function toPatientSessionRow(wire: PatientSessionWire): PatientSessionRow {
  return {
    id: wire.id,
    patientId: wire.patientId,
    deviceId: wire.deviceId,
    status: wire.status,
    provisionedBy: wire.provisionedBy,
    revokedBy: wire.revokedBy,
    createdAt: wire.createdAt,
    revokedAt: wire.revokedAt,
  };
}

@Injectable({ providedIn: 'root' })
export class PatientSessionFacade {
  private readonly port = inject(PATIENT_SESSION_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _session = signal<PatientSessionRow | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  /** Tracks the id of the most recently provisioned or loaded session. */
  private readonly _lastProvisionedId = signal<string | null>(null);

  readonly session = this._session.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastProvisionedId = this._lastProvisionedId.asReadonly();

  loadSession(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.get(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: wire => { this._session.set(toPatientSessionRow(wire)); this._loading.set(false); },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }

  provision(req: ProvisionSessionRequest): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.provision(req))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: wire => {
          this._session.set(toPatientSessionRow(wire));
          this._lastProvisionedId.set(wire.id);
          this._loading.set(false);
        },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }

  /** Pessimistic revoke (SEC-001): row is updated ONLY after the server responds 204. */
  revoke(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.revoke(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const current = this._session();
          if (current?.id === id) {
            this._session.set({ ...current, status: 'revoked', revokedAt: new Date().toISOString() });
          }
          this._loading.set(false);
        },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }
}
