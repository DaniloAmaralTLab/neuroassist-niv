import { Injectable } from '@angular/core';
import {
  DetectionReason,
  DetectionStateEnum,
  StationLivenessPort,
} from './station-liveness.port';

/**
 * No-op implementation of StationLivenessPort.
 *
 * Used as the DEFAULT provider when libs/edge's real station-liveness service
 * is not wired (e.g., unit tests, standalone dev with no EDGE co-mount).
 *
 * The Patient-Mode host that co-mounts GEST + libs/edge MUST override this token
 * with libs/edge's concrete StationLivenessService (SPEC-06 §2.1, SAFETY-GEST-1).
 * Without the override the detection-state signal never reaches EDGE, the heartbeat
 * never carries detectionState, and the EDGE lapse alert is never triggered — which
 * is intentional for environments where EDGE is absent (unit tests, dev stubs).
 */
@Injectable()
export class NoOpStationLivenessPort implements StationLivenessPort {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setDetectionState(
    _state: DetectionStateEnum,
    _reason: DetectionReason | null,
    _engineVersion: string | null,
  ): void {
    // no-op: no EDGE sender wired
  }

  beatNow(): void {
    // no-op: no EDGE sender wired
  }
}
