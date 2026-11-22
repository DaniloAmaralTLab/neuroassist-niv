import { Injectable } from '@angular/core';

/**
 * DetectionLapseAdapter — injectable seam for the EVNT open-detection-lapse signal.
 *
 * CURRENT STATE: returns `'unknown'` (never ok) because EVNT's LapseAlertFacade
 * does not exist yet (FE-EVNT-027/028 pending).
 *
 * CONSEQUENCE (intentional, fail-safe): `DashboardFacade.compositeStatus` can NEVER
 * be `all_clear` until this seam is replaced with a real implementation. This is the
 * correct fail-safe posture — the system acknowledges it cannot confirm detection.
 *
 * TODO[INT-FE-DASH-001]: replace this stub with an injection of EVNT's
 *   `LapseAlertFacade` once FE-EVNT-027/028 ships and exports:
 *   - `AlarmFacade.openDetectionLapses: Signal<DetectionLapseVM[]>`
 *   - `AlarmFacade.detectionState: Signal<'running' | 'lapsed' | 'unknown'>`
 *
 * Authority: `evnt.detection-lapse.read` (EVNT-owned, unchanged — SPEC-04 §4 INT-DASH-1).
 *
 * Wire: when the real implementation arrives, replace `lapseState()` to return
 *   `'running'` when no open lapse, `'lapsed'` when a lapse is open, `'unknown'`
 *   when EVNT cannot determine (defensive default stays the same).
 */
@Injectable({ providedIn: 'root' })
export class DetectionLapseAdapter {
  /**
   * Returns the current detection-lapse state from EVNT's live projection.
   *
   * | Value     | Composite effect                                        |
   * |-----------|----------------------------------------------------------|
   * | `running` | Device is detecting — eligible for `all_clear`          |
   * | `lapsed`  | Online but not detecting — renders as `notice` (amber)   |
   * | `unknown` | Cannot confirm detection — composite stays `degraded`    |
   *
   * STUB: always returns `'unknown'` until INT-FE-DASH-001 is implemented.
   */
  lapseState(): 'running' | 'lapsed' | 'unknown' {
    // TODO[INT-FE-DASH-001]: inject AlarmFacade and return its detectionState signal value.
    return 'unknown';
  }
}
