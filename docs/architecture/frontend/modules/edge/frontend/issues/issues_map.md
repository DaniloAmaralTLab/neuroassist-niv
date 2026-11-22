# Issues Map — EDGE Frontend

> Module: **EDGE — Edge Device Integration** · Project: NeuroAssist NIV
> Generated: 2026-11-20 · Total: 30 functional + 6 integration = **36 issues**
> Amended: 2026-11-20 (SAFETY-GEST-1 increment — detection state + single station heartbeat sender;
> FE-EDGE-026..030, INT-FE-EDGE-006)

## Summary

| Kind | Count | Waves |
|---|---|---|
| FE functional | 30 | P1–P9 |
| INT integration | 6 | P4 |
| **Total** | **36** | |

---

## By Priority (wave order)

### Wave 1 / P1 — Foundation
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-001 | edge.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS | libs/edge/src/lib/ | S |
| FE-EDGE-002 | EDGE_ROUTES — lazy route table with authGuard, canReadDeviceGuard, canPairDeviceGuard | libs/edge/src/lib/ | S |
| FE-EDGE-003 | EdgeModule — entry lib public API and @neuroassist/edge importPath barrel | libs/edge/src/ | S |
| FE-EDGE-004 | EDGE_MODULE_DESCRIPTOR — shell registration in config/module-descriptors.ts | libs/edge/src/lib/ + shell | S |
| FE-EDGE-005 | edge.providers.ts — HTTP adapter default (not mock) | libs/edge/data-access/ | M |
| FE-EDGE-006 | edge.bootstrap.ts — ModuleBootstrap init/destroy lifecycle | libs/edge/src/lib/ | M |

### Wave 2 / P2 — Data Access
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-007 | EdgeDeviceApiService — 7 HTTP operations | libs/edge/data-access/ | M |
| FE-EDGE-008 | Wire record types + mappers (toEdgeDeviceVM, toEdgeDeviceRow, toPairingDraft) | libs/edge/data-access/ | M |
| FE-EDGE-009 | DeviceFacade — signals + pairing poll | libs/edge/data-access/ | L |
| FE-EDGE-010 | EDGE error mapping — ProblemDetail type slug → AppError → FE surface | libs/edge/data-access/ | M |

### Wave 3 / P3 — Feature Libs
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-011 | DevicePairingPageComponent — smart OnPush, feature-device-pairing route | libs/edge/feature-device-pairing/ | M |
| FE-EDGE-012 | DevicePairingPanelComponent + sub-components (presentational sub-tree) | libs/edge/feature-device-pairing/ | M |
| FE-EDGE-013 | PlatformUnsupportedNoticeComponent + phone-mode guard (PLAT-001) | libs/edge/feature-device-pairing/ | S |
| FE-EDGE-014 | EdgeDeviceStatusPageComponent — smart OnPush, feature-device-status route | libs/edge/feature-device-status/ | M |
| FE-EDGE-015 | EdgeDeviceCardComponent + DeviceLifecycleActionsComponent | libs/edge/feature-device-status/ | M |
| FE-EDGE-016 | DeviceStatusBadge (libs/edge/ui) — eager presentational | libs/edge/ui/ | S |

### Wave 4 / P4 — Hub Integrations (INT)
| Issue | Title | Layer | Size |
|---|---|---|---|
| INT-FE-EDGE-001 | INT: @neuroassist/shared/observability — audit hand-off for HIST | libs/edge/integration/ | S |
| INT-FE-EDGE-002 | INT: @neuroassist/shared/tenant-context — tenant switch invalidation | libs/edge/integration/ + data-access | S |
| INT-FE-EDGE-003 | INT: @neuroassist/shared/auth-session — authGuard + unauthenticated redirect | libs/edge/access/ + data-access | S |
| INT-FE-EDGE-004 | INT: @neuroassist/shared/access-decision — AccessDecisionService.can() wired | libs/edge/access/ + feature libs | M |
| INT-FE-EDGE-005 | INT: G-EDGE-2 follow-up — edge-service must add 'version' field (references INT-EDGE-005) | libs/edge/data-access/ | S |

### Wave 5 / P5 — Access Guards
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-017 | canReadDeviceGuard — AccessDecisionService.can('edge.device.read') | libs/edge/access/ | S |
| FE-EDGE-018 | canPairDeviceGuard — AccessDecisionService.can('edge.device.pair') | libs/edge/access/ | S |

### Wave 6 / P6 — Navigation / Breadcrumbs
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-019 | EdgeShellIntegrationService — breadcrumbs + topbar contribution + audit hand-off | libs/edge/integration/ | M |

