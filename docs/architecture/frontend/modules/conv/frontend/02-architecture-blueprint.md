# 02 — Architecture Blueprint — conv (CONV) Frontend

## 1. System boundary

The CONV frontend is the **patient's communication runtime** on the station, in Patient Mode. Its
network boundary is deliberately tiny and **non-blocking**: it is a client of **conv-service**
(through the API gateway) only to **sync** the published speech-tree snapshot and to **prefetch**
audio assets into the local cache — never per navigation step and never per phrase. At runtime the
**cache is the source of truth**. CONV authenticates with the **patient-session token** (minted by
**ACS**, ADR-012) carrying `conv.*` / `gest.*` authorities only (ACS INV-3) — distinct from the
`edge.device` station token that GEST/EDGE use. CONV never streams video, never generates alarms,
never authors content, and **never calls GEST/TRN/EVNT directly**.

> Contract note: concrete conv-service endpoints (tree snapshot, audio asset) are **owned by the BE
> vision (M1.5)**. This blueprint references them abstractly under `${ACCESS_HTTP_BASE}/conv` and
> must be reconciled against the published api-contract at Specs time — no URLs are invented here.

## 2. External actors and systems

- **Patient (station user)** — the only runtime operator; input via gesture / touch / switch scan.
- **GEST (same Patient-Mode host)** — publishes navigation intents **in-process** via the
  `NavigationIntentPort` seam (ADR-007). GEST does **not** HTTP-call CONV.
- **libs/edge (same host)** — owns station/device identity + the device-token interceptor used by
  GEST/EDGE egress; CONV reuses the host's identity wiring but egresses with the **patient-session**
  bearer, not the device token.
- **ACS** — issues the patient-session token + `conv.*` / `gest.*` authorities (ADR-012, INV-3).
- **PAT** — `GET /pat/patients/{patientId}` (`pat.patient.read`) for patient context (known M0).
- **conv-service (BE)** — publishes the dual-authorized tree snapshot + audio assets (contract M1.5).
- **TRN (out-of-band, upstream)** — authors tree + synthesizes audio; approved content later appears
  in CONV's synced snapshot. Async; no synchronous screen handoff.
- **Browser platform** — Service Worker + Cache Storage + IndexedDB (offline), Web Speech API
  (`SpeechSynthesis`) as the audio fallback (OPS-004). No third-party widget; no analytics SDK.

## 3. End-to-end user flows

### Golden path A — Navigate and speak (offline, cache-served)

```
Patient station (Patient Mode) — tree + audio already cached
  Input (any channel) ─▶ NavigationIntentService (single selected-node model)
        ├─ touch/switch ─▶ UI event
        └─ gesture ─▶ NavigationIntentPort.push(intent)  (GEST → CONV, in-process)
                                   │
                                   ▼
  SpeechTreeFacade.select(nodeId)   (reads from local cache — 0 network)
        ├─ node.type = category  ─▶ descend one level (parentId := nodeId)
        └─ node.type = phrase    ─▶ selectedNode := node
                                   │
                                   ▼
  AudioPlaybackService.play(node)
        ├─ cached clip present ─▶ play Blob from Cache Storage      (< 250 ms, patient's voice)
        ├─ clip missing + SpeechSynthesis available ─▶ device TTS of node.content.en.text
        └─ neither ─▶ render the phrase text LARGE (visual-only), never silent-fail
```

### Golden path B — Background sync (online, out of the daily loop)

```
Station regains network (or periodic check) →
  TreeSyncService.check(currentVersion)
        ├─ GET ${ACCESS_HTTP_BASE}/conv/<tree snapshot>  (Bearer patient-session; contract M1.5)
        ├─ 304 / same version ─▶ no-op (keep serving cache)
        └─ newer version ─▶ download snapshot + diff audio assets ─▶ atomically swap cache
                                   │  (stale snapshot kept until the new one is fully cached)
                                   ▼
             publish new version signal; next navigation reads the new cache (cache-first, revalidate)
```

### Golden path C — Pending patient confirmations (boundary to TRN)

```
Cached snapshot includes nodes caregiverConfirmed && !patientConfirmed (en) →
  SpeechTreeFacade.pendingConfirmation() > 0 ─▶ show banner "N new phrase(s) to confirm"
        └─ routerLink → /patient/confirm-training   (patient-confirmation surface — TRN/Screen 09)
  CONV runtime shows the count only; it does NOT author or mutate tree content.
```

### Edge cases

- **Network off at cold start, nothing cached yet** → "Tree not yet configured / not yet synced on
  this station" empty-state; the patient cannot speak until a first sync happened (hard dependency —
  see 06 risks). Never a spinner that blocks forever.
- **Audio clip missing** → device TTS → large-text fallback (A above), surfaced honestly.
- **Stale cache while offline** → keep serving the last fully-cached snapshot; show a subtle "offline
  — showing last synced version" marker; never block.
- **Gesture intent targets a non-authorized/absent node** → ignored (no navigation); scanning/touch
  unaffected.
- **401 on sync** (patient-session revoked by caregiver) → stop syncing, keep serving cache if policy
  allows, surface "session ended — ask your caregiver"; never silently retry a revoked token.
- **403 on sync** (token lacks `conv.*`) → stop; surface misconfiguration; do not fake content.

