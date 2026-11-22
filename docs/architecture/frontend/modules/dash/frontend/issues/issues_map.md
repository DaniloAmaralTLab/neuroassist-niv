# Issues Map -- DASH Frontend Backlog

| Issue | Title | Kind | Priority | Status |
|---|---|---|---|---|
| FE-DASH-001 | dash.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP (5 composed authorities, no dash.*), MODULE_FEATURE_FLAGS | FE | P1 | INTACT |
| FE-DASH-002 | dash.routes.ts — DASH_ROUTES: /home with authGuard + dashGuard; redirectTo home; no entry route | FE | P1 | INTACT |
| FE-DASH-003 | dash.module.ts (shell-entry barrel) + dash.bootstrap.ts — patient-context init, fan-out, destroy; no DASH timer | FE | P1 | INTACT |
| FE-DASH-004 | DASH_DESCRIPTOR + tool-descriptors.ts wiring — shell registration (home branch, section 'care', order 0) | FE | P1 | INTACT |
| FE-DASH-005 | DASH freshness constants — DASH_EDGE_HEARTBEAT_STALE_MS, DASH_HIST_SUMMARY_TTL_MS, DASH_PAT_TTL_MS, DASH_EVNT_FRESH_FACTOR, EDGE_LAPSE_WINDOW_MS (pinned per SPEC-03 §3) | FE | P1 | INTACT |
| FE-DASH-006 | DashboardFacade — aggregator of HIST/EVNT/EDGE/PAT signals; fail-safe CompositeStatus derivation; no HttpClient; em-dash KPIs; emergency defer | FE | P2 | INTACT |
| FE-DASH-007 | DashShellIntegrationService — setActivePatient fan-out to HIST/EDGE/PAT/EVNT seams; refresh relay; composed read-only slices for DashboardFacade | FE | P2 | INTACT |
| FE-DASH-008 | OverviewPageComponent — smart; injects DashboardFacade; wires all embedded panels (HIST/EDGE/EVNT components); refresh on (refresh) emit | FE | P3 | INTACT |
| FE-DASH-009 | OverviewHeadlineComponent — presentational; @Input overview: OverviewVM; renders all_clear | degraded | notice (NEVER emergency); (refresh) output | FE | P3 | INTACT |
| FE-DASH-010 | KpiRowComponent — presentational; @Input kpis: KpiVM; renders '—' (never 0) for any null KPI (INV-4 / SAFETY-DASH) | FE | P3 | INTACT |
| FE-DASH-011 | DetectionLapseNoticeComponent — presentational; amber notice for 'online but not detecting' (SAFETY: never emergency, never all_clear) | FE | P3 | INTACT |
| FE-DASH-012 | CatalogSummaryComponent + SuggestionCardComponent — presentational; dash.suggestion.enabled gate; (confirm)/(ignore) emit; '/calibration' outbound link | FE | P3 | INTACT |
| FE-DASH-013 | feature-overview assembly — OverviewPageComponent wires all embedded module components (HIST HistoryWidgetComponent, EDGE EdgeDeviceCard/DeviceStatusBadge, EVNT RoutineNotice*) | FE | P3 | INTACT |
| FE-DASH-014 | authGuard wiring for /home — reuse shell's shared authGuard; session-absent redirects to ACS login flow (SPEC-01 §4) | FE | P5 | INTACT |
| FE-DASH-015 | dashGuard — AccessDecisionService-backed; asserts authenticated caregiver + linked patient context; evaluates NO dash.* key; never hardcoded true (guard:stub-permissive) | FE | P5 | INTACT |
| FE-DASH-016 | DashShellIntegrationService breadcrumb — /home root breadcrumb [Home]; navigation wiring in shell (SPEC-06 §2) | FE | P6 | INTACT |
| FE-DASH-017 | entry screen shell promotion — promote screens/entry as a SHELL route (ACS login CTA → /home); DASH never registers entry in DASH_ROUTES (SPEC-01 §5, owner=SHELL) | FE | P6 | INTACT |
| FE-DASH-018 | Loading skeletons — OverviewPageComponent loading state while headline='loading' (any source loading); per-panel skeleton while source loading (SPEC-07 §4) | FE | P7 | INTACT |
| FE-DASH-019 | Per-source error states and degraded banners — inline banner per failed panel (not all-or-nothing); device panel error state (not 'offline', not blank); HIST failure → em-dash KPIs (SPEC-07 §2-3) | FE | P7 | INTACT |
| FE-DASH-020 | Empty states — PAT empty (no patient → degraded, never all_clear); no-device; no-commands catalog; toast on refresh failure (SPEC-07 §4) | FE | P7 | INTACT |
| FE-DASH-021 | Telemetry — forward refresh events, source-error signals, detection-lapse notices to @neuroassist/shared/observability; correlation-id from composed reads; no raw patient PII (SPEC-07 §4) | FE | P8 | INTACT |
| FE-DASH-022 | Playwright stub generation — 6 .feature files mapped to test.fixme() stubs in apps/dash-e2e (no empty describe/no vacuous green) | FE | P9 | INTACT |
| FE-DASH-023 | E2E — home-overview-composition scenarios: routing + compose-only + no /dash endpoint + refresh + shell-patient + per-panel RBAC + permission map + AccessDecisionService check | FE | P9 | INTACT |
| FE-DASH-024 | E2E — fail-safe-composite-status scenarios: loading holds headline + all_clear only all ok+fresh + em-dash KPIs + per-source freshness matrix (Scenario Outline) | FE | P9 | INTACT |
| FE-DASH-025 | E2E — detection-lapse-notice + emergency-precedence scenarios: amber notice never emergency; DASH defers to EVNT takeover without styling or suppressing | FE | P9 | INTACT |
| FE-DASH-026 | E2E — partial-failure-and-errors + entry-and-shell-routing scenarios: source error degrades, device error panel, em-dash, partial failure, PII-free telemetry, entry as shell route, authGuard/dashGuard | FE | P9 | INTACT |
| INT-FE-DASH-001 | INT-DASH-1: Consume LapseAlertFacade from @neuroassist/evnt — wire DetectionLapseNoticeComponent + DashboardFacade detectionLapse signal; depends on FE-EVNT-027/028 + FE-EDGE-028/029 | INT | P4 | INTACT |
| INT-FE-DASH-002 | INT-DASH-2 (optional): Consume PeriodSummaryVM.loadedAt from @neuroassist/hist — wire histReadAt freshness in DashboardFacade to upstream read-time; depends on HIST INT-DASH-2 export | INT | P4 | INTACT |

