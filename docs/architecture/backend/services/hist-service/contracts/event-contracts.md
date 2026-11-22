# HIST — Event (Audit Fact) Contract

> Service: `hist-service` · Module **HIST** · messaging **disabled** (no broker, no outbox).
> "Events" here are **audit facts** delivered synchronously over `POST /hist/audit`, not broker
> messages. HIST's own domain milestone is the anchor `AuditRecordAppended` (internal, not published).
> EARS: `../../../standards/ears-notation.md`. Invariants `INV-HIST-*` in `../03-initial-domain-framing.md`.

## 1. Consumed facts — the canonical envelope

HIST consumes one **reconciled canonical envelope** from all five producers via `POST /hist/audit`.
Canonical fields and rules are in `api-contract.md` §1. The authoritative inventory is **36 facts
across 5 producers** (declared in `../03-initial-domain-framing.md`), which supersedes the abbreviated
handoff list.

- WHEN a producer commits a state-changing use case, THE SYSTEM SHALL accept its audit fact, normalize
  divergences (§2), resolve storage scope (tenant vs global, ADR-004), and append one immutable record.
- THE SYSTEM SHALL treat `correlationId` as mandatory (= inbound `X-Correlation-Id`, assumption A1).

## 2. GEST envelope reconciliation — tolerate, do not re-scaffold

GEST is **already scaffolded**. For each divergence HIST **tolerates** it via an ingest-adapter /
normalization (no GEST change) **except** the failure policy, which is resolved by ADR-005.

| # | Concern | ACS·PAT·EDGE·EVNT | GEST | Resolution | GEST change? |
|---|---|---|---|---|---|
| 1 | Discriminator | `action` | `eventType` | HIST **tolerates**: accept `eventType` as alias, canonicalize to `action` | none |
| 2 | Producer attribution | implicit (`source` derived from service-client) | explicit `source` | HIST **tolerates**: `source` mandatory in store; derive from service-client identity when omitted | none |
| 3 | `tenantId` | present | absent | HIST **tolerates**: nullable; route GEST facts to `audit_record_global` (ADR-004) | none |
| 4 | `payloadVersion` | integer | absent (`.vN` suffix on `eventType`) | HIST **tolerates**: default `1`; parse `.vN` suffix into `payload_version` | none |
| 5 | `subjectType` casing | kebab (`edge-device`,`detection-lapse`) | snake (`engine_capability`,`engine_version`) | HIST **tolerates**: store verbatim; publish canonical glossary (§4) | none |
| 6 | `actorType` vocabulary | 4-value union | `caregiver` only | HIST **tolerates**: accept the 4-value union | none |
| 7 | Idempotency key | app-level per fact | explicit composite with `eventType` | HIST **tolerates**: composite uses canonical `action` (≡ `eventType`), honors explicit `idempotencyKey` (ADR-003) | none |
| 8 | **Failure policy** | split (ACS) / hard-502 (PAT,EDGE,EVNT) | fail-closed-vs-best-effort (unresolved) | **Resolved by ADR-005** (accepted). GEST facts are all hard-502 (≡ fail-closed) | **doc amendment only**: GEST cites ADR-005, drops the best-effort note |

> **Net:** HIST tolerates divergences 1–7 in an ingest adapter (no GEST re-scaffold). Divergence 8
> needs a **GEST documentation amendment** (cite ADR-005, drop best-effort) — a backlog item, not a
> re-scaffold. All GEST facts resolve to hard-502 (§3), which is what fail-closed already implied.

### EARS (normalization)

- WHEN `eventType` carries a `.vN` suffix, THE SYSTEM SHALL strip it to resolve `action` and set
  `payload_version = N`.
- WHEN an envelope omits `source`, THE SYSTEM SHALL set `source` from the authenticated service-client
  identity (INV-HIST-2 — `source` is never null in the store).
- WHERE `subjectType` casing differs between producers, THE SYSTEM SHALL store it verbatim and resolve
  meaning via the glossary (§4), never by rewriting producer casing.

## 3. Failure-policy classification table (ADR-005 — authoritative for all producers)

ADR-005 (accepted, Option B) is the single project-wide policy and **closes the five upstream
`TODO[architect]` items**. Each of the 36 facts is classified **hard-502** (producer rolls back the use
case and returns `502 audit-unavailable` when `POST /hist/audit` fails) or **commit+durable-retry**
(producer commits the local state change and enqueues a durable, idempotent audit retry). Dev profile:
**log-only** for every fact.

Rationale classes: **INTEGRITY** (grant/creation/config mutation — integrity first, safe to roll back);
**ACCESS-END** (ends access/sessions/links — must not be blocked, ACS SEC-001); **SAFETY** (safety-runtime
— the help-request/alarm/lapse pathway must never be blocked by an audit outage).

