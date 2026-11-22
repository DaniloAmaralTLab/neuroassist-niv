import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §3 (PAT — Gesture-type catalog).
// Global vocabulary; not tenant-scoped (ADR-002, api-contract §3.1).

/** Mirrors GET /pat/gesture-types items + GET /pat/gesture-types/{id} + POST /pat/gesture-types response. */
export interface GestureTypeWire {
  id: string;
  code: string;
  displayName: string;
  description?: string;
  createdAt?: string;
}

/** Request body for POST /pat/gesture-types (api-contract §3.3). */
export interface RegisterGestureTypeRequest {
  code: string;
  displayName: string;
  description?: string;
}

export interface GestureTypePort {
  /** GET /pat/gesture-types — authority pat.gesture-type.read (api-contract §3.1). */
  list(): Observable<GestureTypeWire[]>;
  /** GET /pat/gesture-types/{id} — authority pat.gesture-type.read (api-contract §3.2). */
  get(id: string): Observable<GestureTypeWire>;
  /** POST /pat/gesture-types — authority pat.gesture-type.create (api-contract §3.3). */
  register(req: RegisterGestureTypeRequest): Observable<GestureTypeWire>;
}

export const GESTURE_TYPE_PORT = new InjectionToken<GestureTypePort>('GestureTypePort');
