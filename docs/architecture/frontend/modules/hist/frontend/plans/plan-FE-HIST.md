# Frontend Execution Plan — HIST (History and Audit Trail)

**Module:** HIST — `@neuroassist/hist` (`frontend/libs/hist`)
**Client:** neuroassist-niv
**Route:** `/history`
**Generated:** 2026-11-20
**Trace:** tr_511706a1698a
**Backlog:** `docs/architecture/frontend/modules/hist/frontend/issues/`
**Total issues:** 30 functional + 5 integration = 35

---

## 1. Project summary

HIST is the caregiver's **read-only** history and audit trail: "what happened, when, and was it attended?" The module promotes the BA prototype `screens/history/history.component.ts` to production (`frontend/libs/hist`) and extends it with:
- Keyset pagination and a whole-period summary (G-HIST-4)
- Structured entry kinds: `event` | `escalation` | `detection-lapse` with SAFETY-GEST-1 visual treatment
- Delegated feedback write: "Was it real?" routes to EVNT's port via the shell — HIST owns zero writes
- DASH-embeddable `HistoryWidgetComponent` via `HistShellIntegrationService`

**Defining invariant (ADR-005):** HIST is **read-only by construction** and **does not poll**. Any write path, live projection, or timer is a defect.

---

## 2. Wave plan (P1–P9)

### Wave P1 — Foundation (est. 2–3 days)

| Issue | Title | Files |
|---|---|---|
| FE-HIST-001 | hist.contract.ts | `libs/hist/src/lib/hist.contract.ts` |
| FE-HIST-002 | HIST_ROUTES + entry-lib | `libs/hist/src/lib/hist.routes.ts` |
| FE-HIST-003 | hist.bootstrap.ts + provideHist(http) | `libs/hist/src/lib/hist.bootstrap.ts`, `hist.providers.ts` |
| FE-HIST-004 | canReadHistoryGuard | `libs/hist/access/src/lib/can-read-history.guard.ts` |
| FE-HIST-005 | Shell fallback descriptor | `apps/neuroassist-niv-web/src/app/config/tool-descriptors.ts` |
| FE-HIST-006 | hist.nav.config.ts breadcrumb | `libs/hist/src/lib/hist.nav.config.ts` |

**DoD:** `nx lint hist`, `nx lint neuroassist-niv-web`, `nx build neuroassist-niv-web` PASS. `/history` route exists; guard denies without authority. Provider spec proves `provideHist()` defaults to `http`.

---

### Wave P2 — Data Access (est. 3–4 days)

| Issue | Title | Files |
|---|---|---|
| FE-HIST-007 | HISTORY_PORT interface | `libs/hist/data-access/src/lib/history.port.ts` |
| FE-HIST-008 | HistoryHttpAdapter | `libs/hist/data-access/src/lib/history-http.adapter.ts` |
| FE-HIST-009 | HistoryMockAdapter | `libs/hist/data-access/src/lib/history-mock.adapter.ts` |
| FE-HIST-010 | Wire types + DTO mappers | `libs/hist/data-access/src/lib/history.wire.ts`, `history.mappers.ts` |
| FE-HIST-011 | HistoryFacade | `libs/hist/data-access/src/lib/history.facade.ts` |
| INT-FE-HIST-001 | hist-service BE read API availability | (dependent on BE scaffold) |

**DoD:** `nx test hist-data-access` PASS — facade unit tests cover all 6 scenarios (load, fail+stale, setPeriod narrow, setPeriod wide, loadMore, PeriodSummaryVM scope). HTTP adapter base URL confirmed `${ACCESS_HTTP_BASE}/hist`. Zero write methods in port/adapter.

---

### Wave P3 — Feature Libs (est. 4–5 days)

