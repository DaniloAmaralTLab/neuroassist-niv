# TRN — Event Contracts

> Service: `trn-service` · **Messaging disabled** (`stack.messaging.enabled = false`). There is **no
> broker, no topic, no async outbox**. The "events" below are **in-process domain events** and the
> subset that becomes **HIST audit facts** over **synchronous REST** (`POST /hist/audit`,
> `hist.audit.record`). TRN publishes and consumes **no** broker messages (ADR-007, doc 04).
> EARS guide: `../../../standards/ears-notation.md`.

## 1. Domain events (in-process)

| Event | Trigger | Audited to HIST? | HIST class (ADR-007) |
|---|---|---|---|
| **TrainingSessionStarted** *(foundational)* | `POST /trn/sessions` | yes | hard-502 |
| **ConsentGranted** *(foundational)* | `POST /trn/consents` | yes | hard-502 |
| **ProposalApproved** *(anchor)* | both dual-auth halves present, distinct actors (§4) | yes | hard-502 |
| **ContentSynthesized** | `TtsPort` produced the audio assets for an approval | no (internal milestone) | — |
| **ContentPublished** *(terminal, downstream)* | CONV accepted `POST /conv/trees` | yes | hard-502 |
| **ConsentRevoked** | `POST /trn/consents/{id}/revocation` | yes | commit + durable-retry |
| **ProposalRejected** | `POST /trn/proposals/{id}/rejection` | no (not a compliance fact) | — |
| **ProposalWithdrawn** | `POST /trn/proposals/{id}/withdrawal` | no | — |
| **VoiceModelDeleted / ContentErased** *(terminal)* | `DELETE /trn/patients/{id}/content` | yes | commit + durable-retry |

> LLM dialog turns and draft edits are **not** domain events and are **not audited** — minimised, not
> retained (ADR-004/ADR-007).

EARS:

- WHEN a proposal receives both dual-authorization halves from distinct actors, THE SYSTEM SHALL raise `ProposalApproved` (the anchor) and audit it to HIST **hard-502** — rolling back the approval if the audit fails (ADR-007, INV-TRN-1).
- WHEN CONV accepts a publish, THE SYSTEM SHALL raise `ContentPublished` and audit it to HIST **hard-502** (integrity of what became the patient's voice — ADR-007).
- WHEN a consent is revoked or content is erased, THE SYSTEM SHALL raise the corresponding event and audit it **commit + durable-retry** — committing locally and retrying the HIST fact until accepted, never blocked by a HIST outage (ADR-007, INV-TRN-9).

## 2. HIST audit fact envelope (producer side)

TRN is a HIST **producer**; it sends the reconciled canonical envelope to `POST /hist/audit` with its
**service-client** token (`hist.audit.record`, base URL includes `/hist` on `:8083`). Shape per HIST
`api-contract.md` §1 / `event-contracts.md` §1:

```json
{
  "action": "ProposalApproved",
  "eventType": "ProposalApproved",
  "source": "trn-service",
  "actorType": "caregiver",
  "actorId": "<caregiver-uuid>",
  "tenantId": "t_<tenantId>",
  "subjectType": "proposal",
  "subjectId": "<proposalId>",
  "occurredAt": "2026-11-22T10:05:00.123Z",
  "correlationId": "<X-Correlation-Id>",
  "payloadVersion": 1,
  "idempotencyKey": "trn-service:proposal:<proposalId>:ProposalApproved:<occurredAt>",
  "payload": { "approvalId": "<uuid>", "caregiverConfirmedBy": "<uuid>", "patientConfirmedBy": "<ref>", "assentMethod": "gesture" }
}
```

| Fact | `subjectType` | `subjectId` | `actorType` | Key `payload` fields (minimised) |
|---|---|---|---|---|
| TrainingSessionStarted | `training-session` | `sessionId` | caregiver | `patientId` |
| ConsentGranted | `consent` | `consentId` | caregiver | `patientId`, `scope`, `grantedByPatient`, `grantedByRepresentative` |
| ProposalApproved | `proposal` | `proposalId` | caregiver | `approvalId`, `caregiverConfirmedBy`, `patientConfirmedBy`, `assentMethod`, `relationship?` |
| ContentPublished | `publication` | `publicationId` | service-client | `approvalId`, `convVersionId`, `idempotencyKey` |
| ConsentRevoked | `consent` | `consentId` | caregiver | `patientId` |
| VoiceModelDeleted / ContentErased | `patient` | `patientId` | caregiver | `erasedAssetCount`, `retiredVersionCount` |

EARS:

- THE SYSTEM SHALL send **no** patient name, PHI, free text or raw LLM content in any HIST payload — only the minimal governance fields above (ADR-004 minimisation, INV-TRN-7).
- THE SYSTEM SHALL set `correlationId` = inbound `X-Correlation-Id` on every audit call.

## 3. Idempotency

- **Audit facts:** `idempotencyKey = <source>:<subjectType>:<subjectId>:<action>:<occurredAt>`; HIST
  replays return `200` with the existing record (HIST ADR-003). Never-blocked facts are driven by
  `outbound_job` (data-model §2.9) with the same key, so a retry after a HIST outage is a no-op once
  accepted.
- **Publish fact:** the CONV publish is idempotent on `idempotencyKey = trn:publish:<approvalId>`
  (INV-TRN-6); `ContentPublished` is audited once per accepted publication.

EARS:

- WHEN a durable-retry job re-sends a fact whose `idempotencyKey` was already accepted, THE SYSTEM SHALL treat the `200` replay as success and mark the `outbound_job` `done` (no duplicate fact).

## 4. Payload versioning

- All envelopes start at `payloadVersion: 1`. A field addition bumps the version; HIST stores unknown
  actions/higher versions (never `422` — HIST INV-HIST-4), so TRN may evolve its facts without a HIST
  change. Removing/renaming a field is a new `payloadVersion`.

## 5. Broker events (none)

- TRN **publishes no** broker events and **consumes no** broker events — messaging is disabled; every
  cross-service relationship is synchronous REST (ADR-007). If a project later enables messaging, the
  anchor `ProposalApproved` and terminal `ContentPublished`/`ContentErased` are the natural candidates
  for an outbox, but that is out of scope for v1.
