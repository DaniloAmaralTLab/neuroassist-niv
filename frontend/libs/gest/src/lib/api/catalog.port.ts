import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §4.1 (EDGE — GET /edge/catalog).
// Keep in sync with edge-service (source of truth: edge api-contract.md §4.1).
// NOTE: GEST reads EDGE's catalog read-model — it NEVER calls PAT directly at runtime.

/** Mirror of a command entry from GET /edge/catalog (EDGE §4.1). */
export interface CatalogCommandWire {
  id: string;
  label: string;
  urgency: 'emergency' | 'routine';
  sensitivity: 'low' | 'medium' | 'high';
  primaryPrimitive: { id: string; code: string; displayName: string };
  secondaryPrimitive: { id: string; code: string; displayName: string } | null;
  /** Minimum elapsed time for the compound gesture window (ms). */
  minGestureTimeMs: number;
  /** Maximum elapsed time (ms) — MUST be > minGestureTimeMs. */
  maxGestureTimeMs: number;
  status: string;
}

/** Mirror of GET /edge/catalog response envelope (EDGE §4.1). */
export interface EdgeCatalogWire {
  deviceId: string;
  commands: CatalogCommandWire[];
  fetchedAt: string;
  etag: string | null;
}

export interface CatalogPort {
  /**
   * GET /edge/catalog — authenticated by edge.device token.
   * authority: edge.catalog.read.
   * Cached via If-None-Match / 304 (EDGE §4.2 — 304 is the common case at runtime).
   */
  read(): Observable<EdgeCatalogWire>;
}

export const CATALOG_PORT = new InjectionToken<CatalogPort>('CatalogPort');
