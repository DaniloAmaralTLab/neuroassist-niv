import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { TenantAdminPort, TenantWire, OnboardTenantRequest } from './tenant-admin.port';

// Base: ${ACCESS_HTTP_BASE}/acs/ops (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// Authority acs.tenant.onboard — platform-ops only (ADR-011, INV-5).
// Route guarded by opsHostGuard in ACS_ROUTES.

@Injectable({ providedIn: 'root' })
export class TenantAdminHttpAdapter implements TenantAdminPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/acs`;

  onboard(req: OnboardTenantRequest): Observable<TenantWire> {
    return this.http.post<TenantWire>(`${this.base}/ops/tenants`, {
      type: req.type,
      name: req.name,
    });
  }
}
