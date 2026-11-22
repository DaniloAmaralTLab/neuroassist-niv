import { Injectable, inject } from '@angular/core';
import { HistShellIntegrationService } from '@neuroassist/hist';
import { AlarmFacade } from '@neuroassist/evnt';
import { DeviceFacade } from '@neuroassist/edge';
import { PatientFacade, CommandFacade } from '@neuroassist/pat';

/**
 * DashShellIntegrationService — wiring seam between the shell and @neuroassist/dash.
 *
 * Responsibilities (SPEC-06 §2):
 *  1. Fan-out the active patientId to each composed module's integration seam.
 *     DASH owns no patient-picker (INV-6; patient comes from the shell/ACS context).
 *  2. Relay explicit caregiver refresh to each composed facade.
 *
 * DASH has NO timer of its own (EVNT owns the only poll loop — doc 05 §2).
 * DASH has NO HttpClient (BE ADR-001 — no dash-service at MVP).
 */
@Injectable({ providedIn: 'root' })
export class DashShellIntegrationService {
  private readonly histIntegration = inject(HistShellIntegrationService);
  private readonly alarmFacade = inject(AlarmFacade);
  private readonly deviceFacade = inject(DeviceFacade);
  private readonly patientFacade = inject(PatientFacade);
  private readonly commandFacade = inject(CommandFacade);

  /**
   * Push the active patientId to each composed module.
   * Call once from the shell when the authenticated caregiver's linked patient is known.
   * Never call from inside DASH itself (INV-6 — DASH does not own patient selection).
   */
  setActivePatient(patientId: string): void {
    // HIST: set patient context for the history timeline + widget
    this.histIntegration.setActivePatient(patientId);
    // EDGE: load device status for this patient
    this.deviceFacade.loadForPatient(patientId);
    // PAT: load patient identity and command catalog
    this.patientFacade.load();
    this.commandFacade.load(patientId);
    // EVNT: start monitoring (server-advertised poll — SPEC-04 §5)
    this.alarmFacade.startMonitoring([patientId]);
  }

  /**
   * Relay a caregiver-initiated refresh to each composed facade.
   * Called by HomeComponent's refresh button; DASH has no polling loop.
   */
  refresh(patientId: string): void {
    this.histIntegration.refreshAfterFeedback();
    this.deviceFacade.loadForPatient(patientId);
    this.patientFacade.load();
    this.commandFacade.load(patientId);
    // EVNT's poll loop is self-managed; it triggers the next cycle automatically.
  }
}
