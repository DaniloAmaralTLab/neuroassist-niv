# SPEC-02 — Component Hierarchy — conv (CONV) Frontend

> Smart components inject the CONV facades/services and read their signals; presentational components
> receive inputs and emit outputs. **No EARS here** (component trees are structure, not behavior — EARS
> guide "Where NOT to use EARS"). No Angular code is generated at this stage; the tree is illustration.
> Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/04` §3, prototype `conv-tree.component.ts`.

## 1. `feature-converse` tree

```
SpeechTreeNavigatorComponent                 (smart — Screen 06; OnPush, standalone)
│   injects: SpeechTreeFacade, AudioPlaybackService, NavigationService
│   reads signals: vm() (ConverseScreenVM), nodes(), currentLevelLabel(), selectedNode(),
│                  activeChannel(), pendingConfirmation(), audioSource(), offline(), snapshotVersion()
│
├── LevelHeaderComponent                      (presentational)
│     @Input currentLevelLabel: string | null  → parent node text, or "Choose a category"
│     @Input offline: boolean                   → renders the subtle "offline — last synced vX" marker
│     @Input snapshotVersion: string
│
├── ChannelBadgeComponent                     (presentational)
│     @Input activeChannel: 'touch' | 'gesture' | 'scan'   → "Active channel: …"
│
├── PendingConfirmationBannerComponent        (presentational)
│     @Input count: number                      → "N new phrase(s) to confirm"
│     emits:  (open) → routerLink /patient/confirm-training (TRN surface; CONV links only — SPEC-01 §2)
│     rendered only WHEN count > 0
│
├── NodeGridComponent                         (presentational)
│     @Input nodes: SpeechTreeNodeVM[]          → active-filtered, order-sorted children of current level
│     @Input selectedId: string | null
│     emits:  (select node) (descend categoryId)
│     renders a large-target tile per node; "reachable by gesture" hint when reachableByGesture
│
├── TtsPlayerComponent                        (presentational)
│     @Input selectedNode: SpeechTreeNodeVM | null
│     @Input audioSource: 'cached' | 'tts-fallback' | 'text-only' | null
│     renders the honest cached-vs-fallback indicator; for 'text-only' shows the phrase LARGE
│
└── NavFooterComponent                        (presentational)
      emits:  (back)                            → level up; rendered only when not at root
      switch-scan cursor affordance (dwell/scan timing from NavigationService)
```

### Smart component — `SpeechTreeNavigatorComponent`

The **only** smart component. It injects `SpeechTreeFacade` (cache-backed signals), `AudioPlaybackService`
(fail-safe cascade) and `NavigationService` (level stack + switch-scan timing). It owns **no `HttpClient`**,
**no store**, and issues **no network call** on any user action (reads are cache-first — doc 05 §2/§3). All
three input channels (touch, gesture via `NAVIGATION_INTENT_PORT`, switch scan) converge on the same
`SpeechTreeFacade.select(nodeId)` / level navigation — no channel forks the state (ADR-007, INV in doc 03 §5).

Signals the smart component reads (explicit, doc 04 §6):

| Component | Signals read |
|---|---|
| `SpeechTreeNavigatorComponent` | `SpeechTreeFacade.items()`, `.loading()`, `.selectedNode()`, `.pendingConfirmation()`, `NavigationService.currentLevelLabel()`, `.activeChannel()`, `AudioPlaybackService.audioSource()`, `TreeSyncService.offline()`, `.snapshotVersion()` |

## 2. Presentational-only rule

`LevelHeader`, `ChannelBadge`, `PendingConfirmationBanner`, `NodeGrid`, `TtsPlayer` and `NavFooter` are
`OnPush`, take inputs and emit outputs, and hold **no** injected facade or HTTP. This keeps the cache the
single source of truth and prevents a second, drifting navigation state. The `conv-local ui/` lib
(`type:ui`) holds `NodeTile`, `ChannelBadge`, `TTSPlayer` if extracted; otherwise they live in
`feature-converse`.

## 3. What CONV does NOT render

CONV renders **no** authoring, publish, retire or erase surface (those are TRN service-client operations,
BE api-contract §5–§7 — no patient-session UI). It renders **no** caregiver dashboard or history (DASH/HIST),
**no** webcam/gesture-recognition surface (GEST owns the camera), and **no** alarm/event takeover (EVNT). The
`/patient/confirm-training` page is TRN's; CONV only links to it via `PendingConfirmationBannerComponent`.
