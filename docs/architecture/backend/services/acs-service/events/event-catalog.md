# ACS — Event Catalog

> Service: `acs-service` · Module **ACS — Caregivers and Access** · Project: NeuroAssist NIV
> **Messaging disabled.** Entries below are **audited domain actions** delivered to HIST
> over synchronous REST (not broker messages). Full contract: `../contracts/event-contracts.md`.

| Name | Type | Payload (link) | Known consumers |
|---|---|---|---|
| `TenantOnboarded` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit trail) |
| `CaregiverRegistered` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `CaregiverDeactivated` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `CaregiverAuthenticated` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `PatientLinked` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `PatientUnlinked` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `PatientSessionProvisioned` **(anchor)** | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `PatientSessionRevoked` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |

**Consumed:** none.

> When a broker is introduced (explicit future decision — doc 04), these action names
> become the published event names and the payloads in `event-contracts.md` become the
> message schemas without renaming.
