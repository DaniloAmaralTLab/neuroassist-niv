# Issues Map — EVNT (Events and Alarms)

> Service: `evnt-service` · Project: NeuroAssist NIV
> Generated: 2026-11-20 · 27 functional + 5 integration issues
> SAFETY-1 (ADR-005 / SPEC-11): EVNT-016..021, INT-EVNT-ACS-001, INT-EVNT-005
> **SAFETY-GEST-1 (ADR-006 / SPEC-12) — incremental 2026-11-20:** EVNT-028..036, INT-EVNT-ACS-002
> **HIST ADR-005 failure policy — incremental 2026-11-20:** EVNT-037, INT-EVNT-ACS-003
> **HIST caregiver-timeline audit fields — incremental 2026-11-20:** EVNT-038 (G-HIST-1 / G-HIST-3)

---

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (api surface) | EVNT-003, EVNT-005, EVNT-006, EVNT-022, EVNT-023 |
| SPEC-02 (event generation) | EVNT-002, EVNT-004, EVNT-038 |
| SPEC-03 (alarm delivery safety) | EVNT-022, EVNT-024 |
| SPEC-04 (data model / migrations) | EVNT-007, EVNT-008, EVNT-009, EVNT-010 |
| SPEC-05 (idempotency) | EVNT-004, EVNT-005, EVNT-006, EVNT-008, EVNT-010, EVNT-023 |
| SPEC-06 (security) | EVNT-011, EVNT-013, EVNT-015 |
| SPEC-07 (observability) | EVNT-024 |
| SPEC-08 (BDD) | EVNT-025, EVNT-026, EVNT-027 |
| SPEC-09 (messaging disabled) | — (messaging disabled, no issues) |
| SPEC-10 (integrations) | EVNT-011, EVNT-012, EVNT-013, EVNT-014, EVNT-037, INT-EVNT-ACS-003 |
| SPEC-11 (SAFETY-1 escalation) | EVNT-016, EVNT-017, EVNT-018, EVNT-019, EVNT-020, EVNT-021, EVNT-027, EVNT-038 |
| SPEC-12 (SAFETY-GEST-1 detection-lapse alerting) | EVNT-028, EVNT-029, EVNT-030, EVNT-031, EVNT-032, EVNT-033, EVNT-034, EVNT-035, EVNT-036, INT-EVNT-ACS-002 |

---

## By Priority

| Priority | Issues | Theme |
|---|---|---|
| P1 | EVNT-001, EVNT-002 | Scaffold + domain aggregate |
| P2 | EVNT-003, EVNT-004, EVNT-005, EVNT-006 | Golden path ingest + confirm + feedback |
| P3 | EVNT-007, EVNT-008, EVNT-009, EVNT-010, INT-EVNT-004 | Persistence + migrations |
| P4 | EVNT-011, EVNT-012, EVNT-013, EVNT-014, INT-EVNT-ACS-001, INT-EVNT-002, INT-EVNT-003 | External integrations + cross-module |
| P5 | EVNT-015 | Security + multi-tenancy |
| P6 | EVNT-016, EVNT-017, EVNT-018, EVNT-019, EVNT-020, EVNT-021, INT-EVNT-005 | SAFETY-1 escalation |
| P7 | EVNT-022, EVNT-023 | Read surface + push subscription CRUD |
| P8 | EVNT-024 | Observability + health |
| P9 | EVNT-025, EVNT-026, EVNT-027, EVNT-037, EVNT-038 | BDD end-to-end + HIST ADR-005 durable retry + HIST timeline audit fields |
| — SAFETY-GEST-1 additions — | | |
| P2 (GEST-1) | EVNT-030, EVNT-031, EVNT-032, EVNT-033, EVNT-034 | Detection-lapse raise/resolve/ack/list + escalation reuse |
| P3 (GEST-1) | EVNT-028, EVNT-029 | Flyway V0044–V0046 |
| P4 (GEST-1) | INT-EVNT-ACS-002 | ACS service-client JWT for edge-service (EVNT namespaced authorities) |
| P7 (GEST-1) | EVNT-035 | HIST audit: DetectionLapseRaised/Resolved/Acknowledged + EscalationAttempted subjectType |
| P8 (GEST-1) | EVNT-036 | BDD detection-lapse-alerting.feature + DetectionLapseAlertingSteps.java |

---

## By Module Layer

### api (controllers, DTOs)
- EVNT-003 GestureReportController (ingest)
- EVNT-005 EventConfirmationController (confirm)
- EVNT-006 EventFeedbackController (feedback)
- EVNT-022 PatientEventController + EscalationAttemptController (read)
- EVNT-023 PushSubscriptionController (create/delete)
- EVNT-030 DetectionLapseController (raise — service-client path)
- EVNT-033 PatientDetectionLapseController (list — caregiver path)

### application (use cases, sweep)
- EVNT-004 IngestGestureReportUseCase
- EVNT-005 ConfirmAlarmUseCase
- EVNT-006 RecordFeedbackUseCase
- EVNT-017 EscalationSweep (SAFETY-1)
- EVNT-023 CreatePushSubscriptionUseCase + DeletePushSubscriptionUseCase
- EVNT-030 DetectionLapseService.raise (SAFETY-GEST-1)
- EVNT-031 DetectionLapseService.resolve (SAFETY-GEST-1)
- EVNT-032 DetectionLapseService.acknowledge (SAFETY-GEST-1)
- EVNT-033 PatientDetectionLapseService.list (SAFETY-GEST-1)
- EVNT-034 EscalationSweep/EscalationPolicy — detection_lapse extension (SAFETY-GEST-1)

