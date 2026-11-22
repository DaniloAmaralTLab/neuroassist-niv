# CONV FE Issues Map

**Generated:** 2026-11-22
**Total:** 25 functional issues + 5 integration issues = **30 issues**
**Module:** CONV (Conversation via Speech Tree)
**Layer:** Frontend (Angular 21 / Nx)
**D-493:** prototype-first → promote; all issues are "wire component X to API Y" — no scaffold

---

## Summary by priority wave

| Wave | Label | Issues | Count |
|---|---|---|---|
| P1 | Foundation | FE-CONV-001..005 | 5 |
| P2 | Data access | FE-CONV-006..010 | 5 |
| P3 | Feature libs | FE-CONV-011..017 | 7 |
| P4 | INT cross-module | INT-FE-CONV-001..003 | 3 |
| P5 | Access guards | FE-CONV-018, INT-FE-CONV-005 | 2 |
| P6 | Shell integration | FE-CONV-019 | 1 |
| P7 | UX polish | FE-CONV-020..021 | 2 |
| P8 | Observability | FE-CONV-022, INT-FE-CONV-004 | 2 |
| P9 | E2E + hardening | FE-CONV-023..025 | 3 |

---

## P1 — Foundation (FE-CONV-001..005)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-001 | conv.contract.ts — 3 authorities, 2 flags, CONV_MODULE_VERSION | P1 | S |
| FE-CONV-002 | CONV_ROUTES — /patient/converse, patientSessionGuard, lazy, G1 host gap noted | P1 | S |
| FE-CONV-003 | provideConv() — HTTP ports, NoOpNavigationIntentPort default, mock-adapter-default guard | P1 | S |
| FE-CONV-004 | NAVIGATION_INTENT_PORT InjectionToken + NoOpNavigationIntentPort | P1 | S |
| FE-CONV-005 | CONV_MODULE_DESCRIPTOR + conv.bootstrap.ts — shell descriptor, lifecycle subscribe/unsubscribe | P1 | S |

**SPEC sources:** SPEC-01 (routes), SPEC-05 (contract, permissions), SPEC-06 (descriptor/bootstrap)

---

## P2 — Data access (FE-CONV-006..010)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-006 | TreeSnapshotHttpAdapter — GET /conv/tree, ETag, http-adapter:wrong-prefix guard | P2 | M |
| FE-CONV-007 | TreeCacheStore + TreeSyncService — IndexedDB, atomic swap, offline-stale state | P2 | M |
| FE-CONV-008 | AudioAssetHttpAdapter + AudioCacheStore — GET /conv/audio/{assetId}, immutable ETag, Blob storage | P2 | M |
| FE-CONV-009 | AudioPlaybackService — fail-safe cascade (cached Blob → TTS → text-only), audioSource signal | P2 | M |
| FE-CONV-010 | UsageSignalHttpAdapter + UsageSignalService — POST /conv/usage-signals, opt-in gate, 400 discard | P2 | M |

**SPEC sources:** SPEC-04 (data access, ports), SPEC-07 (error handling, fail-safe)
**Key invariant:** ZERO HTTP on the navigation/playback loop (INV-CONV-5); cache-is-truth (ADR-005)

---

## P3 — Feature libs (FE-CONV-011..017)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-011 | View model types — SpeechTreeNodeVM, ConverseScreenVM, TreeState, Wire records | P3 | S |
| FE-CONV-012 | SpeechTreeFacade — computed signals (.asReadonly()), dual-auth filter, select/descend/back | P3 | M |
| FE-CONV-013 | NavigationService — level stack, currentLevelLabel, activeChannel, switch-scan gate | P3 | S |
| FE-CONV-014 | SpeechTreeNavigatorComponent — smart, OnPush, injects facades, zero HttpClient | P3 | M |
| FE-CONV-015 | LevelHeaderComponent + ChannelBadgeComponent + PendingConfirmationBannerComponent | P3 | M |
| FE-CONV-016 | NodeGridComponent — dual-auth display, large tiles (ALS/MND), gesture hint, a11y | P3 | M |
| FE-CONV-017 | TtsPlayerComponent + NavFooterComponent — honest source indicator, text-only large render | P3 | M |