## 4. Internal boundaries (Nx libraries — module-as-library, ADR-006)

```
apps/conv/                                   # thin host (type:app, scope:conv) — mounted by the
└── src/app/app.routes.ts                    #   Patient-Mode shell (host TBD, §06 G1 shared with GEST)
                                             #   loadChildren → @neuroassist/conv

libs/conv/   (scope:conv)                    # module-as-library; importPath @neuroassist/conv (ADR-006)
└── src/lib/
    ├── conv.routes.ts                        # CONV_ROUTES[] (Screen 06 + confirm-training link-out)
    ├── conv.providers.ts                     # provideConv({ adapter }) — default 'http' (see below)
    ├── conv.descriptor.ts                    # CONV_MODULE_DESCRIPTOR (section:'patient', consumed by host)
    ├── conv.permission-map.ts                # MODULE_PERMISSION_MAP (conv.* keys = BE authorities)
    ├── conv.feature-flags.ts                 # ModuleFeatureFlags (defaultState)
    ├── access/           (type:domain)       # patientSessionGuard (conv.* via session — never `return true`)
    ├── api/              (type:data-access)  # TREE_SNAPSHOT_PORT + AUDIO_ASSET_PORT + Http/Mock adapters
    │                                         #   (base `${ACCESS_HTTP_BASE}/conv`; <Wire> types + mappers)
    ├── offline/          (type:domain)       # TreeCacheStore (IndexedDB) + AudioCacheStore (Cache Storage)
    │                                         #   + TreeSyncService (version-aware, cache-first revalidate)
    ├── integration/      (type:domain)       # NAVIGATION_INTENT_PORT + NoOpNavigationIntentPort
    │                                         #   + ConvShellIntegrationService (host wiring)
    ├── speech-tree.facade.ts                 # signals: items(), loading(), isActive(node,locale),
    │                                         #   selectedNode(), pendingConfirmation()
    ├── audio-playback.service.ts             # cached clip → device TTS → large text (fail-safe)
    ├── feature-converse/ (type:feature)      # SpeechTreeNavigator page (Screen 06, OnPush, standalone)
    ├── navigation/       (type:domain)       # breadcrumb/level state, switch-scan timing model
    └── ui/ (optional)    (type:ui)           # conv-local presentational (NodeTile, ChannelBadge, TTSPlayer)

apps/conv-e2e/                               # Playwright specs (offline mode, fake intents, missing-clip)
```

Tags: `scope:conv` + `type:{feature|data-access|domain|ui|app}`. A `scope:conv` lib may import only
`scope:conv` + `scope:shared`. The Patient-Mode shell imports `@neuroassist/conv` via
`CONV_MODULE_DESCRIPTOR` and co-mounts it beside GEST + libs/edge in **one host** (the G1 gap).

> Pitfall guard (Learning D-611): `conv.providers.ts` ships **default `adapter:'http'`** once
> conv-service is published; HTTP adapters use base `${ACCESS_HTTP_BASE}/conv`, type responses as
> `<...Wire>` mirroring the BE record, and `.pipe(map(toDomain))`; the Mock adapter serves the same
> wire shape through the same mappers; a providers spec proves the default resolves to HTTP.

## 5. Cross-cutting concerns

| Concern | How CONV handles it |
|---|---|
| **Station / patient identity (AuthN)** | **patient-session** token from **ACS** (ADR-012) carrying `conv.*`/`gest.*` (INV-3) — **not** a caregiver JWT, **not** the `edge.device` token. CONV egress attaches the patient-session bearer. |
| **AuthZ / RBAC** | `@neuroassist/shared/access-decision` — `patientSessionGuard` consults the session + `conv.*` authorities; **never hardcodes `return true`** (Learning pitfall `guard:stub-permissive`). Permission keys mirror BE authorities verbatim (D-639). |
| **HTTP** | `@neuroassist/shared/access-http-base` interceptors (correlation + error-normalize); base `${ACCESS_HTTP_BASE}/conv` (**never** `/api/v1`). Used only for sync/prefetch, never per step. |
| **Offline / cache** | Service Worker + **Cache Storage** (audio Blobs) + **IndexedDB** (tree snapshot + version). Cache-first reads, version-aware background revalidate, atomic swap (ADR-005). |
| **Input channels** | `NAVIGATION_INTENT_PORT` in-process seam (GEST→CONV); touch + switch-scan handled in-module; one selected-node model (ADR-007). Accessibility: dwell, large targets, configurable scan timing. |
| **Audio** | `AudioPlaybackService`: cached clip → `SpeechSynthesis` fallback (OPS-004) → large-text visual; honest "cached vs fallback" indicator. |
| **Errors** | conv-service `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → `@neuroassist/shared/ui-feedback`. Offline/stale are states, not errors. |
| **Observability** | `@neuroassist/shared/observability` — navigation latency, cache hit/miss, audio source (cached/TTS/text), sync outcome; never logs phrase content as PII beyond policy; no `console.log`. |
| **Design tokens** | Tailwind v4 oklch tokens via `@neuroassist/shared/ui-tokens`; dark default; CDK primitives (no Material); large targets for ALS/MND. |
| **i18n** | None — English-only (ADR-018); content keeps a per-locale map shape but only `content.en` is used. |
