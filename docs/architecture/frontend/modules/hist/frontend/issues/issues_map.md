# HIST Frontend Backlog — Issues Map

**Module:** HIST (History and Audit Trail)
**Client:** neuroassist-niv
**Total:** 30 functional issues (FE-HIST-001..030) + 5 integration issues (INT-FE-HIST-001..005) = **35 issues**
**Trace:** tr_511706a1698a
**Generated:** 2026-11-20

---

## 1. Issue index (all issues)

| ID | Title | Layer | Wave | Priority | SAFETY |
|---|---|---|---|---|---|
| FE-HIST-001 | hist.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS | foundation | P1 | P1 | |
| FE-HIST-002 | HIST_ROUTES + hist entry-lib — lazy /history route, loadComponent | foundation | P1 | P1 | |
| FE-HIST-003 | hist.bootstrap.ts — provideHist(http) + init/destroy lifecycle | foundation | P1 | P1 | |
| FE-HIST-004 | canReadHistoryGuard — AccessDecisionService.can('hist.history.read'), never hardcode true | foundation | P1 | P1 | |
| FE-HIST-005 | Shell fallback descriptor — tool-descriptors.ts static hist entry | foundation | P1 | P1 | |
| FE-HIST-006 | hist.nav.config.ts — breadcrumb + NavigationService wiring for /history | foundation | P1 | P1 | |
| FE-HIST-007 | HISTORY_PORT interface — zero-write read-only port seam (InjectionToken) | data-access | P2 | P2 | |
| FE-HIST-008 | HistoryHttpAdapter — ${ACCESS_HTTP_BASE}/hist; ProblemDetail type-slug error mapping | data-access | P2 | P2 | |
| FE-HIST-009 | HistoryMockAdapter — same wire shape as HTTP; explicit mock provider for tests/offline dev | data-access | P2 | P2 | |
| FE-HIST-010 | Wire types + DTO mappers — HistoryPageWire, HistoryEntryWire, PeriodSummaryWire, toHistoryEntryVM, toPeriodSummaryVM | data-access | P2 | P2 | |
| FE-HIST-011 | HistoryFacade — signals + .asReadonly(), computed, load/loadMore/setPeriod/refresh, PeriodSummaryVM binding | data-access | P2 | P2 | |
| FE-HIST-012 | feature-history lib + HistoryPageComponent — smart, signals, injects HistoryFacade + AccessDecisionService | feature | P3 | P3 | |
| FE-HIST-013 | PeriodFilterTabsComponent — presentational period selector (today/week/month) | feature | P3 | P3 | |
| FE-HIST-014 | HistoryTimelineComponent — presentational, markFeedback EventEmitter; HIST writes nothing, delegates to EVNT | feature | P3 | P3 | |
| FE-HIST-015 | HistoryListSkeletonComponent + HistoryEmptyStateComponent — presentational; CLS<0.1 reserved rows | feature | P3 | P3 | |
| FE-HIST-016 | HistoryErrorBannerComponent — degraded banner + stale state + Retry; NEVER render false no-history | feature | P3 | P3 | YES |
| FE-HIST-017 | PeriodSummaryCardComponent — presentational; scope label 'period'\|'loaded' (G-HIST-4) | feature | P3 | P3 | |
| FE-HIST-018 | feature-trail lib + EscalationTrailSectionComponent — smart, same HistoryFacade, flag hist.escalation-trail | feature | P3 | P3 | YES (SAFETY-GEST-1) |
| FE-HIST-019 | TrailSectionHeaderComponent + TrailDegradedNoticeComponent — presentational; partial-trail failure (SPEC-07 §2.1) | feature | P3 | P3 | YES (SAFETY-GEST-1) |
| FE-HIST-020 | EscalationAttemptListComponent + DetectionLapseListComponent — presentational; uses shared ui/ row components | feature | P3 | P3 | YES (SAFETY-GEST-1) |
| FE-HIST-021 | ui/ lib — HistoryEventRowComponent, UrgencyBadgeComponent, ConfirmationStatusComponent, FeedbackOutcomeBadgeComponent | ui | P5 | P5 | |
| FE-HIST-022 | [SAFETY] EscalationRowComponent + DetectionLapseRowComponent — neutral info styling; --color-info NEVER --color-alarm; maskedTarget verbatim | ui | P5 | P5 | YES |
| FE-HIST-023 | HistShellIntegrationService — patient context, facade slice, delegated feedback wiring via shell | integration | P6 | P6 | |
| FE-HIST-024 | HistoryWidgetComponent — read-only widget for DASH embedding; same hist.history.read guard; fed from HistoryFacade | integration | P6 | P6 | |
| FE-HIST-025 | Loading skeleton CLS budget — reserved rows, layout-shift compliance (CLS<0.1) | ux-polish | P7 | P7 | |
| FE-HIST-026 | [SAFETY] Error boundary audit — 403 forbidden vs transport failure vs empty; never false all-clear | ux-polish | P7 | P7 | YES |
| FE-HIST-027 | Telemetry events — OpenHistory, Refresh, PeriodSwitch, LoadMore via @neuroassist/shared/observability | observability | P8 | P8 | |
| FE-HIST-028 | E2E — caregiver-history.feature (prototype parity, 3 features coverage) | e2e | P9 | P9 | |
| FE-HIST-029 | [SAFETY-GEST-1] E2E — escalation-detection-lapse-trail.feature (info styling, masking, partial-trail degraded) | e2e | P9 | P9 | YES |
| FE-HIST-030 | E2E — hist-access-and-contract.feature (guards, RBAC, adapter default, zero-write port, JWT tenant) | e2e | P9 | P9 | |
| INT-FE-HIST-001 | hist-service BE read API availability — GET /hist/patients/{patientId}/history contract parity | integration | P2 | P2 | |
| INT-FE-HIST-002 | EVNT audit payload amendment — commandLabel field on EventGenerated (G-HIST-1 upstream dependency) | integration | P4 | P4 | |
| INT-FE-HIST-003 | EVNT audit payload amendment — maskedTarget field on EscalationAttempted (G-HIST-3 upstream dependency) | integration | P4 | P4 | |
| INT-FE-HIST-004 | Shell delegated feedback wiring — EVNT feedback port + HistoryFacade.refresh on success (ADR-005, SPEC-06 §3) | integration | P4 | P4 | |
| INT-FE-HIST-005 | DASH HistoryWidgetComponent embedding — HistShellIntegrationService boundary confirmation (SPEC-06 §4) | integration | P6 | P6 | |

