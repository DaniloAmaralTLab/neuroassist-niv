# Frontend Execution Plan — GEST (Gesture Detection)

**Client:** neuroassist-niv
**Module:** GEST — Gesture Detection (station runtime)
**Layer:** Frontend (Angular 21 / Nx 22, signal-based, `libs/gest`)
**Generated:** 2026-11-20
**Status:** DRAFT — awaiting G1 decision (INT-FE-GEST-003)

---

## Project summary

The GEST frontend module implements a **station-side gesture detection runtime**. It runs on
a physical bedside device, authenticates with an `edge.device` token (never a caregiver token),
and provides two routes: `/station/runtime` (headless detection loop) and `/station/status`
(operator diagnostics panel).

The module makes exactly **three** device-token API calls: `POST /evnt/gesture-reports`,
`POST /gest/capabilities/support-check`, `GET /edge/catalog`. The heartbeat is delegated to
`libs/edge` via the `StationLivenessPort` interface (SAFETY-GEST-1). Video frames never leave
the browser (INV-GEST-4). The host shell is pending a decision (G1, INT-FE-GEST-003).

Architecture baseline: 73 EARS across 9 SPECs; 5 Playwright e2e features; SAFETY-GEST-1 closed
by design (libs/edge single-sender); 8 invariants (INV-GEST-1..8) enforced by issues and specs.

---

## Wave map (P1–P6)

### P1 — Foundation (~20h, ~3 days)

**Goal:** Module entry point, routes, guard, ACS coordination.

| Issue | Deliverable | Blocker |
|---|---|---|
| FE-GEST-001 | `gest.contract.ts` — MODULE_KEY, MODULE_PERMISSION_MAP={}, STATION_TOKEN_AUTHORITIES[5] | none |
| FE-GEST-002 | `gest.routes.ts` — lazy routes, stationIdentityGuard on both | FE-GEST-024 |
| FE-GEST-003 | `gest.module.ts` + `gest.providers.ts` — provideGest(adapter='http') | none |
| FE-GEST-004 | `gest.descriptor.ts` — GEST_MODULE_DESCRIPTOR, identity=edge.device | none |
| FE-GEST-005 | `gest.bootstrap.ts` — 7-step init, 5-step destroy | INT-FE-GEST-003 |
| FE-GEST-024 | `stationIdentityGuard` — edge.device validation, never return true | none |
| INT-FE-GEST-001 | ACS authority confirmation (gest.capability.read + gest.engine.read) | ACS team |
| INT-FE-GEST-003 | G1 host shell decision | Architecture owner |

**P1 Definition of Done:** `npx nx build gest` PASS; routes registered; guard redirects on absent token; ACS coordination started.

---

### P2 — Data access + mappers (~60h, ~8 days)

**Goal:** All three API services, error mapper, facades, detection state mapper.

| Issue | Deliverable | Blocker |
|---|---|---|
| FE-GEST-006 | GestureReportApiService + mock | FE-GEST-003 |
| FE-GEST-007 | CapabilityApiService + mock | FE-GEST-003 |
| FE-GEST-008 | EdgeCatalogApiService + mock | FE-GEST-003 |
| FE-GEST-009 | ReportFacade + durable queue + RetryScheduler | FE-GEST-006 |
| FE-GEST-010 | CatalogFacade + detectable computation | FE-GEST-007, FE-GEST-008 |
| FE-GEST-011 | RuntimeFacade + StationRuntimeVM signals | none |
| FE-GEST-023 | DetectionStateMapper (SPEC-03 §7, never-false-RUNNING) | FE-GEST-011 |
| FE-GEST-025 | GestErrorMapper (ProblemDetail→AppError by type slug) | none |
| INT-FE-GEST-002 | EDGE catalog window params confirmed | EDGE team |
| INT-FE-GEST-004 | StationLivenessPort interface published | none (GEST publishes interface) |

**P2 Definition of Done:** all API services + mocks PASS; `npx nx test gest-data-access` PASS; DetectionStateMapper 7 tests PASS.

---

### P3 — Detection core (~64h, ~8 days)

**Goal:** Camera, Web Worker, classifier, state machine, perf budget.

| Issue | Deliverable | Blocker |
|---|---|---|
| FE-GEST-012 | CameraService — getUserMedia lifecycle | none |
| FE-GEST-013 | LandmarkWorker + LandmarkWorkerSeam — frames stay in worker | FE-GEST-012 |
| FE-GEST-014 | ClassifierService + sensitivityThreshold + reportIdMinter | FE-GEST-013 |
| FE-GEST-015 | CompoundGestureStateMachine — detectable gate INV-GEST-7 | FE-GEST-010, FE-GEST-014 |
| FE-GEST-016 | PerfBudgetService — fps degradation | FE-GEST-012 |

**P3 Definition of Done:** `npx nx test gest-detection` PASS; state machine detectable gate spec PASS; LandmarkWorker frame-privacy spec PASS.

---

### P4 — UI components (~56h, ~7 days)

