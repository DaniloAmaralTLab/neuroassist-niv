# Plan — FE-CONV: Conversation via Speech Tree (Frontend)

**Client:** neuroassist-niv
**Module:** CONV
**Layer:** Frontend (Angular 21 / Nx 22)
**Generated:** 2026-11-22
**Status:** ACTIVE

---

## 1. Project summary

CONV is the offline-first speech tree runtime for ALS/MND patients using the NeuroAssist NIV station. The patient communicates by selecting pre-synthesized audio phrases (ElevenLabs, patient's cloned voice) from a hierarchical category/phrase tree. The design contract is **cache-is-truth**: IndexedDB stores the tree bundle; Cache Storage holds the audio Blobs. The navigation/playback loop performs **zero HTTP calls** (INV-CONV-5); sync and usage-signal delivery are background concerns.

The frontend module exposes a single route (`/patient/converse`) guarded by `patientSessionGuard`. It is built on Angular 21 signals + standalone components + `OnPush`, following `ADR-005` (offline-first) and `ADR-007` (input-channel-agnostic navigation seam). Patient identity: a non-expiring, revocable `patient-session` token with exactly three CONV authorities (`conv.tree.read`, `conv.audio.read`, `conv.usage.record`).

The module integrates with GEST (navigation intents via in-process `NAVIGATION_INTENT_PORT`, non-blocking), EDGE (audio prefetch on first-sync, non-blocking), and TRN (link-out to `/patient/confirm-training`, no CONV-owned route).

---

## 2. Execution waves — P1..P9

### P1 — Foundation (days 1–3)

**Goal:** Contract, routing, DI bootstrap. After P1, the CONV module loads in the shell and renders an empty tree surface.

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-001 | conv.contract.ts | — |
| FE-CONV-002 | CONV_ROUTES | FE-CONV-001 |
| FE-CONV-003 | provideConv() | FE-CONV-001 |
| FE-CONV-004 | NAVIGATION_INTENT_PORT | FE-CONV-003 |
| FE-CONV-005 | CONV_MODULE_DESCRIPTOR + conv.bootstrap.ts | FE-CONV-001 |

**Definition of Done (P1):** `npx nx build conv` PASS; `/patient/converse` loads in the shell (empty surface, no errors); `provideConv()` resolves `NoOpNavigationIntentPort` by default.

---

### P2 — Data access (days 3–7)

**Goal:** All three HTTP ports + offline cache layer wired. After P2, tree sync works, audio plays from cache, usage signals queue.

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-006 | TreeSnapshotHttpAdapter | FE-CONV-003 |
| FE-CONV-007 | TreeCacheStore + TreeSyncService | FE-CONV-006 |
| FE-CONV-008 | AudioAssetHttpAdapter + AudioCacheStore | FE-CONV-003 |
| FE-CONV-009 | AudioPlaybackService (cascade) | FE-CONV-008 |
| FE-CONV-010 | UsageSignalHttpAdapter + UsageSignalService | FE-CONV-003 |

FE-CONV-008..010 can run in parallel after FE-CONV-003.

**Definition of Done (P2):** `npx nx test conv-data-access` PASS; tree snapshot fetched + cached in IndexedDB; audio Blob cached in Cache Storage; usage signals queue with no network block on playback.

---

### P3 — Feature libs (days 7–12)

**Goal:** Full speech tree UI implemented. After P3, the patient can navigate, select, and hear phrases.

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-011 | View model types | FE-CONV-001 |
| FE-CONV-012 | SpeechTreeFacade | FE-CONV-011, FE-CONV-007, FE-CONV-013 |
| FE-CONV-013 | NavigationService | FE-CONV-011 |
| FE-CONV-014 | SpeechTreeNavigatorComponent | FE-CONV-012, FE-CONV-009 |
| FE-CONV-015 | LevelHeader + ChannelBadge + PendingConfirmationBanner | FE-CONV-014 |
| FE-CONV-016 | NodeGridComponent | FE-CONV-011, FE-CONV-014 |
| FE-CONV-017 | TtsPlayerComponent + NavFooterComponent | FE-CONV-011, FE-CONV-014 |

FE-CONV-011..013 can run in parallel. FE-CONV-015..017 can run in parallel after FE-CONV-014.

**MVP gate (P3 done):** patient can navigate to a phrase and trigger the audio cascade; `treeState='ready'` renders the grid; `select()` via touch plays audio. This is the **MVP shippable on dev** milestone.

---

### P4 — INT cross-module (days 10–13, partially parallel with P3)

**Goal:** Cross-module coordination issues surfaced and unblocked.

| Issue | Owner | Blocking |
|---|---|---|
| INT-FE-CONV-001 | GEST | FE-CONV-004, FE-CONV-019 |
| INT-FE-CONV-002 | EDGE | FE-CONV-008 |
| INT-FE-CONV-003 | CONV | FE-CONV-006, FE-CONV-008, FE-CONV-010, FE-CONV-020 |

**Definition of Done (P4):** GEST co-mounted → gesture navigation intent selects same node as touch. EDGE first-sync warms audio cache. CONV ProblemDetail.type slugs registered.

---

### P5 — Access guards (days 12–14)

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-018 | patientSessionGuard + conv-auth.interceptor | FE-CONV-001 |
| INT-FE-CONV-005 | shared/access-decision stub (Wave-0) | FE-CONV-018 |

**Definition of Done (P5):** absent patient-session → redirect to session-ended surface; conv HTTP egress carries patient-session Bearer.

---

### P6 — Shell integration (days 13–14)

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-019 | ConvShellIntegrationService | FE-CONV-004, FE-CONV-012, INT-FE-CONV-001 |

---

### P7 — UX polish (days 14–16)

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-020 | TreeState error UI surfaces | FE-CONV-012, INT-FE-CONV-003 |
| FE-CONV-021 | TTS/text-only visual fallback | FE-CONV-009, FE-CONV-017 |

**Definition of Done (P7):** all five `TreeState` values render correctly; TTS cascade wired; text-only large render displays phrase; no modal used under any circumstance.

---

### P8 — Observability (days 16–17)

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-022 | Telemetry events (6 events, no PII) | FE-CONV-007, FE-CONV-009..010, FE-CONV-012 |
| INT-FE-CONV-004 | Correlation id propagation | FE-CONV-018 |

---

### P9 — E2E + hardening (days 17–21)

| Issue | Title | Blocking |
|---|---|---|
| FE-CONV-023 | conv-e2e Nx project + fixtures | P2, P5 (guard) |
| FE-CONV-024 | E2E golden paths A/B/C (SPEC-08 features 1–3) | FE-CONV-023 |
| FE-CONV-025 | E2E guard + audio fail-safe + input channel (SPEC-08 features 4–6) | FE-CONV-023..024 |

**Definition of Done (P9):** 35 E2E scenarios from SPEC-08 PASS; `npx nx e2e conv-e2e --skipInstall` green in CI.

---

## 3. Critical path

```
P1: 001→002→003→004→005
P2: 003→006→007→012  (008→009 parallel)
P3: 011→012→014→016  (013→012; 015,017 parallel)
P5: 001→018
P6: 004+012→019
P7: 012+009→020+021
P9: 023→024→025
```

Elapsed time estimate: **18–23 developer-days** (1 dev, some parallel P2+P3 work). With two developers in parallel: ~12–14 days.

---

## 4. Top risks

| ID | Risk | Mitigation |
|---|---|---|
| G1 | Patient-Mode host app undecided | CONV and GEST are independently deployable today; `NoOpNavigationIntentPort` default + `CONV_MODULE_DESCRIPTOR` prepared for host integration when decided |
| Q1 | Two tokens per station (patient-session / edge.device) — interceptor scoping is a host concern | FE-CONV-018 implements the CONV interceptor only; Q1 is a host-level concern tracked in INT-FE-CONV-005 notes |
| R1 | Registry label `conv-ui` vs `@neuroassist/conv` inconsistency | Reconcile `modules.registry[CONV].frontendLib` with the on-disk Nx lib path before scaffold |
| R2 | shared/access-decision Wave-0 stub is permissive | Network-layer enforcement via `conv-auth.interceptor.ts` Bearer is always active; FE-layer authority check tightens when PLATFORM ships; stub is tracked in INT-FE-CONV-005 |

---

## 5. Definition of Done — per milestone

| Milestone | DoD |
|---|---|
| P1 done | `npx nx build conv` PASS; `/patient/converse` loads in shell |
| P2 done | `npx nx test conv-data-access` PASS; tree + audio cache working; zero HTTP on playback |
| P3 done (MVP) | Patient navigates tree, hears phrase, back navigation works; `npx nx test conv-feature-converse` PASS |
| P5 done | Guard redirects absent session to session-ended surface; interceptor adds Bearer |
| P7 done | All 5 TreeState values render; text-only large render; no modal used |
| P9 done | 35 E2E scenarios from SPEC-08 PASS in CI |

---

## 6. Architecture decision references

| ADR | Title | Issues |
|---|---|---|
| ADR-005 | Offline-first tree + audio cache (immutable ETag-versioned bundles, atomic swap) | FE-CONV-006..009 |
| ADR-007 | Input-channel-agnostic navigation seam (touch, gesture, switch-scan → same facade) | FE-CONV-012..014, FE-CONV-019, INT-FE-CONV-001 |
| ADR-018 | English-only product (SpeechSynthesis lang='en-US') | FE-CONV-021 |

---

## 7. Approval criteria by wave

| Wave | Approver | Evidence required |
|---|---|---|
| P1 | FE Lead | Shell loads `/patient/converse`; Nx build green |
| P3 (MVP) | Product Owner | Demo: patient navigates, selects phrase, audio plays from cache |
| P5 | Security Review | Guard test: absent session → session-ended; Bearer on interceptor |
| P9 | QA Lead | 35 E2E green in CI; no flakiness on 3 consecutive runs |
