# HIST — API Contract

> Service: `hist-service` · Module **HIST** · `base_path: /hist` · port `8083` · Java 21 / Spring Boot.
> EARS acceptance criteria: see `../../../standards/ears-notation.md`. Invariants `INV-HIST-*`
> are declared in `../03-initial-domain-framing.md` and only cited here.

All paths are rooted at the controller base `/hist` (D-640). Auth is OAuth2 resource-server
(JWT validated via ACS JWKS). Tenant is **never** read from a header — it is derived from the
authenticated principal / envelope under `TenantContextFilter` (ADR shared hexagonal,
`@Order(LOWEST_PRECEDENCE - 10)`).

## 0. Authentication model

| Caller | Principal | Credential | Notes |
|---|---|---|---|
| Producers (ACS, PAT, EDGE, EVNT, GEST) | **service-client** (one principal per producer service) | ACS-issued service-client JWT | `source` is derived from this identity when the envelope omits it |
| DASH / caregiver dashboard | caregiver JWT | ACS human token | tenant + patient scope enforced |
| Compliance operator | operator JWT / service-client | ACS token with `hist.audit.read` | full producer trail |

- WHEN a request omits a valid bearer token, THE SYSTEM SHALL respond `401` with a `ProblemDetail`.
- WHEN a token is valid but lacks the required authority, THE SYSTEM SHALL respond `403`.
- THE SYSTEM SHALL require `X-Correlation-Id` on every request; WHEN absent, the gateway (GWY)
  injects it, and IF still absent at HIST, THEN THE SYSTEM SHALL generate one and echo it back.

## 1. `POST /hist/audit` — audit ingest (producers) · authority `hist.audit.record`

The single append-only ingest for all five producers. Accepts the **reconciled canonical envelope**
(see `event-contracts.md` §1 and the GEST normalization in §2). Service-client JWT only.

### Request

Headers: `Authorization: Bearer <service-client JWT>`, `X-Correlation-Id`, `Content-Type: application/json`.

```json
{
  "action": "AlarmConfirmed",
  "eventType": "AlarmConfirmed",
  "source": "evnt-service",
  "actorType": "caregiver",
  "actorId": "cg_01HXY...",
  "tenantId": "t_8f3a...",
  "subjectType": "event",
  "subjectId": "evt_01HXZ...",
  "occurredAt": "2026-11-20T16:40:12.482Z",
  "correlationId": "corr_01HXW...",
  "payloadVersion": 1,
  "idempotencyKey": "evnt-service:event:evt_01HXZ:AlarmConfirmed:2026-11-20T16:40:12.482Z",
  "payload": { "confirmedBy": "cg_01HXY", "urgency": "emergency" }
}
```

Field rules (canonical shape; GEST aliases accepted — see `event-contracts.md` §2):

| Field | Type | Required | Rule |
|---|---|---|---|
| `action` | string | yes (or `eventType`) | canonical discriminator; `eventType` accepted as alias |
| `source` | string | yes* | producer service id; *derived from service-client identity when omitted |
| `actorType` | enum `caregiver`\|`edge-device`\|`system`\|`service-client` | yes | union of all producers |
| `actorId` | string | no | null for `system` where unknown |
| `tenantId` | string | conditional | NOT NULL for tenant-scoped facts; NULL/absent for GEST global facts |
| `subjectType` | string | yes | stored verbatim (kebab or snake_case) |
| `subjectId` | string | yes | stable subject id |
| `occurredAt` | ISO-8601 instant (sub-second) | yes | producer-side time |
| `correlationId` | string | yes | = inbound `X-Correlation-Id` (A1) |
| `payloadVersion` | int | no (default `1`) | GEST `.vN` suffix on `eventType` mapped here |
| `idempotencyKey` | string | no | explicit key honored when present (ADR-003) |
| `payload` | JSON object | no | fact-specific body (may hold personal fields — ADR-006) |