| # | Producer | Fact | Policy | Rationale |
|---|---|---|---|---|
| 1 | ACS | `TenantOnboarded` | hard-502 | INTEGRITY (creation) |
| 2 | ACS | `CaregiverRegistered` | hard-502 | INTEGRITY (creation) |
| 3 | ACS | `CaregiverDeactivated` | commit+durable-retry | ACCESS-END (ACS SEC-001) |
| 4 | ACS | `CaregiverAuthenticated` | commit+durable-retry | SAFETY (a caregiver must be able to log in to attend an active alarm) — W1 ratified |
| 5 | ACS | `PatientLinked` | hard-502 | INTEGRITY (grant) |
| 6 | ACS | `PatientUnlinked` | commit+durable-retry | ACCESS-END (removes a link) |
| 7 | ACS | `PatientSessionProvisioned` | hard-502 | INTEGRITY (session grant) |
| 8 | ACS | `PatientSessionRevoked` | commit+durable-retry | ACCESS-END (ACS SEC-001) |
| 9 | PAT | `PatientRegistered` | hard-502 | INTEGRITY (creation) |
| 10 | PAT | `PatientDeactivated` | commit+durable-retry | ACCESS-END (ends monitoring/access) |
| 11 | PAT | `PatientReactivated` | hard-502 | INTEGRITY (restores access — grant) |
| 12 | PAT | `CommandCalibrated` | hard-502 | INTEGRITY (catalog config) |
| 13 | PAT | `CommandRetired` | hard-502 | INTEGRITY (catalog config) |
| 14 | PAT | `GestureTypeRegistered` | hard-502 | INTEGRITY (creation) |
| 15 | EDGE | `DeviceEnrolled` | hard-502 | INTEGRITY (creation) |
| 16 | EDGE | `DevicePaired` | hard-502 | INTEGRITY (grant) |
| 17 | EDGE | `DeviceReactivated` | hard-502 | INTEGRITY (restores — grant) |
| 18 | EDGE | `DeviceDeactivated` | commit+durable-retry | ACCESS-END (device can no longer run) |
| 19 | EDGE | `DeviceUnpaired` | commit+durable-retry | ACCESS-END (unpair) |
| 20 | EDGE | `DeviceRevoked` | commit+durable-retry | ACCESS-END (revoke) |
| 21 | EDGE | `DeviceWentOffline` | hard-502 | INTEGRITY (system observation; EDGE heartbeat job retries) — see note (N1) |
| 22 | EDGE | `DeviceCameOnline` | hard-502 | INTEGRITY (system observation; EDGE heartbeat job retries) — see note (N1) |
| 23 | EDGE | `CatalogRefreshed` | hard-502 | INTEGRITY (catalog-sync record) |
| 24 | EDGE | `DetectionLapseStarted` | commit+durable-retry | SAFETY (detection down) |
| 25 | EDGE | `DetectionLapseResolved` (subjectType `edge-device`) | commit+durable-retry | SAFETY |
| 26 | EVNT | `EventGenerated` | commit+durable-retry | SAFETY (the help-request pathway must never be blocked) — see warning (W2) |
| 27 | EVNT | `AlarmConfirmed` | commit+durable-retry | SAFETY (ADR-005 enumerated) |
| 28 | EVNT | `FeedbackRecorded` | hard-502 | INTEGRITY (after-the-fact quality annotation) |
| 29 | EVNT | `EscalationAttempted` | commit+durable-retry | SAFETY (ADR-005 enumerated) |
| 30 | EVNT | `DetectionLapseRaised` | commit+durable-retry | SAFETY (ADR-005 enumerated) |
| 31 | EVNT | `DetectionLapseResolved` (subjectType `detection-lapse`) | commit+durable-retry | SAFETY (ADR-005 enumerated) |
| 32 | EVNT | `DetectionLapseAcknowledged` | commit+durable-retry | SAFETY (ADR-005 enumerated) |
| 33 | GEST | `EngineVersionRegistered` | hard-502 | INTEGRITY (global registry creation) |
| 34 | GEST | `EngineVersionDeprecated` | hard-502 | INTEGRITY (registry lifecycle) |
| 35 | GEST | `EngineCapabilityDeclared` | hard-502 | INTEGRITY (global registry creation) |
| 36 | GEST | `EngineCapabilityRetired` | hard-502 | INTEGRITY (registry lifecycle) |

**Counts:** hard-502 = **20** · commit+durable-retry = **16**.

