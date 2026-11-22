# EVNT Frontend Backlog — Issues Map

**Module:** EVNT (Events and Alarms)
**Client:** neuroassist-niv
**Total:** 31 functional issues (FE-EVNT-001..031) + 7 integration issues (INT-FE-EVNT-001..007) = **38 issues**
**Trace:** tr_1d11dccf3957
**Generated:** 2026-11-20
**Amended:** 2026-11-20 — SAFETY-GEST-1 detection-lapse alert (ADR-006 / BE SPEC-12): +5 functional (FE-EVNT-027..031) + 1 integration (INT-FE-EVNT-007)

---

## 1. Issue index (all issues)

| ID | Title | Layer | Wave | Priority | SAFETY |
|---|---|---|---|---|---|
| FE-EVNT-001 | evnt.contract.ts — EventPort + InjectionToken | foundation | P1 | P1 | |
| FE-EVNT-002 | EVNT_ROUTES + lazy-load | foundation | P1 | P1 | |
| FE-EVNT-003 | EvntModule + provideEvnt() | foundation | P1 | P1 | |
| FE-EVNT-004 | EVNT_MODULE_DESCRIPTOR + shell registration | foundation | P1 | P1 | |
| FE-EVNT-005 | evnt.bootstrap.ts lifecycle | foundation | P1 | P1 | |
| FE-EVNT-006 | Access guards — canReadEvent + canConfirmEvent | foundation | P1 | P1 | |
| FE-EVNT-007 | EventApiService HTTP adapter | data-access | P2 | P2 | |
| FE-EVNT-008 | Wire mappers + name resolver | data-access | P2 | P2 | |
| FE-EVNT-009 | AlarmFacade — polling + projection | data-access | P2 | P2 | YES (poll invariant) |
| FE-EVNT-010 | PushSubscriptionApiService + PushChannelFacade | data-access | P2 | P2 | YES (push lifecycle) |
| FE-EVNT-011 | AlarmPageComponent + feature-alarm routes | feature | P3 | P3 | |
| FE-EVNT-012 | EmergencyAlarmComponent + AlarmSubjectBanner + AcknowledgeButton | feature | P3 | P3 | |
| FE-EVNT-013 | AlarmEmptyStateComponent + AcknowledgedConfirmationComponent | feature | P3 | P3 | |
| FE-EVNT-014 | [SAFETY] MonitoringStatusBannerComponent | feature | P3 | P3 | YES |
| FE-EVNT-015 | RoutineNoticeListComponent + NoticeCard + Indicator | feature | P3 | P3 | |
| FE-EVNT-016 | EscalationAttemptsComponent + AttemptRowComponent | feature | P3 | P3 | |
| FE-EVNT-017 | [SAFETY] PushEnrollmentComponent + EscalationChannelStatusComponent | feature | P3 | P3 | YES |
| FE-EVNT-018 | [SAFETY] NotificationPermissionPromptComponent | feature | P3 | P3 | YES |
| FE-EVNT-019 | [SAFETY] Web Push enrollment lifecycle | data-access | P4 | P4 | YES |
| FE-EVNT-020 | [SAFETY] EvntShellIntegrationService — Page Visibility + connectivity | integration | P4 | P4 | YES |
| FE-EVNT-021 | [SAFETY] Channel-status indicator integration — contact-missing + SW bridge | integration | P4 | P4 | YES |
| FE-EVNT-022 | Error handling pipeline — ProblemDetail type slug → surface | data-access | P2 | P2 | |
| FE-EVNT-023 | Telemetry via @neuroassist/shared/observability | domain | P8 | P8 | |
| FE-EVNT-024 | E2E — emergency-alarm.feature + alarm-delivery-safety.feature (18 scenarios) | e2e | P9 | P9 | YES |
| FE-EVNT-025 | E2E — routine-notice.feature + evnt-navigation.feature (13 scenarios) | e2e | P9 | P9 | |
| FE-EVNT-026 | [SAFETY-1] E2E — push-escalation.feature (11 scenarios) | e2e | P9 | P9 | YES |
| FE-EVNT-027 | [SAFETY-GEST-1] DetectionLapse wire + mappers + DetectionLapseVM | data-access | P2 | P2 | YES |
| FE-EVNT-028 | [SAFETY-GEST-1] DetectionLapseApiService + LapseAlertFacade (poll + ack + auto-clear) | data-access | P2 | P2 | YES |
| FE-EVNT-029 | [SAFETY-GEST-1] feature-lapse — DetectionLapseAlert + Card + EmptyState | feature | P3 | P3 | YES |
| FE-EVNT-030 | [SAFETY-GEST-1] EvntShellIntegrationService — lapse poll lifecycle + emergency precedence | integration | P4 | P4 | YES |
| FE-EVNT-031 | [SAFETY-GEST-1] E2E — detection-lapse-alert.feature (14 scenarios) | e2e | P9 | P9 | YES |
| INT-FE-EVNT-001 | evnt-service HTTP adapter integration | integration | P2 | P2 | |
| INT-FE-EVNT-002 | Shell app SW ownership — ngsw / sw-push.js + push relay | integration | P4 | P4 | YES |
| INT-FE-EVNT-003 | ACS phone channel dependency tracking (INT-EVNT-ACS-001) | integration | P4 | P4 | YES |
| INT-FE-EVNT-004 | Shared layer integration — tokens wiring | integration | P2 | P2 | |
| INT-FE-EVNT-005 | HIST audit hand-off via @neuroassist/shared/observability | integration | P8 | P8 | |
| INT-FE-EVNT-006 | Mock PUSH_PORT + stubbed SW for dev/E2E | integration | P2 | P2 | |
| INT-FE-EVNT-007 | evnt-service detection-lapse HTTP adapter integration (list + confirm) | integration | P2 | P2 | YES |

