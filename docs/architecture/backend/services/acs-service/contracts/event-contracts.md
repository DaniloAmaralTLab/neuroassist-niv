# ACS — Event Contracts

> Service: `acs-service` · Module **ACS — Caregivers and Access** · Project: NeuroAssist NIV
> **Messaging disabled** (`stack.messaging.enabled = false`). EARS guide:
> `../../../standards/ears-notation.md`.

ACS publishes no broker messages. Its "domain events" are **audited domain actions**:
each state-changing use case records an immutable audit entry to HIST (`hist-service`)
over **synchronous REST**, in the same request boundary as the action (ADR — "all
synchronous"). This document is the contract for those audited actions — their payload,
headers, idempotency and versioning — so HIST and downstream readers have a stable shape.

If a broker is introduced later (explicit future decision, doc 04 §Async vs Sync), these
same action names become the event names and this contract becomes the message schema.

---

## 1. Published (audited) domain actions → HIST

Transport: `POST {hist.baseUrl}/audit` (sync REST, TLS outside localhost — TECH-006).
Envelope is identical for every action; `action` discriminates.

### 1.1 Audit envelope

```json
{
  "action": "PatientSessionProvisioned",
  "actorType": "caregiver",
  "actorId": "<uuid>",
  "tenantId": "<uuid>",
  "subjectType": "patient-session",
  "subjectId": "<uuid>",
  "occurredAt": "2026-11-19T12:00:00Z",
  "correlationId": "<X-Correlation-Id>",
  "payloadVersion": 1,
  "payload": { }
}
```

### 1.2 Action catalog

| `action` | Trigger (use case) | `subjectType` | `payload` fields |
|---|---|---|---|
| `TenantOnboarded` | OnboardTenant | `tenant` | `type`, `name` |
| `CaregiverRegistered` | RegisterCaregiver | `caregiver` | `username`, `role` |
| `CaregiverDeactivated` | DeactivateCaregiver | `caregiver` | `previousStatus` |
| `CaregiverAuthenticated` | Authenticate | `caregiver` | `outcome` (`success`) |
| `PatientLinked` | LinkPatient | `patient-link` | `caregiverId`, `patientId` |
| `PatientUnlinked` | UnlinkPatient | `patient-link` | `caregiverId`, `patientId` |
| `PatientSessionProvisioned` **(anchor)** | ProvisionSession | `patient-session` | `patientId`, `deviceId`, `provisionedBy` |
| `PatientSessionRevoked` | RevokeSession | `patient-session` | `patientId`, `revokedBy`, `jti` |

EARS — publishing (auditing):

- WHEN any state-changing use case commits, THE SYSTEM SHALL record the corresponding audited action to HIST within the same request, before returning success to the caller.
- THE SYSTEM SHALL set `correlationId` on every audit envelope to the inbound `X-Correlation-Id`.
**Failure policy — resolved by HIST ADR-005 (accepted, Option B).** The authoritative per-fact
classification is `../../hist-service/contracts/event-contracts.md` §3; ACS now cites
`../../hist-service/adr/ADR-005-audit-write-failure-policy.md` instead of a local TODO. ACS keeps its
split and, under ADR-005, **adds `CaregiverAuthenticated` and `PatientUnlinked`** to the
commit+durable-retry set:

| `action` | Policy (ADR-005 §3) |
|---|---|
| `TenantOnboarded` | hard-502 — INTEGRITY (creation) |
| `CaregiverRegistered` | hard-502 — INTEGRITY (creation) |
| `CaregiverDeactivated` | commit+durable-retry — ACCESS-END (SEC-001) |
| `CaregiverAuthenticated` | commit+durable-retry — SAFETY (login to attend an active alarm; W1 ratified) |
| `PatientLinked` | hard-502 — INTEGRITY (grant) |
| `PatientUnlinked` | commit+durable-retry — ACCESS-END (removes a link) |
| `PatientSessionProvisioned` | hard-502 — INTEGRITY (session grant) |
| `PatientSessionRevoked` | commit+durable-retry — ACCESS-END (SEC-001) |

- IF a **commit+durable-retry** action's HIST call fails in prod (`CaregiverDeactivated`, `CaregiverAuthenticated`, `PatientUnlinked`, `PatientSessionRevoked`), THEN THE SYSTEM SHALL still commit the local state change (and, for access-ending actions, the blacklist entry) and SHALL enqueue the audit envelope for idempotent durable retry (HIST durable-retry contract, hist-service `event-contracts.md` §3 — commit-first, local durable queue, explicit `idempotencyKey`, bounded + backlog alert).
- WHERE a **hard-502** action's HIST call fails in prod, THE SYSTEM SHALL roll back the use case and respond `502 Bad Gateway` type `audit-unavailable` (audit is part of the grant/creation guarantee).
- WHILE the dev profile is active, THE SYSTEM SHALL log the audit failure and continue (log-only).

> The durable-retry mechanism (ACS-016 + ACS-024) already exists for the SEC-001 access-ending
> actions; **ACS-026** extends it to the two newly added facts (`CaregiverAuthenticated`,
> `PatientUnlinked`). Config/token (hist base URL `/hist` segment + `hist.audit.record`
> authority): **INT-ACS-006**.

---

## 2. Consumed events

**None.** ACS consumes no broker events and depends on no event from another module
(messaging disabled; `ai.hasAi = false`). Inbound coupling is limited to synchronous
calls: resource servers call ACS (`/acs/auth/introspect`, JWKS) to validate tokens.

---

## 3. Idempotency

| Action | Idempotency key | Window / semantics |
|---|---|---|
| `TenantOnboarded` | `tenant.id` | PK insert; re-onboard of same name → new id (no dedup by name) |
| `CaregiverRegistered` | global `username` | `409` on duplicate (INV-6) |
| `PatientLinked` | `(caregiverId, patientId)` | `409` on duplicate; re-link is a no-op on state |
| `PatientSessionProvisioned` | `patient_session.id` + `token_jti` unique | one active session row per provision call |
| `PatientSessionRevoked` | `patient_session.id` | re-revoke of a `revoked` session → `204`, no second blacklist entry |
| `CaregiverAuthenticated` | audit-only | each login attempt audited; not deduplicated |

EARS — idempotency:

- WHEN `RevokeSession` is invoked on an already-`revoked` session, THE SYSTEM SHALL return success without adding a second blacklist entry or emitting a second `PatientSessionRevoked` (SPEC-05).
- WHEN `LinkPatient` is invoked for an existing link, THE SYSTEM SHALL reject the duplicate with `409` and SHALL NOT emit a second `PatientLinked`.

---

## 4. Payload versioning

- The audit envelope carries `payloadVersion` (integer, starts at `1`).
- THE SYSTEM SHALL increment `payloadVersion` only on a backward-incompatible change to a
  given `action` payload, and SHALL keep the envelope fields (`action`, `actorType`,
  `actorId`, `tenantId`, `subjectType`, `subjectId`, `occurredAt`, `correlationId`) stable
  across versions.
- WHERE HIST receives an unknown `action` or a higher `payloadVersion` than it understands,
  THE SYSTEM (HIST side) SHALL store the raw envelope and flag it, rather than rejecting —
  audit is append-only and must not lose records. (Contract note for the HIST consumer.)
