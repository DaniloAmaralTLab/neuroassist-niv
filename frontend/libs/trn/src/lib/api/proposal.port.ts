import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Proposal } from '../trn.model';

// ---------------------------------------------------------------------------
// ProposalPort — covers BE api-contract §3.2–§4 (read, update, confirmations).
// ---------------------------------------------------------------------------

export interface ProposalPort {
  /**
   * GET /trn/sessions/{sessionId}/proposals/{proposalId}.
   * Authority: trn.proposal.read (BE §3.2).
   */
  get(sessionId: string, proposalId: string): Observable<Proposal>;

  /**
   * PATCH /trn/sessions/{sessionId}/proposals/{proposalId}.
   * Refines the proposal text (caregiver edit, pre-approval).
   * Authority: trn.proposal.update (BE §3.3).
   */
  update(sessionId: string, proposalId: string, text: string): Observable<Proposal>;

  /**
   * POST /trn/proposals/{proposalId}/caregiver-confirmation.
   * Caregiver approves their half of Dual Authorization.
   * Authority: trn.proposal.approve (BE §4.1).
   */
  confirmCaregiver(proposalId: string): Observable<Proposal>;

  /**
   * POST /trn/proposals/{proposalId}/patient-assent.
   * Records the in-session patient/guardian assent attested by the caregiver (ADR-002, Option C).
   * Authority: trn.proposal.approve (BE §4.2).
   * No patient-session token is used — the caregiver bears both halves (ACS INV-3).
   */
  recordPatientAssent(
    proposalId: string,
    opts: { relationship?: string; evidenceRef?: string },
  ): Observable<Proposal>;

  /**
   * POST /trn/proposals/{proposalId}/rejection.
   * Authority: trn.proposal.reject (BE §4.3).
   */
  reject(proposalId: string): Observable<Proposal>;

  /**
   * POST /trn/proposals/{proposalId}/withdrawal.
   * Authority: trn.proposal.update (BE §4.4).
   */
  withdraw(proposalId: string): Observable<Proposal>;
}

export const PROPOSAL_PORT = new InjectionToken<ProposalPort>('ProposalPort');
