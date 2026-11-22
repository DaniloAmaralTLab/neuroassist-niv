# ADR-012 — Patient identity model with persistent session

> **Date:** 2026-08-30 (promoted to `accepted` on 2026-08-30)
> **Status:** accepted
> **Decider:** Danilo Amaral (architect, combined role — see ORG-001 in constraints.md) — **decision closed**: Option C (new actor "Patient with session" in `acs-service`).

---

## Context

Today (real code, `acs-service`/`pat-service`) there are 3 identities, never overlapping:

- **Caregiver** (`acs-service`) — the only actor with a real login (user/password), issues a JWT.
- **Edge device** — service identity (`client_credentials`), never a person.
- **Patient** (`pat-service`) — no credential at all; resolved indirectly via `edge_device.patient_id` (pairing).

The post-handoff briefing (§3.2) asks for a new case: the patient activates the device from their own mobile phone, with the caregiver logging in *on behalf of* the patient and that session being kept **maintained, without expiring** — unlike the normal caregiver session. It is not the patient's own credential (no password/PIN/QR of their own); it is a session provisioned by the caregiver and persisted on the patient's device.

This has to coexist, in the same **already-implemented** system, with the current majority case (patient with no credential). The change to the schema/identity model has a real cost: `acs-service` today only models the caregiver as an authenticable actor; introducing any of the options below touches authentication in production.

## Options considered (none chosen — briefing §3.2 records the 3, without deciding)

### Option A — Long-lived device token bound to the patient

The patient's mobile phone receives a long-lived device token (not a person token), bound to the `Patient`, analogous to the `client_credentials` token that the fixed edge device already uses today — but with a direct link to the patient instead of only to the tenant.

- **Advantages:** reuses the existing device-identity pattern (`edge-service`); does not introduce a new type of human actor in `acs-service`
- **Disadvantages:** a long-lived device token still needs a revocation mechanism (see constraint SEC-001) that does not exist today for device tokens — it would have to be built
- **Cost:** medium — extension of the existing device identity model, does not introduce a new actor in `acs-service`

### Option B — "Delegated" caregiver session carried internally by the patient's app

The login remains the caregiver's (real caregiver JWT), but the patient's app keeps that session internally and uses it as if "acting on behalf of". It is not a new actor — it is a way of using the existing actor.

- **Advantages:** no schema change in `acs-service` — reuses 100% of the caregiver authentication model already implemented
- **Disadvantages:** semantically odd (the patient's app acts "as" the caregiver, without representing the patient); the caregiver JWT has a standard TTL — a "non-expiring" session would require special handling only for this flow, breaking the uniformity of the caregiver token model in production; risk of excessive scope (the caregiver's session, if leaked from the patient's mobile phone, gives full access to the caregiver role)
- **Cost:** low in schema, but high in security risk and in an exception to the token model already in production

### Option C — Something new (actor "Patient with session" as its own identity, distinct from caregiver and from device)

A fourth type of identity in `acs-service`, specific to the patient-with-session, with its own lifecycle (provisioned by the caregiver, no expiration, revocable).

- **Advantages:** semantically more correct modeling — the actor that acts is the patient, not the caregiver nor a generic device
- **Disadvantages:** higher implementation cost — new actor type in `acs-service`, new issuance/revocation flow, one more authentication path to maintain and audit in production
- **Cost:** high — new schema, new authentication flow, more audit surface

## Decision

**Closed on 2026-08-30 by Danilo Amaral: Option C.** Introduce a fourth type of identity in `acs-service` — "Patient with session" — distinct from caregiver and from edge device, with its own lifecycle: provisioned by the caregiver, no expiration, revocable by the caregiver at any time. It is the semantically correct option (the actor that acts is the patient, not the caregiver "in disguise" nor a generic device token) and the one that gives granular RBAC from the start — the patient's app is born with authority only over CONV/GEST, inheriting nothing from the caregiver (Option B) nor mixing person identity with service identity (Option A).

## Rationale

Prioritizes model correctness and audit trail (HIST records the action as coming from the patient's session, not from the device nor from the caregiver) over lower implementation cost — the higher cost (new schema, new issuance/revocation flow) is accepted because patient-with-session is a first-class actor in the product (the speech tree in CONV is precisely their direct interaction), not an edge case to be patched on top of an existing mechanism.

## How to reverse if the decision proves wrong

High cost — the new actor schema in `acs-service` would need to be undone/migrated if the decision proves wrong. Mitigation: isolate the new actor in its own tables/flows from the start (do not mix with `caregiver`), so that reversing means removing the new actor, not undoing changes to `caregiver` already in production.

## Signals that it is wrong

- The cost of maintaining a fourth actor type proving disproportionate to the real volume of patients with a session (today: 1 pilot patient) — reassess if the product grows without this pattern repeating.
- The issuance/revocation flow of the new actor introducing an audit surface redundant with the caregiver's, with no real gain in RBAC granularity.

## Complementary decisions closed on 2026-08-30 (RBAC and revocation)

**RBAC (briefing question 3) — ✅ decided:** the patient's mobile phone carries **two simultaneous and independent identities**, not just one:
- **Device token** (`edge.device`) — for reporting a gesture via GEST, in the same model as the "station" of `gest/frontend` ADR-008 D1 (see ADR-014 of this amendment). This token is not the "Patient with session" actor of this ADR-012 — it is the device identity already existing in EDGE, reused.
- **Patient session** (the "Patient with session" actor defined above) — authorities restricted to `conv.tree.navigate` / `conv.node.select` (provisional names; the architect may rename when designing the real schema). No management/caregiver authority in either identity.

**Revocation (briefing question 4, constraint SEC-001) — ✅ decided:** the caregiver revokes the patient session from their own screen in ACS; **immediate** invalidation, via the **blacklist mechanism already existing** in the real project for revoking stateless JWTs (`neuroassist-ai/docs/architecture/shared/rbac/session-policy.md` — "Blacklist is necessary because JWT is stateless"). It is not a new mechanism to invent — it is reuse of what already protects caregiver session revocation. The revocation action is audited in HIST, like any caregiver action on a patient.

## TODO[architect]

The decisions on identity model, RBAC and revocation mechanism are closed (Option C + CONV/GEST-report authorities + reused blacklist). What remains is to design: the schema of the "Patient with session" actor in `acs-service` (its own table, isolated from `caregiver`), the concrete issuance/provisioning flow by the caregiver, and the integration of the revocation flow with the existing blacklist (confirm whether the current mechanism supports the "no expiration, revocable at any time" lifecycle without adaptation, or needs an extension).
