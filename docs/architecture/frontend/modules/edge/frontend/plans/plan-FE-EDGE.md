# Plan FE-EDGE — Edge Device Integration Frontend

> Module: **EDGE — Edge Device Integration** · Project: NeuroAssist NIV
> Generated: 2026-11-20 · Command: `/fe-architect-backlog neuroassist-niv EDGE`
> Source: `docs/architecture/frontend/modules/edge/_brief.md`

---

## Project Summary

EDGE is the **device lifecycle management** module of NeuroAssist NIV. The FE surfaces two patient-scoped routes (`/patients/:patientId/device` and `/patients/:patientId/device/pair`) plus one always-visible topbar `DeviceStatusBadge`. The shell lazy-loads the entire EDGE feature set; only the badge is an eager presentational contributed at shell bootstrap.

The primary persona is the **Clinic Coordinator** (`CLINIC_COORDINATOR`), who enrolls and pairs a device using a short-lived pairing code, monitors connectivity, and can deactivate or revoke. The **Family Caregiver** (`CAREGIVER`) reads device status and can revoke. No device-facing endpoints (`/edge/heartbeat`, `/edge/catalog`, JWKS) are within FE scope.

Three architectural constraints drive the design:
1. **Liveness is server-derived** (ADR-005): the badge never infers `online`/`offline` from a client timer.
2. **Pairing is pessimistic** (SPEC-04 §4): `paired` state is confirmed only by a successful `GET /edge/devices/{id}` polling response.
3. **HTTP adapter is the default** (SPEC-04 §2, G-EDGE-3 resolved): `edge-service` api-contract exists; mock adapter is for tests only.

---

## Wave Map (P1–P9)

### P1 — Foundation (Days 1–3)
**Goal:** Module is registered in the shell; contract, routes, providers, and bootstrap are in place.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-001 | edge.contract.ts (authorities, menu, flags) | — |
| FE-EDGE-002 | EDGE_ROUTES (lazy routes + guards) | FE-001, FE-017, FE-018 |
| FE-EDGE-003 | EdgeModule barrel + importPath @neuroassist/edge | FE-001, FE-002 |
| FE-EDGE-004 | EDGE_MODULE_DESCRIPTOR (shell registration) | FE-001, FE-003 |
| FE-EDGE-005 | edge.providers.ts (HTTP adapter default; proves http, not mock) | FE-003 |
| FE-EDGE-006 | edge.bootstrap.ts (init/destroy lifecycle) | FE-004, FE-009, INT-002 |

**Definition of Done (P1):** `npx nx build neuroassist-niv-web` succeeds with EDGE registered; topbar badge slot reserved; no eager feature lib in the shell bundle.

---

### P2 — Data Access (Days 3–6)
**Goal:** All BE HTTP operations implemented; facade signals wired; error mapping complete.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-007 | EdgeDeviceApiService (enroll, list, get, reactivate, deactivate, unpair, revoke) | FE-005, FE-008 |
| FE-EDGE-008 | Wire types (EdgeDeviceWire, EdgeDeviceRowWire, EnrollResultWire) + mappers | — |
| FE-EDGE-009 | DeviceFacade (signals + pairing poll + reset/invalidate) | FE-007, FE-008 |
| FE-EDGE-010 | EDGE error mapper (ProblemDetail slug → AppError → surface) | FE-005, INT-003 |

**Definition of Done (P2):** All 7 HTTP operations have passing unit tests with HttpClientTestingModule; mapper spec covers online, offline, unavailable, version-absent; facade pairing poll resolves to `'paired'` and to `'error'` on timeout.

---

### P3 — Feature Libs (Days 6–10)
**Goal:** All UI components implemented; both feature routes render correct data from facade.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-011 | DevicePairingPageComponent (smart) | FE-009, INT-004 |
| FE-EDGE-012 | DevicePairingPanelComponent + sub-tree (presentational) | FE-011, FE-016 |
| FE-EDGE-013 | PlatformUnsupportedNoticeComponent + phone-mode guard (PLAT-001) | FE-012 |
| FE-EDGE-014 | EdgeDeviceStatusPageComponent (smart) | FE-009, INT-004 |
| FE-EDGE-015 | EdgeDeviceCardComponent + DeviceLifecycleActionsComponent | FE-016, FE-022 |
| FE-EDGE-016 | DeviceStatusBadge (libs/edge/ui — eager presentational) | — |

