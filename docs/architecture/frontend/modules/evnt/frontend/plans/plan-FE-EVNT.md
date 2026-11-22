# EVNT Frontend — Execution Plan

**Module:** EVNT (Events and Alarms)
**Client:** neuroassist-niv
**Architect phase:** fe-architect-backlog
**Generated:** 2026-11-20
**Amended:** 2026-11-20 — SAFETY-GEST-1 detection-lapse alert (ADR-006 / BE SPEC-12): FE-EVNT-027..031 + INT-FE-EVNT-007
**Trace:** tr_1d11dccf3957

---

## Project summary

The EVNT module delivers the emergency alarm monitoring and notification UI for neuroassist-niv caregivers. The `/alarm` route renders a full-screen takeover when an emergency is active, with a continuous polling facade, a mandatory monitoring-limitation banner, and a three-tier escalation surface (Web Push → SMS → Voice). It is the safety-critical core of the product: alarm delivery failures must be visibly communicated, never silent.

The scope spans: `libs/evnt/` (five feature libs — alarm, notifications, push, **lapse** — + data-access + access + integration + domain), app entry in `apps/neuroassist-niv/src/app/evnt-module/`, shell wiring in `apps/neuroassist-niv-web/`, and e2e in `apps/evnt-e2e/`.

**SAFETY-GEST-1 amendment (ADR-006 / BE SPEC-12, 2026-11-20).** EVNT also surfaces a DISTINCT "station not detecting" alert for a detection lapse raised by EDGE: a separate list poll (reusing the AlarmFacade monitoring model), caregiver acknowledge (`evnt.detection-lapse.confirm`), and auto-clear on server resolve. It is **never** the emergency takeover and an unconfirmed emergency always outranks it (LAPSE-6). The service-client raise/resolve path is EDGE's — out of FE scope.

---

## Wave map (P1 → P9)

### P1 — Foundation (unlock: routing + shell registration)

**Goal:** the app can navigate to `/alarm` and the shell recognises the EVNT module.

| Issue | Title | Estimate |
|---|---|---|
| FE-EVNT-001 | evnt.contract.ts — EventPort + InjectionToken | S |
| FE-EVNT-002 | EVNT_ROUTES + lazy-load | S |
| FE-EVNT-003 | EvntModule + provideEvnt() | S |
| FE-EVNT-004 | EVNT_MODULE_DESCRIPTOR + shell registration | S |
| FE-EVNT-005 | evnt.bootstrap.ts lifecycle | S |
| FE-EVNT-006 | Access guards — canReadEvent + canConfirmEvent | S |

**Definition of Done (P1):** `npx nx build neuroassist-niv-web` PASS; navigation to `/alarm` lazy-loads without errors; shell shows EVNT in module registry.

---

### P2 — Data access (unlock: live poll, real API surface)

**Goal:** `AlarmFacade` polls `evnt-service`, `PushChannelFacade` wires push subscription API, error handler maps degraded states.

| Issue | Title | Estimate |
|---|---|---|
| FE-EVNT-007 | EventApiService HTTP adapter | M |
| FE-EVNT-008 | Wire mappers + name resolver | M |
| FE-EVNT-009 | AlarmFacade — polling + projection | M |
| FE-EVNT-010 | PushSubscriptionApiService + PushChannelFacade | M |
| FE-EVNT-022 | Error handling pipeline | S |
| FE-EVNT-027 | [SAFETY-GEST-1] DetectionLapse wire + mappers + DetectionLapseVM | S |
| FE-EVNT-028 | [SAFETY-GEST-1] DetectionLapseApiService + LapseAlertFacade (poll + ack + auto-clear) | M |
| INT-FE-EVNT-001 | evnt-service HTTP adapter integration | S |
| INT-FE-EVNT-004 | Shared layer tokens wiring | S |
| INT-FE-EVNT-006 | Mock PUSH_PORT + stubbed SW for dev/E2E | S |
| INT-FE-EVNT-007 | detection-lapse HTTP adapter integration (list + confirm) | S |

