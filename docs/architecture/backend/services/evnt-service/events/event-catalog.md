# EVNT — Event Catalog

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> **Messaging disabled.** "Events" here are audited domain actions over sync REST → HIST
> (`event-contracts.md`), not broker messages.

| Name | Type | Payload (link) | Known consumers |
|---|---|---|---|
| `EventGenerated` **(anchor)** | published (audited → HIST) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit sink; payload carries `commandLabel` snapshot for the caregiver timeline — G-HIST-1); DASH observes the resulting Event via the polled read surface; CONV (future, out-of-band escalation) |
| `AlarmConfirmed` | published (audited → HIST) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit sink); DASH clears the alarm on the next poll |
| `FeedbackRecorded` | published (audited → HIST) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit sink) |
| `EscalationAttempted` | published (audited → HIST) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit sink; payload carries `maskedTarget` — masked inside EVNT, raw endpoint never audited — G-HIST-3) — one row per out-of-band escalation attempt (push/SMS/voice; ADR-005 / SPEC-11), subject = emergency `event` **or** `detection-lapse` (ADR-006 / SPEC-12); DASH may read the trail via `GET .../escalation-attempts` |
| `DetectionLapseRaised` | published (audited → HIST) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit sink) — EDGE raised a detection-lapse episode (ADR-006 / SPEC-12); actorType `service-client` (`edge-service`) |
| `DetectionLapseResolved` | published (audited → HIST) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit sink) — station back to `RUNNING`; stops the lapse escalation |
| `DetectionLapseAcknowledged` | published (audited → HIST) | [event-contracts §1.2](../contracts/event-contracts.md) | HIST (audit sink) — a linked caregiver acknowledged the "station not detecting" alert; stops the lapse escalation |
| — | consumed | — | **none** — EVNT consumes no broker event; the edge station calls `POST /evnt/gesture-reports` and the EDGE backend calls `POST /evnt/detection-lapses` synchronously; the escalation clock is a scheduled in-process sweep, not a consumed message |

If a broker is later introduced (ADR-006 shared future signal), these action names become message
names **without renaming** (doc 03).