---

## 2. By priority wave

### Wave P1 — Foundation (6 issues)

| ID | Title |
|---|---|
| FE-EVNT-001 | evnt.contract.ts |
| FE-EVNT-002 | EVNT_ROUTES + lazy-load |
| FE-EVNT-003 | EvntModule + provideEvnt() |
| FE-EVNT-004 | EVNT_MODULE_DESCRIPTOR + shell registration |
| FE-EVNT-005 | evnt.bootstrap.ts lifecycle |
| FE-EVNT-006 | Access guards |

### Wave P2 — Data access (11 issues)

| ID | Title |
|---|---|
| FE-EVNT-007 | EventApiService HTTP adapter |
| FE-EVNT-008 | Wire mappers + name resolver |
| FE-EVNT-009 | AlarmFacade |
| FE-EVNT-010 | PushSubscriptionApiService + PushChannelFacade |
| FE-EVNT-022 | Error handling pipeline |
| FE-EVNT-027 | [SAFETY-GEST-1] DetectionLapse wire + mappers + DetectionLapseVM |
| FE-EVNT-028 | [SAFETY-GEST-1] DetectionLapseApiService + LapseAlertFacade |
| INT-FE-EVNT-001 | HTTP adapter integration |
| INT-FE-EVNT-004 | Shared layer tokens wiring |
| INT-FE-EVNT-006 | Mock PUSH_PORT + stubbed SW |
| INT-FE-EVNT-007 | detection-lapse HTTP adapter integration |

### Wave P3 — Feature libs (9 issues)

| ID | Title |
|---|---|
| FE-EVNT-011 | AlarmPageComponent + feature-alarm routes |
| FE-EVNT-012 | EmergencyAlarmComponent + AlarmSubjectBanner + AcknowledgeButton |
| FE-EVNT-013 | AlarmEmptyStateComponent + AcknowledgedConfirmation |
| FE-EVNT-014 | [SAFETY] MonitoringStatusBannerComponent |
| FE-EVNT-015 | RoutineNoticeListComponent + NoticeCard + Indicator |
| FE-EVNT-016 | EscalationAttemptsComponent + AttemptRow |
| FE-EVNT-017 | [SAFETY] PushEnrollmentComponent + EscalationChannelStatus |
| FE-EVNT-018 | [SAFETY] NotificationPermissionPromptComponent |
| FE-EVNT-029 | [SAFETY-GEST-1] feature-lapse — DetectionLapseAlert + Card + EmptyState |

### Wave P4 — Hub integrations (6 issues)

| ID | Title |
|---|---|
| FE-EVNT-019 | [SAFETY] Web Push enrollment lifecycle |
| FE-EVNT-020 | [SAFETY] EvntShellIntegrationService |
| FE-EVNT-021 | [SAFETY] Channel-status indicator integration |
| FE-EVNT-030 | [SAFETY-GEST-1] EvntShellIntegrationService — lapse poll lifecycle + emergency precedence |
| INT-FE-EVNT-002 | Shell SW ownership + push relay |
| INT-FE-EVNT-003 | ACS phone channel dependency tracking |

### Wave P8 — Observability (2 issues)