| Issue | Title |
|---|---|
| FE-HIST-012 | HistoryPageComponent (smart) |
| FE-HIST-013 | PeriodFilterTabsComponent + PeriodSummaryCardComponent |
| FE-HIST-014 | HistoryTimelineComponent (delegated markFeedback) |
| FE-HIST-015 | HistoryListSkeletonComponent + HistoryEmptyStateComponent |
| FE-HIST-016 | **[SAFETY]** HistoryErrorBannerComponent |
| FE-HIST-017 | PeriodSummaryCardComponent scope polish |
| FE-HIST-018 | **[SAFETY-GEST-1]** feature-trail + EscalationTrailSectionComponent |
| FE-HIST-019 | **[SAFETY-GEST-1]** TrailSectionHeaderComponent + TrailDegradedNoticeComponent |
| FE-HIST-020 | **[SAFETY-GEST-1]** EscalationAttemptListComponent + DetectionLapseListComponent |

**DoD:** `nx test hist-feature-history` PASS, `nx test hist-feature-trail` PASS. Failed read never renders empty state. Trail section renders under `hist.history.read` only. Escalation/lapse rows use `--color-info` token (never `--color-alarm`).

---

### Wave P4 — Hub Integrations (tracking wave, non-blocking on FE-HIST)

| Issue | Title | Owner |
|---|---|---|
| INT-FE-HIST-002 | EVNT audit amendment — commandLabel | EVNT team |
| INT-FE-HIST-003 | EVNT audit amendment — maskedTarget | EVNT team |
| INT-FE-HIST-004 | Shell delegated feedback wiring | Shell + EVNT teams |

**DoD:** EVNT amendments deployed to dev; shell wires `markFeedback` to EVNT port; FE-HIST-028 delegated feedback scenario PASS.

---

### Wave P5 — UI Shared (est. 2 days)

| Issue | Title |
|---|---|
| FE-HIST-021 | ui/ lib — HistoryEventRowComponent, UrgencyBadgeComponent, ConfirmationStatusComponent, FeedbackOutcomeBadgeComponent |
| FE-HIST-022 | **[SAFETY]** EscalationRowComponent + DetectionLapseRowComponent |

**DoD:** `nx test hist-ui`, `nx lint hist-ui`, `nx build hist-ui` PASS. EscalationRow test confirms no `--color-alarm` class. maskedTarget rendered verbatim.

---

### Wave P6 — Integration / Widget (est. 1–2 days)

| Issue | Title |
|---|---|
| FE-HIST-023 | HistShellIntegrationService |
| FE-HIST-024 | HistoryWidgetComponent |
| INT-FE-HIST-005 | DASH embedding boundary confirmation |

**DoD:** `nx test hist-integration` PASS. Widget gated by `hist.history.read`. Service wires patient context and delegated feedback. DASH embedding boundary confirmed at M1.5.

---

### Wave P7 — UX Polish (est. 1 day)

| Issue | Title |
|---|---|
| FE-HIST-025 | Loading skeleton CLS budget (CLS<0.1) |
| FE-HIST-026 | **[SAFETY]** Error boundary audit |

**DoD:** CLS<0.1 measurement passes in Playwright. All three error state transitions unit-tested.

---

### Wave P8 — Observability (est. 0.5 day)

| Issue | Title |
|---|---|
| FE-HIST-027 | Telemetry events (OpenHistory, Refresh, PeriodSwitch, LoadMore) |

**DoD:** Telemetry emit unit tests PASS. No PII in event properties.

---

### Wave P9 — E2E + Hardening (est. 2–3 days)

| Issue | Title |
|---|---|
| FE-HIST-028 | E2E — caregiver-history.feature |
| FE-HIST-029 | **[SAFETY-GEST-1]** E2E — escalation-detection-lapse-trail.feature |
| FE-HIST-030 | E2E — hist-access-and-contract.feature |

**DoD:** `nx e2e hist-e2e` PASS for all 3 spec files. SAFETY assertions confirmed by Playwright: no alarm styling on safety surfaces; partial-trail degraded notice shown; maskedTarget verbatim.

