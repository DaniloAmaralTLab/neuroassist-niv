import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { TrainingSession, DialogTurnResult } from '../trn.model';

// ---------------------------------------------------------------------------
// TrainingSessionPort — covers BE api-contract §2 (session) + §3.1 (dialog).
// Base: ${ACCESS_HTTP_BASE}/trn — NEVER /api/v1 (carry-forward pitfall).
// ---------------------------------------------------------------------------

export interface TrainingSessionPort {
  /**
   * POST /trn/sessions — Opens a new training session for the given patient.
   * Authority: trn.session.create (BE api-contract §2.1).
   */
  create(patientId: string): Observable<TrainingSession>;

  /**
   * GET /trn/sessions/{sessionId} — Reads the session and its proposal list.
   * Authority: trn.session.read (BE api-contract §2.2).
   */
  get(sessionId: string): Observable<TrainingSession>;

  /**
   * POST /trn/sessions/{sessionId}/dialog — Sends a caregiver dialog turn to the LLM.
   * The BE mediates the Anthropic call; the FE never contacts the vendor directly (ADR-007).
   * Authority: trn.proposal.update (BE api-contract §3.1).
   * Returns the new message(s) and any new proposals the LLM added.
   */
  postDialogTurn(sessionId: string, caregiverText: string): Observable<DialogTurnResult>;
}

export const TRAINING_SESSION_PORT =
  new InjectionToken<TrainingSessionPort>('TrainingSessionPort');