**SPEC sources:** SPEC-02 (component hierarchy), SPEC-03 (view models, derived state), ADR-007 (channel-agnostic)

---

## P4 — INT cross-module (INT-FE-CONV-001..003)

| ID | Title | Owner | Priority |
|---|---|---|---|
| INT-FE-CONV-001 | GEST publishes navigation intents to CONV NAVIGATION_INTENT_PORT (non-blocking, default NoOp) | GEST | P4 |
| INT-FE-CONV-002 | EDGE provisioning first-sync must PREFETCH AUDIO (amends BE INT-CONV-1) | EDGE | P4 |
| INT-FE-CONV-003 | shared/error-model CONV type slugs — 4 ProblemDetail URNs, copy map | CONV | P4 |

**SPEC sources:** SPEC-04 §2+§4 (INT-FE-CONV-1/2), SPEC-07 §2 (error slugs)

---

## P5 — Access guards (FE-CONV-018, INT-FE-CONV-005)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-018 | patientSessionGuard + CONV egress patient-session bearer (never hardcoded true) | P5 | M |
| INT-FE-CONV-005 | shared/access-decision stub — Wave-0 permissive, PLATFORM ledger item | P5 | S |

**SPEC sources:** SPEC-01 §4 (guard carry-forward), SPEC-05 §4 (authorities)
**Key pitfall:** guard:stub-permissive — NEVER hardcode true; guard:unauth-redirect — session-ended not /login

---

## P6 — Shell integration (FE-CONV-019)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-019 | ConvShellIntegrationService — NAVIGATION_INTENT_PORT subscription, engineFeatureRef resolution | P6 | M |

**SPEC sources:** SPEC-06 §2–3 (ADR-007)

---

## P7 — UX polish (FE-CONV-020..021)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-020 | TreeState + error UI surfaces — bounded cold, empty, offline-stale, banners, toast (never modal) | P7 | M |
| FE-CONV-021 | TTS/text-only visual fallback — SpeechSynthesis Web API, phrase text LARGE, honest indicator | P7 | M |

**SPEC sources:** SPEC-03 §2 (TreeState), SPEC-07 §2–3 (error surfaces, cascade)

---

## P8 — Observability (FE-CONV-022, INT-FE-CONV-004)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-022 | Telemetry via shared/observability — 6 CONV events, no PII/text in payload | P8 | M |
| INT-FE-CONV-004 | shared/observability correlation id — X-Correlation-Id propagated from conv-auth.interceptor | P8 | S |

**SPEC sources:** SPEC-04 §3, SPEC-07 §4

---

## P9 — E2E + hardening (FE-CONV-023..025)

| ID | Title | Priority | Size |
|---|---|---|---|
| FE-CONV-023 | conv-e2e Nx project — Playwright registration, patientSession + offlineMode fixtures | P9 | M |
| FE-CONV-024 | E2E golden paths A/B/C — tree navigation (touch), audio play, offline stale (SPEC-08 features 1–3) | P9 | L |
| FE-CONV-025 | E2E session guard + audio fail-safe + input channel (SPEC-08 features 4–6) | P9 | L |

**SPEC sources:** SPEC-08 §1–6 (35 scenarios total across 6 feature files)

---

## By SPEC source

| SPEC | Issues driven |
|---|---|
| SPEC-01 (routes) | FE-CONV-002, FE-CONV-018 |
| SPEC-02 (components) | FE-CONV-014..017 |
| SPEC-03 (view models) | FE-CONV-011..013, FE-CONV-020 |
| SPEC-04 (data access, ports) | FE-CONV-006..010, INT-FE-CONV-001..002 |
| SPEC-05 (contract, permissions) | FE-CONV-001, FE-CONV-018, INT-FE-CONV-005 |
| SPEC-06 (shell, descriptor) | FE-CONV-005, FE-CONV-019 |
| SPEC-07 (error handling, cascade) | FE-CONV-009, FE-CONV-020..021, INT-FE-CONV-003..004 |
| SPEC-08 (e2e scenarios) | FE-CONV-023..025 |
| generator-config.yml | FE-CONV-003..004, FE-CONV-022 |