---

## 2. By priority wave

| Wave | Issues | Focus |
|---|---|---|
| P1 — Foundation | FE-HIST-001..006 | Module contract, routes, bootstrap, guard, shell descriptor, breadcrumb |
| P2 — Data access | FE-HIST-007..011, INT-FE-HIST-001 | Port, HTTP adapter, mock adapter, wire types + mappers, facade |
| P3 — Feature libs | FE-HIST-012..020 | HistoryPageComponent, presentational components, feature-trail (SAFETY-GEST-1) |
| P4 — Hub integrations | INT-FE-HIST-002..004 | EVNT audit payload amendments, shell delegated feedback wiring |
| P5 — UI shared | FE-HIST-021..022 | Shared presentational row components (ui/ lib); SAFETY styling |
| P6 — Integration / Widget | FE-HIST-023..024, INT-FE-HIST-005 | HistShellIntegrationService, HistoryWidgetComponent, DASH boundary |
| P7 — UX polish | FE-HIST-025..026 | CLS budget, error boundary audit (SAFETY) |
| P8 — Observability | FE-HIST-027 | Telemetry events |
| P9 — E2E + Hardening | FE-HIST-028..030 | Playwright specs for all 3 feature files |

---

## 3. By SPEC origin

| SPEC | EARS theme | Issues |
|---|---|---|
| SPEC-01 | Routes, guards, no-write route, trail as section | FE-HIST-002, FE-HIST-004, FE-HIST-018, FE-HIST-030 |
| SPEC-02 | Component hierarchy, visual distinctness (SAFETY) | FE-HIST-012..020, FE-HIST-021, FE-HIST-022 |
| SPEC-03 | View models, wire types, period summary, entry kinds | FE-HIST-010, FE-HIST-013, FE-HIST-015, FE-HIST-017 |
| SPEC-04 | Data access, port, adapter, facade, delegation | FE-HIST-007..011, FE-HIST-014 |
| SPEC-05 | Module contract, permission map, feature flags, RBAC | FE-HIST-001, FE-HIST-003, FE-HIST-004 |
| SPEC-06 | Shell integration, patient context, widget, delegated feedback | FE-HIST-005, FE-HIST-023, FE-HIST-024, INT-FE-HIST-004, INT-FE-HIST-005 |
| SPEC-07 | Error handling, stale, partial-trail degraded (SAFETY) | FE-HIST-016, FE-HIST-026, FE-HIST-029 |
| SPEC-08 | E2E scenarios | FE-HIST-028, FE-HIST-029, FE-HIST-030 |

---

## 4. SAFETY-tagged issues