**Goal:** Smart pages, presentational components.

| Issue | Deliverable | Blocker |
|---|---|---|
| FE-GEST-017 | StationRuntimePageComponent (smart, INV-GEST-6) | FE-GEST-011, FE-GEST-018 |
| FE-GEST-018 | OperatorPreview + DetectionPausedOverlay (ARIA) + IdentityNotice | none |
| FE-GEST-019 | StationStatusPageComponent (smart, kiosk requirement) | FE-GEST-020 |
| FE-GEST-020 | Status panels + DetectableBadge + ReportQueuePanel | none |

**P4 Definition of Done:** `npx nx test gest-feature-station-runtime` + `gest-feature-station-status` PASS; overlay ARIA attributes verified; DetectableBadge 'not yet detectable' renders.

MVP marker: **P4 done = station runtime shippable in dev** (all functional paths covered; e2e and liveness wiring in P5-P6).

---

### P5 — Integration + safety wiring (~32h, ~4 days)

**Goal:** Shell integration, Wake Lock, telemetry, liveness wiring.

| Issue | Deliverable | Blocker |
|---|---|---|
| FE-GEST-021 | GestShellIntegrationService — StationLivenessPort wiring SAFETY-GEST-1 | INT-FE-GEST-004 (interface), INT-FE-GEST-003 (host) |
| FE-GEST-022 | WakeLockService + visibility handler | FE-GEST-021 |
| FE-GEST-026 | GestTelemetryService — whitelisted events, no frames | FE-GEST-021 |

**P5 Definition of Done:** `npx nx test gest-integration` PASS; liveness transitions call `setDetectionState + beatNow`; no raw frame in telemetry.

---

### P6 — e2e + hardening (~32h, ~4 days)

**Goal:** Playwright specs for the 5 e2e features.

| Issue | Deliverable | Blocker |
|---|---|---|
| FE-GEST-027 | e2e: recognise-and-report + offline-queue-and-retry | FE-GEST-009, FE-GEST-017 |
| FE-GEST-028 | e2e: privacy-zero-egress (network inspection, 0 video frames) | FE-GEST-013, FE-GEST-021 |
| FE-GEST-029 | e2e: station-identity + detection-liveness (SAFETY-GEST-1 e2e) | FE-GEST-021, FE-GEST-029 |

**P6 Definition of Done:** `npx nx e2e gest-e2e` PASS; privacy-zero-egress asserts 0 frame bytes; SAFETY-GEST-1 liveness cycle proven.

---

## Critical path

```
P1 (foundation + guard + ACS coordination)
    ↓
P2 (API services + facades + mappers)
    ↓
P3 (detection: camera → worker → classifier → state machine → perf)
    ↓
P4 (UI pages + presentational components)  ← MVP milestone
    ↓
P5 (integration + liveness wiring)
    ↓
P6 (e2e + privacy + safety proofs)
```

Parallel streams available within each wave: e.g. FE-GEST-006..008 can run in parallel (all depend only on FE-GEST-003).

---

## Top-3 risks

1. **G1 host shell decision (INT-FE-GEST-003)** — affects `gest.bootstrap.ts` init and `StationLivenessPort` provider registration; FE-GEST-005 and FE-GEST-021 cannot be fully finalized until resolved. Mitigation: proceed with P1-P4 using `NoOpStationLivenessPort`; defer host-specific wiring to P5.

2. **ACS device token authority gap (INT-FE-GEST-001)** — if `gest.capability.read` / `gest.engine.read` are not in the pairing grant, all commands become `detectable=false` at runtime; discovery blocked on ACS team response. Mitigation: `CapabilityApiService` 403 → `all detectable=false` fallback is implemented in FE-GEST-007/010; ship P4 with this defensive path.

3. **LandmarkWorker WASM load latency** — `@mediapipe/tasks-vision` WASM binary may be large; model load on slow WiFi may delay `model=ready` by 10-30s, surfacing as `detection='unavailable'` for a prolonged period. Mitigation: `PerfBudgetService` downscale path (FE-GEST-016) handles CPU-limited devices; WASM is loaded from local assets bundle (not CDN, INV-GEST-4); lazy initialisation path in FE-GEST-013.

---

## Definition of Done (overall)

- [ ] All 29 functional issues PASS (unit + build)
- [ ] `npx nx e2e gest-e2e` PASS (5 feature files, 3 spec files)
- [ ] INV-GEST-1..8 each traced to at least one PASS spec
- [ ] SAFETY-GEST-1 closed: `libs/edge` delivers `EdgeStationLivenessService` (INT-FE-GEST-004)
- [ ] G1 host shell decision made (INT-FE-GEST-003)
- [ ] ACS confirms device token authorities (INT-FE-GEST-001)
- [ ] privacy-zero-egress e2e PASS (FE-GEST-028)
- [ ] `npx nx lint gest` PASS (Nx boundary tags respected)
- [ ] 0 `TODO[agent]` or placeholder values remaining in production code
