# GEST Frontend Issues Map

**Generated:** 2026-11-20
**Module:** GEST (Gesture Detection — station runtime)
**Total:** 29 functional + 4 integration = **33 issues**

---

## 1. Issue index

| ID | Title | Priority | SPEC | Layer | Size |
|---|---|---|---|---|---|
| FE-GEST-001 | gest.contract.ts (MODULE_KEY, permissions={}, STATION_TOKEN_AUTHORITIES[5]) | P1 | SPEC-05 | apps/gest | S |
| FE-GEST-002 | gest.routes.ts (lazy routes, stationIdentityGuard on both) | P1 | SPEC-01 | apps/gest | S |
| FE-GEST-003 | gest.module.ts + gest.providers.ts (provideGest, adapter default=http) | P1 | SPEC-04 | apps/gest | S |
| FE-GEST-004 | gest.descriptor.ts (GEST_MODULE_DESCRIPTOR, identity=edge.device) | P1 | SPEC-05 | apps/gest | S |
| FE-GEST-005 | gest.bootstrap.ts (init/destroy 7-step + 5-step lifecycle) | P1 | SPEC-06 | apps/gest | M |
| FE-GEST-006 | GestureReportApiService + mock (POST /evnt/gesture-reports, body whitelist, type-slug errors) | P2 | SPEC-04 | libs/gest/data-access | M |
| FE-GEST-007 | CapabilityApiService + mock (support-check, ETag, 403→unverified) | P2 | SPEC-04 | libs/gest/data-access | M |
| FE-GEST-008 | EdgeCatalogApiService + mock (GET /edge/catalog, ETag, 503→AppError) | P2 | SPEC-04 | libs/gest/data-access | M |
| FE-GEST-009 | ReportFacade (durable queue, RetryScheduler, INV-GEST-1, INV-GEST-5) | P2 | SPEC-04 | libs/gest/data-access | L |
| FE-GEST-010 | CatalogFacade (EDGE catalog + support-check, detectable computation INV-GEST-7) | P2 | SPEC-04 | libs/gest/data-access | M |
| FE-GEST-011 | RuntimeFacade (StationRuntimeVM signals, honest state, error mapping) | P2 | SPEC-03 | libs/gest/data-access | L |
| FE-GEST-012 | CameraService (getUserMedia lifecycle, MediaStream teardown) | P3 | SPEC-02 | libs/gest/detection | M |
| FE-GEST-013 | LandmarkWorker (Web Worker frame→landmarks, privacy boundary INV-GEST-4) | P3 | SPEC-09 | libs/gest/detection | L |
| FE-GEST-014 | ClassifierService + sensitivityThreshold + reportIdMinter (INV-GEST-3) | P3 | SPEC-04 | libs/gest/detection | M |
| FE-GEST-015 | CompoundGestureStateMachine (idle→recognised, detectable gate INV-GEST-7) | P3 | SPEC-03 | libs/gest/detection | L |
| FE-GEST-016 | PerfBudgetService (fps measurement, degraded state trigger, downscale) | P3 | SPEC-09 | libs/gest/detection | M |
| FE-GEST-017 | StationRuntimePageComponent (smart, INV-GEST-6, honest paused/degraded) | P4 | SPEC-02 | libs/gest/feature-station-runtime | L |
| FE-GEST-018 | Presentational runtime components (OperatorPreview, PausedOverlay ARIA, IdentityNotice) | P4 | SPEC-02 | libs/gest/feature-station-runtime | M |
| FE-GEST-019 | StationStatusPageComponent (smart, DiagnosticsVM, kiosk requirement) | P4 | SPEC-02 | libs/gest/feature-station-status | M |
| FE-GEST-020 | Status panels + DetectableBadge + ReportQueuePanel (RelativeTimePipe) | P4 | SPEC-03 | libs/gest/feature-station-status | M |
| FE-GEST-021 | GestShellIntegrationService (StationLivenessPort wiring SAFETY-GEST-1, INV-GEST-8) | P5 | SPEC-06 | libs/gest/integration | L |
| FE-GEST-022 | WakeLockService (acquire/re-acquire, keepalive beat on hidden SPEC-09 §2.1) | P5 | SPEC-09 | libs/gest/integration | M |
| FE-GEST-023 | DetectionStateMapper (SPEC-03 §7 priority table, never-false-RUNNING INV-GEST-8) | P2 | SPEC-03 | libs/gest/data-access | S |
| FE-GEST-024 | stationIdentityGuard (edge.device validation, never hardcoded true) | P1 | SPEC-05 | libs/gest/access | M |
| FE-GEST-025 | Error handling pipeline (ProblemDetail→AppError by type slug, SPEC-07) | P2 | SPEC-07 | libs/gest/data-access | S |
| FE-GEST-026 | Observability telemetry (schema-whitelisted, never frames INV-GEST-4) | P5 | SPEC-09 | libs/gest/integration | S |
| FE-GEST-027 | e2e: recognise-and-report + offline-queue-and-retry (INV-GEST-1) | P6 | SPEC-04 | apps/gest-e2e | M |
| FE-GEST-028 | e2e: privacy-zero-egress (network inspection, 0-byte frames INV-GEST-4) | P6 | SPEC-09 | apps/gest-e2e | M |
| FE-GEST-029 | e2e: station-identity-and-runtime + station-detection-liveness (SAFETY-GEST-1) | P6 | SPEC-01 | apps/gest-e2e | M |
| INT-FE-GEST-001 | INT-GEST-ACS-1: device token authorities gest.capability.read + gest.engine.read | P1 | SPEC-05 | cross-team | S |
| INT-FE-GEST-002 | INT-GEST-PAT-1: compoundWindowMs from EDGE catalog (not PAT hardcoded) | P2 | SPEC-04 | cross-team | S |
| INT-FE-GEST-003 | G1: Patient-Mode host shell undecided (blocks FE-GEST-021 final wiring) | P1 | SPEC-06 | cross-team | S |
| INT-FE-GEST-004 | libs/edge StationLivenessPort implementation (SAFETY-GEST-1 closure) | P2 | SPEC-06 | libs/edge (EDGE team) | M |

