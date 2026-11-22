import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §2 (PAT — Patients and Command Catalog).
// Keep in sync with pat-service (source of truth: api-contract.md §2).
// Field names follow the BE contract: minGestureTimeMs / maxGestureTimeMs.

export type CommandUrgency = 'emergency' | 'routine';
export type CommandSensitivity = 'low' | 'medium' | 'high';
export type CommandStatus = 'active' | 'retired';

/** Embedded gesture type primitive resolved by the catalog-pull endpoint (ADR-004, api-contract §2.2). */
export interface GestureTypePrimitive {
  id: string;
  code: string;
  displayName: string;
}

/** Mirrors GET /pat/patients/{patientId}/commands items + GET /pat/commands/{id} response. */
export interface CommandWire {
  id: string;
  patientId: string;
  tenantId?: string;
  label: string;
  urgency: CommandUrgency;
  sensitivity: CommandSensitivity;
  primaryPrimitive: GestureTypePrimitive;
  secondaryPrimitive: GestureTypePrimitive | null;
  minGestureTimeMs: number;
  maxGestureTimeMs: number;
  status: CommandStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Request body for POST /pat/patients/{patientId}/commands (api-contract §2.1). */
export interface CreateCommandRequest {
  label: string;
  urgency: CommandUrgency;
  sensitivity: CommandSensitivity;
  primaryPrimitive: string;        // GestureType id
  secondaryPrimitive: string | null;
  minGestureTimeMs: number;
  maxGestureTimeMs: number;
}

/** Request body for PATCH /pat/commands/{commandId} (api-contract §2.4). */
export interface CalibrateCommandRequest {
  label?: string;
  urgency?: CommandUrgency;
  sensitivity?: CommandSensitivity;
  primaryPrimitive?: string;
  secondaryPrimitive?: string | null;
  minGestureTimeMs?: number;
  maxGestureTimeMs?: number;
}

export interface CommandPort {
  /** GET /pat/patients/{patientId}/commands — authority pat.command.read (api-contract §2.2). */
  listByPatient(patientId: string, status?: CommandStatus | 'all'): Observable<CommandWire[]>;
  /** GET /pat/commands/{commandId} — authority pat.command.read (api-contract §2.3). */
  get(commandId: string): Observable<CommandWire>;
  /** POST /pat/patients/{patientId}/commands — authority pat.command.create (api-contract §2.1). */
  create(patientId: string, req: CreateCommandRequest): Observable<CommandWire>;
  /** PATCH /pat/commands/{commandId} — authority pat.command.calibrate (api-contract §2.4). */
  calibrate(commandId: string, req: CalibrateCommandRequest): Observable<CommandWire>;
  /** DELETE /pat/commands/{commandId} — authority pat.command.retire (api-contract §2.5). */
  retire(commandId: string): Observable<void>;
}

export const COMMAND_PORT = new InjectionToken<CommandPort>('CommandPort');
