import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { TenantAdminPort, TenantWire, OnboardTenantRequest } from './tenant-admin.port';

// Seed data from design-reference/shared/mock-data.ts (tenants).
const MOCK_TENANTS: TenantWire[] = [
  { id: 'tenant-family-amaral', type: 'family', name: 'Amaral Family' },
];

@Injectable()
export class TenantAdminMockAdapter implements TenantAdminPort {
  private tenants: TenantWire[] = [...MOCK_TENANTS];

  onboard(req: OnboardTenantRequest): Observable<TenantWire> {
    const newTenant: TenantWire = {
      id: `tenant-${Date.now()}`,
      type: req.type,
      name: req.name,
    };
    this.tenants = [...this.tenants, newTenant];
    return of(newTenant).pipe(delay(400));
  }
}
