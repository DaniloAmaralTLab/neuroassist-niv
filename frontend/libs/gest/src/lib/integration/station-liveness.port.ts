import { InjectionToken } from '@angular/core';

// GEST→EDGE seam (SAFETY-GEST-1, SPEC-06 §2.1).
// libs/edge owns the ONE and ONLY heartbeat sender (POST /edge/heartbeat).
// GEST publishes its mapped detectionState in-process via this port;
// libs/edge carries it on the next periodic beat and on beatNow().
// GEST itself NEVER opens a POST /edge/heartbeat call.

/** EDGE enum identifiers for the detection state (EDGE api-contract §3.1). */
export type DetectionStateEnum = 'RUNNING' | 'PAUSED' | 'DEGRADED' | 'UNAVAILABLE';

/**
 * Reason alongside a non-RUNNING detectionState (EDGE api-contract §3.1).
 * Maps RUNNING → null; all other states carry a reason if applicable.
 */
export type DetectionReason = 'HIDDEN' | 'CAMERA_DENIED' | 'MODEL_FAILED' | 'LOW_FPS';

/**
 * Seam between GEST's detection runtime and libs/edge's station-liveness sender.
 *
 * libs/edge provides the concrete implementation; GEST declares only the port.
 * The default for environments where libs/edge is not wired is NoOpStationLivenessPort.
 *
 * GEST calls:
 *   - `setDetectionState(...)` on every detectionState transition
 *   - `beatNow()` to request an immediate out-of-cadence heartbeat from libs/edge
 *
 * libs/edge:
 *   - Carries the last pushed state on every periodic beat (cadence ≤ 30 s)
 *   - Sends `fetch(…, { keepalive: true })` when beatNow() is called on tab-hidden
 */
export interface StationLivenessPort {
  /**
   * Push the mapped detectionState so libs/edge carries it on the next heartbeat.
   * Called on every transition: RUNNING/PAUSED/DEGRADED/UNAVAILABLE.
   * @param state    The EDGE enum value (SPEC-03 §7 mapping, INV-GEST-8).
   * @param reason   Cause beside a non-RUNNING state; null for RUNNING.
   * @param engineVersion  The running engine version; null if the model is not yet loaded.
   */
  setDetectionState(
    state: DetectionStateEnum,
    reason: DetectionReason | null,
    engineVersion: string | null,
  ): void;

  /**
   * Request an immediate out-of-cadence heartbeat from libs/edge.
   * Called by GestShellIntegrationService on EVERY detectionState transition,
   * including the tab-hidden transition (libs/edge sends with keepalive:true).
   * GEST does NOT send the heartbeat itself.
   */
  beatNow(): void;
}

export const STATION_LIVENESS_PORT = new InjectionToken<StationLivenessPort>(
  'StationLivenessPort',
);