---

## Totals

- **26 functional issues** (FE-DASH-001 through FE-DASH-026)
- **2 integration issues** (INT-FE-DASH-001 through INT-FE-DASH-002)
- **Total: 28 issues**

---

## By priority wave

| Wave | Issues | Focus |
|---|---|---|
| P1 — Foundation | FE-DASH-001..005 | Shell-entry contracts, routes, bootstrap, descriptor, freshness constants |
| P2 — Composition wiring | FE-DASH-006..007 | DashboardFacade (fail-safe derivation) + DashShellIntegrationService (fan-out) |
| P3 — Feature lib | FE-DASH-008..013 | OverviewPageComponent + 5 presentational components + feature-overview assembly |
| P4 — Integration | INT-FE-DASH-001..002 | LapseAlertFacade wiring (EVNT dep) + HIST loadedAt (optional) |
| P5 — Guards | FE-DASH-014..015 | authGuard (shared) + dashGuard (no dash.* key; never hardcoded true) |
| P6 — Navigation | FE-DASH-016..017 | Breadcrumb [Home] + entry screen shell promotion |
| P7 — UX polish | FE-DASH-018..020 | Loading skeletons + per-source error banners + empty states + toast |
| P8 — Observability | FE-DASH-021 | Telemetry: refresh, source-error, lapse events (no PII) |
| P9 — E2E | FE-DASH-022..026 | Playwright stubs (test.fixme) + 5 implemented e2e suites covering all 6 feature files |

---

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (route map) | FE-DASH-001, FE-DASH-002, FE-DASH-004, FE-DASH-014, FE-DASH-015, FE-DASH-017 |
| SPEC-02 (component hierarchy) | FE-DASH-008, FE-DASH-009, FE-DASH-010, FE-DASH-011, FE-DASH-012, FE-DASH-013 |
| SPEC-03 (view models + freshness) | FE-DASH-005, FE-DASH-006, FE-DASH-010, FE-DASH-024 |
| SPEC-04 (data access + INT items) | FE-DASH-006, FE-DASH-007, FE-DASH-013, INT-FE-DASH-001, INT-FE-DASH-002 |
| SPEC-05 (module contract) | FE-DASH-001, FE-DASH-003, FE-DASH-004, FE-DASH-015 |
| SPEC-06 (shell integration) | FE-DASH-003, FE-DASH-007, FE-DASH-016, FE-DASH-017 |
| SPEC-07 (error handling) | FE-DASH-009, FE-DASH-010, FE-DASH-011, FE-DASH-018, FE-DASH-019, FE-DASH-020, FE-DASH-021 |
| SPEC-08 (e2e scenarios) | FE-DASH-022..026 |