### domain (aggregates, ports, policy)
- EVNT-002 Event aggregate + Urgency + Feedback
- EVNT-008 EventRepository port
- EVNT-009 PushSubscriptionRepository port
- EVNT-010 EscalationAttemptRepository port
- EVNT-011 EdgeTokenValidator port
- EVNT-012 PatCommandPort
- EVNT-013 CaregiverLinksPort
- EVNT-014 AuditPort
- EVNT-016 EscalationPolicy (SAFETY-1)
- EVNT-017 EmergencyNotificationPort
- EVNT-018 WebPushAdapter (implements EmergencyNotificationPort)
- EVNT-030 DetectionLapse aggregate + DetectionLapseRepositoryPort (SAFETY-GEST-1)

### infrastructure (persistence, feign, security, notification)
- EVNT-007 Flyway V0040–V0043
- EVNT-008 EventJpaRepositoryAdapter
- EVNT-009 PushSubscriptionJpaRepositoryAdapter
- EVNT-010 EscalationAttemptJpaRepositoryAdapter
- EVNT-011 EdgeTokenValidatorAdapter + EdgeJwksClient
- EVNT-012 PatCommandFeignClient
- EVNT-013 AcsCaregiverFeignClient + AcsJwksClient
- EVNT-014 HistAuditFeignClient
- EVNT-015 EvntSecurityConfig + TenantContextHolder + RoleAuthorityPolicy
- EVNT-018 WebPushAdapter + VapidKeyConfig
- EVNT-019 AwsSmsAdapter + AwsMessagingConfig
- EVNT-020 AwsVoiceAdapter
- EVNT-021 EscalationProperties
- EVNT-024 EvntHealthIndicator + MdcFilter
- EVNT-028 Flyway V0044 (detection_lapse table — SAFETY-GEST-1)
- EVNT-029 Flyway V0045–V0046 (escalation_attempt generalisation — SAFETY-GEST-1)
- EVNT-030 DetectionLapseJpaRepositoryAdapter (SAFETY-GEST-1)
- EVNT-035 HistAuditClient — detection-lapse facts (SAFETY-GEST-1)
- EVNT-037 Durable audit retry (outbox) for the safety-runtime facts (HIST ADR-005)
- EVNT-038 HIST timeline audit fields — commandLabel on EventGenerated + masked maskedTarget on EscalationAttempted (G-HIST-1 / G-HIST-3)

---

## Integration Issues

| Issue | Target | Concern |
|---|---|---|
| INT-EVNT-ACS-001 | ACS | Expose caregiver phoneE164/smsCapable/voiceCapable/notifyConsent/preferredLocale for SAFETY-1 Tiers 1–2 |
| INT-EVNT-002 | ACS | Service-client minting path for `evnt-service` principal (PAT/HIST/introspect calls) |
| INT-EVNT-003 | HIST | Failure policy — hard-502 vs enqueue for all EVNT audit writes |
| INT-EVNT-004 | MIG | Flyway range V0040–V0044 registration and tenant provisioning |
| INT-EVNT-005 | AWS / Ops | End User Messaging prerequisites (Region, +55, origination, account plan) |
| INT-EVNT-ACS-002 | ACS | Mint edge-service service-client JWT with `evnt.detection-lapse.create` + `evnt.detection-lapse.resolve` authorities (SAFETY-GEST-1 / ADR-006) |
| INT-EVNT-ACS-003 | ACS / HIST | HIST audit: base URL + /hist path + `hist.audit.record` token (D-640 / ADR-005) |

---

## SAFETY-GEST-1 Coverage (ADR-006 / SPEC-12) — incremental 2026-11-20

| SAFETY-GEST-1 Requirement | Issue |
|---|---|
| detection_lapse table (V0044) | EVNT-028 |
| escalation_attempt generalisation (V0045–V0046) | EVNT-029 |
| Raise endpoint + idempotency (LAPSE-1/LAPSE-2) | EVNT-030 |
| Resolve endpoint + 404 guard (LAPSE-5) | EVNT-031 |
| Acknowledge endpoint (LAPSE-5) | EVNT-032 |
| Caregiver list (LAPSE-3) | EVNT-033 |
| Escalation sweep reuse + emergency precedence (LAPSE-4/LAPSE-5/LAPSE-6) | EVNT-034 |
| HIST audit facts: DetectionLapseRaised/Resolved/Acknowledged + EscalationAttempted subjectType (LAPSE-7/ESC-7) | EVNT-035 |
| BDD feature + DetectionLapseAlertingSteps.java | EVNT-036 |
| ACS service-client JWT for edge-service (cross-module) | INT-EVNT-ACS-002 |

---

## SAFETY-1 Coverage (ADR-005 / SPEC-11)

| SAFETY-1 Requirement | Issue |
|---|---|
| Escalation sweep / scheduler | EVNT-017 |
| Tier policy (ESC-1..7) | EVNT-016 |
| EmergencyNotificationPort (provider-agnostic) | EVNT-017 (port definition), EVNT-018/019/020 (adapters) |
| Web Push (VAPID) adapter | EVNT-018 |
| AWS SMS adapter (disabled by default) | EVNT-019 |
| AWS Voice adapter (disabled by default) | EVNT-020 |
| push_subscription persistence + 410 handling | EVNT-009 |
| escalation_attempt idempotency (ESC-4) | EVNT-010 |
| EscalationAttempted HIST audit (ESC-7) | EVNT-014, EVNT-017 |
| Configuration / env vars | EVNT-021 |
| AWS prerequisites (operational) | INT-EVNT-005 |
| ACS caregiver phone (cross-module) | INT-EVNT-ACS-001 |
