<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Module **DASH** · NeuroAssist NIV · **No backend service / no owned domain** (ADR-001).
> DASH has no aggregate, persists nothing and emits no domain event. This document records that
> emptiness deliberately, and maps the vocabulary DASH **borrows** from the modules it composes, so
> the Specs phase does not invent a domain for it.

## Ubiquitous Language

DASH introduces **one** presentation concept and reuses the rest from the owning modules:

| Term | Meaning in DASH | Owner of the underlying fact |
|---|---|---|
| **Home overview** | The composed, read-only "is the patient okay?" view assembled from several modules. A view, not an entity. | DASH (presentation only) |
| **Okay status** | A derived, fail-safe headline: *okay* only when every source was read and none signals a problem; otherwise *needs attention* or *unknown*. | Derived in `dash-ui`; inputs owned by EVNT/EDGE |
| Patient | The person being monitored; identity/label shown on home | PAT |
| Edge device status | online/offline + `detectionState` (RUNNING/PAUSED/…) + `lastDetectingAt` | EDGE |
| Active alarm | The single unconfirmed emergency event | EVNT |
| Detection lapse | "Station connected but not detecting" episode | EVNT (raised by EDGE) |
| Event / day summary | Structured occurrences + per-period counts | EVNT (live) / HIST (timeline+summary) |

## Aggregates and Entities

**None.** DASH owns no aggregate and no entity. The entities on screen
(`Patient`, `EdgeDevice`, `Event`, detection-lapse, history entry) are owned by PAT, EDGE and EVNT/HIST
and are referenced read-only by id. There is nothing for the Data-Model spec to model for DASH.

## Domain Events

**None emitted.** DASH writes nothing, so it produces no domain event and no HIST audit record. The
events a caregiver sees on the home screen — `EventGenerated`, `AlarmConfirmed`, `FeedbackRecorded`,
`EscalationAttempted`, `DetectionLapseRaised`/`Resolved`/`Acknowledged`, `DeviceWentOffline`/
`DeviceCameOnline` — are all owned and audited by EVNT or EDGE. DASH only displays them.

> `stack.messaging.enabled = false` for the project: even the owning modules exchange these facts
> over synchronous REST / HIST audit, not a broker. DASH is purely a reader on that same synchronous
> surface.

## State Transitions

DASH has no persisted state machine. The only state is **client-side view state** (loading →
loaded | partial | error per source), described in the FE vision. For completeness, the *displayed*
"okay status" is a pure function of the latest reads, not a stored lifecycle:

```
all sources read AND no active alarm AND no open lapse AND device detecting  -> OKAY
any source errored/stale/unknown                                             -> UNKNOWN (cannot confirm)
active alarm present (EVNT) OR open detection-lapse (EVNT) OR device offline  -> NEEDS ATTENTION
```

This is recomputed on every render/poll; it is never written back anywhere.

## Invariants

- **INV-DASH-1 (no ownership).** DASH SHALL NOT persist, cache authoritatively, or re-derive any fact
  owned by PAT/EDGE/EVNT/HIST; it holds only transient view state.
- **INV-DASH-2 (fail-safe headline).** The "okay status" SHALL evaluate to OKAY only when *every*
  contributing source was successfully read and fresh; any missing, errored or stale source SHALL
  force UNKNOWN, never OKAY (safety — doc 02 §5, ADR-002).
- **INV-DASH-3 (caregiver identity).** Every read SHALL carry the caregiver's ACS JWT; DASH SHALL NOT
  act as a service-client nor hold any `*.read` authority of its own.
- **INV-DASH-4 (no new surface).** There SHALL be no `/dash/**` endpoint, no `dash-service` in REG,
  and no DASH schema in MIG (ADR-001).