---

## Safety issues (SAFETY-DASH / INV-* coverage)

| Invariant | Issues |
|---|---|
| **INV-1 / SAFETY-DASH-1** (`all_clear` only when every source ok+fresh) | FE-DASH-005, FE-DASH-006, FE-DASH-009, FE-DASH-018, FE-DASH-024, INT-FE-DASH-001 |
| **INV-3** (emergency never faked/hidden) | FE-DASH-009, FE-DASH-025 |
| **INV-4** (`"—"` not `0` for failed KPIs) | FE-DASH-006, FE-DASH-010, FE-DASH-024 |
| **INV-6** (no patient-picker in DASH) | FE-DASH-003, FE-DASH-007, FE-DASH-008 |
| **SAFETY-GEST-1** (detection lapse = amber, never emergency) | FE-DASH-011, FE-DASH-025, INT-FE-DASH-001 |
| **guard:stub-permissive** (no hardcoded `return true`) | FE-DASH-014, FE-DASH-015 |

---

## Critical dependency path

```
FE-DASH-001 (contract)
  └── FE-DASH-002 (routes)
        └── FE-DASH-004 (descriptor + shell wiring)
              └── FE-DASH-003 (bootstrap + lifecycle)
FE-DASH-005 (freshness constants)
  └── FE-DASH-006 (DashboardFacade — SAFETY core)
        └── FE-DASH-007 (DashShellIntegrationService)
              └── FE-DASH-008 (OverviewPageComponent — smart)
                    ├── FE-DASH-009 (OverviewHeadlineComponent)
                    ├── FE-DASH-010 (KpiRowComponent — INV-4)
                    ├── FE-DASH-011 (DetectionLapseNoticeComponent — SAFETY-GEST-1)
                    ├── FE-DASH-012 (CatalogSummary + SuggestionCard)
                    └── FE-DASH-013 (feature-overview assembly)
FE-DASH-014 (authGuard)
  └── FE-DASH-015 (dashGuard — no dash.*, no hardcoded true)
FE-DASH-016 (breadcrumb)
FE-DASH-017 (entry shell promotion)
FE-DASH-018..020 (UX polish)
FE-DASH-021 (telemetry)
FE-DASH-022 (e2e stubs — test.fixme)
  └── FE-DASH-023..026 (e2e implemented)
INT-FE-DASH-001 (depends on FE-EVNT-027/028 + FE-EDGE-028/029 — external)
INT-FE-DASH-002 (depends on HIST INT-DASH-2 export — optional)
```

---

## Key architectural constraints tracked across all issues

- **No backend / No dash.* authority** (ADR-001): DASH has no HTTP adapter, no `/dash/**` endpoint, no `dash.*` permission key (FE-DASH-001, FE-DASH-006, FE-DASH-015)
- **INV-1 / SAFETY-DASH-1**: `all_clear` = every source ok+fresh; the contrapositive is the law — any non-ok source → never `all_clear` (FE-DASH-005, FE-DASH-006, FE-DASH-009, FE-DASH-024)
- **INV-3**: DASH never applies emergency styling; EVNT emergency takeover renders above DASH (FE-DASH-009, FE-DASH-025)
- **INV-4**: `"—"` not `0` for failed KPIs (FE-DASH-010, FE-DASH-024)
- **guard:stub-permissive**: no hardcoded `return true` in any guard (FE-DASH-014, FE-DASH-015)
- **D-493**: prototype-to-production — screens/home promoted to libs/dash/feature-overview; screens/entry promoted as a shell route (FE-DASH-017)
- **INT-DASH-1 dependency**: `detectionLapse` defaults to `null` until FE-EVNT-027/028 + FE-EDGE-028/029 land (stopgap: HIST timeline lapse derivation; INT-FE-DASH-001)
- **e2e stubs**: use `test.fixme()` not empty `describe` — pitfall `fe-nx-register-module:e2e-stub:empty-describe-passes-as-green` (FE-DASH-022)