---

## 3. Critical path (sequence of blocking issues)

```
FE-HIST-001 → FE-HIST-002 → FE-HIST-004     (P1 foundation)
                │
FE-HIST-010 → FE-HIST-007 → FE-HIST-008     (P2 data layer foundation)
              │
FE-HIST-011 (HistoryFacade — most complex)
              │
FE-HIST-021 + FE-HIST-022 (ui/ — SAFETY)
              │
FE-HIST-012 (HistoryPageComponent)
  │       │       │       │       │
013     014     015     016     018 (SAFETY-GEST-1 trail)
                        SAFETY
              │
FE-HIST-023 (HistShellIntegrationService)
              │
FE-HIST-028..030 (E2E)
```

**Longest blocker chain:** FE-HIST-001 → 010 → 007 → 011 → 022 → 012 → 016 → 028

---

## 4. Top risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | EVNT audit amendments (INT-FE-HIST-002/003) delayed | commandLabel and maskedTarget absent in real data | FE-HIST-009 mock adapter already covers fallback; FE renders correctly without the fields (G-HIST-1 fallback to `title`) |
| R2 | hist-service BE read API (INT-FE-HIST-001) not available for integration testing | HistoryHttpAdapter cannot be validated against real BE | HistoryMockAdapter covers all functionality; E2E can run against mock; unblock real API test separately |
| R3 | DASH↔HIST embedding boundary (INT-FE-HIST-005) not confirmed at M1.5 | HistoryWidgetComponent design may need adjustment | Widget is a thin projection; interface can be adapted cheaply; `HistShellIntegrationService` is the decoupling point |

---

## 5. Definition of Done per milestone

| Milestone | Criteria |
|---|---|
| **P2 done — data layer complete** | Facade unit tests 100% PASS; HTTP adapter base URL confirmed; zero write methods in port/adapter |
| **P3 done — MVP shippable in dev** | /history route renders with mock data; period filter works; skeleton → list → empty → error states all correct; trail section renders with neutral info styling; failed read shows banner (SAFETY) |
| **P5 done — ui/ lib stable** | Shared row components PASS unit + lint + build; SAFETY styling confirmed (no alarm tokens on safety rows) |
| **P9 done — module complete** | All 3 Playwright spec files PASS; SAFETY assertions confirmed by E2E; `nx build neuroassist-niv-web` PASS |

---

## 6. Approval criteria per wave

| Gate | Wave | Approver |
|---|---|---|
| P1 gate | Foundation: routes/guard/contract in place | FE Lead |
| P2 gate | Data access: facade unit tests + providers spec PASS | FE Lead + BE available |
| P3 gate | Feature components: SAFETY-GEST-1 trail reviewed; error boundary reviewed | FE Lead + Safety reviewer |
| P9 gate | E2E: all 3 feature files PASS; SAFETY assertions by Playwright | FE Lead + QA |

---

## 7. Prototype-to-production reference

Promoted from: `frontend/design-reference/angular-prototype/apps/neuroassist-niv-web/src/app/screens/history/history.component.ts`

Key promote decisions (D-493):
- `HistoryComponent` → `HistoryPageComponent` (smart) + decomposed presentational components
- `EventsFacade` + `CommandsFacade` prototype in-memory data → `HistoryFacade` over `HISTORY_PORT → HistoryHttpAdapter`
- `periodo = 'week'` prototype default preserved as FE initial selection (BE endpoint default is 'today' — FE sends explicitly)
- `'mes'` → `'month'` in `PeriodFilter` type (SPEC-03 mapping note)
- In-memory `marcar()` feedback write → delegated to EVNT via shell (`markFeedback` EventEmitter → shell → EVNT port)
- KPI cards (`DsKpiComponent`) → `PeriodSummaryCardComponent` (whole-period BE summary when available, scope label)
