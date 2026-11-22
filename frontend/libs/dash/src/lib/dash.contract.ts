// DASH module contract — composition host (BE ADR-001: no dash-service, no dash.* authority).
// Permission keys equal the OWNING modules' BE authorities (D-639, SPEC-05 §2).
// DASH has NO Port, NO Adapter, NO HttpClient (SPEC-04 §1, ADR-005).

export const MODULE_KEY = 'dash';

// ── Freshness thresholds (SPEC-03 §3, pinned) ────────────────────────────────

/** EDGE: stale after 2 × 30 s heartbeat cadence (single dropped beat tolerated). */
export const DASH_EDGE_HEARTBEAT_STALE_MS = 60_000;

/** HIST: summary read considered fresh for 60 s (read-on-navigation + explicit refresh). */
export const DASH_HIST_SUMMARY_TTL_MS = 60_000;

/** PAT: patient identity considered fresh for 5 min (low-volatility). */
export const DASH_PAT_TTL_MS = 300_000;

/** EVNT: stale multiplier × server-advertised pollIntervalSeconds (SPEC-03 §3). */
export const DASH_EVNT_FRESH_FACTOR = 2;

/**
 * EDGE detection-lapse threshold (server-owned; referenced for copy only, never recomputed by DASH).
 * EDGE opens the lapse after 120 s of silence; EVNT surfaces it (BE EDGE ADR-005 / EVNT ADR-006).
 */
export const EDGE_LAPSE_WINDOW_MS = 120_000;

// ── Source health types (SPEC-03 §1) ─────────────────────────────────────────

export type SourceKey = 'hist' | 'evnt' | 'edge' | 'pat';

/**
 * Per-source health axis.
 * `stale` = read succeeded but older than the freshness window.
 * Only `ok` counts for the `all_clear` composite.
 */
export type SourceHealth = 'ok' | 'empty' | 'loading' | 'unknown' | 'error' | 'stale';

// ── Composite overview status (SPEC-03 §4, the heart of ADR-002/ADR-005) ─────

/**
 * `all_clear` ONLY when EVERY source is `ok` and fresh and affirmatively clear.
 * `emergency` defers to EVNT full-screen takeover — DASH never renders emergency styling.
 */
export type CompositeStatus = 'loading' | 'all_clear' | 'degraded' | 'notice' | 'emergency';

// ── View-model interfaces (SPEC-03 §2) ────────────────────────────────────────

export interface OverviewVM {
  patientName: string | null;
  headline: CompositeStatus;
  lastCheckAt: string | null;
  sources: Record<SourceKey, SourceHealth>;
  degradedReason: string | null;
}

export interface KpiVM {
  /** null when HIST not ok — render as "—", NEVER as 0 (INV-4). */
  eventsToday: number | null;
  confirmedToday: number | null;
  pendingToday: number | null;
}

export interface CatalogSummaryVM {
  /** null when PAT not ok. */
  items: { label: string; urgency: 'emergency' | 'routine' }[] | null;
  loading: boolean;
}

export interface SuggestionVM {
  kind: 'advisory';
  text: string;
}

// ── Permission map (caregiver authorities — owning-module BE authorities) ─────
// DASH has no dash.* authority (BE ADR-001 — no backend service at MVP).
// Authorities are those of the composed modules (SPEC-05 §2).

export const MODULE_PERMISSION_MAP = {
  'hist.history.read': { label: 'Read patient history', owner: 'hist' },
  'evnt.event.read': { label: 'Read events / active alarm', owner: 'evnt' },
  'evnt.detection-lapse.read': { label: 'Read detection-lapse state', owner: 'evnt' },
  'edge.device.read': { label: 'Read edge device status', owner: 'edge' },
  'pat.command.read': { label: 'Read command catalog', owner: 'pat' },
} as const;

// ── Feature flags ─────────────────────────────────────────────────────────────

export const MODULE_FEATURE_FLAGS = {
  'dash.suggestion.enabled': {
    defaultState: true,
    justification: 'Deterministic heuristic over HIST entries — advisory card on Home. Never self-executing (INV-5). Off = suggestion card hidden; data layer unaffected.',
  },
} as const;
