import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PATIENT_PORT } from './api/patient.port';
import type { PatientWire, RegisterPatientRequest } from './api/patient.port';

export type PatientRow = PatientWire;

@Injectable({ providedIn: 'root' })
export class PatientFacade {
  private readonly port = inject(PATIENT_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _items = signal<PatientWire[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .list('active')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: patients => {
          this._items.set(patients);
          this._loading.set(false);
        },
        error: err => {
          this._error.set(err?.message ?? 'Failed to load patients');
          this._loading.set(false);
        },
      });
  }

  register(req: RegisterPatientRequest): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .register(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: patient => {
          this._items.update(list => [...list, patient]);
          this._loading.set(false);
        },
        error: err => {
          this._error.set(err?.message ?? 'Failed to register patient');
          this._loading.set(false);
        },
      });
  }
}