**Definition of Done (P2):** `npx nx test evnt` PASS; `provideEvnt()` defaults to `http`; `AlarmFacade.alarmVm()` reflects live poll; `MonitoringVM.polling` transitions correctly.

**Safety gate:** `AlarmFacade.monitoringVm().polling` NEVER equals `'none'` after a failed read; `LapseAlertFacade` NEVER reports "no detection lapses" after a failed/paused read (SPEC-04 §6.2).

---

### P3 — Feature libs (unlock: MVP UI shippable in dev)

**Goal:** the full alarm takeover, monitoring banner, routine notices, escalation surface, and push channel UI are rendered and functional.

| Issue | Title | Estimate |
|---|---|---|
| FE-EVNT-011 | AlarmPageComponent + feature-alarm routes | M |
| FE-EVNT-012 | EmergencyAlarmComponent + AlarmSubjectBanner + AcknowledgeButton | M |
| FE-EVNT-013 | AlarmEmptyStateComponent + AcknowledgedConfirmation | S |
| FE-EVNT-014 | [SAFETY] MonitoringStatusBannerComponent | M |
| FE-EVNT-015 | RoutineNoticeListComponent + NoticeCard + Indicator | M |
| FE-EVNT-016 | EscalationAttemptsComponent + AttemptRow | S |
| FE-EVNT-017 | [SAFETY] PushEnrollmentComponent + EscalationChannelStatus | M |
| FE-EVNT-018 | [SAFETY] NotificationPermissionPromptComponent | S |
| FE-EVNT-029 | [SAFETY-GEST-1] feature-lapse — DetectionLapseAlert + Card + EmptyState | M |

**Definition of Done (P3):** `npx nx test evnt` PASS; alarm takeover renders with mock poll; `MonitoringStatusBanner` visible during degraded states; `AcknowledgeButton` hidden when `!canConfirm`; push channel shows `contact-missing` for SMS/Voice.

**Safety gate (P3 = MVP shippable in dev):** banner is ALWAYS present and non-dismissible while degraded; empty state ONLY after positive null read.

---

### P4 — Hub integrations (unlock: live push enrollment, page-visibility safety, shell wiring)

**Goal:** full shell integration: Page Visibility and connectivity handling, Web Push subscription lifecycle, SW relay, ACS contact-missing tracking.

| Issue | Title | Estimate |
|---|---|---|
| FE-EVNT-019 | [SAFETY] Web Push enrollment lifecycle | M |
| FE-EVNT-020 | [SAFETY] EvntShellIntegrationService | M |
| FE-EVNT-021 | [SAFETY] Channel-status indicator integration | M |
| FE-EVNT-030 | [SAFETY-GEST-1] EvntShellIntegrationService — lapse poll lifecycle + emergency precedence | M |
| INT-FE-EVNT-002 | Shell SW ownership + push relay | M |
| INT-FE-EVNT-003 | ACS phone channel dependency tracking | S |

**Definition of Done (P4):** `npx nx test evnt` PASS; tab-hidden pauses poll + shows banner; connectivity offline pauses + shows banner; tab-visible triggers immediate poll; `notificationclick` routes to `/alarm`; `410 Gone` on DELETE produces no toast.

**Safety gate:** SM/Voice channels show `contact-missing` WHILE INT-EVNT-ACS-001 is OPEN; the detection-lapse poll reuses the SAME visibility/connectivity stack (no second stack) and an unconfirmed emergency outranks the lapse (LAPSE-6).

---

### P8 — Observability (non-blocking on P4 completion)

| Issue | Title | Estimate |
|---|---|---|
| FE-EVNT-023 | Telemetry via @neuroassist/shared/observability | S |
| INT-FE-EVNT-005 | HIST audit hand-off | S |

**Definition of Done (P8):** `npx nx lint evnt` enforces Nx boundary `scope:evnt` CANNOT import `scope:hist`; `ObservabilityService.track()` called on acknowledge.

---

### P9 — e2e + Hardening (unlock: release readiness)

