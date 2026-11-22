import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §3.3 and §2.1 (GEST — gest-service).
// Keep in sync with gest-service (source of truth: api-contract.md §3.3).

/** Request body for POST /gest/capabilities/support-check (GEST §3.3). */
export interface SupportCheckRequestWire {
  engineVersion: string;
  /** All primitive codes in the active catalog that need resolution. */
  codes: string[];
}

export type SupportStatus = 'supported' | 'experimental' | 'unsupported' | 'unknown';

/** Response body for POST /gest/capabilities/support-check (GEST §3.3). */
export interface SupportCheckResultWire {
  engineVersion: string;
  results: {
    code: string;
    supportStatus: SupportStatus;
    /**
     * True when supportStatus is 'supported' or 'experimental'.
     * An unknown code (no row) → detectable: false (GEST §3.3).
     */
    detectable: boolean;
  }[];
}

/** Mirror of a row from GET /gest/engines (GEST §2.1). */
export interface GestEngineWire {
  id: string;
  version: string;
  status: 'active' | 'deprecated' | 'retired';
  releaseDate: string;
}

export interface CapabilitySupportPort {
  /**
   * POST /gest/capabilities/support-check — authenticated by edge.device token.
   * Cached by engineVersion via ETag + If-None-Match (304 is the common case).
   * authority: gest.capability.read (INT-GEST-ACS-1).
   */
  checkSupport(req: SupportCheckRequestWire): Observable<SupportCheckResultWire>;

  /**
   * GET /gest/engines — resolve/display the active engineVersion.
   * authority: gest.engine.read (INT-GEST-ACS-1).
   */
  listEngines(): Observable<GestEngineWire[]>;
}

export const CAPABILITY_SUPPORT_PORT = new InjectionToken<CapabilitySupportPort>('CapabilitySupportPort');