| Issue | SAFETY reason |
|---|---|
| FE-HIST-016 | HistoryErrorBannerComponent — NEVER render false no-history from a failed read (SPEC-07 §2) |
| FE-HIST-018 | EscalationTrailSectionComponent — SAFETY-GEST-1 trail (escalation + detection-lapse visibility) |
| FE-HIST-019 | TrailDegradedNoticeComponent — NEVER implies "no escalations occurred" on partial failure |
| FE-HIST-020 | EscalationAttemptListComponent + DetectionLapseListComponent — SAFETY-GEST-1 surfaces |
| FE-HIST-022 | EscalationRowComponent + DetectionLapseRowComponent — neutral info styling; --color-alarm FORBIDDEN; maskedTarget verbatim |
| FE-HIST-026 | Error boundary audit — 403 vs 5xx vs empty: never false all-clear |
| FE-HIST-029 | E2E — SAFETY-GEST-1 trail feature; asserts no alarm styling; partial-trail degraded notice |

---

## 5. By layer (Nx lib path)

| Layer | Path | Issues |
|---|---|---|
| Module entry | `frontend/libs/hist/src/` | FE-HIST-001..003, FE-HIST-006 |
| Access guards | `frontend/libs/hist/access/` | FE-HIST-004 |
| Data access | `frontend/libs/hist/data-access/` | FE-HIST-007..011 |
| feature-history | `frontend/libs/hist/feature-history/` | FE-HIST-012..017, FE-HIST-025..027 |
| feature-trail | `frontend/libs/hist/feature-trail/` | FE-HIST-018..020 |
| ui | `frontend/libs/hist/ui/` | FE-HIST-021..022 |
| integration | `frontend/libs/hist/integration/` | FE-HIST-023..024 |
| Shell app | `frontend/apps/neuroassist-niv-web/` | FE-HIST-005, INT-FE-HIST-004 |
| e2e | `frontend/apps/hist-e2e/` | FE-HIST-028..030 |
| Cross-module | (EVNT, DASH, hist-service) | INT-FE-HIST-001..005 |

---

## 6. Critical dependency chain (longest path)

```
FE-HIST-001 (contract)
  └── FE-HIST-002 (routes)
        └── FE-HIST-004 (guard)
  └── FE-HIST-003 (bootstrap)
        └── FE-HIST-007 (HISTORY_PORT)
              └── FE-HIST-010 (wire types + mappers)
                    └── FE-HIST-008 (HttpAdapter)
                    └── FE-HIST-009 (MockAdapter)
                    └── FE-HIST-011 (HistoryFacade)
                          └── FE-HIST-021 (ui/ event row)
                          └── FE-HIST-022 (ui/ SAFETY rows)  ← CRITICAL SAFETY
                                └── FE-HIST-012 (HistoryPageComponent)
                                      └── FE-HIST-013 (PeriodFilterTabsComponent)
                                      └── FE-HIST-014 (HistoryTimelineComponent)
                                      └── FE-HIST-015 (Skeleton + EmptyState)
                                      └── FE-HIST-016 (ErrorBanner — SAFETY)
                                      └── FE-HIST-017 (PeriodSummaryCardComponent)
                                      └── FE-HIST-018 (EscalationTrailSection — SAFETY-GEST-1)
                                            └── FE-HIST-019 (TrailHeader + DegradedNotice)
                                            └── FE-HIST-020 (EscalationAttemptList + LapseList)
                                └── FE-HIST-023 (HistShellIntegrationService)
                                      └── FE-HIST-024 (HistoryWidgetComponent)
                          └── FE-HIST-028 (E2E caregiver-history)
                          └── FE-HIST-029 (E2E trail — SAFETY-GEST-1)
                          └── FE-HIST-030 (E2E access + contract)

INT-FE-HIST-001 (hist-service BE ready) — unblocks HistoryHttpAdapter live testing
INT-FE-HIST-002 + 003 (EVNT amendments) — unblock commandLabel + maskedTarget in real data
INT-FE-HIST-004 (shell feedback wiring) — unblocks delegated feedback E2E
```

---

## 7. Size estimates

| Wave | Issues | Est. | Comment |
|---|---|---|---|
| P1 | 6 | M | Contract + routes + bootstrap + guard |
| P2 | 5 + 1 INT | M | Port + adapters + facade (most complex issue: FE-HIST-011) |
| P3 | 9 | L | Multiple feature components; SAFETY-GEST-1 trail |
| P4 | 3 INT | S | Dependent on EVNT team; track/unblock only |
| P5 | 2 | M | Shared ui/ row components; SAFETY styling review |
| P6 | 2 + 1 INT | S | Integration service + widget |
| P7 | 2 | S | CLS audit + error boundary audit |
| P8 | 1 | S | Telemetry emit calls |
| P9 | 3 | M | Playwright specs for all 3 feature files |