| Issue | Title | Estimate |
|---|---|---|
| FE-EVNT-024 | E2E — emergency-alarm + alarm-delivery-safety (18 scenarios) | M |
| FE-EVNT-025 | E2E — routine-notice + evnt-navigation (13 scenarios) | M |
| FE-EVNT-026 | [SAFETY-1] E2E — push-escalation (11 scenarios) | M |
| FE-EVNT-031 | [SAFETY-GEST-1] E2E — detection-lapse-alert (14 scenarios) | M |

**Definition of Done (P9):** `npx nx e2e evnt-e2e` PASS for all 56 scenarios; no `.skip` on SAFETY scenarios.

---

## Critical path

```
P1 (001..006) → P2 (007..010, 022, 027, 028, INT-001, INT-004, INT-006, INT-007)
             → P3 (011..018, 029)
             → P4 (019..021, 030, INT-002, INT-003)
             → P9 (024..026, 031)

P8 (023, INT-005) can run in parallel with P4.

SAFETY-GEST-1 sub-path: 027 (lapse wire/VM) → 028 (LapseAlertFacade, reuses 009) →
  { INT-007 (adapter), 029 (feature-lapse, reuses 014), 030 (shell integ., reuses 020) } → 031 (e2e).
```

Minimum viable product gate: **P3 complete** (alarm takeover + monitoring banner in dev with mock poll).

---

## Risks — top 3

### R1 — INT-EVNT-ACS-001 is OPEN (SAFETY)

**Risk:** ACS does not expose caregiver phone. SMS/Voice Tiers 1/2 remain `contact-missing` until ACS ships.
**Mitigation:** FE renders `contact-missing` by default; INT-FE-EVNT-003 tracks the dependency; ACS capability flip requires no FE release.

### R2 — Web Push permission UX (SAFETY)

**Risk:** a first-paint permission prompt will get hard-denied by caregivers → Tier 0 silently lost.
**Mitigation:** FE-EVNT-018 (carry-forward `fe-push:no-permission-prompt-on-first-paint`) enforces gesture-only prompt; e2e FE-EVNT-026 scenario 2 proves denied → channel blocked (not "off").

### R3 — provideEvnt() mock-adapter-default (carry-forward ev=7)

**Risk:** scaffold defaults to mock adapter → all alarm reads silently return stubs in production.
**Mitigation:** INT-FE-EVNT-001 integration test asserts `EVENT_PORT instanceof EventHttpAdapter` without overrides; monitored by learning pitfall tracker.

### R4 — detection-lapse alert must never mask or imitate an emergency (SAFETY-GEST-1)

**Risk:** a lapse rendered like the emergency takeover, or ranked above an unconfirmed emergency, would steal attention from a real life-safety event; a degraded lapse poll silently claiming "no lapses" would hide a silent detection stop.
**Mitigation:** FE-EVNT-027/029 keep the lapse a DISTINCT alert (never the takeover — LAPSE-3); FE-EVNT-028/030 enforce emergency precedence (`suppressedByEmergency` — LAPSE-6) and "never claim no lapses when unable to poll"; FE-EVNT-031 e2e proves both. INT-FE-EVNT-007 proves the adapter never exposes the service-client raise/resolve path.

---

## Definition of Done — module release

- [ ] `npx nx test evnt` PASS (all units)
- [ ] `npx nx lint evnt` PASS (Nx boundaries enforced)
- [ ] `npx nx build evnt` PASS (no type errors)
- [ ] `npx nx e2e evnt-e2e` PASS (all 56 scenarios, 0 skipped)
- [ ] `npx nx build neuroassist-niv-web` PASS (shell integration)
- [ ] SAFETY review signed off: banner visible in degraded states; state=none only after positive read; no false "covered" for unarmed channels
- [ ] INT-EVNT-ACS-001 tracked and `contact-missing` rendered correctly
- [ ] No `.skip` on any SAFETY-tagged e2e scenario

---

## Approval criteria by milestone

| Milestone | Approval signal |
|---|---|
| P1 done | App navigates to /alarm; lazy-load OK |
| P2 done | Facade poll works with live mock; adapter=http confirmed |
| P3 done | MVP shippable in dev (alarm + banner + push channel status) |
| P4 done | Full shell integration; push enrollment end-to-end |
| P9 done | 56 e2e scenarios pass; SAFETY review complete; release-ready |