### Responses

| Status | When |
|---|---|
| `201 Created` | new record appended (`Location: /hist/audit/{id}`) |
| `200 OK` | idempotent replay — same idempotency key already stored; existing record returned |
| `202 Accepted` | *(not used on ingest; producers' own durable-retry is producer-side)* |
| `400 Bad Request` | envelope fails structural validation (missing `subjectType`/`occurredAt`/`correlationId`, etc.) — `ProblemDetail` |
| `401 / 403` | unauthenticated / missing `hist.audit.record` |
| `422 Unprocessable` | *never for unknown action/higher version* — those are stored+flagged (INV-HIST-4) |

Response body (201/200):

```json
{ "id": "ar_01HY0...", "status": "APPENDED", "flagged": false, "replay": false, "receivedAt": "2026-11-20T16:40:12.6Z" }
```

### EARS acceptance criteria

- WHEN a valid envelope is received with a key not seen before, THE SYSTEM SHALL append exactly one
  immutable record and respond `201` (INV-HIST-1, INV-HIST-3).
- WHEN a valid envelope is received whose idempotency key already exists, THE SYSTEM SHALL append no
  second record and respond `200` with the existing record (INV-HIST-3).
- WHEN `action` is absent but `eventType` is present, THE SYSTEM SHALL treat `eventType` as `action`.
- IF `action`/`eventType` is unknown OR `payloadVersion` is higher than the known maximum, THEN THE
  SYSTEM SHALL store the record with `flagged = true` and respond `201` (INV-HIST-4) — never reject.
- WHILE the fact is tenant-scoped, THE SYSTEM SHALL require a non-null `tenantId` and route the record
  to the `t_<tenantId>` scope; IF `tenantId` is missing for a tenant-scoped fact, THEN THE SYSTEM
  SHALL respond `400` (INV-HIST-5).
- WHERE the fact is a GEST global-schema fact, THE SYSTEM SHALL accept a null `tenantId` and route the
  record to the global scope (INV-HIST-5).
- THE SYSTEM SHALL never expose `UPDATE` or `DELETE` on this resource (INV-HIST-1).

## 2. `GET /hist/patients/{patientId}/history` — caregiver timeline · authority `hist.history.read`

Per-patient, read-only, human-readable timeline built from HIST's **own** audit records (HIST is the
source of truth for history — it does not proxy EVNT; see SPEC-03). Facts surfaced:
`EventGenerated`, `AlarmConfirmed`, `FeedbackRecorded`, `EscalationAttempted`, and all detection-lapse
facts from **both** EDGE (`subjectType=edge-device`) and EVNT (`subjectType=detection-lapse`).

### Request

Headers: `Authorization: Bearer <caregiver JWT>`, `X-Correlation-Id`.

Query parameters:

| Param | Type | Default | Rule |
|---|---|---|---|
| `period` | enum `today`\|`week`\|`month` | `today` | mutually exclusive with `from`/`to` |
| `from` / `to` | ISO-8601 instant | — | explicit range; both required together; overrides `period` |
| `cursor` | opaque string | — | keyset pagination cursor (on `occurredAt desc, id desc`) |
| `size` | int (1..100) | `20` | page size |

### Response `200 OK`

