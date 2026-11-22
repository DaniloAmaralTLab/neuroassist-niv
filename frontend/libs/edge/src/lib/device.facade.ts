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
  EDGE_DEVICE_PORT,
  EdgeDeviceWire,
  EdgeLifecycleState,
  EdgeConnectivity,
  EnrollResultWire,
} from './api/edge-device.port';

// View-model types (SPEC-03).
// version is intentionally absent — G-EDGE-2: no BE field exists; never fabricate it.

export type DeviceConnectivity = EdgeConnectivity;
export type DeviceLifecycleState = EdgeLifecycleState;

export interface EdgeDeviceVM {
  id: string;
  patientId: string;
  lifecycleState: DeviceLifecycleState;
  /** From BE `connectivity`; null WHILE lifecycleState != 'paired'. */
  status: DeviceConnectivity | null;
  /** From BE `lastHeartbeatAt`; null before the first heartbeat. */
  lastSyncAt: string | null;
  // version is explicitly absent — G-EDGE-2: no BE field yet.
  pairedAt: string | null;
}

export interface DeviceStatusVM {
  device: EdgeDeviceVM | null;
  badge: 'online' | 'offline' | 'unavailable';
  /** Display-only relative time; null when lastSyncAt is null. */
  lastSyncRelative: string | null;
  loading: boolean;
  canRead: boolean; // set by the caller (AccessDecisionService.can)
}

export interface DevicePairingVM {
  mode: 'station' | 'phone';
  existingDevice: EdgeDeviceVM | null;
  pairing: 'idle' | 'pairing' | 'paired' | 'error';
  /** Held transiently for display only; from POST /edge/devices (enroll). INV-EDGE-3. */
  pairingCode: string | null;
  pairingCodeExpiresAt: string | null;
  canPair: boolean; // set by the caller (AccessDecisionService.can)
  platformSupported: boolean; // phone mode: Android/Chromium check (PLAT-001)
  error: string | null;
}

export interface DeviceLifecycleVM {
  device: EdgeDeviceVM;
  canUnpair: boolean;
  canDeactivate: boolean;
  canReactivate: boolean;
  canRevoke: boolean;
  pendingAction: 'none' | 'unpair' | 'deactivate' | 'reactivate' | 'revoke';
  confirming: boolean;
  submitting: boolean;
}

function toEdgeDeviceVM(wire: EdgeDeviceWire): EdgeDeviceVM {
  return {
    id: wire.id,
    patientId: wire.patientId,
    lifecycleState: wire.lifecycleState,
    status: wire.connectivity,         // BE connectivity → VM status
    lastSyncAt: wire.lastHeartbeatAt,  // BE lastHeartbeatAt → VM lastSyncAt
    pairedAt: wire.pairedAt,
    // version is intentionally omitted — G-EDGE-2
  };
}

/** Relative time string from an ISO timestamp (display-only). */
function relativeTime(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  return `${Math.floor(diffHr / 24)} d ago`;
}

/** Derive badge from VM — never infers online/offline from client timer (ADR-005). */
function deriveBadge(device: EdgeDeviceVM | null): 'online' | 'offline' | 'unavailable' {
  if (!device || device.lifecycleState !== 'paired' || device.status === null) {
    return 'unavailable';
  }
  return device.status === 'online' ? 'online' : 'offline';
}

@Injectable({ providedIn: 'root' })
export class DeviceFacade {
  private readonly port = inject(EDGE_DEVICE_PORT);
  private readonly destroyRef = inject(DestroyRef);

  // ── Internal signals ────────────────────────────────────────────────────────
  private readonly _device = signal<EdgeDeviceVM | null>(null);
  private readonly _enrollResult = signal<EnrollResultWire | null>(null);
  private readonly _pairing = signal<'idle' | 'pairing' | 'paired' | 'error'>('idle');
  private readonly _pendingAction = signal<DeviceLifecycleVM['pendingAction']>('none');
  private readonly _confirming = signal(false);
  private readonly _submitting = signal(false);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ── Public read-only signals ─────────────────────────────────────────────────
  readonly device = this._device.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ── Composed view-model signals ──────────────────────────────────────────────

  statusVm(canRead = true): DeviceStatusVM {
    const device = this._device();
    return {
      device,
      badge: deriveBadge(device),
      lastSyncRelative: relativeTime(device?.lastSyncAt ?? null),
      loading: this._loading(),
      canRead,
    };
  }

