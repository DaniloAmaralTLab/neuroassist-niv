# CONV — Event Contracts

> Service: `conv-service` · **Messaging disabled** (`stack.messaging.enabled = false`). CONV
> publishes **no** broker events and consumes **none**. The "events" below are **in-process domain
> events / HIST audit facts over synchronous REST**, not messages on a queue/topic (doc 04).
> EARS guide: `../../../standards/ears-notation.md`.

## 1. No broker

- THE SYSTEM SHALL NOT publish to or consume from any broker (messaging disabled); all intra-project
  relationships are synchronous REST plus id references (doc 04).
- THE SYSTEM SHALL realize domain events as either (a) an **audit fact** POSTed to HIST, or (b) a
  client-side realization that leaves no server trace (`PhraseSpoken`), or (c) an opt-in
  `usage_signal` row — never a broker message.

## 2. Domain events (realization)

| Domain event | Realization | Persisted | HIST audit fact | Class (ADR-006) |
|---|---|---|---|---|
| **PhraseSpoken** *(anchor)* | client-side on the station; no CONV call on the live path (INV-CONV-5) | only as opt-in `usage_signal` (if opted in) | **no** | — |
| **TreePublished** *(foundational)* | `POST /conv/trees` transaction | new `tree_version` (active) | **yes** | **hard-502** |
| **TreeVersionSuperseded** | same publish transaction | previous version → `superseded` | **yes** (same tx) | **hard-502** |
| **TreeVersionWithdrawn** *(terminal)* | `POST /conv/tree-versions/{id}:retire` | version → `withdrawn` | **yes** | **commit + durable-retry** |
| **AudioAssetsErased** *(terminal)* | `DELETE /conv/patients/{id}/audio` | crypto-shred + versions `withdrawn` | **yes** | **commit + durable-retry** |

EARS:

- WHEN a tree version is published, THE SYSTEM SHALL audit `TreePublished` (and `TreeVersionSuperseded` for the replaced version) to HIST in the same transaction; IF that audit fails, THEN THE SYSTEM SHALL roll back the publish and respond `502` (hard-502 — ADR-006, api-contract §5.1).
- WHEN a version is retired or a patient's audio is erased, THE SYSTEM SHALL commit the state change first and audit `TreeVersionWithdrawn` / `AudioAssetsErased` with durable idempotent retry, so a HIST outage never blocks erasure (ADR-006).
- THE SYSTEM SHALL NOT emit any HIST fact on the `PhraseSpoken` / playback path, so HIST availability never gates the patient's voice (INV-CONV-5, INV-CONV-6).

## 3. HIST audit envelope (producer = `conv-service`)

Facts are POSTed to **`POST /hist/audit`** (HIST base URL includes `/hist`), service-client
`hist.audit.record`, canonical envelope (HIST api-contract §1). Fields CONV sets:

```json
{
  "action": "TreePublished",
  "source": "conv-service",
  "actorType": "service-client",
  "actorId": "<trn-actor-or-conv-system>",
  "tenantId": "<uuid>",
  "subjectType": "tree-version",
  "subjectId": "<versionId>",
  "occurredAt": "2026-11-20T12:00:00Z",
  "correlationId": "<X-Correlation-Id>",
  "payloadVersion": 1,
  "idempotencyKey": "conv-service:tree-version:<versionId>:TreePublished",
  "payload": { "patientId": "<uuid>", "version": 7, "contentHash": "sha256:4f1c...", "supersededVersionId": "<uuid-or-null>" }
}
```

| Fact `action` | `subjectType` | `subjectId` | key payload |
|---|---|---|---|
| `TreePublished` | `tree-version` | versionId | `patientId`, `version`, `contentHash`, `supersededVersionId` |
| `TreeVersionSuperseded` | `tree-version` | superseded versionId | `patientId`, `newActiveVersionId` |
| `TreeVersionWithdrawn` | `tree-version` | versionId | `patientId`, `reason` |
| `AudioAssetsErased` | `patient` | patientId | `erasedAssetCount`, `withdrawnVersionCount` |

EARS:

- THE SYSTEM SHALL set `source = "conv-service"`, `actorType = "service-client"`, the inbound `X-Correlation-Id` as `correlationId`, and a deterministic `idempotencyKey` on every HIST fact (HIST ADR-003 idempotency; SPEC-05).
- WHEN re-sending a durable-retry fact (`TreeVersionWithdrawn` / `AudioAssetsErased`), THE SYSTEM SHALL reuse the original `idempotencyKey` so HIST replays return `200 OK` and no duplicate is appended.

## 4. Payload versioning

- THE SYSTEM SHALL stamp `payloadVersion = 1` on all CONV facts; a breaking payload change SHALL bump `payloadVersion` and keep HIST's store-and-flag behavior (HIST INV-HIST-4) — HIST never rejects a higher version.

## 5. Idempotency keys (summary; full rules in SPEC-05)

| Operation | Idempotency key |
|---|---|
| publish | `trn:publish:<approvalId>` (request) → `conv-service:tree-version:<versionId>:TreePublished` (audit) |
| retire | `conv-service:tree-version:<versionId>:TreeVersionWithdrawn` |
| erase audio | `conv-service:patient:<patientId>:AudioAssetsErased` |
| usage signal | `<patientId>:<phraseId>:<occurredAt>` (client-supplied) |
