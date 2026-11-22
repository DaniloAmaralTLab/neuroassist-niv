# HIST — Event Catalog

> Service: `hist-service` · Module **HIST** · messaging **disabled** (no broker). "Events" are audit
> **facts** consumed synchronously via `POST /hist/audit`; HIST publishes nothing. Full contract:
> `../contracts/event-contracts.md`. Inventory source of truth: `../03-initial-domain-framing.md`.

## Consumed audit facts (36 across 5 producers)

| Fact (action) | Source | subjectType | Scope | Failure policy |
|---|---|---|---|---|
| TenantOnboarded | acs-service | tenant | tenant | hard-502 |
| CaregiverRegistered | acs-service | caregiver | tenant | hard-502 |
| CaregiverDeactivated | acs-service | caregiver | tenant | commit+durable-retry |
| CaregiverAuthenticated | acs-service | caregiver | tenant | commit+durable-retry |
| PatientLinked | acs-service | patient | tenant | hard-502 |
| PatientUnlinked | acs-service | patient | tenant | commit+durable-retry |
| PatientSessionProvisioned | acs-service | patient-session | tenant | hard-502 |
| PatientSessionRevoked | acs-service | patient-session | tenant | commit+durable-retry |
| PatientRegistered | pat-service | patient | tenant | hard-502 |
| PatientDeactivated | pat-service | patient | tenant | commit+durable-retry |
| PatientReactivated | pat-service | patient | tenant | hard-502 |
| CommandCalibrated | pat-service | command | tenant | hard-502 |
| CommandRetired | pat-service | command | tenant | hard-502 |
| GestureTypeRegistered | pat-service | gesture-type | tenant | hard-502 |
| DeviceEnrolled | edge-service | edge-device | tenant | hard-502 |
| DevicePaired | edge-service | edge-device | tenant | hard-502 |
| DeviceReactivated | edge-service | edge-device | tenant | hard-502 |
| DeviceDeactivated | edge-service | edge-device | tenant | commit+durable-retry |
| DeviceUnpaired | edge-service | edge-device | tenant | commit+durable-retry |
| DeviceRevoked | edge-service | edge-device | tenant | commit+durable-retry |
| DeviceWentOffline | edge-service | edge-device | tenant | hard-502 |
| DeviceCameOnline | edge-service | edge-device | tenant | hard-502 |
| CatalogRefreshed | edge-service | edge-device | tenant | hard-502 |
| DetectionLapseStarted | edge-service | edge-device | tenant | commit+durable-retry |
| DetectionLapseResolved | edge-service | edge-device | tenant | commit+durable-retry |
| EventGenerated | evnt-service | event | tenant | commit+durable-retry |
| AlarmConfirmed | evnt-service | event | tenant | commit+durable-retry |
| FeedbackRecorded | evnt-service | event | tenant | hard-502 |
| EscalationAttempted | evnt-service | event | tenant | commit+durable-retry |
| DetectionLapseRaised | evnt-service | detection-lapse | tenant | commit+durable-retry |
| DetectionLapseResolved | evnt-service | detection-lapse | tenant | commit+durable-retry |
| DetectionLapseAcknowledged | evnt-service | detection-lapse | tenant | commit+durable-retry |
| EngineVersionRegistered | gest-service | engine-version | global | hard-502 |
| EngineVersionDeprecated | gest-service | engine-version | global | hard-502 |
| EngineCapabilityDeclared | gest-service | engine-capability | global | hard-502 |
| EngineCapabilityRetired | gest-service | engine-capability | global | hard-502 |

> `DetectionLapseResolved` appears twice (EDGE `edge-device` / EVNT `detection-lapse`) — disambiguated
> by (source, subjectType), never by action alone (`event-contracts.md` §5).

## Internal domain milestone

| Milestone | Nature | Published? |
|---|---|---|
| `AuditRecordAppended` | raised in-process when a record is durably appended | **No** (no broker; internal only) |

## Published events

**None.**