```json
{
  "patientId": "pat_01HX...",
  "window": { "from": "2026-11-20T00:00:00Z", "to": "2026-11-20T23:59:59Z" },
  "summary": {
    "scope": "period",
    "window": { "from": "2026-11-20T00:00:00Z", "to": "2026-11-20T23:59:59Z" },
    "counts": { "EventGenerated": 7, "AlarmConfirmed": 3, "FeedbackRecorded": 2,
                "EscalationAttempted": 4, "DetectionLapseStarted": 1,
                "DetectionLapseResolved": 1, "DetectionLapseAcknowledged": 0 },
    "events": { "total": 7, "confirmed": 3, "unconfirmed": 4,
                "markedReal": 2, "falsePositives": 0, "notReviewed": 5 }
  },
  "entries": [
    { "id": "ar_01HY2", "kind": "EventGenerated", "source": "evnt-service", "subjectType": "event",
      "subjectId": "evt_01HXZ", "relatedEventId": "evt_01HXZ",
      "occurredAt": "2026-11-20T16:39:00.000Z", "title": "Help request", "detail": "Patient signalled 'Water'",
      "commandId": "cmd_01HX7", "commandLabel": "Water", "urgency": "emergency", "outcome": "real",
      "confirmation": { "confirmedAt": "2026-11-20T16:40:12.482Z", "confirmedBy": "cg_01HXY" } },
    { "id": "ar_01HY0", "kind": "AlarmConfirmed", "source": "evnt-service", "subjectType": "event",
      "subjectId": "evt_01HXZ", "relatedEventId": "evt_01HXZ",
      "occurredAt": "2026-11-20T16:40:12.482Z", "title": "Alarm confirmed",
      "detail": "Emergency alarm confirmed by caregiver", "urgency": "emergency", "outcome": "real" },
    { "id": "ar_01HY3", "kind": "EscalationAttempted", "source": "evnt-service", "subjectType": "event",
      "subjectId": "evt_01HXZ", "relatedEventId": "evt_01HXZ",
      "occurredAt": "2026-11-20T16:40:40.000Z", "title": "Escalation attempted",
      "detail": "Tier 1 SMS to linked caregiver", "channel": "sms", "maskedTarget": "+55•••••1234",
      "outcome": "sent" }
  ],
  "nextCursor": "b64..."
}
```

**Structured entry fields (G-HIST-1..5 closed — FE cross-link §4).** Beyond `title`/`detail` prose, each
entry carries structured fields so the FE renders the prototype without parsing prose or inventing a field:

| Field | On which entries | Source | Rule |
|---|---|---|---|
| `subjectId` | all | `audit_record.subject_id` | stable subject id (event entries → the `eventId`) |
| `relatedEventId` | event-subject entries (`EventGenerated`, `AlarmConfirmed`, `FeedbackRecorded`, `EscalationAttempted` with `subjectType=event`) | `= subjectId` | **join key** (G-HIST-2): lets the FE fold confirmation/feedback/escalation onto the originating event row |
| `commandId` | event-kind entries | producer payload (`EventGenerated`/`AlarmConfirmed`/`FeedbackRecorded` carry `commandId`) | opaque PAT command ref |
| `commandLabel` | event-kind entries | producer payload | the family's word ("Water") — **upstream doc amendment: EVNT must add `commandLabel` to the `EventGenerated` audit payload** (it holds the PAT snapshot in `event.command_label`; `event-contracts.md` §1.2 payload list omits it today). IF the payload omits it, THEN HIST **omits** the field — never fabricates (G-HIST-1) |
| `urgency` | event-kind entries | producer payload (`EventGenerated` carries `urgency`) | `emergency`\|`routine` |
| `confirmation` | folded onto the `EventGenerated` entry | server-side fold | `{ confirmedAt, confirmedBy }` — `confirmedAt` = the sibling `AlarmConfirmed.occurredAt`, `confirmedBy` from its payload; absent when no confirmation in-window (G-HIST-2) |
| `channel` | `EscalationAttempted` | producer payload (`channel`) | `web_push`\|`sms`\|`voice` (EVNT escalation channel enum) |
| `maskedTarget` | `EscalationAttempted` | **masked server-side, never raw** | **upstream doc amendment: EVNT must add `maskedTarget` (already masked, e.g. `+55•••••1234`, like EVNT api §3.4) to the `EscalationAttempted` audit payload** (its payload carries `channel`/`tier`/`status` but no target today — raw `channel_target` stays out of the audit for privacy). HIST passes it through verbatim; HIST never unmasks (G-HIST-3) |
| `outcome` | per `kind` (enumerated) | derived | feedback/event → `real`\|`false_positive`\|`not_evaluated`; escalation → `sent`\|`failed`; detection-lapse → `started`\|`resolved`\|`acknowledged` (G-HIST-5) |

