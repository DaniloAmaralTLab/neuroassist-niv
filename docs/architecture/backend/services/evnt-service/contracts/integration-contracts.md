# EVNT — Integration Contracts

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> All integrations are **intra-project synchronous REST** (messaging disabled). No external
> third-party systems in the MVP. EARS guide: `../../../standards/ears-notation.md`.

This file pins EVNT's **outbound** synchronous calls (EDGE, PAT, ACS, HIST) with their identity,
fallback and circuit-breaker posture, and the **inbound** surface EVNT publishes with its known and
future downstream consumers. The upstream contracts (ACS, PAT, EDGE) are consumed **as-is** and never
modified by EVNT.

---

## 1. Outbound — EVNT → EDGE (`edge-service`) — device-token trust (ADR-002, G5)

EVNT is an **EDGE resource server** on the ingest path. It validates the inbound `edge.device` token
against EDGE JWKS and consults EDGE introspection on this revoke-sensitive path.

| Operation | Target | Auth | Purpose | Fallback |
|---|---|---|---|---|
| Fetch JWKS | `GET {edge.baseUrl}/edge/.well-known/jwks.json` | public | verify `edge.device` token signature | cache last-known key set; `401` if no key available |
| Introspect device token | `POST {edge.baseUrl}/edge/device-tokens/introspect` | ACS service-client | reject a revoked/unpaired device within one TTL (EDGE G1) | on EDGE outage: a signature-valid, unexpired token still passes; check best-effort + logged |

- Resolver: `edge-service` via REG (Eureka); `edge.base-url` for the direct URL.

EARS:

- THE SYSTEM SHALL verify every inbound `edge.device` token against the EDGE JWKS before any authority check, using cached keys if JWKS is briefly unreachable, and SHALL never accept an unsigned token.
- WHEN a gesture report arrives, THE SYSTEM SHALL honor EDGE introspection and reject a revoked/unpaired device `401` (INV-EVNT-6).

## 2. Outbound — EVNT → PAT (`pat-service`) — command snapshot (ADR-004)

At ingest, EVNT resolves the Command's `urgency` + `label` **once** and snapshots them onto the Event
(reads never call PAT — ADR-004).

| Aspect | Value |
|---|---|
| Operation | `GET {pat.baseUrl}/pat/commands/{commandId}` |
| Auth | **ACS-issued service-client JWT** for the `evnt-service` principal, authority `pat.command.read` (`actorType = service-client`) |
| Response used | `label` → `command_label`; `urgency` → `urgency` (snapshot) |
| Discovery | `pat-service` via REG; `pat.base-url` for the direct URL |
| Fallback | **none — fail-closed.** On PAT `404` → `404 command-not-found`; on PAT outage/5xx → `503 catalog-unavailable` + `Retry-After`, no event created (ADR-004, Risk R4) |

EARS:

- WHEN generating an event, THE SYSTEM SHALL resolve `urgency` + `label` from `GET /pat/commands/{commandId}` with the `pat.command.read` service-client token exactly once and snapshot them onto the row (INV-EVNT-2).
- IF PAT returns `404` for `{commandId}`, THEN THE SYSTEM SHALL respond `404 command-not-found` and SHALL NOT create an event.
- IF PAT is unreachable or returns `5xx`, THEN THE SYSTEM SHALL respond `503 catalog-unavailable` with `Retry-After`, create no event, and never guess urgency (fail-closed — ADR-004).
- THE SYSTEM SHALL NOT call PAT with the inbound `edge.device` token (PAT rejects non-service-client `403`); it uses its own cached `evnt-service` service-client token.

> **TODO[architect]:** the exact ACS minting path for the `evnt-service` service-client token
> (client-credentials grant vs provisioned principal) is an ACS concern flagged OPEN by EDGE and PAT
> too; confirm at backlog/scaffold against the live ACS contract. EVNT's side is fixed: a cached
> service-client JWT carrying `pat.command.read`.

## 3. Outbound — EVNT → ACS (`acs-service`) — caregiver trust + who-to-notify

