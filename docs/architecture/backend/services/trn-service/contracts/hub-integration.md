# TRN — Hub Integration

> Service: `trn-service` · Intra-project dependencies — **all synchronous REST** (messaging disabled).
> TRN is a **resource server** for the ACS caregiver token and holds a **service-client** token to call
> CONV / PAT / HIST. No TechLab AI (`techlab-ai`) orchestration dependency (`ai.hasAi` unset); the LLM
> is **Anthropic Claude accessed directly** behind `LlmDialogPort` (see `integration-contracts.md` §1).
> EARS guide: `../../../standards/ears-notation.md`.

## 1. Dependency map

| Dependency | Direction | Transport | Purpose | Authority / contract |
|---|---|---|---|---|
| **ACS** | TRN ← ACS | JWKS | validate the caregiver JWT (resource server); TRN also obtains a service-client token | `ADR-002-identity-and-authority-model`, INV-3 |
| **PAT** | TRN → PAT | sync REST (Feign) | patient reference read | `pat.patient.read` (service-client, ETag/304); patient-session `403` on `/pat` (INV-PAT-7) |
| **HIST** | TRN → HIST | sync REST (Feign) | audit governance facts | `hist.audit.record` (service-client; base includes `/hist` on `:8083`) |
| **CONV** | TRN → CONV | sync REST (Feign, push) | publish / retire / erase approved versions | `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` (service-client; INT-CONV-2); idempotency `trn:publish:<approvalId>` |
| **MIG** | TRN → MIG | — (build-time) | centralized Flyway migrations (TRN owns no runner) | shared ADR-003 schema-per-tenant; block `V0080–V0089` |

## 2. ACS — identity (resource server + service-client)

- TRN validates the ACS-minted **caregiver** JWT via ACS JWKS and maps the `authorities` claim with a
  `JwtAuthenticationConverter` (SPEC-06, D-642). It mints **no** token of its own.
- TRN obtains an ACS **service-client** token carrying `conv.tree.publish`, `conv.tree-version.retire`,
  `conv.audio.delete`, `hist.audit.record`, `pat.patient.read` to call CONV/PAT/HIST (INT-CONV-2,
  INT-TRN items in `integration-contracts.md` §4).

EARS:

- THE SYSTEM SHALL validate the caregiver JWT against ACS JWKS and derive tenant context from its `tenantId` claim only (INV-TRN-8).
- THE SYSTEM SHALL call CONV/PAT/HIST with the TRN **service-client** token, never with a caregiver or patient-session token.

## 3. PAT — patient reference (`PatientReferencePort`)

- `GET /pat/patients/{patientId}` with `pat.patient.read` (service-client), conditional `If-None-Match`
  / `304`. TRN caches the ETag and holds patient **id only**; it stores no patient name/PHI (INV-TRN-7).

EARS:

- WHEN opening a session, THE SYSTEM SHALL confirm the patient via `PatientReferencePort` (PAT `pat.patient.read`) and SHALL respond `404 patient-not-found` if PAT does not resolve the patient in the tenant.
- WHEN PAT returns `304 Not Modified`, THE SYSTEM SHALL use its cached patient reference.
- IF PAT is unavailable during authoring, THEN THE SYSTEM SHALL degrade operator context but SHALL NOT affect any approval, publish or CONV runtime (ADR-007).

## 4. HIST — audit facts (`AuditPort`)

- `POST /hist/audit` with `hist.audit.record` (service-client), canonical envelope (`event-contracts.md`
  §2). Failure class per fact (ADR-007): creation/approval/publish = **hard-502** (roll back);
  consent-revocation/erasure = **commit + durable-retry** (never blocked, via `outbound_job`).

EARS:

- WHEN auditing a hard-502 fact (TrainingSessionStarted/ConsentGranted/ProposalApproved/ContentPublished), THE SYSTEM SHALL roll back the originating transaction and respond `502 audit-unavailable` if HIST rejects or is unreachable (ADR-007).
- WHEN auditing a never-blocked fact (ConsentRevoked/ContentErased/VoiceModelDeleted), THE SYSTEM SHALL commit locally, enqueue the fact on `outbound_job`, and retry idempotently until HIST accepts (ADR-007, INV-TRN-9).

## 5. CONV — publication, retire, erase (`TreePublicationPort`)

The push side of authoring → runtime. Details and the exact CONV request/response shapes are in
`integration-contracts.md` §4; summary:

| Operation | CONV endpoint | Authority | Idempotency / class |
|---|---|---|---|
| publish | `POST /conv/trees` | `conv.tree.publish` | `trn:publish:<approvalId>`; dangling asset → `422` |
| retire | `POST /conv/tree-versions/{versionId}:retire` | `conv.tree-version.retire` | idempotent; commit + durable-retry |
| erase audio | `DELETE /conv/patients/{patientId}/audio` | `conv.audio.delete` | idempotent; commit + durable-retry |

EARS:

- THE SYSTEM SHALL publish to CONV only when the dual authorization is complete and every approved phrase has a synthesized `available` asset (INV-TRN-4, INT-CONV-5).
- WHEN CONV is unreachable, THE SYSTEM SHALL retry publish/retire/erase idempotently via `outbound_job` and SHALL never block erasure or affect CONV runtime (ADR-007, INV-TRN-9).

## 6. MIG — migrations

- TRN contributes the versioned SQL of `data-model.md` §4 (block `V0080–V0089`) to MIG, the **only**
  Flyway runner. TRN introduces **no** cross-schema foreign keys; references to PAT/CONV are by id.

## 7. TechLab AI

- **None.** `ai.hasAi` is unset; TRN depends on no `techlab-ai` orchestration/knowledge/analytics
  service. The authoring LLM is Anthropic Claude behind `LlmDialogPort` (`integration-contracts.md` §1),
  not the framework's AI service.
