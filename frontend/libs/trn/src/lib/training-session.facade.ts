import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TRAINING_SESSION_PORT } from './api/training-session.port';
import { TrainingSession, DialogMessage, Proposal } from './trn.model';

/**
 * TrainingSessionFacade — signals-based application layer for TRN training sessions.
 *
 * Covers Screen 08 (caregiver authoring surface).
 * Orchestrates:
 *  - Session lifecycle (create, end).
 *  - LLM dialog turns (via TRAINING_SESSION_PORT.postDialogTurn — BE-mediated, never FE-direct).
 *  - Local proposal list read-through (proposals are part of TrainingSession).
 *  - Fail-safe: LLM down surfaces an honest error; drafts are NEVER discarded on session end.
 *
 * Layer 2 (FE-TRN-003/FE-TRN-005): full LLM streaming + optimistic dual-confirm indicator +
 * polling loop for publication status belong in the implement cycle.
 */
@Injectable({ providedIn: 'root' })
export class TrainingSessionFacade {
  private readonly port = inject(TRAINING_SESSION_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _session = signal<TrainingSession | null>(null);
  private readonly _loading = signal(false);
  private readonly _dialogPending = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _dialogError = signal<string | null>(null);
  private readonly _messages = signal<DialogMessage[]>([]);

  readonly session = this._session.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** True while a dialog turn is in flight (LLM latency indicator). */
  readonly dialogPending = this._dialogPending.asReadonly();
  readonly error = this._error.asReadonly();
  /** Error from the last dialog turn (503 llm-unavailable etc.). Honest, never faked. */
  readonly dialogError = this._dialogError.asReadonly();
  readonly messages = this._messages.asReadonly();

  /** All proposals in the current session (empty list when no session). */
  readonly proposals = (): Proposal[] => this._session()?.proposals ?? [];

  /**
   * Proposals pending caregiver approval (session started, not yet caregiver-approved).
   * These are displayed in the pending-proposals panel (Screen 08).
   */
  readonly pendingApproval = (): Proposal[] =>
    this.proposals().filter(
      p => p.status === 'proposed' && !p.authorization.caregiverConfirmed,
    );

  /**
   * Proposals with caregiver approval but awaiting patient/guardian assent (Screen 09).
   */
  readonly pendingAssent = (): Proposal[] =>
    this.proposals().filter(
      p => p.authorization.caregiverConfirmed && !p.authorization.patientAssented,
    );

  /**
   * Open a new training session for the given patient.
   * Authority: trn.session.create.
   */
  startSession(patientId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .create(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this._session.set(session);
          this._messages.set([]);
          this._loading.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  /**
   * Load an existing session (e.g. on page reload — pending proposals persist as drafts,
   * ADR-016 "Complementary decisions").
   * Authority: trn.session.read.
   */
  loadSession(sessionId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .get(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this._session.set(session);
          this._loading.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  /**
   * Post a caregiver dialog turn to the LLM (via trn-service, never a direct vendor call).
   * On 503 llm-unavailable: surfaces dialogError and fabricates NOTHING (ADR-007).
   * Authority: trn.proposal.update.
   */
  sendDialogTurn(caregiverText: string): void {
    const session = this._session();
    if (!session) return;

    this._dialogPending.set(true);
    this._dialogError.set(null);
    this.port
      .postDialogTurn(session.id, caregiverText)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this._messages.update(list => [...list, ...result.messages]);
          this._session.update(s =>
            s ? { ...s, proposals: [...s.proposals, ...result.newProposals] } : s,
          );
          this._dialogPending.set(false);
        },
        error: (err: Error) => {
          // Honest error — never fabricate an LLM response (ADR-007).
          this._dialogError.set(err.message);
          this._dialogPending.set(false);
        },
      });
  }

  /**
   * End the session. Pending proposals are NOT discarded (ADR-016: no automatic expiry).
   * The UI clears the dialog transcript locally; proposals remain on the server.
   */
  endSession(): void {
    this._session.update(s => (s ? { ...s, status: 'ended' as const } : null));
    this._messages.set([]);
  }

  /** Update a proposal in the local session list (called after ProposalFacade writes). */
  updateLocalProposal(updated: Proposal): void {
    this._session.update(s => {
      if (!s) return s;
      return {
        ...s,
        proposals: s.proposals.map(p => (p.id === updated.id ? updated : p)),
      };
    });
  }
}