**Definition of Done (P3):** MVP shippable in dev — a Clinic Coordinator can enroll a device, see the pairing code, and confirm paired; the status page shows lifecycle actions. `npx nx test edge-feature-device-pairing` and `npx nx test edge-feature-device-status` both PASS.

**MVP marker:** P3 completion → MVP shippable in dev.

---

### P4 — Hub Integrations (Days 8–10, parallel with P3)
**Goal:** Shared libs integrated and contracts verified; G-EDGE-2 tracked.

| Issue | Description | Dep |
|---|---|---|
| INT-FE-EDGE-001 | observability — audit hand-off event schema verified | FE-019, FE-023 |
| INT-FE-EDGE-002 | tenant-context — tenant switch invalidates DeviceFacade | FE-006, FE-009 |
| INT-FE-EDGE-003 | auth-session — authGuard + 401 redirect | FE-002, FE-010 |
| INT-FE-EDGE-004 | access-decision — AccessDecisionService.can() wired for all 7 authorities | FE-001, FE-014 |
| INT-FE-EDGE-005 | G-EDGE-2: BE must add 'version' field (open dependency on INT-EDGE-005) | FE-008 |

**Definition of Done (P4):** Tenant switch does not bleed EDGE state; access-decision tests pass for all 7 authority strings; INT-EDGE-005 is open in BE backlog.

---

### P5 — Access Guards (Day 10)
**Goal:** Route guards are production-ready, proven non-permissive.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-017 | canReadDeviceGuard (edge.device.read) | FE-001, INT-004 |
| FE-EDGE-018 | canPairDeviceGuard (edge.device.pair) | FE-001, INT-004 |

**Definition of Done (P5):** Guard specs prove denial → UrlTree to `/forbidden`; no `return true` hardcoded.

---

### P6 — Navigation / Breadcrumbs (Day 11)
**Goal:** Shell integration service wires breadcrumbs and topbar badge.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-019 | EdgeShellIntegrationService (breadcrumbs, topbar, audit hand-off) | FE-016, FE-009, INT-001 |

**Definition of Done (P6):** Badge always visible; breadcrumbs `Care → Edge device → {patient} [→ Pair]` appear on navigation; `console.log` absent from all EDGE files.

---

### P7 — UX Polish (Days 11–12)
**Goal:** Loading, error, and expiry UX are correct; a11y base in place.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-020 | Loading + status-unavailable + error states | FE-014, FE-016 |
| FE-EDGE-021 | Pairing code countdown + expiry → pairing=error | FE-009, FE-012 |
| FE-EDGE-022 | RelativeTimePipe + aria-live + focus-return | FE-015, FE-012 |

**Definition of Done (P7):** badge skeleton shown while loading; `'unavailable'` never defaults to `'online'`; countdown expires correctly in `fakeAsync` test.

---

### P8 — Observability (Day 12)
**Goal:** All device lifecycle transitions forwarded to observability; no console.log.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-023 | EDGE telemetry events via @neuroassist/shared/observability | FE-019, INT-001 |

**Definition of Done (P8):** Integration test verifies 4 event types emitted with correct payload; `console.log` grep returns zero hits in `libs/edge/`.

---

### P9 — e2e + Hardening (Days 13–14)
**Goal:** 27 Playwright stubs in place; a11y carry-forwards verified.

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-024 | Playwright e2e stubs (5 feature files, 27 scenarios) | FE-003, all P1-P8 |
| FE-EDGE-025 | A11y carry-forwards (aria-live, focus-return, contrast AA, keyboard) | FE-022, FE-024 |

**Definition of Done (P9):** `npx nx lint edge-e2e` PASS; 27 stubs in `test.fixme()` form; a11y audit passes for the 3 carry-forwards.

---

### SAFETY-GEST-1 increment — detection state + single station heartbeat sender (Days 15–18)
**Goal:** `libs/edge` becomes the single `POST /edge/heartbeat` sender carrying detection state, and the
caregiver surfaces render "connected, NOT detecting" distinctly from offline. Realises product decision
**SAFETY-GEST-1** (BE edge-service ADR-005; GEST SPEC-06 §2.1). Specs amended: SPEC-03 §1.1 matrix,
SPEC-04 §1/§3 heartbeat egress + detection wire, SPEC-06 §5 StationLivenessService, SPEC-07 §3,
SPEC-08 (new `station-detection-liveness.feature`).