| ID | Title |
|---|---|
| FE-EVNT-023 | Telemetry via @neuroassist/shared/observability |
| INT-FE-EVNT-005 | HIST audit hand-off |

### Wave P9 — e2e + Hardening (4 issues)

| ID | Title |
|---|---|
| FE-EVNT-024 | E2E — emergency-alarm + alarm-delivery-safety (18 scenarios) |
| FE-EVNT-025 | E2E — routine-notice + evnt-navigation (13 scenarios) |
| FE-EVNT-026 | [SAFETY-1] E2E — push-escalation (11 scenarios) |
| FE-EVNT-031 | [SAFETY-GEST-1] E2E — detection-lapse-alert (14 scenarios) |

---

## 3. By SPEC origin

| SPEC | Issues |
|---|---|
| SPEC-01-route-map | FE-EVNT-002, FE-EVNT-006 |
| SPEC-02-component-hierarchy | FE-EVNT-011..018, FE-EVNT-029 |
| SPEC-03-view-models | FE-EVNT-008, FE-EVNT-009, FE-EVNT-010, FE-EVNT-013, FE-EVNT-016, FE-EVNT-017, FE-EVNT-027, FE-EVNT-029, INT-FE-EVNT-003 |
| SPEC-04-data-access | FE-EVNT-007..010, FE-EVNT-019..021, FE-EVNT-022, FE-EVNT-027, FE-EVNT-028, INT-FE-EVNT-001, INT-FE-EVNT-006, INT-FE-EVNT-007 |
| SPEC-05-tool-contract | FE-EVNT-001, FE-EVNT-003, FE-EVNT-006, INT-FE-EVNT-004 |
| SPEC-06-shell-integration | FE-EVNT-004, FE-EVNT-005, FE-EVNT-020, FE-EVNT-021, FE-EVNT-030, INT-FE-EVNT-002 |
| SPEC-07-error-handling | FE-EVNT-022, FE-EVNT-028 |
| SPEC-08-e2e-scenarios | FE-EVNT-024, FE-EVNT-025, FE-EVNT-026, FE-EVNT-031 |
| contracts/backend-api-cross-link | FE-EVNT-008, INT-FE-EVNT-003, INT-FE-EVNT-005, FE-EVNT-026, INT-FE-EVNT-007 |
| generator-config.yml | FE-EVNT-002, FE-EVNT-003, INT-FE-EVNT-001, INT-FE-EVNT-007 |

---

## 4. By architectural layer

| Layer | Path | Issues |
|---|---|---|
| App entry / module | `apps/neuroassist-niv/src/app/evnt-module/` | FE-EVNT-001, FE-EVNT-002, FE-EVNT-003, FE-EVNT-004, FE-EVNT-005, INT-FE-EVNT-004 |
| Access guards | `libs/evnt/access/` | FE-EVNT-006 |
| Data access | `libs/evnt/data-access/` + `libs/evnt/api/` | FE-EVNT-007, FE-EVNT-008, FE-EVNT-009, FE-EVNT-010, FE-EVNT-019, FE-EVNT-022, FE-EVNT-027, FE-EVNT-028, INT-FE-EVNT-001, INT-FE-EVNT-003, INT-FE-EVNT-004, INT-FE-EVNT-006, INT-FE-EVNT-007 |
| Feature — alarm | `libs/evnt/feature-alarm/` | FE-EVNT-011, FE-EVNT-012, FE-EVNT-013, FE-EVNT-014 |
| Feature — notifications | `libs/evnt/feature-notifications/` | FE-EVNT-015 |
| Feature — push | `libs/evnt/feature-push/` | FE-EVNT-016, FE-EVNT-017, FE-EVNT-018 |
| Feature — lapse | `libs/evnt/feature-lapse/` | FE-EVNT-029 |
| Integration | `libs/evnt/integration/` | FE-EVNT-020, FE-EVNT-021, FE-EVNT-030 |
| Domain | `libs/evnt/domain/` | FE-EVNT-023, INT-FE-EVNT-005 |
| Shell | `apps/neuroassist-niv-web/` | INT-FE-EVNT-002 |
| e2e | `apps/evnt-e2e/` | FE-EVNT-024, FE-EVNT-025, FE-EVNT-026, FE-EVNT-031 |

---

## 5. SAFETY issues

14 issues carry a SAFETY designation:

| ID | Safety concern |
|---|---|
| FE-EVNT-009 | MonitoringVM state=none ONLY after positive read |
| FE-EVNT-014 | MonitoringStatusBannerComponent — always visible when degraded |
| FE-EVNT-017 | Honest channel status — no fabricated "covered" |
| FE-EVNT-018 | No first-paint permission prompt |
| FE-EVNT-019 | Web Push lifecycle — 410 resubscribe, no silent failure |
| FE-EVNT-020 | Page Visibility + connectivity — immediate poll on resume |
| FE-EVNT-021 | contact-missing WHILE INT-EVNT-ACS-001 OPEN |
| FE-EVNT-026 | SAFETY-1 e2e proof — push enrollment + escalation |
| FE-EVNT-027 | [GEST-1] Lapse VM never rendered as the emergency takeover (LAPSE-3) |
| FE-EVNT-028 | [GEST-1] Lapse poll never claims "no lapses" when unable to poll; auto-clear is read, not timer |
| FE-EVNT-029 | [GEST-1] Distinct "station not detecting" alert; held back under an emergency (LAPSE-6) |
| FE-EVNT-030 | [GEST-1] One monitoring stack; emergency outranks the lapse |
| FE-EVNT-031 | [GEST-1] e2e proof — distinct alert + precedence + never "no lapses" |
| INT-FE-EVNT-007 | [GEST-1] Lapse adapter default http; raise/resolve excluded; authorities exact |

---

## 6. Critical dependency path

```
FE-EVNT-001 (contract)
  └─ FE-EVNT-002 (routes) ─── FE-EVNT-006 (guards)
       └─ FE-EVNT-003 (module/provideEvnt) ─── INT-FE-EVNT-001 (http adapter)
            └─ FE-EVNT-007 (EventApiService)
                 └─ FE-EVNT-008 (mappers)
                      └─ FE-EVNT-009 (AlarmFacade) ◄── SAFETY polling invariant
                           ├─ FE-EVNT-011 (AlarmPageComponent)
                           │    ├─ FE-EVNT-012 (EmergencyAlarmComponent)
                           │    ├─ FE-EVNT-014 (MonitoringStatusBanner) ◄── SAFETY
                           │    └─ FE-EVNT-022 (ErrorHandler)
                           └─ FE-EVNT-010 (PushChannelFacade)
                                └─ FE-EVNT-019 (Push lifecycle) ◄── SAFETY
                                     ├─ FE-EVNT-017 (PushEnrollment) ◄── SAFETY
                                     │    └─ FE-EVNT-018 (PermissionPrompt) ◄── SAFETY
                                     └─ FE-EVNT-020 (ShellIntegration) ◄── SAFETY
                                          └─ FE-EVNT-021 (ChannelStatus) ◄── SAFETY
FE-EVNT-004 (descriptor) ─── FE-EVNT-005 (bootstrap)
INT-FE-EVNT-002 (shell SW) ─── FE-EVNT-021
INT-FE-EVNT-003 (ACS dep) ─── FE-EVNT-017
FE-EVNT-023 (telemetry) ─── INT-FE-EVNT-005 (HIST hand-off)
FE-EVNT-009..021 ─── FE-EVNT-024..026 (e2e)

SAFETY-GEST-1 (detection-lapse alert, ADR-006 / BE SPEC-12):
FE-EVNT-008 (mappers) ─── FE-EVNT-027 (lapse wire + VM)
  └─ FE-EVNT-028 (LapseAlertFacade — reuses FE-EVNT-009 monitoring model) ◄── SAFETY (never "no lapses")
       ├─ INT-FE-EVNT-007 (lapse adapter default http; raise/resolve excluded)
       ├─ FE-EVNT-029 (DetectionLapseAlert — reuses FE-EVNT-014 banner) ◄── SAFETY (distinct, not takeover)
       └─ FE-EVNT-030 (shell integration — reuses FE-EVNT-020 stack; emergency precedence) ◄── SAFETY
            └─ FE-EVNT-031 (detection-lapse-alert e2e) ◄── SAFETY
```

---

## 7. Size estimates

| Wave | Issues | Estimate |
|---|---|---|
| P1 Foundation | 6 | M (1–2 days) |
| P2 Data access | 11 | L (4–5 days) |
| P3 Feature libs | 9 | L (4.5–5.5 days) |
| P4 Hub integrations | 6 | M (2.5–3.5 days) |
| P8 Observability | 2 | S (0.5 days) |
| P9 e2e + Hardening | 4 | M (1.5–2.5 days) |
| **Total** | **38** | **~14–19 dev-days** |

S = < 0.5 day, M = 0.5–1 day, L = 1–2 days per issue.
