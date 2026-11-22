# plan-FE-DASH — Execution Plan — DASH Frontend

> Source: `/fe-architect-backlog neuroassist-niv DASH` (2026-11-20)
> Trace: tr_511706a1698a
> Backlog: `docs/architecture/frontend/modules/dash/frontend/issues/issues_map.md`
> Specs: `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-01..08`
> ADR: `docs/architecture/frontend/modules/dash/frontend/adr/ADR-005-composition-host-and-fail-safe-overview.md`

---

## Project summary

DASH is the **composition host** module of NeuroAssist NIV: it owns the caregiver's home screen (`/home`) and composes the read-only surfaces of HIST, EVNT, EDGE and PAT into a single fail-safe overview. It has **no backend** (ADR-001) and **no `dash.*` authority** (ADR-001 / SPEC-05). The central safety contract is the `CompositeStatus` derivation: `all_clear` only when every source is ok+fresh; any non-ok source → `degraded`; detection lapse → `notice` (amber, never emergency); EVNT emergency → defer (never style or suppress). The prototype `screens/home` is promoted to `libs/dash/feature-overview` (D-493); `screens/entry` is promoted as a shell route whose CTA drives the ACS login flow.

Backlog: **26 functional issues** (FE-DASH-001..026) + **2 integration issues** (INT-FE-DASH-001..002) = **28 total issues**.

---

## Wave map (P1–P9)

| Wave | Issues | Est. | Focus |
|---|---|---|---|
| **P1 — Foundation** | FE-DASH-001..005 | 2–3 days | Shell contracts, routes, bootstrap, descriptor, freshness constants |
| **P2 — Composition wiring** | FE-DASH-006..007 | 2 days | DashboardFacade (fail-safe core) + DashShellIntegrationService |
| **P3 — Feature lib** | FE-DASH-008..013 | 3–4 days | 6 DASH-owned components + feature-overview assembly |
| **P4 — Integration** | INT-FE-DASH-001..002 | 1–2 days | LapseAlertFacade wiring (blocked by EVNT/EDGE) + HIST loadedAt (optional) |
| **P5 — Guards** | FE-DASH-014..015 | 1 day | authGuard (shared) + dashGuard (no dash.* key) |
| **P6 — Navigation** | FE-DASH-016..017 | 1 day | Breadcrumb + entry shell promotion |
| **P7 — UX polish** | FE-DASH-018..020 | 2 days | Loading skeletons + per-source error banners + empty states + toast |
| **P8 — Observability** | FE-DASH-021 | 0.5 days | Telemetry: refresh, source-error, lapse (no PII) |
| **P9 — E2E** | FE-DASH-022..026 | 2–3 days | 6 Playwright spec files (stubs → implemented) |
| **Total** | 28 issues | **~14–17 days** | |

---

## Critical path

The longest blocking chain is:

```
FE-DASH-005 (constants)
  → FE-DASH-006 (DashboardFacade — SAFETY core, most complex issue)
    → FE-DASH-007 (DashShellIntegrationService)
      → FE-DASH-008 (OverviewPageComponent)
        → FE-DASH-013 (feature-overview assembly)
          → FE-DASH-022 (e2e stubs)
            → FE-DASH-023..026 (e2e implemented)
```

**P2 (DashboardFacade) is the highest-risk issue** — it implements the fail-safe `CompositeStatus` derivation (INV-1) with five per-source freshness checks. Plan for the most review time here.

**INT-FE-DASH-001** is on a parallel track gated by EVNT (FE-EVNT-027/028) and EDGE (FE-EDGE-028/029). Until it lands, `detectionLapse` is `null` and the detection-lapse notice is dormant (safe degraded mode).

---

## Top-3 risks (from docs 06)

| # | Risk | Mitigation |
|---|---|---|
| R1 | **FE-EVNT-027/028 delay** — INT-FE-DASH-001 is blocked until EVNT exports `LapseAlertFacade`. Detection-lapse notice stays null-rendered (amber notice never appears), which is safe (degraded, not false `all_clear`). | Track FE-EVNT-027/028 progress; stopgap is HIST-timeline lapse derivation (explicitly degraded, never `all_clear`) |
| R2 | **DashboardFacade freshness gating correctness** — wrong threshold values or off-by-one in freshness math silently changes the safety invariant (INV-1). | Unit-test `deriveCompositeStatus` exhaustively; pin constants in SPEC-03 §3; code review gate on FE-DASH-005+006 |
| R3 | **Embedded-component API drift** — HIST/EVNT/EDGE components exported from their `index.ts` may not yet have the expected `@Input` signatures when DASH's P3 wave starts. | Start P3 only after FE-HIST/FE-EVNT/FE-EDGE feature-lib issues that export the embedded components are confirmed INTACT |

---

## Definition of Done per wave

| Wave | DoD |
|---|---|
| **P1 done** | `npx nx build dash` PASS; `MODULE_PERMISSION_MAP` has 0 `dash.*` keys; `DASH_ROUTES` has 0 `entry` path |
| **P2 done** | `npx nx test dash` PASS; `deriveCompositeStatus` unit tests cover all 5 `CompositeStatus` branches + per-source freshness; `DashboardFacade` has no `HttpClient` |
| **P3 done** | `npx nx build neuroassist-niv-web` PASS; `/home` loads and renders all 6 DASH-owned components; embedded HIST/EVNT/EDGE components present |
| **P4 done** | INT-FE-DASH-001: `detectionLapse()` non-null with open EVNT lapse (may remain `null` if EVNT dep not ready) |
| **P5 done** | `grep -r 'return true' frontend/libs/dash/access/` returns nothing |
| **P6 done** | `/home` breadcrumb shows `[Home]`; entry screen CTA navigates to ACS login |
| **P7 done** | First load with all sources loading shows skeleton (not blank); EDGE error shows error panel (not "offline") |
| **P8 done** | Refresh event appears in observability with `correlationId`; no patient-name in event payload |
| **P9 done** | `npx nx run dash-e2e:e2e` PASS; 0 scenarios vacuously green; all 6 feature files covered |

---

## Approval criteria by milestone

| Milestone | Gate | MVP shippable? |
|---|---|---|
| P3 done | `/home` renders with composed data; `all_clear` derivation correct | Yes — dev environment (all sources mocked) |
| P5 done | Guards live; auth/authz flow complete; no hardcoded true | Yes — staging |
| P7 done | Full error handling; no blank panels; no silent failures | Yes — production-ready |
| P9 done | Full e2e coverage; all safety scenarios verified | Yes — full release |

---

## Linked specs and ADRs

- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-01-route-map.md`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02-component-hierarchy.md`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-04-data-access.md`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-05-tool-contract.md`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-06-shell-integration.md`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-07-error-handling.md`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-08-e2e-scenarios.md`
- `docs/architecture/frontend/modules/dash/frontend/adr/ADR-005-composition-host-and-fail-safe-overview.md`
- `docs/architecture/backend/services/dash-service/adr/ADR-001-dash-has-no-backend-service.md` (no backend)
- `docs/architecture/frontend/modules/dash/frontend/contracts/backend-api-cross-link.md` (composition map)