---

## By Angular/Nx layer

| Layer | Path | Issues |
|---|---|---|
| Lib entry/contract | `libs/conv/src/` | FE-CONV-001, FE-CONV-003..005, FE-CONV-011 |
| Routing | `libs/conv/src/lib/routes/` | FE-CONV-002 |
| Data access | `libs/conv/data-access/src/` | FE-CONV-006..010, FE-CONV-012..013, FE-CONV-022 |
| Feature — converse | `libs/conv/feature-converse/src/` | FE-CONV-014..017, FE-CONV-020..021 |
| Access guards | `libs/conv/access/src/` | FE-CONV-018, INT-FE-CONV-004 |
| Integration | `libs/conv/integration/src/` | FE-CONV-019 |
| Shared — error model | `libs/shared/error-model/src/` | INT-FE-CONV-003 |
| Shared — access-decision | `libs/shared/access-decision/src/` | INT-FE-CONV-005 |
| E2E | `apps/conv-e2e/src/` | FE-CONV-023..025 |
| Cross-module (GEST) | `libs/gest/integration/` | INT-FE-CONV-001 |
| Cross-module (EDGE) | `libs/edge/data-access/` | INT-FE-CONV-002 |

---

## Critical dependency path (longest chain)

```
FE-CONV-001 (contract)
  └─> FE-CONV-003 (provideConv)
        └─> FE-CONV-004 (NAVIGATION_INTENT_PORT)
              └─> FE-CONV-006 (TreeSnapshotHttpAdapter)
                    └─> FE-CONV-007 (TreeCacheStore + TreeSyncService)
                          └─> FE-CONV-012 (SpeechTreeFacade)
                                └─> FE-CONV-014 (SpeechTreeNavigatorComponent)
                                      └─> FE-CONV-020 (TreeState error surfaces)
                                            └─> FE-CONV-024 (E2E golden paths)
                                                  └─> FE-CONV-025 (E2E guard + channels)
```

Parallelizable from P2 onward: FE-CONV-008..010 and FE-CONV-011..013 can proceed in parallel once FE-CONV-001..005 are done.

---

## Open items (surface as risks in plan-FE-CONV.md)

| Ref | Description | Impact |
|---|---|---|
| G1 | Patient-Mode host app (that mounts CONV + GEST + libs/edge) is undecided | CONV_ROUTES, FE-CONV-005, INT-FE-CONV-001 |
| Q1 | Two tokens per station (patient-session for CONV, edge.device for GEST/EDGE) — interceptor scoping is a host concern | FE-CONV-018 interceptor scoping |
| R1 (registry label) | modules.registry[CONV].frontendLib = 'conv-ui' vs on-disk `@neuroassist/conv` (libs/conv) | provideConv() import path, Nx project.json |
| R2 (access-decision stub) | Wave-0 stub must be replaced before production | INT-FE-CONV-005 |

---

## Estimates (aggregate)

| Wave | Estimate | Notes |
|---|---|---|
| P1 (5 issues) | 2–3 days | Contract + routing + bootstrap — well-understood |
| P2 (5 issues) | 3–4 days | Offline-first cache logic — moderate complexity |
| P3 (7 issues) | 4–5 days | Signal-based components — moderate, parallelizable |
| P4–P5 (5 issues INT) | 2–3 days | Cross-module + guard — depends on GEST/EDGE/PLATFORM |
| P6 (1 issue) | 1 day | Integration service |
| P7 (2 issues) | 2 days | UX polish — TreeState + TTS |
| P8 (2 issues) | 1 day | Telemetry + correlation |
| P9 (3 issues) | 3–4 days | E2E — depends on test environment setup |
| **Total** | **18–23 days** | 1 dev; parallelizable P2+P3 reduces elapsed time |
