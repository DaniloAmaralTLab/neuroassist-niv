import {
  Injectable,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import {
  CAREGIVER_PORT,
  CaregiverWire,
  PatientLinkWire,
  RegisterCaregiverRequest,
} from './api/caregiver.port';

/** View-model for a caregiver row (SPEC-03 §5). */
export interface CaregiverRow {
  id: string;
  username: string;
  role: 'caregiver' | 'clinic_coordinator';
  status: 'active' | 'deactivated';
  tenantId: string;
}

function toCaregiverRow(wire: CaregiverWire): CaregiverRow {
  return { id: wire.id, username: wire.username, role: wire.role, status: wire.status, tenantId: wire.tenantId };
}

@Injectable({ providedIn: 'root' })
export class CaregiverFacade {
  private readonly port = inject(CAREGIVER_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _me = signal<CaregiverRow | null>(null);
  private readonly _links = signal<PatientLinkWire[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly me = this._me.asReadonly();
  readonly links = this._links.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Active links for a specific caregiver. */
  linksFor(caregiverId: string) {
    return computed(() => this._links().filter(l => l.caregiverId === caregiverId));
  }

  loadMe(): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.me())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: wire => { this._me.set(toCaregiverRow(wire)); this._loading.set(false); },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }

  loadLinks(caregiverId: string): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.listLinks(caregiverId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: links => { this._links.set(links); this._loading.set(false); },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }

  register(req: RegisterCaregiverRequest): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.register(req))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this._loading.set(false); },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }

  deactivate(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.deactivate(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this._loading.set(false); },
        error: err => { this._error.set(err.message); this._loading.set(false); },
      });
  }
}
