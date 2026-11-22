import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  CaregiverPort,
  CaregiverWire,
  PatientLinkWire,
  RegisterCaregiverRequest,
} from './caregiver.port';

// Seed data from design-reference/shared/mock-data.ts (ACS slice).
const MOCK_CAREGIVER: CaregiverWire = {
  id: 'cg-jamilly',
  tenantId: 'tenant-family-amaral',
  username: 'jamilly.amaral',
  role: 'caregiver',
  status: 'active',
};

const MOCK_LINKS: PatientLinkWire[] = [
  { id: 'link-jamilly-marcio', caregiverId: 'cg-jamilly', patientId: 'pat-marcio' },
];

@Injectable()
export class CaregiverMockAdapter implements CaregiverPort {
  private caregivers: CaregiverWire[] = [MOCK_CAREGIVER];
  private links: PatientLinkWire[] = [...MOCK_LINKS];

  me(): Observable<CaregiverWire> {
    return of(MOCK_CAREGIVER).pipe(delay(400));
  }

  register(req: RegisterCaregiverRequest): Observable<CaregiverWire> {
    const newCaregiver: CaregiverWire = {
      id: `cg-${Date.now()}`,
      tenantId: 'tenant-family-amaral',
      username: req.username,
      role: req.role,
      status: 'active',
    };
    this.caregivers = [...this.caregivers, newCaregiver];
    return of(newCaregiver).pipe(delay(400));
  }

  deactivate(id: string): Observable<void> {
    this.caregivers = this.caregivers.map(c =>
      c.id === id ? { ...c, status: 'deactivated' as const } : c,
    );
    return of(undefined).pipe(delay(400));
  }

  listLinks(caregiverId: string): Observable<PatientLinkWire[]> {
    return of(this.links.filter(l => l.caregiverId === caregiverId)).pipe(delay(400));
  }

  link(caregiverId: string, patientId: string): Observable<PatientLinkWire> {
    const link: PatientLinkWire = {
      id: `link-${caregiverId}-${patientId}`,
      caregiverId,
      patientId,
    };
    this.links = [...this.links, link];
    return of(link).pipe(delay(400));
  }

  unlink(caregiverId: string, patientId: string): Observable<void> {
    this.links = this.links.filter(
      l => !(l.caregiverId === caregiverId && l.patientId === patientId),
    );
    return of(undefined).pipe(delay(400));
  }
}