  pairingVm(mode: 'station' | 'phone' = 'station', canPair = true, platformSupported = true): DevicePairingVM {
    return {
      mode,
      existingDevice: this._device(),
      pairing: this._pairing(),
      pairingCode: this._enrollResult()?.pairingCode ?? null,
      pairingCodeExpiresAt: this._enrollResult()?.pairingCodeExpiresAt ?? null,
      canPair,
      platformSupported,
      error: this._error(),
    };
  }

  lifecycleVm(canUnpair = false, canDeactivate = false, canReactivate = false, canRevoke = false): DeviceLifecycleVM | null {
    const device = this._device();
    if (!device) return null;
    return {
      device,
      canUnpair,
      canDeactivate,
      canReactivate,
      canRevoke,
      pendingAction: this._pendingAction(),
      confirming: this._confirming(),
      submitting: this._submitting(),
    };
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  /** Load device for a patient. Called on route entry and topbar badge mount. */
  loadForPatient(patientId: string): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.list())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          const row = rows.find(r => r.patientId === patientId) ?? null;
          if (row) {
            // Fetch the full record for the found device
            this.getDevice(row.id);
          } else {
            this._device.set(null);
            this._loading.set(false);
          }
        },
        error: err => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  /** Get a specific device by id (also used to poll for 'paired' state). */
  getDevice(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.get(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: wire => {
          this._device.set(toEdgeDeviceVM(wire));
          this._loading.set(false);
          // If we were pairing and the server now reports 'paired' — confirm it
          if (this._pairing() === 'pairing' && wire.lifecycleState === 'paired') {
            this._pairing.set('paired');
          }
        },
        error: err => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  /**
   * Enroll a device — POST /edge/devices with { patientId }.
   * Dashboard displays the returned pairing code once and then polls getDevice(id)
   * until lifecycleState = 'paired'. Pessimistic: 'paired' is never set here (SPEC-04 §4).
   */
  enroll(patientId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this._pairing.set('idle');
    this._enrollResult.set(null);
    from(this.port.enroll(patientId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this._enrollResult.set(result);
          this._pairing.set('pairing');
          this._loading.set(false);
          // Begin polling for 'paired' state
          this.getDevice(result.id);
        },
        error: err => {
          this._error.set(err.message);
          this._pairing.set('error');
          this._loading.set(false);
        },
      });
  }

  reactivate(id: string): void {
    this._submitting.set(true);
    this._error.set(null);
    from(this.port.reactivate(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: wire => {
          this._device.set(toEdgeDeviceVM(wire));
          this._submitting.set(false);
          this._pendingAction.set('none');
          this._confirming.set(false);
        },
        error: err => {
          this._error.set(err.message);
          this._submitting.set(false);
        },
      });
  }

  deactivate(id: string): void {
    this._submitting.set(true);
    this._error.set(null);
    from(this.port.deactivate(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const current = this._device();
          if (current) {
            this._device.set({ ...current, lifecycleState: 'deactivated', status: null });
          }
          this._submitting.set(false);
          this._pendingAction.set('none');
          this._confirming.set(false);
        },
        error: err => {
          this._error.set(err.message);
          this._submitting.set(false);
        },
      });
  }

  unpair(id: string): void {
    this._submitting.set(true);
    this._error.set(null);
    from(this.port.unpair(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this._device.set(null);
          this._submitting.set(false);
          this._pendingAction.set('none');
          this._confirming.set(false);
        },
        error: err => {
          this._error.set(err.message);
          this._submitting.set(false);
        },
      });
  }

  revoke(id: string): void {
    this._submitting.set(true);
    this._error.set(null);
    from(this.port.revoke(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const current = this._device();
          if (current) {
            this._device.set({ ...current, lifecycleState: 'revoked', status: null });
          }
          this._submitting.set(false);
          this._pendingAction.set('none');
          this._confirming.set(false);
        },
        error: err => {
          this._error.set(err.message);
          this._submitting.set(false);
        },
      });
  }

  /** Set a pending action requiring explicit confirm (unpair / deactivate / revoke). */
  setPendingAction(action: DeviceLifecycleVM['pendingAction']): void {
    this._pendingAction.set(action);
    this._confirming.set(action !== 'none');
  }

  cancelAction(): void {
    this._pendingAction.set('none');
    this._confirming.set(false);
  }

  /** Reset pairing state — called when retrying. */
  resetPairing(): void {
    this._pairing.set('idle');
    this._enrollResult.set(null);
    this._error.set(null);
  }

  /** Invalidate all EDGE state on tenant switch (bootstrap-flow). */
  clearState(): void {
    this._device.set(null);
    this._enrollResult.set(null);
    this._pairing.set('idle');
    this._pendingAction.set('none');
    this._confirming.set(false);
    this._submitting.set(false);
    this._loading.set(false);
    this._error.set(null);
  }
}