---

## 2. By priority wave

### P1 — Foundation (must land before anything else)
FE-GEST-001, FE-GEST-002, FE-GEST-003, FE-GEST-004, FE-GEST-005, FE-GEST-024,
INT-FE-GEST-001 (ACS coordination), INT-FE-GEST-003 (G1 decision)

### P2 — Data access + mappers
FE-GEST-006, FE-GEST-007, FE-GEST-008, FE-GEST-009, FE-GEST-010, FE-GEST-011,
FE-GEST-023, FE-GEST-025,
INT-FE-GEST-002 (window params), INT-FE-GEST-004 (StationLivenessPort interface)

### P3 — Detection core
FE-GEST-012, FE-GEST-013, FE-GEST-014, FE-GEST-015, FE-GEST-016

### P4 — UI components
FE-GEST-017, FE-GEST-018, FE-GEST-019, FE-GEST-020

### P5 — Integration + safety wiring
FE-GEST-021, FE-GEST-022, FE-GEST-026

### P6 — e2e / hardening
FE-GEST-027, FE-GEST-028, FE-GEST-029

---

## 3. By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (route map) | FE-GEST-002, FE-GEST-029 |
| SPEC-02 (component hierarchy) | FE-GEST-017, FE-GEST-018, FE-GEST-019 |
| SPEC-03 (view models) | FE-GEST-011, FE-GEST-015, FE-GEST-020, FE-GEST-023 |
| SPEC-04 (data access) | FE-GEST-006, FE-GEST-007, FE-GEST-008, FE-GEST-009, FE-GEST-010, FE-GEST-014, FE-GEST-027, INT-FE-GEST-002 |
| SPEC-05 (tool contract) | FE-GEST-001, FE-GEST-004, FE-GEST-024, INT-FE-GEST-001 |
| SPEC-06 (shell integration) | FE-GEST-005, FE-GEST-021, INT-FE-GEST-003, INT-FE-GEST-004 |
| SPEC-07 (error handling) | FE-GEST-025 |
| SPEC-09 (safety + privacy) | FE-GEST-013, FE-GEST-016, FE-GEST-022, FE-GEST-026, FE-GEST-028 |

