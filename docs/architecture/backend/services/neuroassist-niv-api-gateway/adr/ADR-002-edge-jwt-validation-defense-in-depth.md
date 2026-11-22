<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Coarse edge JWT validation (two issuers) with defense in depth

## Status
aceita

> Orchestrator default (recommendation) — revisable by the owner (recorded without a
> clarifying question in automated mode).

## Contexto
The gateway can either pass tokens through untouched (trusting the resource servers entirely)
or perform its own validation at the edge. Two token issuers exist, each publishing a JWKS:
**ACS** mints caregiver and patient-session tokens (`../acs-service/contracts/api-contract.md`
§0.2), and **EDGE** mints `edge.device` tokens — EDGE `ADR-002-device-token-issuance-validation`
explicitly names **GWY** among the resource servers that must trust EDGE's signing key
*alongside* ACS's. Two constraints shape the check: patient-session tokens are **non-expiring**
(no `exp`, ACS §4.1 / ADR-003), and revocation is a stateless `jti`-blacklist honored
downstream (ACS introspect), not something a stateless edge can see without a per-request hop.

## Decisão
GWY performs a **coarse, stateless edge check** on every protected route: it verifies the JWT
**signature**, **issuer**, and **expiry when present**, against **both** the ACS JWKS and the
EDGE JWKS (multi-issuer trust fabric). An absent `exp` is treated as valid (patient-session
tokens are non-expiring by design) — expiry is enforced only when the claim exists. The check
is **advisory, not terminal**: resource servers still re-validate the token and enforce
`@PreAuthorize`/RBAC and the `jti`-blacklist/revocation check (RULE-07, `rbac.arch.json`).
The gateway does **not** call ACS introspect per request (latency + coupling); immediate
revocation remains a downstream responsibility. Public paths (login, both JWKS, pairing,
health) bypass the check (ADR per anonymous allow-list, see ADR-004/ADR-005 context).

## Consequências
- Positive: cheap, stateless rejection of unsigned/forged/wrong-issuer/expired tokens at the
  edge, before any backend is touched — a real first line without a per-request introspect hop.
- Positive: one validation fabric for both human and device identities; `edge.device` tokens
  are admitted because the EDGE JWKS is trusted (INV-G6).
- Positive: defense in depth — the coarse check never replaces RBAC or revocation; a bug at
  the edge cannot grant authority a resource server would deny.
- Negative / trade-off: a token revoked after issuance still passes the **edge** check until
  the resource server rejects it (the edge is blacklist-blind); accepted because revocation is
  authoritative downstream and a per-request introspect would couple and slow the edge. If a
  route ever needs edge-level revocation, an optional introspection hop can be added for that
  route only (ties to EDGE Gap G1).
- Negative / trade-off: the gateway must fetch and cache **two** JWKS and handle key rotation
  for both; a misconfiguration that trusts only one issuer breaks the other's clients (Risk R1).
