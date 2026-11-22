import {
  Injectable,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import {
  TENANT_ADMIN_PORT,
  TenantWire,
  OnboardTenantRequest,
} from './api/tenant-admin.port';

/** View-model for a tenant (SPEC-03 §5). */
export interface TenantRow {
  id: string;
  type: 'family' | 'clinic';
  name: string;
}

function toTenantAdmin(wire: TenantWire): TenantRow {
  return { id: wire.id, type: wire.type, name: wire.name };
}

@Injectable({ providedIn: 'root' })
export class TenantAdminFacade {
  private readonly port = inject(TENANT_ADMIN_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _lastOnboarded = signal<TenantRow | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly lastOnboarded = this._lastOnboarded.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  onboard(req: OnboardTenantRequest): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.onboard(req))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: wire => {
          this._lastOnboarded.set(toTenantAdmin(wire));
          this._loading.set(false);
        },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }
}