---

## 4. By layer

| Layer / Path | Issues |
|---|---|
| `apps/gest/src/app/gest-module/` | FE-GEST-001..005 |
| `libs/gest/access/` | FE-GEST-024 |
| `libs/gest/data-access/` | FE-GEST-006..011, FE-GEST-023, FE-GEST-025 |
| `libs/gest/detection/` | FE-GEST-012..016 |
| `libs/gest/feature-station-runtime/` | FE-GEST-017, FE-GEST-018 |
| `libs/gest/feature-station-status/` | FE-GEST-019, FE-GEST-020 |
| `libs/gest/integration/` | FE-GEST-021, FE-GEST-022, FE-GEST-026 |
| `apps/gest-e2e/` | FE-GEST-027, FE-GEST-028, FE-GEST-029 |
| Cross-team / libs/edge | INT-FE-GEST-001..004 |

---

## 5. Critical dependency chain (longest path)

```
INT-FE-GEST-001 (ACS authority)
    └─→ FE-GEST-007 (CapabilityApiService 403 fallback confirmed)
         └─→ FE-GEST-010 (CatalogFacade detectable computation)
              └─→ FE-GEST-015 (CompoundGestureStateMachine detectable gate)

INT-FE-GEST-003 (G1 host shell decision)
    └─→ INT-FE-GEST-004 (StationLivenessPort impl)
         └─→ FE-GEST-021 (GestShellIntegrationService — final wiring)
              └─→ FE-GEST-029 (SAFETY-GEST-1 e2e)

FE-GEST-001..005 (P1 foundation)
    └─→ FE-GEST-006..011 + FE-GEST-023..025 (P2 data access)
         └─→ FE-GEST-012..016 (P3 detection)
              └─→ FE-GEST-017..020 (P4 UI)
                   └─→ FE-GEST-021..022..026 (P5 integration)
                        └─→ FE-GEST-027..029 (P6 e2e)
```

---

## 6. SAFETY / INV traceability

| Invariant | Issues enforcing it |
|---|---|
| INV-GEST-1 (exactly-once reportId) | FE-GEST-009, FE-GEST-027 |
| INV-GEST-2 (compound state machine) | FE-GEST-015 |
| INV-GEST-3 (sensitivity threshold) | FE-GEST-014 |
| INV-GEST-4 (privacy zero-egress) | FE-GEST-013, FE-GEST-021, FE-GEST-026, FE-GEST-028 |
| INV-GEST-5 (durable queue 24h expiry) | FE-GEST-009 |
| INV-GEST-6 (honest paused/degraded overlay) | FE-GEST-011, FE-GEST-017, FE-GEST-018 |
| INV-GEST-7 (detectable gate) | FE-GEST-010, FE-GEST-015, FE-GEST-020 |
| INV-GEST-8 (never-false-RUNNING) | FE-GEST-011, FE-GEST-021, FE-GEST-023 |
| SAFETY-GEST-1 (single heartbeat sender = libs/edge) | FE-GEST-021, FE-GEST-029, INT-FE-GEST-004 |

---

## 7. Estimates (by size)

| Size | Count | Est/issue | Total |
|---|---|---|---|
| S (< 2h) | 10 | 2h | 20h |
| M (half day) | 15 | 4h | 60h |
| L (full day) | 8 | 8h | 64h |
| **Total** | **33** | | **~144h** |

Excludes cross-team INT coordination time (INT-FE-GEST-001..004).
