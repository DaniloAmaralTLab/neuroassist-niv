import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §4 (CONV — opt-in usage signal).
// Keep in sync with conv-service (source of truth: api-contract.md §4).
// Opt-in per INV-CONV-6 — OFF by default; never blocks playback (feature flag: conv.usage-signal.enabled).

/** Minimal usage signal — phraseId + timestamp ONLY, no free text (INV-CONV-6). */
export interface UsageSignalRequest {
  phraseId: string;
  /** ISO-8601 timestamp on the client (the moment the phrase was spoken). */
  occurredAt: string;
  /** Idempotency key: '<phraseId>:<occurredAt>' scoped by the session's patient (BE api-contract §4.1). */
  idempotencyKey: string;
}

export interface UsageSignalPort {
  /**
   * POST ${ACCESS_HTTP_BASE}/conv/usage-signals — 202/200 idempotent.
   * Fire-and-forget on the client: the caller enqueues and flushes opportunistically;
   * playback is NEVER blocked on this call.
   */
  record(signal: UsageSignalRequest): Observable<void>;
}

export const USAGE_SIGNAL_PORT = new InjectionToken<UsageSignalPort>('UsageSignalPort');
