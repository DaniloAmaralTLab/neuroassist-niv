# PAT — Event Catalog

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> **Messaging disabled.** Entries below are **audited domain actions** delivered to HIST
> over synchronous REST (not broker messages). Full contract: `../contracts/event-contracts.md`.

| Name | Type | Payload (link) | Known consumers |
|---|---|---|---|
| `PatientRegistered` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit trail) |
| `PatientDeactivated` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `PatientReactivated` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `CommandCalibrated` **(anchor)** | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `CommandRetired` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |
| `GestureTypeRegistered` | audited (published) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST |

**Consumed:** none.

> When a broker is introduced (explicit future decision — doc 04), these action names become
> the published event names and the payloads in `event-contracts.md` become the message
> schemas without renaming. A broker would also let a published `CommandCalibrated` invalidate
> edge catalog caches (ADR-004 consequence), without changing ownership.
