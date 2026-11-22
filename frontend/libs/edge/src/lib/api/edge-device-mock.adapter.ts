import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  EdgeDevicePort,
  EdgeDeviceWire,
  EdgeDeviceRowWire,
  EnrollResultWire,
} from './edge-device.port';

// Seed data derived from design-reference/mock-data.json (device slice).
// version is intentionally absent — G-EDGE-2: no BE field exists.

const MOCK_DEVICE: EdgeDeviceWire = {
  id: 'dev-marcio-station',
  tenantId: 'tenant-family-amaral',
  patientId: 'pat-marcio',
  lifecycleState: 'paired',
  connectivity: 'online',
  lastHeartbeatAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 min ago
  pairedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  enrolledBy: 'cg-jamilly',
  credentialId: 'cred-dev-marcio',
  catalogFetchedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
};

@Injectable()
export class EdgeDeviceMockAdapter implements EdgeDevicePort {
  private devices: EdgeDeviceWire[] = [MOCK_DEVICE];

  enroll(patientId: string): Observable<EnrollResultWire> {
    const result: EnrollResultWire = {
      id: `dev-${Date.now()}`,
      tenantId: 'tenant-family-amaral',
      patientId,
      lifecycleState: 'awaiting_claim',
      connectivity: null,
      pairingCode: 'MOCK-1234',
      pairingCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      enrolledBy: 'cg-jamilly',
      createdAt: new Date().toISOString(),
    };
    // Add a mock device in awaiting_claim state
    const newDevice: EdgeDeviceWire = {
      ...result,
      credentialId: null,
      catalogFetchedAt: null,
      pairedAt: null,
      lastHeartbeatAt: null,
      updatedAt: result.createdAt,
    };
    this.devices = [...this.devices, newDevice];
    return of(result).pipe(delay(400));
  }

  list(): Observable<EdgeDeviceRowWire[]> {
    const rows: EdgeDeviceRowWire[] = this.devices.map(d => ({
      id: d.id,
      patientId: d.patientId,
      lifecycleState: d.lifecycleState,
      connectivity: d.connectivity,
      lastHeartbeatAt: d.lastHeartbeatAt,
      pairedAt: d.pairedAt,
    }));
    return of(rows).pipe(delay(400));
  }

  get(id: string): Observable<EdgeDeviceWire> {
    const device = this.devices.find(d => d.id === id) ?? MOCK_DEVICE;
    return of({ ...device }).pipe(delay(400));
  }

  reactivate(id: string): Observable<EdgeDeviceWire> {
    this.devices = this.devices.map(d =>
      d.id === id
        ? { ...d, lifecycleState: 'paired', connectivity: 'offline', updatedAt: new Date().toISOString() }
        : d,
    );
    const updated = this.devices.find(d => d.id === id) ?? MOCK_DEVICE;
    return of({ ...updated }).pipe(delay(400));
  }

  deactivate(id: string): Observable<void> {
    this.devices = this.devices.map(d =>
      d.id === id
        ? { ...d, lifecycleState: 'deactivated', connectivity: null, updatedAt: new Date().toISOString() }
        : d,
    );
    return of(undefined).pipe(delay(400));
  }

  unpair(id: string): Observable<void> {
    this.devices = this.devices.filter(d => d.id !== id);
    return of(undefined).pipe(delay(400));
  }

  revoke(id: string): Observable<void> {
    this.devices = this.devices.map(d =>
      d.id === id
        ? { ...d, lifecycleState: 'revoked', connectivity: null, credentialId: null, updatedAt: new Date().toISOString() }
        : d,
    );
    return of(undefined).pipe(delay(400));
  }
}
