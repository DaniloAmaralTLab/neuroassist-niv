import { Injectable, inject } from '@angular/core';
import { HistoryFacade } from '../hist.facade';

// HistShellIntegrationService — thin wiring seam between the shell and @neuroassist/hist.
// Owns NO timers, NO HttpClient (HIST does not poll — ADR-005, doc 05 §2).
// Responsibilities (SPEC-06 §2):
//  1. Supply the active patientId to HistoryFacade (the shell owns patient selection).
//  2. Expose the read-only HistoryFacade slice for DASH/Home widget embedding.
// TODO[FE-HIST-002]: wire real patientId from shell's patient-context (ACS/DASH concern).

@Injectable({ providedIn: 'root' })
export class HistShellIntegrationService {
  private readonly historyFacade = inject(HistoryFacade);

  /**
   * Wire the active patient context from the shell.
   * Called by the shell when the authenticated caregiver's linked patientId is known.
   * HIST does not own a patient-picker (ACS/DASH concern — SPEC-01 §3).
   */
  setActivePatient(patientId: string): void {
    this.historyFacade.setPatientId(patientId);
  }

  /**
   * Read-only facade slice for DASH/Home widget embedding (SPEC-06 §4).
   * DASH injects this service to get the HistoryFacade; it NEVER queries hist-service directly.
   * Returns entries and summary as read-only signals (HistoryFacade exposes `.asReadonly()`).
   */
  get historyEntries() {
    return this.historyFacade.entries;
  }

  get historySummary() {
    return this.historyFacade.summary;
  }

  get historyState() {
    return this.historyFacade.state;
  }

  /**
   * Post-EVNT-feedback-write success: trigger HIST to re-read its own read-model.
   * Called by the shell after a delegated EVNT feedback write succeeds (SPEC-04 §4, SPEC-06 §3).
   * HIST does NOT patch a local entry — it always re-reads (ADR-005, doc 05 §4).
   */
  refreshAfterFeedback(): void {
    this.historyFacade.refresh();
  }
}