**commit+durable-retry set (the 16 that must never be blocked by a HIST outage):**
`CaregiverAuthenticated`, `CaregiverDeactivated`, `PatientUnlinked`, `PatientSessionRevoked` (ACS);
`PatientDeactivated` (PAT);
`DeviceDeactivated`, `DeviceUnpaired`, `DeviceRevoked`, `DetectionLapseStarted`,
`DetectionLapseResolved`(EDGE) (EDGE);
`EventGenerated`, `AlarmConfirmed`, `EscalationAttempted`, `DetectionLapseRaised`,
`DetectionLapseResolved`(EVNT), `DetectionLapseAcknowledged` (EVNT).

> **W1 — RATIFIED 2026-11-20 (orchestrator default per the owner's standing instruction; revisable):** moved to
> commit+durable-retry. Original analysis: `CaregiverAuthenticated` was classified hard-502 per ADR-005's integrity-first
> rule for grant actions. Trade-off: a HIST outage would block caregiver login (recoverable once HIST
> recovers, SLO ≥ 99.9%). The owner may wish to move it to commit+durable-retry so a caregiver can still
> log in to attend an active alarm during a HIST blip.
> **W2 — RATIFIED 2026-11-20 (orchestrator default; revisable):** `EventGenerated` stays commit+durable-retry.
> Original analysis: `EventGenerated` and `DeviceWentOffline/CameOnline` were **not** in
> ADR-005's enumerated set. `EventGenerated` is classified SAFETY/commit+durable-retry here because it
> **is** the patient's help request — blocking it on an audit outage directly endangers the patient;
> this extends ADR-005's safety rationale and should be ratified by the owner.
> **N1:** `DeviceWentOffline/CameOnline` are system observations generated by EDGE's own heartbeat
> monitor; a `502` simply means the next heartbeat cycle re-derives the state, so hard-502 is harmless
> and keeps the never-block set tight.

### Durable retry contract (producers implementing commit+durable-retry)

For every commit+durable-retry fact, the producer SHALL:

1. **Commit first** — commit the local state change (and, for access-ending actions, the blacklist
   entry) **before** attempting the audit write.
2. **Durable enqueue** — on `POST /hist/audit` failure, persist the audit envelope to a **local durable
   store** (an outbox-style table — there is no broker, messaging is disabled) for retry.
3. **Idempotent replay** — retries are idempotent by relying on HIST's composite idempotency key, and
   SHOULD send an explicit `idempotencyKey` (ADR-003) so replays are unambiguous; replaying any number
   of times yields at most one audit record (INV-HIST-3).
4. **Bounded** — capped attempts with backoff; a backlog monitor/alert fires when the durable queue
   exceeds an age/size threshold (ADR-005 consequence: reconcile the committed-but-not-yet-audited
   window).
5. **Ordering not required** — each audit record is independent; replays need no ordering.
6. **Dev profile** — log-only; no durable queue in dev.

- WHEN a commit+durable-retry fact's audit write fails in prod, THE SYSTEM SHALL (producer-side) keep
  the committed state change and enqueue the envelope for idempotent retry (ADR-005).
- WHEN a hard-502 fact's audit write fails in prod, THE SYSTEM SHALL (producer-side) roll back the use
  case and return `502 audit-unavailable` (ADR-005).
- WHILE the dev profile is active, THE SYSTEM SHALL log the audit failure and continue (log-only).

## 4. Canonical `subjectType` glossary

| Canonical | Emitting producers | Casing seen on the wire |
|---|---|---|
| `tenant` | ACS | `tenant` |
| `caregiver` | ACS | `caregiver` |
| `patient` | ACS, PAT | `patient` |
| `patient-session` | ACS | `patient-session` |
| `command` | PAT | `command` |
| `gesture-type` | PAT | `gesture-type` |
| `edge-device` | EDGE | `edge-device` |
| `detection-lapse` | EDGE, EVNT | `detection-lapse` |
| `event` | EVNT | `event` |
| `engine-version` | GEST | `engine_version` (snake — stored verbatim) |
| `engine-capability` | GEST | `engine_capability` (snake — stored verbatim) |

## 5. `DetectionLapseResolved` collision resolution (doc 06 R4)

`DetectionLapseResolved` is emitted by **both** EDGE (device-side episode, `subjectType=edge-device`)
and EVNT (lapse record, `subjectType=detection-lapse`). HIST stores both `source` and `subject_type`
on every record and keys the idempotency tuple on them, so the two are **never conflated**.

- THE SYSTEM SHALL disambiguate `DetectionLapseResolved` by (`source`, `subject_type`), never by
  `action` alone (doc 06 R4).
- WHEN the caregiver timeline (`GET /hist/patients/{id}/history`) renders a `DetectionLapseResolved`,
  THE SYSTEM SHALL render the EDGE device-side and EVNT lapse-side resolutions as **distinct** entries.

## 6. Published events

**None.** Messaging is disabled; HIST publishes no broker messages and runs no outbox. The anchor
`AuditRecordAppended` is an internal domain milestone only.