### Wave 7 / P7 — UX Polish
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-020 | Loading + status-unavailable + error states | feature-device-status/ + ui/ | S |
| FE-EDGE-021 | Pairing code countdown — expiry, single-use, timeout → pairing=error | feature-device-pairing/ + data-access | M |
| FE-EDGE-022 | lastSyncRelative pipe + a11y live-region + focus-return | libs/edge/ui/ + feature libs | S |

### Wave 8 / P8 — Observability
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-023 | EDGE telemetry events via @neuroassist/shared/observability | libs/edge/integration/ | S |

### Wave 9 / P9 — e2e + Hardening
| Issue | Title | Layer | Size |
|---|---|---|---|
| FE-EDGE-024 | Playwright e2e stubs — 5 feature files (27 stubs total) | apps/edge-e2e/ | M |
| FE-EDGE-025 | A11y carry-forwards — aria-live, focus-return, contrast AA, keyboard | UI lib + feature libs | S |

### SAFETY-GEST-1 increment — detection state + single station heartbeat sender
| Issue | Title | Layer | Size | Wave |
|---|---|---|---|---|
| FE-EDGE-026 | StationLivenessService — single station heartbeat sender (StationLivenessPort) | libs/edge/integration/ | M | P6 |
| FE-EDGE-027 | Heartbeat egress — POST /edge/heartbeat body, keepalive fetch, token rotation | libs/edge/data-access/ | M | P2 |
| FE-EDGE-028 | Detection-state wire fields + VM mapping (absent ⇒ UNKNOWN; derived detection axis) | libs/edge/data-access/ | M | P2 |
| FE-EDGE-029 | Caregiver surfaces render detection distinct from connectivity (badge + card + status page) | libs/edge/ui/ + feature-device-status/ | M | P7 |
| FE-EDGE-030 | e2e stubs — station-detection-liveness.feature + detection badge scenarios | apps/edge-e2e/ | M | P9 |
| INT-FE-EDGE-006 | INT: StationLivenessPort seam — libs/edge single sender, GEST consumes in-process | libs/edge/integration/ + gest | S | P4 |

---

## By SPEC (which SPEC feeds which issues)

| SPEC | Issues |
|---|---|
| SPEC-01 (Route Map) | FE-EDGE-002, FE-EDGE-017, FE-EDGE-018, INT-FE-EDGE-003 |
| SPEC-02 (Component Hierarchy) | FE-EDGE-011, FE-EDGE-012, FE-EDGE-013, FE-EDGE-014, FE-EDGE-015, FE-EDGE-016, FE-EDGE-022, FE-EDGE-025 |
| SPEC-03 (View Models) | FE-EDGE-008, FE-EDGE-009, FE-EDGE-020, FE-EDGE-021, FE-EDGE-028, FE-EDGE-029, INT-FE-EDGE-005 |
| SPEC-04 (Data Access) | FE-EDGE-005, FE-EDGE-007, FE-EDGE-008, FE-EDGE-009, FE-EDGE-021, FE-EDGE-027, FE-EDGE-028, INT-FE-EDGE-002 |
| SPEC-05 (Module Contract) | FE-EDGE-001, FE-EDGE-004, INT-FE-EDGE-004 |
| SPEC-06 (Shell Integration) | FE-EDGE-004, FE-EDGE-006, FE-EDGE-019, FE-EDGE-023, FE-EDGE-026, FE-EDGE-027, INT-FE-EDGE-001, INT-FE-EDGE-006 |
| SPEC-07 (Error Handling) | FE-EDGE-010, FE-EDGE-020, FE-EDGE-021, FE-EDGE-029, INT-FE-EDGE-003 |
| SPEC-08 (e2e Scenarios) | FE-EDGE-024, FE-EDGE-030 |
| generator-config.yml | FE-EDGE-003, FE-EDGE-005 |
| backend-api-cross-link.md | FE-EDGE-007, INT-FE-EDGE-005 |

---

## By Layer

| Layer | Issues |
|---|---|
| `libs/edge/src/lib/` (Tool entry) | FE-001, FE-002, FE-003, FE-004, FE-005, FE-006 |
| `libs/edge/data-access/` | FE-007, FE-008, FE-009, FE-010, FE-027, FE-028, INT-002, INT-005 |
| `libs/edge/feature-device-pairing/` | FE-011, FE-012, FE-013, FE-021 |
| `libs/edge/feature-device-status/` | FE-014, FE-015, FE-020, FE-029 |
| `libs/edge/ui/` | FE-016, FE-022, FE-025, FE-029 |
| `libs/edge/access/` | FE-017, FE-018, INT-003, INT-004 |
| `libs/edge/integration/` | FE-019, FE-023, FE-026, INT-001, INT-002, INT-006 |
| `apps/edge-e2e/` | FE-024, FE-030 |
| `apps/neuroassist-niv-web/` (shell) | FE-004 |

---

