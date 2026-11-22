# 03 — Domain Framing (Frontend) — conv (CONV)

> Mirror of the BE domain; do not redefine. Canonical terms live in `_brief.md` and the BE framing
> (M1.5). This file captures the **client-side** view-models, events, state and invariants only.

## 1. Ubiquitous language (mirror)

- **SpeechTreeNode** — a node of the tree; `type ∈ { category, phrase }`; `parentId = null` ⇒ root.
  Carries `order`, `content` (per-locale map; only `en` used, ADR-018), optional `engineFeatureRef`
  (maps a recognized gesture to a node, unified gesture vocabulary), optional `audioRef` per locale.
- **Dual Authorization** — `content[locale].caregiverConfirmed` + `content[locale].patientConfirmed`;
  a **phrase** is *active* (shown) only when both are true (ADR-015/ADR-016). Categories are always
  shown (structure, not reviewable content).
- **Published snapshot** — the dual-authorized, synced tree cached on the station (CONV reads this).
- **Audio clip** — pre-synthesized ElevenLabs Blob in the patient's voice, referenced by `audioRef`,
  cached in Cache Storage (ADR-017).
- **Patient session** — the non-expiring, revocable session identity (ACS, ADR-012) CONV runs under.

## 2. View models (draft)

```
SpeechTreeNodeVM {
  id: string
  type: 'category' | 'phrase'
  parentId: string | null
  order: number
  text: string                 // content.en.text
  audioRef: string | null      // content.en.audioRef (cache key)
  engineFeatureRef: string | null
  reachableByGesture: boolean  // derived: engineFeatureRef != null
  active: boolean              // derived: type==='category' || dualAuthorized(en)
}

ConverseScreenVM {
  currentLevelLabel: string | null   // parent node text, or "Choose a category"
  nodes: SpeechTreeNodeVM[]          // children of current parent, active-filtered, order-sorted
  selectedNode: SpeechTreeNodeVM | null
  activeChannel: 'touch' | 'gesture' | 'scan'
  pendingConfirmation: number        // caregiverConfirmed && !patientConfirmed (en)
  audioSource: 'cached' | 'tts-fallback' | 'text-only' | null
  offline: boolean                   // serving cache without a live sync
  snapshotVersion: string
}
```

## 3. UI events (user-driven state changes)

- `selectNode(id)` — from any channel (touch tap, switch confirm, or gesture intent).
- `descend(categoryId)` / `back()` — level navigation.
- `playSelected()` — trigger audio for the selected phrase (auto on phrase select).
- `scanTick()` / `scanConfirm()` — switch-scanning cursor advance / commit (timed).
- `gestureIntent(ref)` — inbound via `NavigationIntentPort` (GEST), resolved to a node at the level.
- `openPendingConfirmations()` — navigate out to `/patient/confirm-training` (TRN surface).
- `syncNow()` — manual/background revalidate (non-blocking).

## 4. State transitions (UI level)

```
Tree load:      cold → syncing → ready(cache) | empty(no snapshot)
Navigation:     idle ⇄ category-level ⇄ child-level     (selectedNode resets on descend/back)
Selection:      none → phrase-selected → speaking → spoken   (channel-independent)
Audio:          resolve → cached-play | tts-play | text-show   (fail-safe cascade)
Scanning:       scan-idle → scan-cursor-moving → scan-confirmed → selectNode
Sync:           up-to-date ⇄ checking → (newer→swapping→up-to-date) | (offline→stale, keep serving)
```

## 5. Invariants (client-side)

- A **phrase** node renders only if dual-authorized in `en`; a **category** always renders.
- Navigation depth from root to any phrase MUST be reachable in **≤ 2 selections** (Principle 7).
- Every channel resolves to the **same** `selectedNode`; no channel bypasses the active-filter.
- Runtime navigation + playback MUST issue **zero** network calls (cache-only); sync is out-of-loop.
- Audio MUST never silently fail: cached → device TTS → large text, in that order.
- `patientSessionGuard` MUST decide from the real session (`conv.*` authority); never `return true`.
- CONV MUST NOT mutate tree content, mint tokens, generate events, or call GEST/TRN/EVNT over HTTP.
- TODO[architect]: whether selecting a phrase with an `engineFeatureRef` ALSO emits a catalog Event
  (prototype §select TODO; BE framing question). CONV v1 **does not** emit Events (EVNT owns that);
  confirm at M1.5 before Specs.