| Issue | Description | Dep |
|---|---|---|
| FE-EDGE-027 | Heartbeat egress (body, keepalive fetch, token rotation; no sendBeacon) | FE-005 |
| FE-EDGE-028 | Detection wire fields + VM mapping (absent ⇒ UNKNOWN; §1.1 derived axis) | FE-008 |
| FE-EDGE-026 | StationLivenessService — single sender (StationLivenessPort, ≤30s, beatNow) | FE-027, FE-028 |
| FE-EDGE-029 | Caregiver surfaces: detection distinct from connectivity (badge/card/page) | FE-028, FE-016, FE-015 |
| INT-FE-EDGE-006 | StationLivenessPort seam: libs/edge single sender, GEST in-process consumer | FE-026, GEST SPEC-06 §2.1 |
| FE-EDGE-030 | e2e stubs — detection-liveness + detection badge scenarios | FE-026..029, FE-024 |

**Definition of Done (SAFETY-GEST-1):** exactly one heartbeat sender (`libs/edge`); the hidden beat uses
`keepalive` fetch and never `sendBeacon`; an absent `detectionState` maps to `UNKNOWN` and never renders
as detecting; the four detection states render per the SPEC-03 §1.1 matrix; GEST adds no second sender
and no fourth egress; EARS→Gherkin gate green for the 14 new clauses.

---

## Critical Path

```
FE-001 → FE-002 → (FE-017, FE-018)
FE-001 → FE-003 → FE-004
FE-001 → FE-005 → FE-007 → FE-008 → FE-009 → FE-011 → FE-012 → FE-021
                                               FE-009 → FE-014 → FE-015 → FE-020
                       FE-010
FE-016 → (FE-004 descriptor, FE-012 panel, FE-015 card)
FE-019 → FE-023
FE-022 → FE-025
FE-024 ← (all P1-P8)
```

Longest chain: **FE-001 → FE-005 → FE-007 → FE-008 → FE-009 → FE-014 → FE-015 → FE-020** (~10 days sequential if no parallelism).

---

## Top 3 Risks

| Risk | Mitigation |
|---|---|
| **R1 — Pairing poll complexity.** The pessimistic poll (enroll + periodic GET until `lifecycleState=paired` OR expiry) must handle race conditions (edge station claims between polls) and cleanup on destroy/expiry. | Use `RxJS` `interval` within `switchMap`; test with `fakeAsync/tick`; stop poll on destroy via `takeUntilDestroyed`. |
| **R2 — G-EDGE-2 version field.** The Home card's `version` line is a known vision feature that the BE api-contract does not yet expose. FE explicitly models it absent; risk is that HIST/UX teams expect it and block UAT. | INT-FE-EDGE-005 open → INT-EDGE-005 in BE backlog; card renders without it; explicitly documented. |
| **R3 — Shared lib API surface.** `@neuroassist/shared/observability`, `@neuroassist/shared/tenant-context`, and `@neuroassist/shared/access-decision` may not expose the exact APIs EDGE expects (onSwitch observable, can() method, emit function). | INT-FE-EDGE-001/002/004 each have a first step of reading the shared lib API before implementation; block and escalate if the API is absent. |

---

## Approval Criteria by Marco

| Marco | Criteria |
|---|---|
| P3 done = MVP dev-shippable | A Clinic Coordinator can enroll, pair, and view lifecycle actions in a local dev environment with `provideEdgeMock()`. |
| P5 done = access-secure | Guards deny unauthorized access; proven by unit tests; no `return true` stubs. |
| P8 done = audit-ready | All lifecycle events reach observability; `console.log` absent from EDGE. |
| P9 done = e2e-registered | 27 Playwright stubs registered and linted; a11y carry-forwards closed. |

---

## Carry-forward Resolution Summary

| Learning / Gap | Issue that closes it |
|---|---|
| `scaffold:mock-adapter-default` | FE-EDGE-005 |
| `guard:stub-permissive` | FE-EDGE-017, FE-018, INT-004 |
| `http-adapter:wrong-prefix` | FE-EDGE-005, FE-007 |
| `fe-facade:fabricated-null-fields` | FE-EDGE-008, INT-005 |
| `http-adapter:error-code-by-status-not-problemdetail-type` | FE-EDGE-010 |
| G-EDGE-1 (edge.device.view superseded) | FE-EDGE-001, FE-002, FE-017 |
| G-EDGE-2 (version field absent) | FE-EDGE-008, INT-005 (open) |
| G-EDGE-3 (adapter default was mock) | FE-EDGE-005 |
| G-EDGE-4 (pairing = enroll+claim, not one FE action) | FE-EDGE-009, FE-011 |

---

## Next Action

```
-> /fe-architect-scaffold neuroassist-niv EDGE
```
