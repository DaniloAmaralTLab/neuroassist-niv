// trn.error-handler.ts — TRN module error normalisation (SPEC-07).
//
// All TRN errors arrive through the shared access-http-base interceptors
// (error-normalise, correlation). This file documents the TRN-specific
// error taxonomy and helpers for surfacing honest, actionable messages.
//
// SPEC-07 fail-safe hierarchy:
//  - LLM unavailable (503 llm-unavailable): surface dialogError, preserve drafts, NO faked reply.
//  - ElevenLabs unavailable: show "Synthesis delayed — your proposal is queued." (never faked).
//  - 409 proposal-state-locked / dual-authorization-same-actor: re-read server truth (ProposalFacade._reconcile).
//  - 422 (dangling audio ref): surface publish error, let the user retry.
//  - 401: caregiverAuthoringGuard redirects to /entry before the request fires.

export type TrnErrorCode =
  | 'llm-unavailable'
  | 'tts-unavailable'
  | 'proposal-state-locked'
  | 'dual-authorization-same-actor'
  | 'dangling-audio'
  | 'unknown';

export interface TrnError {
  code: TrnErrorCode;
  /** Human-readable message shown in the UI. */
  userMessage: string;
  /** Original error for logging. */
  cause: unknown;
}

/** Normalise an HTTP error from the trn-service into a TrnError. */
export function normalizeTrnError(err: unknown): TrnError {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('llm-unavailable') || msg.includes('503')) {
      return {
        code: 'llm-unavailable',
        userMessage:
          'The assistant is temporarily unavailable. Your draft proposals are preserved — please try again shortly.',
        cause: err,
      };
    }
    if (msg.includes('tts') || msg.includes('elevenlabs')) {
      return {
        code: 'tts-unavailable',
        userMessage:
          'Voice synthesis is temporarily delayed. Your approved proposal is queued and will be synthesised automatically.',
        cause: err,
      };
    }
    if (msg.includes('proposal-state-locked')) {
      return {
        code: 'proposal-state-locked',
        userMessage:
          'This proposal was updated by another session. Refreshing to show the latest state.',
        cause: err,
      };
    }
    if (msg.includes('dual-authorization-same-actor')) {
      return {
        code: 'dual-authorization-same-actor',
        userMessage:
          'The same person cannot complete both sides of the authorization. The patient must confirm their own side.',
        cause: err,
      };
    }
    if (msg.includes('422') || msg.includes('dangling')) {
      return {
        code: 'dangling-audio',
        userMessage:
          'Publication failed: the audio asset is not yet ready. Please try publishing again.',
        cause: err,
      };
    }
  }
  return {
    code: 'unknown',
    userMessage: 'An unexpected error occurred. Please try again.',
    cause: err,
  };
}
