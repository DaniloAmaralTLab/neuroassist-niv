<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Patient session revocation via reused JWT blacklist

## Status
aceita

## Contexto
The patient-with-session (ADR-002, ADR-012) is **non-expiring** by design — the
patient cannot "log in again" on their own, so the session must persist. Constraint
SEC-001 makes a revocation mechanism mandatory, not optional: a lost/stolen phone, a
device swap or a patient discharge must let the caregiver end the session. JWTs in
NeuroAssist NIV are stateless, and the real project already ships a blacklist for
revoking stateless caregiver JWTs (`rbac/session-policy.md` — "Blacklist is necessary
because JWT is stateless"). Inventing a second, session-specific revocation mechanism
would duplicate audit surface and diverge from production.

## Decisão
We **reuse the existing stateless-JWT blacklist** for patient-session revocation. A
caregiver revokes the session from their ACS screen (authority
`acs.patient-session.revoke`); ACS marks the `patient_session` row `revoked`
(terminal) and adds the token identifier to the blacklist in the same transaction, so
invalidation is **immediate** — the next request from the device is rejected. The
action is audited in HIST (`PatientSessionRevoked`). Re-enabling access requires
provisioning a **new** session; a revoked session is never reactivated.

## Consequências
- Positive: reuse over invention — one revocation path, one audit surface, consistent
  with caregiver-session revocation already in production.
- Positive: immediate, synchronous invalidation fits an access-ending action (no async
  propagation delay tolerated).
- Negative / trade-off: the blacklist was built for TTL-bounded caregiver JWTs;
  non-expiring patient sessions mean a blacklist entry may need to be retained longer
  (until the token could no longer be presented). **TODO[architect]:** confirm the
  current blacklist supports the "no-expiry, revocable at any time" lifecycle without
  adaptation, or scope a minimal additive extension — do not redesign the mechanism.
