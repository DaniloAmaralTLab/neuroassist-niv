import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PROPOSAL_PORT } from './api/proposal.port';
import { TrainingSessionFacade } from './training-session.facade';
import { Proposal } from './trn.model';

/**
 * ProposalFacade — signals-based application layer for Proposal operations.
 *
 * Covers caregiver-confirmation, patient/guardian assent, rejection, withdrawal and edit.
 * All writes are SERVER-AUTHORITATIVE. Optimistic updates are scoped and reversible:
 * on a 409 (proposal-state-locked / dual-authorization-same-actor), the facade
 * re-reads server truth and reconciles (SPEC-04 §4).
 *
 * Patient/guardian assent is an IN-SESSION DOMAIN FACT attested under the caregiver
 * authority (trn.proposal.approve) — there is NO patient-session guard and NO
 * trn.proposal.confirm authority (SPEC-01 §2, ADR-002).
 */
@Injectable({ providedIn: 'root' })
export class ProposalFacade {
  private readonly port = inject(PROPOSAL_PORT);
  private readonly sessionFacade = inject(TrainingSessionFacade);
  private readonly destroyRef = inject(DestroyRef);

  /** Per-proposal loading state (proposal id → boolean). */
  private readonly _pendingMap = signal<Record<string, boolean>>({});
  private readonly _errorMap = signal<Record<string, string | null>>({});

  readonly pendingMap = this._pendingMap.asReadonly();
  readonly errorMap = this._errorMap.asReadonly();

  isPending(proposalId: string): boolean {
    return this._pendingMap()[proposalId] ?? false;
  }

  errorFor(proposalId: string): string | null {
    return this._errorMap()[proposalId] ?? null;
  }

  /**
   * Caregiver approves their half of Dual Authorization.
   * Authority: trn.proposal.approve (BE §4.1).
   * Optimistic: sets caregiverConfirmed locally; reverts on 409.
   */
  confirmCaregiver(proposalId: string): void {
    this._setLoading(proposalId, true);
    this.port
      .confirmCaregiver(proposalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.sessionFacade.updateLocalProposal(updated);
          this._setLoading(proposalId, false);
        },
        error: (err: Error) => {
          this._setError(proposalId, err.message);
          this._setLoading(proposalId, false);
          // 409 reconciliation: re-read server truth.
          this._reconcile(proposalId);
        },
      });
  }

  /**
   * Records the in-session patient/guardian assent attested by the caregiver.
   * Authority: trn.proposal.approve (BE §4.2).
   * No patient-session token involved (ACS INV-3; ADR-002, Option C).
   */
  recordPatientAssent(
    proposalId: string,
    opts: { relationship?: string; evidenceRef?: string } = {},
  ): void {
    this._setLoading(proposalId, true);
    this.port
      .recordPatientAssent(proposalId, opts)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.sessionFacade.updateLocalProposal(updated);
          this._setLoading(proposalId, false);
        },
        error: (err: Error) => {
          this._setError(proposalId, err.message);
          this._setLoading(proposalId, false);
          this._reconcile(proposalId);
        },
      });
  }

  /**
   * Rejects the proposal. Authority: trn.proposal.reject (BE §4.3).
   */
  reject(proposalId: string): void {
    this._setLoading(proposalId, true);
    this.port
      .reject(proposalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.sessionFacade.updateLocalProposal(updated);
          this._setLoading(proposalId, false);
        },
        error: (err: Error) => {
          this._setError(proposalId, err.message);
          this._setLoading(proposalId, false);
        },
      });
  }

  /**
   * Withdraws the proposal (caregiver pull-back). Authority: trn.proposal.update (BE §4.4).
   */
  withdraw(proposalId: string): void {
    this._setLoading(proposalId, true);
    this.port
      .withdraw(proposalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.sessionFacade.updateLocalProposal(updated);
          this._setLoading(proposalId, false);
        },
        error: (err: Error) => {
          this._setError(proposalId, err.message);
          this._setLoading(proposalId, false);
        },
      });
  }

  /**
   * Updates the proposal text (pre-approval refinement). Authority: trn.proposal.update (BE §3.3).
   */
  update(sessionId: string, proposalId: string, text: string): void {
    this._setLoading(proposalId, true);
    this.port
      .update(sessionId, proposalId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.sessionFacade.updateLocalProposal(updated);
          this._setLoading(proposalId, false);
        },
        error: (err: Error) => {
          this._setError(proposalId, err.message);
          this._setLoading(proposalId, false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _setLoading(id: string, loading: boolean): void {
    this._pendingMap.update(m => ({ ...m, [id]: loading }));
  }

  private _setError(id: string, msg: string | null): void {
    this._errorMap.update(m => ({ ...m, [id]: msg }));
  }

  /**
   * 409 reconciliation — re-read server truth for the given proposal and
   * update the local session list (SPEC-04 §4).
   * Best-effort: a second failure leaves the UI in an error state (the user can retry).
   */
  private _reconcile(proposalId: string): void {
    const session = this.sessionFacade.session();
    if (!session) return;
    const proposal = session.proposals.find((p: Proposal) => p.id === proposalId);
    if (!proposal) return;

    this.port
      .get(session.id, proposalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: serverTruth => this.sessionFacade.updateLocalProposal(serverTruth),
      });
  }
}