## Critical Path (longest dependency chain)

```
FE-EDGE-001 (contract)
  └→ FE-EDGE-002 (routes)
       └→ FE-EDGE-017 (canReadDeviceGuard)
       └→ FE-EDGE-018 (canPairDeviceGuard)
  └→ FE-EDGE-003 (barrel)
       └→ FE-EDGE-004 (descriptor)
  └→ FE-EDGE-005 (providers / http adapter)
       └→ FE-EDGE-007 (ApiService)
            └→ FE-EDGE-008 (wire types + mappers)
                 └→ FE-EDGE-009 (DeviceFacade)
                      └→ FE-EDGE-011 (PairingPage)
                           └→ FE-EDGE-012 (PairingPanel)
                                └→ FE-EDGE-021 (countdown)
                      └→ FE-EDGE-014 (StatusPage)
                           └→ FE-EDGE-015 (Card + LifecycleActions)
                                └→ FE-EDGE-020 (loading/unavailable states)
            └→ FE-EDGE-010 (error mapper)
  └→ FE-EDGE-006 (bootstrap)
       └→ FE-EDGE-019 (ShellIntegrationService)
            └→ FE-EDGE-023 (telemetry)
FE-EDGE-016 (DeviceStatusBadge) ← eager, feeds FE-004 descriptor + FE-012/015/020
FE-EDGE-024 (e2e stubs) ← after P1-P8 implemented
FE-EDGE-025 (a11y) ← after FE-022
```

---

## Carry-forwards (from Learning Layer and SPEC reconciliation)

| Carry-forward | Addressed by |
|---|---|
| `scaffold:mock-adapter-default:shell-provider-not-switched-to-http` | FE-EDGE-005 |
| `guard:stub-permissive:hardcoded-return-true` | FE-EDGE-017, FE-EDGE-018, INT-FE-EDGE-004 |
| `http-adapter:wrong-prefix` (using /api/v1 instead of /edge) | FE-EDGE-005, FE-EDGE-007 |
| `fe-facade:fabricated-null-fields` | FE-EDGE-008, INT-FE-EDGE-005 |
| `http-adapter:error-code-by-status-not-problemdetail-type` | FE-EDGE-010 |
| `fe-facade:toast-fixed-text-discards-be-detail` | FE-EDGE-010 |
| `fe-component:a11y-live-region` | FE-EDGE-022, FE-EDGE-025 |
| `fe-component:modal-focus-return` | FE-EDGE-022, FE-EDGE-025 |
| `fe-component:kpi-decimal-format` | FE-EDGE-022 |
| `fe-e2e:shared-seed:state-leak-across-specs` | FE-EDGE-024 |
| `fe-e2e:rbac-access-decision:setExtraHTTPHeaders` | FE-EDGE-024 |
| `guard:unauth-redirect:session-absent-must-go-to-login` | INT-FE-EDGE-003 |
| `edge:fe-infers-liveness` (client timer for online/offline) | FE-EDGE-009, FE-EDGE-016, FE-EDGE-020 |
| G-EDGE-1 (edge.device.view superseded by edge.device.read) | FE-EDGE-001, FE-EDGE-002, FE-EDGE-017 |
| G-EDGE-2 (version field absent in BE) | FE-EDGE-008, INT-FE-EDGE-005 |
| G-EDGE-3 (adapter default was mock, now http) | FE-EDGE-005 |
| G-EDGE-4 (pairing = enroll+claim, not one FE action) | FE-EDGE-009, FE-EDGE-011 |
| G-EDGE-6 (detection state — second liveness axis, SAFETY-GEST-1) | FE-EDGE-028, FE-EDGE-029 |
| SAFETY-GEST-1 (libs/edge = single heartbeat sender; INV-GEST-8) | FE-EDGE-026, FE-EDGE-027, INT-FE-EDGE-006 |
| INV-EDGE-9 (absent detectionState ⇒ UNKNOWN, never RUNNING) | FE-EDGE-028 |
| `fe-heartbeat:sendBeacon-cannot-carry-bearer` (keepalive fetch, not sendBeacon) | FE-EDGE-027 |

---

## Estimates (aggregate)

| Wave | Issues | Est. days |
|---|---|---|
| P1 Foundation | 6 | 3 |
| P2 Data Access | 4 | 3 |
| P3 Feature libs | 6 | 4 |
| P4 Hub Integrations | 5 | 2 |
| P5 Access Guards | 2 | 1 |
| P6 Navigation | 1 | 1 |
| P7 UX Polish | 3 | 2 |
| P8 Observability | 1 | 0.5 |
| P9 e2e + Hardening | 2 | 2 |
| SAFETY-GEST-1 increment | 6 | ~3.5 |
| **Total** | **36** | **~22 days** |
