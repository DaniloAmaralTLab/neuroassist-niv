<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV

## Ubiquitous Language

- **Audit record** — one immutable, appended entry recording a single state-changing
  domain action by a producer. Never updated, never deleted on the ingest path.
- **Audit envelope** — the wire shape producers send to `POST /audit`.
- **Producer / audit writer** — a service that records actions to HIST (ACS, PAT, EDGE,
  EVNT, GEST).
- **Fact / action / eventType** — the discriminator naming the recorded action. Producers
  disagree on the field name (see reconciliation below).
- **Actor** — who performed the action: `caregiver`, `edge-device`, `system`,
  `service-client`.
- **Subject** — what the action was about (`subjectType` + `subjectId`).
- **Correlation id** — the `X-Correlation-Id` carried from the originating request; the
  cross-service spine for incident reconstruction.
- **History** — the caregiver-facing, patient-scoped projection of audit records read by
  DASH.

## Aggregates and Entities

- **AuditRecord** (aggregate root, immutable) — `id`, `source` (producer), `action`
  (canonical discriminator), `actorType`, `actorId`, `tenantId` (nullable for global
  facts), `subjectType`, `subjectId`, `occurredAt`, `receivedAt`, `correlationId`,
  `payloadVersion`, `payload` (JSONB), `idempotencyKey`, optional `flagged` (unknown
  action / higher payloadVersion). Draft — refined in `/be-architect-specs`.
- **HistoryEntry** (read model / projection) — the caregiver-facing view over `AuditRecord`
  filtered to patient-relevant facts and rendered in human language.

### Producer / fact inventory (authoritative = producer contracts)

**36 facts across 5 producers.** The autopilot handoff (`handoff.M0`) listed an
abbreviated subset; the authoritative inventory below is taken from each producer's
`event-contracts.md` and **supersedes** the handoff list.

| Producer | Count | Facts |
|---|---|---|
| **ACS** | 8 | `TenantOnboarded`, `CaregiverRegistered`, `CaregiverDeactivated`, `CaregiverAuthenticated`, `PatientLinked`, `PatientUnlinked`, `PatientSessionProvisioned`*(anchor)*, `PatientSessionRevoked` |
| **PAT** | 6 | `PatientRegistered`, `PatientDeactivated`, `PatientReactivated`, `CommandCalibrated`*(anchor)*, `CommandRetired`, `GestureTypeRegistered` |
| **EDGE** | 11 | `DeviceEnrolled`, `DevicePaired`*(anchor)*, `DeviceReactivated`, `DeviceDeactivated`, `DeviceUnpaired`, `DeviceRevoked`, `DeviceWentOffline`, `DeviceCameOnline`, `CatalogRefreshed`, `DetectionLapseStarted`, `DetectionLapseResolved` |
| **EVNT** | 7 | `EventGenerated`*(anchor)*, `AlarmConfirmed`, `FeedbackRecorded`, `EscalationAttempted`, `DetectionLapseRaised`, `DetectionLapseResolved`, `DetectionLapseAcknowledged` |
| **GEST** | 4 | `EngineVersionRegistered`, `EngineVersionDeprecated`, `EngineCapabilityDeclared`*(anchor)*, `EngineCapabilityRetired` |

> **Naming collision:** `DetectionLapseResolved` is emitted by **both** EDGE (subjectType
> `edge-device`, the device-side episode) and EVNT (subjectType `detection-lapse`, the
> lapse record). HIST must disambiguate by `source` + `subjectType`, never by `action`
> alone — a strong reason `source` is mandatory in the stored record (see ADR-004 note and
> reconciliation #2 below).

### Envelope reconciliation findings

ACS, PAT, EDGE and EVNT share one envelope; **GEST diverges**. HIST must normalize:

| # | Field / concern | ACS · PAT · EDGE · EVNT | GEST | HIST normalization |
|---|---|---|---|---|
| 1 | Discriminator | `action` | `eventType` | Canonical `action`; accept `eventType` as alias on ingest |
| 2 | Producer attribution | implicit (no `source` field; `system` actions set `actorId`=service name) | explicit `source: "gest-service"` | Make `source` **mandatory** in the stored record; derive from service-client identity when the envelope omits it |
| 3 | `tenantId` | present | **absent** (global-schema registry) | Nullable in the store; global facts routed per ADR-004 (SAFETY — see ADR-004) |
| 4 | `payloadVersion` | integer field, bump on breaking change | **absent**; versions via `eventType` suffix (`.v2`) | Store `payloadVersion` (default 1); map GEST suffix to it |
| 5 | `subjectType` vocabulary | kebab / singular (`patient-session`, `edge-device`, `detection-lapse`, `event`, `command`, `gesture-type`) | snake_case (`engine_capability`, `engine_version`) | Store verbatim; publish a canonical `subjectType` glossary in specs |
| 6 | `actorType` vocabulary | `caregiver`, `edge-device`, `system`, `service-client` | `caregiver` | Enumerate the union; accept all four |
| 7 | Idempotency key | described as app-level "no second audit"; key varies per fact | explicit composite `(source, subjectType, subjectId, eventType, occurredAt)` upsert | Adopt a HIST-side composite idempotency key for **all** producers (ADR-003) |
| 8 | Failure policy | **split**: access-ending actions commit + enqueue retry even if audit fails; grant actions roll back `502` | hub-integration fail-closed vs best-effort (referenced, not fixed) | Reconcile into one project policy (ADR-005) |

## Domain Events

HIST is a sink, so its own "domain event" is the anchor **`AuditRecordAppended`** — raised
internally when a record is durably appended. There is no outbox and no broker (messaging
disabled); the event is purely a domain milestone, not a published message.

## State Transitions

An `AuditRecord` has an intentionally trivial, terminal lifecycle:

```
(absent) --append--> APPENDED            # normal path, immutable thereafter
(absent) --append (unknown/higher ver)--> APPENDED + FLAGGED
APPENDED --retry (same idempotency key)--> APPENDED   # no-op, returns existing
```

There is **no** `UPDATED` and **no** `DELETED` transition on the ingest path. Retention/
erasure actions (ADR-006) operate outside this lifecycle and must preserve immutability.

## Invariants

- **INV-HIST-1** — an `AuditRecord`, once appended, is never updated or deleted via the
  ingest path (append-only — ADR-002).
- **INV-HIST-2** — every record carries a non-null `source`, `action`, `actorType`,
  `occurredAt` and `correlationId`.
- **INV-HIST-3** — a record is uniquely identified by its idempotency key; a replay of the
  same key appends no second record (ADR-003).
- **INV-HIST-4** — an unknown `action` or a higher `payloadVersion` is stored and flagged,
  never rejected (audit must not lose records — contract note from all producers).
- **INV-HIST-5** — tenant-scoped facts carry a non-null `tenantId` and are stored in the
  tenant scope; global-schema facts (GEST) carry a null `tenantId` and are stored in the
  global scope (ADR-004).
- **INV-HIST-6** — the history read surface only returns records within the caller's
  authenticated tenant + patient scope.
