# SPEC-03 — View Models — conv (CONV) Frontend

> The view-models the CONV facades expose as `computed` signals, plus the **offline-first state
> invariants** that are the module's critical-domain decision (FE `adr/ADR-005`, BE `ADR-003`; invariants
> declared once in `frontend/03-domain-framing-frontend.md` §5). Code fences are illustration. Invariant
> ids are **cited, not redeclared** (ADR-007 of candeeiro-so).

## 1. View-models (record shapes with Signals)

```ts
// child node at the active level
export interface SpeechTreeNodeVM {
  id: string;
  type: 'category' | 'phrase';
  parentId: string | null;
  order: number;
  text: string;                  // content.en.text (ADR-018 English-only)
  audioRef: string | null;       // content.en.audioRef → maps to an audioManifest assetId (cache key)
  engineFeatureRef: string | null;
  reachableByGesture: boolean;   // derived: engineFeatureRef != null
  active: boolean;               // derived: type === 'category' || dualAuthorized(en)
}

// the /patient/converse screen
export interface ConverseScreenVM {
  currentLevelLabel: string | null;   // parent node text, or "Choose a category"
  nodes: SpeechTreeNodeVM[];          // children of current parent, active-filtered, order-sorted
  selectedNode: SpeechTreeNodeVM | null;
  activeChannel: 'touch' | 'gesture' | 'scan';
  pendingConfirmation: number;        // caregiverConfirmed && !patientConfirmed (en)
  audioSource: 'cached' | 'tts-fallback' | 'text-only' | null;
  offline: boolean;                   // serving cache without a live sync
  snapshotVersion: string;            // the cached TreeVersion's version/ETag label
  treeState: TreeState;               // §2
}
```

## 2. Tree-load state axis (the fail-safe surface)

```ts
export type TreeState = 'cold' | 'syncing' | 'ready' | 'empty' | 'offline-stale';
```

| TreeState | Meaning | What the patient sees |
|---|---|---|
| `cold` | first boot, no snapshot, first sync in flight | a **bounded** loading state (never an infinite spinner) |
| `syncing` | a snapshot is cached; a background revalidate is in flight | the cached tree stays fully usable (non-blocking) |
| `ready` | cached snapshot present, last sync succeeded | the live tree |
| `empty` | **no snapshot cached and offline** (never synced on this station) | honest cold-empty state "not yet synced on this station" (R1) |
| `offline-stale` | cached snapshot present, serving offline without a live sync | the cached tree + a subtle "offline — last synced vX" marker |

`offline-stale` is a **state, not an error** (doc 05 §5): the last fully-cached snapshot keeps serving; the
version marker is shown; nothing blocks. `empty` is the single hard-dependency state (BE/EDGE provisioning
must have performed a first sync — INT-CONV-1; cross-link §3).

## 3. Derived-state rules (cited invariants, doc 03 §5)

- **Dual-authorization filter.** A **phrase** node is in `nodes` only when `active === true` (dual-authorized
  in `en`); a **category** node is always in `nodes` (structure, not reviewable content).
- **≤ 2 selections.** The active level's `nodes` guarantee any phrase is reachable in at most two selections
  (root category → phrase); the VM never nests deeper than the published tree allows.
- **One selected node, all channels.** `selectedNode` is set the same way from touch, a gesture intent, and a
  switch-scan confirm; no channel bypasses the active-filter (ADR-007).
- **Zero network on the loop.** Building any `ConverseScreenVM` reads only from `TreeCacheStore` /
  `AudioCacheStore`; it issues **no** HTTP (INV-CONV-5).
- **Honest audio source.** `audioSource` reflects the resolved cascade (`cached` → `tts-fallback` →
  `text-only`); it is never reported as `cached` when the clip is absent.

## Acceptance criteria (EARS)

- WHILE the station is on cold start with the first tree sync in flight, THE SYSTEM SHALL hold a bounded loading state and SHALL NOT render an empty tree as configured.
- WHILE no snapshot is cached and the station is offline, THE SYSTEM SHALL render the cold-empty "not yet synced on this station" state and SHALL NOT render a spinner that blocks forever.
- THE SYSTEM SHALL render a phrase node only when it is dual-authorized in English and SHALL always render a category node.
- WHILE serving a cached snapshot without a live sync, THE SYSTEM SHALL show the offline "last synced" version marker and SHALL keep the cached tree usable.
- WHEN caregiver-confirmed phrases await patient confirmation, THE SYSTEM SHALL show the "N phrase(s) to confirm" banner linking to the TRN confirmation surface.
- THE SYSTEM SHALL resolve every channel to the same selected node and SHALL NOT let any channel bypass the dual-authorization filter.