**`summary` object (G-HIST-4).** Returned **only on the first page** (when `cursor` is absent), computed
over the **whole requested period** — not over the (keyset-truncated) page. `scope` is always `"period"`
here: the aggregate spans the full window regardless of `size`, so the FE never has to label it
"loaded entries". `counts` is per `kind`; `events` folds confirmed/unconfirmed and feedback verdicts for
the event-kind facts. On every subsequent page (a `cursor` is present) `summary` is **absent** (not
recomputed). **Decision (2026-11-20, orchestrator default, revisable):** the summary is **inlined on the
first page** rather than exposed as a separate `GET .../history/summary`. Rationale — one authority
(`hist.history.read`), one round-trip, one window predicate; the aggregate is cheap (served by
`ix_audit_record_patient_time`, data-model §4/§7) and the FE needs it exactly when it first paints the
period. The separate-endpoint alternative is recorded and not taken (it would add an op + authority +
a second scoped read for no gain at MVP).

### EARS acceptance criteria

- WHEN a caregiver requests a patient they are linked to within their tenant, THE SYSTEM SHALL return the
  ordered (newest-first) timeline for the resolved window (INV-HIST-6).
- IF the caller is not linked to `patientId`, OR `patientId` is outside the caller's tenant, THEN THE
  SYSTEM SHALL respond `403` and leak no record (INV-HIST-6) — same link-scoping rule as EVNT
  `PatientEventService`.
- WHEN neither `period` nor `from/to` is supplied, THE SYSTEM SHALL default to `period=today`.
- IF only one of `from`/`to` is supplied, THEN THE SYSTEM SHALL respond `400`.
- THE SYSTEM SHALL expose only GET on this resource (read-only; caregivers never write to HIST —
  feedback/confirm stay in EVNT: `evnt.feedback.record` / `evnt.event.confirm`).