| Operation | Target | Auth | Purpose | Fallback |
|---|---|---|---|---|
| Fetch JWKS | `GET {acs.baseUrl}/acs/.well-known/jwks.json` | public | verify caregiver JWTs on §3–5 paths | cache last-known keys; `401` if none |
| Introspect | `POST {acs.baseUrl}/acs/auth/introspect` | service-client | revocation-aware check on confirm (revoke-sensitive) | on ACS outage: signature-valid unexpired tokens pass; best-effort + logged |
| Resolve links | `GET {acs.baseUrl}/acs/caregivers/{caregiverId}/links` | caregiver token (the caller's) | who-to-notify / read scoping (INV-EVNT-7); `{caregiverId}` = JWT `sub` | short-TTL cache of the caller's links; on outage serve cached links, else `403` (deny — never widen scope) |

EARS:

- THE SYSTEM SHALL verify every inbound caregiver JWT against the ACS JWKS before any authority check, using cached keys if JWKS is briefly unreachable.
- WHEN a caregiver reads/confirms/records an event, THE SYSTEM SHALL confirm the event's `patientId` is in the caller's ACS links and respond `404` otherwise (INV-EVNT-7).
- IF the ACS links lookup fails and no cached links are available, THEN THE SYSTEM SHALL deny the read (`403`) rather than widen scope (fail-closed on authorization).

### 3.1 Cross-module dependency — caregiver phone number for SMS/voice escalation (ADR-005)

The out-of-band escalation (SPEC-11) needs each linked caregiver's **phone number** for Tiers 1–2
(SMS, voice). **ACS does not expose a caregiver phone today** — `GET /acs/caregivers/{id}/links`
returns link scoping, not contact details. EVNT needs, per linked caregiver:

| Field EVNT needs | Purpose |
|---|---|
| `phoneE164` | SMS + voice destination (`+55…`) |
| `smsCapable` / `voiceCapable` | whether the number can receive each channel |
| `notifyConsent` | caregiver consent to be contacted out-of-band |
| `preferredLocale` (optional) | voice/SMS message language |

**This file does NOT modify ACS.** The need is recorded as a **cross-module `INT` issue to be opened at
backlog** — *INT-EVNT-ACS-001: ACS to expose caregiver notification contacts (phone, capability,
consent) to EVNT*. Candidate shapes (ACS decides): extend the links response with a `contact` block, or
a new `GET /acs/caregivers/{id}/notification-contacts`. Until ACS provides it, Tiers 1–2 record a
`failed` attempt reason `no-contact` (never silent — ESC-5); Tier 0 Web Push is unaffected (its data
lives in EVNT's `push_subscription`).

EARS:

- WHERE a linked caregiver has no reachable `phoneE164` from ACS, THE SYSTEM SHALL record the SMS/voice attempt as `failed` reason `no-contact` and still attempt the remaining channels (ESC-5).
- IF a caregiver's `notifyConsent` is false, THEN THE SYSTEM SHALL NOT attempt SMS/voice to that caregiver (consent-gated), recording `failed` reason `no-consent`.

## 4. Outbound — EVNT → HIST (`hist-service`) — audit sink

| Operation | Target | Auth | Purpose |
|---|---|---|---|
| Record audit | `POST {hist.baseUrl}/audit` | service-client carrying `hist.audit.record`, `X-Correlation-Id` echoed | append-only audit of `EventGenerated` / `AlarmConfirmed` / `FeedbackRecorded` / `EscalationAttempted` / `DetectionLapse*` |

- Envelope: identical to ACS/PAT/EDGE (event-contracts §1.1). Resolver: `hist-service` via REG (`lb://hist-service/hist`); `hist.base-url` / `HIST_BASE_URL` for the direct URL and **MUST include the `/hist` segment** (dev `http://localhost:8083/hist`) so the literal `POST {hist.baseUrl}/audit` reaches `/hist/audit` (D-640). The service-client JWT **MUST carry `hist.audit.record`** (hist-service api-contract §1). Config/token tracked by **INT-EVNT-ACS-003**.
- Failure policy resolved by HIST ADR-005 (`event-contracts.md` §1): every EVNT fact except `FeedbackRecorded` is commit+durable-retry (SAFETY); `FeedbackRecorded` is hard-502 (`502 audit-unavailable`). Durable retry tracked by **EVNT-037**.

## 5. Outbound (not a runtime call) — EVNT → MIG (`neuroassist-niv-migrations`)

EVNT **authors** Flyway scripts (`data-model.md` §4, reserved `V0040`–`V0046`) that MIG applies
centrally to `neuroassist_global` and each `t_<tenantId>` schema. No per-service Flyway runner.

## 6. Resilience posture

| Dependency | Pattern | Timeout / retry |
|---|---|---|
| EDGE JWKS | cache + refresh | long-cache keys; no retry storm |
| EDGE introspect | fail-open-on-outage, best-effort | 1 attempt, short timeout (revoke check is additive to signature) |
| PAT command read | **fail-closed**, no fallback | short timeout; station's own at-least-once retry re-drives ingest; EVNT does not internally retry a 5xx (avoids duplicate PAT load) |
| ACS JWKS / links | cache + fail-closed on authz | cached keys/links on brief outage; deny on hard failure |
| HIST audit | in-band, policy-driven | per HIST failure policy (prod `502` / dev log-only) |
| Emergency notification (push/SMS/voice) | out-of-band, async sweep; retry+advance (ESC-5/6) | capped backoff per tier; failure advances tier + audited, never silent (§8, SPEC-11) |

EVNT exposes **no** circuit breaker that silently drops a safety signal: the only "degrade" on the
ingest path is fail-closed with a retryable status (`503`), never a fabricated event.

---

## 7. Inbound — EVNT publishes (downstream exposure)

The surface EVNT exposes and who consumes it:

| Consumer | How it consumes EVNT | v1 wired? |
|---|---|---|
| **DASH** (`evnt-ui` dashboard) | **polls** the read surface — `GET /evnt/patients/{id}/active-alarm` (short interval) and `GET /evnt/patients/{id}/events`; renders full-screen alarm vs toast by `urgency`; calls `POST .../confirmation` and `POST .../feedback` (ADR-003) | **yes** — primary consumer |
| **GEST** (edge station / detection) | **produces** the gesture report EVNT ingests — `POST /evnt/gesture-reports` with the `edge.device` token carrying `evnt.event.ingest`; GEST owns detection truth, EVNT trusts the resolved `commandId` (ADR-002) | **yes** — the ingest producer |
| **EDGE** (`edge-service` **backend**) | **produces** detection-lapse raises/resolves EVNT ingests — `POST /evnt/detection-lapses` + `.../{lapseId}/resolution` with an **ACS service-client** token (`edge-service`), distinct from the station's §1 gesture path (ADR-006 / §9) | **yes** — SAFETY-GEST-1 |
| **HIST** (`hist-service`) | **receives** EVNT's audit writes (`POST /audit`): `EventGenerated` / `AlarmConfirmed` / `FeedbackRecorded` / `EscalationAttempted` / `DetectionLapse{Raised,Resolved,Acknowledged}` — append-only trail (event-contracts §1) | **yes** — audit sink |
| **CONV** (conversation / communication) | **not wired in v1 — superseded for the escalation use case.** Out-of-band emergency delivery is now handled **inside EVNT** by the escalation policy + `EmergencyNotificationPort` (ADR-005 / SPEC-11, §8 below), not by a separate CONV consumer. CONV remains a possible future consumer for non-safety messaging; the escalation path no longer waits on it | **no** — not needed for SAFETY-1 |

EARS — inbound exposure:

- THE SYSTEM SHALL expose the event state exclusively through the §3–5 REST surface; it SHALL open no socket and push to no consumer (ADR-003).
- WHERE CONV or a push transport is later adopted, THE SYSTEM SHALL keep the audited action names unchanged so they become message names without renaming (doc 03).

---

## 8. Outbound — EVNT → emergency notification providers (`EmergencyNotificationPort`, ADR-005 / SPEC-11)

The out-of-band escalation (SPEC-11) calls out through **one provider-agnostic outbound port**,
`EmergencyNotificationPort`, with per-channel adapters. The port is the contract; the providers are
adapters that can be swapped. These are **outbound integrations** (HTTPS/SDK), **not** the internal
message bus — `stack.messaging.enabled = false` is not reopened (ADR-005).

| Tier | Channel | Adapter | Provider / transport | Identity |
|---|---|---|---|---|
| 0 | Web Push | `WebPushAdapter` | browser push service via **VAPID** (Web Push Protocol, HTTPS) | VAPID key pair (server secret); subscription `endpoint`+keys from `push_subscription` |
| 1 | SMS | `AwsSmsAdapter` | **AWS End User Messaging (SMS)** in the project's selected Region | AWS IAM (service role / SDK creds) |
| 2 | Voice | `AwsVoiceAdapter` | **AWS End User Messaging (Voice)** in the project's selected Region | AWS IAM (service role / SDK creds) |

- **Resilience:** per-tier retry with capped exponential backoff (`EVNT_ESCALATION_PROVIDER_MAX_RETRIES`,
  SPEC-11 ESC-6); on exhaustion the attempt is `failed` and the policy advances to the next tier
  (ESC-5). A Web Push `410 Gone` retires the subscription (`push_subscription.revoked_at`). No channel
  failure is silent — each is persisted and audited (`EscalationAttempted`).
- **Provider-agnostic:** the AWS adapters implement the same port; swapping to another SMS/voice
  provider changes an adapter, not the policy or the port.

**TODO[architect] — AWS End User Messaging (confirm before enabling telephony tiers):**

- Confirm the **project Region** in AWS Settings (> View all projects > Overview > Additional Info >
  Region). All Regional resources (SMS/voice origination, config) must be in that selected Region —
  **no cross-Region** (CLAUDE.md constraint).
- Confirm **AWS End User Messaging (SMS + Voice) availability** in the selected Region and the
  **origination / sender requirements for Brazilian (+55) numbers** (sender identity: long code /
  short code / sender ID as applicable; voice origination; any registration/onboarding).
- Confirm the **account plan** supports AWS End User Messaging (free vs paid; advanced-feature
  activation) — `aws freetier get-account-plan-state` + the supported-services list.
- Keep `EmergencyNotificationPort` provider-agnostic so the SMS/voice adapter can change without
  touching SPEC-11.
- **Open cross-module `INT-EVNT-ACS-001`** (§3.1) — ACS must expose the caregiver phone before Tiers
  1–2 can resolve a destination.

EARS — provider port:

- THE SYSTEM SHALL invoke every out-of-band channel through `EmergencyNotificationPort`, never binding the escalation policy to a concrete provider (ADR-005).
- WHEN a provider call fails after its retries, THE SYSTEM SHALL mark the attempt `failed`, advance to the next tier, and audit the failure — never drop it silently (ESC-5 / ESC-7).
- THE SYSTEM SHALL create all AWS End User Messaging resources in the project's selected Region and SHALL NOT make a cross-Region call (CLAUDE.md constraint).

---

## 9. Inbound — EDGE backend → EVNT — detection-lapse raise/resolve (ADR-006 / SPEC-12, SAFETY-GEST-1)

This is the EVNT side of EDGE integration-contracts §6.2 (G6). It is a **backend-to-backend** inbound
surface distinct from §1 (the station's `edge.device` gesture path). EDGE raises a detection-lapse
episode (station connected but not detecting, or heartbeat stopped, for `N` s) to EVNT, which owns the
alerting/escalation (SPEC-12, reusing the ADR-005 ladder). **EVNT does not modify EDGE**; it confirms
the contract EDGE specified and pins the EVNT-owned authority strings.

| Aspect | EVNT's side (fixed by this amend) |
|---|---|
| Raise endpoint | `POST /evnt/detection-lapses` (op `createDetectionLapse`, api-contract §10.1) — `201` new / `200` idempotent replay |
| Resolve endpoint | `POST /evnt/detection-lapses/{lapseId}/resolution` (op `resolveDetectionLapse`, api-contract §10.2) — `200`; `404` on unknown `lapseId` |
| Caller identity accepted | an **ACS-issued service-client JWT** for the `edge-service` principal (`actorType = service-client`); **never** the `edge.device` station token |
| Authority (EVNT namespace) | `evnt.detection-lapse.create` (raise) and `evnt.detection-lapse.resolve` (resolve) — EVNT chose `create` because `raise` is not a listed op verb (api-contract §0); these supersede EDGE's illustrative `evnt.detection-lapse.raise`/`.resolve` placeholders |
| Idempotency | `Idempotency-Key` header, EDGE's stable per-episode key; EVNT dedups on `(tenant_id, idempotency_key)` (`uq_detection_lapse_idem`, LAPSE-2) |
| Payload accepted | `{ deviceId, patientId, tenantId, cause (NOT_RUNNING\|HEARTBEAT_STOPPED), detectionState, reason, lastDetectingAt, lapseStartedAt, engineVersion }` + `X-Correlation-Id` |
| Discovery | EDGE finds `evnt-service` via REG (Eureka) / `evnt.base-url`; EVNT only receives |

EARS:

- WHEN EVNT receives a detection-lapse raise with a valid `edge-service` service-client token carrying `evnt.detection-lapse.create` and an `Idempotency-Key`, THE SYSTEM SHALL open (or idempotently return) the episode and begin alerting/escalation (SPEC-12 LAPSE-1/LAPSE-4).
- IF the raise/resolve path receives an `edge.device` token (the station's §1 right) or a token lacking the EVNT detection-lapse authority, THEN THE SYSTEM SHALL respond `401`/`403` and SHALL NOT open an episode (SPEC-06).
- WHEN EVNT receives a resolve for a known open lapse, THE SYSTEM SHALL stop escalation and audit `DetectionLapseResolved`; IF the `lapseId` is unknown, THEN THE SYSTEM SHALL respond `404` so EDGE retries (EDGE §6.2 fallback).

> **INT TODO[architect] — INT-EVNT-ACS-002 (ACS must mint the `edge-service` service-client token):**
> ACS must issue a service-client JWT for the `edge-service` principal carrying the EVNT-namespace
> authorities `evnt.detection-lapse.create` + `evnt.detection-lapse.resolve`. This closes EDGE
> integration-contracts §6.2's INT TODO **on the EVNT side** (the endpoint paths, the authority strings
> and the idempotency semantics are now fixed here). The ACS minting path (client-credentials grant vs
> provisioned principal) is the **same open ACS item** flagged for EVNT→PAT/EDGE/HIST (§2, §4); confirm
> against the live ACS contract at backlog/scaffold. **Do not edit ACS or EDGE here.** The caregiver
> phone source for SMS/voice remains `INT-EVNT-ACS-001` (§3.1).
