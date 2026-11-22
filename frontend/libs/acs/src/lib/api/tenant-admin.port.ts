import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror BE api-contract §5 (Tenant onboarding — ops-only).
// Keep in sync with acs-service (source of truth: api-contract.md §5).
// Authority acs.tenant.onboard is restricted to platform-ops (ADR-011, INV-5).

export type TenantType = 'family' | 'clinic';

/** Mirrors POST /acs/ops/tenants response (api-contract §5.1). */
export interface TenantWire {
  id: string;
  type: TenantType;
  name: string;
}

/** Request body for POST /acs/ops/tenants (api-contract §5.1). */
export interface OnboardTenantRequest {
  /** Must not drop any field — carry-forward `http-adapter:request-body-field-whitelist`. */
  type: TenantType;
  name: string;
}

export interface TenantAdminPort {
  /** POST /acs/ops/tenants — authority acs.tenant.onboard (platform-ops only, INV-5). */
  onboard(req: OnboardTenantRequest): Observable<TenantWire>;
}

export const TENANT_ADMIN_PORT = new InjectionToken<TenantAdminPort>('TenantAdminPort');
