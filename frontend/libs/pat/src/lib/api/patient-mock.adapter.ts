import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { PatientPort, PatientWire, RegisterPatientRequest, PatientStatus } from './patient.port';

// Seed data from design-reference/shared/mock-data.ts (PAT slice).
// Fields mapped to BE wire shape: `name` → `label` (api-contract §1).

const MOCK_PATIENTS: PatientWire[] = [
  {
    id: 'pat-marcio',
    tenantId: 'tenant-family-amaral',
    label: 'Márcio Amaral',
    deviceId: 'edge-marcio-01',
    status: 'active',
    createdBy: 'cg-jamilly',
    createdAt: '2026-07-27T00:00:00Z',
  },
];

@Injectable()
export class PatientMockAdapter implements PatientPort {
  private patients: PatientWire[] = [...MOCK_PATIENTS];

  list(status: PatientStatus | 'all' = 'active'): Observable<PatientWire[]> {
    const result =
      status === 'all' ? this.patients : this.patients.filter(p => p.status === status);
    return of(result).pipe(delay(400));
  }

  get(patientId: string): Observable<PatientWire> {
    const patient = this.patients.find(p => p.id === patientId) ?? MOCK_PATIENTS[0];
    return of(patient).pipe(delay(400));
  }

  register(req: RegisterPatientRequest): Observable<PatientWire> {
    const newPatient: PatientWire = {
      id: `pat-${Date.now()}`,
      tenantId: 'tenant-family-amaral',
      label: req.label,
      deviceId: req.deviceId ?? null,
      status: 'active',
      createdBy: 'cg-jamilly',
      createdAt: new Date().toISOString(),
    };
    this.patients = [...this.patients, newPatient];
    return of(newPatient).pipe(delay(400));
  }
}
