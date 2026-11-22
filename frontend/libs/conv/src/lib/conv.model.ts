// conv.model.ts — domain types for the CONV speech-tree runtime.
// Mirrors the prototype's data-model.ts (Amendment 3/4) promoted to the library;
// English-only product (ADR-018-english-only-product).

export type SpeechTreeNodeType = 'category' | 'phrase';
/** English is the only supported locale (ADR-018). */
export type Locale = 'en';

/**
 * Per-locale content of a SpeechTreeNode.
 * Dual Authorization gates phrase visibility (ADR-016):
 * a phrase is "active" (shown in the runtime) only when both flags are true.
 */
export interface ContentLocale {
  text: string;
  /** Reference to the cached audio clip (`assetId`); null if not yet synthesized. */
  audioRef: string | null;
  /** Set by the caregiver in the TRAINING phase (TRN) — read-only in CONV. */
  caregiverConfirmed: boolean;
  /** Set by the patient in the TRAINING phase (TRN) — read-only in CONV. */
  patientConfirmed: boolean;
}

/**
 * Speech-tree node in the domain model (flattened from the wire hierarchy).
 * null `parentId` = root (top-level category).
 * `engineFeatureRef` maps to a GestureType id from the GEST vocabulary (ADR-013 §complement).
 */
export interface SpeechTreeNode {
  id: string;
  patientId: string;
  parentId: string | null;
  type: SpeechTreeNodeType;
  /** Keyed by Locale (always 'en', ADR-018). */
  content: Record<Locale, ContentLocale>;
  order: number;
  engineFeatureRef: string | null;
  proposedByTraining: boolean;
}