- WHILE rendering the timeline, THE SYSTEM SHALL disambiguate `DetectionLapseResolved` by
  (`source`, `subjectType`) so EDGE device-side and EVNT lapse-side resolutions are distinct entries
  (INV reconciliation #2, doc 06 R4).
- WHEN rendering an event-kind entry, THE SYSTEM SHALL project `commandId`, `commandLabel` and `urgency`
  from the stored producer payload (G-HIST-1); IF the payload omits `commandLabel`, THEN THE SYSTEM SHALL
  omit the field and SHALL NOT fabricate a label.
- THE SYSTEM SHALL set `relatedEventId` on every `subjectType=event` entry equal to its `subjectId`, so a
  confirmation/feedback/escalation entry can be folded onto its originating event (G-HIST-2).
- WHERE an `EventGenerated` entry has a sibling `AlarmConfirmed` within the window, THE SYSTEM SHALL fold
  a `confirmation { confirmedAt, confirmedBy }` object onto the event entry, `confirmedAt` being the
  `AlarmConfirmed.occurredAt` (G-HIST-2).
- WHEN rendering an `EscalationAttempted` entry, THE SYSTEM SHALL project a structured `channel` and a
  server-side `maskedTarget`, and SHALL NOT expose a raw contact endpoint (G-HIST-3).
- THE SYSTEM SHALL set `outcome` to an enumerated value per `kind`: feedback/event
  `real|false_positive|not_evaluated`, escalation `sent|failed`, detection-lapse
  `started|resolved|acknowledged` (G-HIST-5).
- WHEN the first page is requested (no `cursor`), THE SYSTEM SHALL return a `summary` object computed over
  the whole requested period with `scope="period"` (G-HIST-4); WHILE a `cursor` is present, THE SYSTEM
  SHALL omit `summary`.

## 3. `GET /hist/audit` — operator audit trail · authority `hist.audit.read`

Full producer trail (all 36 facts, all sources) for incident reconstruction and access review.
Restricted to the compliance operator. Cross-tenant reads run against the controlled operator path
(ADR-004) — tenant-scoped data is still fetched per tenant scope, never by relaxing isolation.

Query parameters: `correlationId`, `source`, `action`, `subjectType`, `subjectId`, `actorId`,
`tenantId`, `from`, `to`, `flagged` (bool), `cursor`, `size` (1..200, default `50`).

### EARS acceptance criteria

- WHEN the operator queries by `correlationId`, THE SYSTEM SHALL return every record carrying that id,
  across producers, ordered by `occurredAt` (incident reconstruction spine).
- IF the caller lacks `hist.audit.read`, THEN THE SYSTEM SHALL respond `403`.
- WHERE `flagged=true` is passed, THE SYSTEM SHALL return only records flagged under INV-HIST-4.
- THE SYSTEM SHALL expose only GET on this resource (INV-HIST-1).

## 4. `POST /hist/subjects/{subjectId}/erasure` — subject erasure · authority `hist.erasure.create`

Operator-triggered crypto-shred of a subject's personal payload fields (ADR-006). **Minimal for MVP**:
triggered by the **ACS / compliance operator** (service-client principal), not by caregivers or the FE.
It deletes the per-subject encryption key so personal payload fields become unreadable; the immutable
`AuditRecord` rows (action, subjectId, actorId, occurredAt, correlationId) are **retained**
(ADR-002 immutability preserved — the erasure path touches the key table, never audit rows).

### Request

```json
{ "subjectType": "patient", "legalBasisRef": "DSR-2026-0042", "reason": "data-subject-erasure" }
```

### Responses

| Status | When |
|---|---|
| `202 Accepted` | erasure accepted; key scheduled for deletion / deleted; returns `{ "subjectId", "status": "SHREDDED" }` |
| `200 OK` | idempotent replay — subject already shredded |
| `401 / 403` | missing `hist.erasure.create` |
| `404` | no key / no records for subject |

### EARS acceptance criteria

- WHEN the operator requests erasure for a subject with a live per-subject key, THE SYSTEM SHALL delete
  (crypto-shred) that key and respond `202`, leaving the immutable audit rows intact (ADR-002, ADR-006).
- WHEN erasure is requested for an already-shredded subject, THE SYSTEM SHALL respond `200` (idempotent).
- IF the caller lacks `hist.erasure.create`, THEN THE SYSTEM SHALL respond `403`.
- THE SYSTEM SHALL never delete an audit row to satisfy erasure (INV-HIST-1) — personal data is rendered
  unreadable via key deletion, the action record is kept.

## 5. Errors — RFC 7807 ProblemDetail

All errors use `application/problem+json`:

```json
{ "type": "https://neuroassist/errors/audit-validation", "title": "Invalid audit envelope",
  "status": 400, "detail": "subjectType is required", "instance": "/hist/audit",
  "correlationId": "corr_01HXW..." }
```

| `type` suffix | status | meaning |
|---|---|---|
| `audit-validation` | 400 | structural envelope error |
| `tenant-required` | 400 | tenant-scoped fact missing `tenantId` |
| `unauthorized` | 401 | no/invalid token |
| `forbidden` | 403 | missing authority or out-of-scope patient/tenant |
| `subject-not-found` | 404 | erasure for unknown subject |
| `audit-unavailable` | 502 | *emitted by producers*, not by HIST — see `integration-contracts.md` §2 (ADR-005) |

## 6. Mandatory headers (all endpoints)

- `X-Correlation-Id` — propagated/echoed on every request and response (observability spine).
- `Authorization: Bearer <JWT>` — resource-server validated via ACS JWKS.
- Tenant is derived from the principal/envelope, **never** from `X-Tenant-Id` (header not trusted).
