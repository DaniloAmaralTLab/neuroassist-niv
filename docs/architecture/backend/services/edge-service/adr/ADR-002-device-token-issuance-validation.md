<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Edge device token issuance and validation

## Status
aceita

## Contexto
The edge station is a non-human actor and must authenticate as a **device**, never as a
person (ADR-014 D1: `edge.device` token only). Two upstream decisions constrain where that
credential comes from: ACS `ADR-002-identity-and-authority-model` states "edge device token
— owned by EDGE; ACS validates but does not mint it", and ADR-012 keeps the device token
distinct from the patient-with-session token that coexists on the same phone. ACS is the
platform's authorization server for *human* identities, but it deliberately does not issue
the device credential. So EDGE must be the authorization endpoint for the device identity —
and the open question is how PAT/EVNT (which the station or EDGE calls) validate that token,
and how a revoke takes effect immediately.

## Decisão
EDGE is the **device authorization endpoint**: on a successful pairing claim it mints the
`edge.device` token, carrying `actorType = edge-device`, `deviceId`, `patientId`,
`tenantId`, and authorities restricted to `edge.heartbeat.record` / `edge.catalog.read`
(plus the right to report a gesture to EVNT) — never any management, `acs.*`, `pat.*` or
patient-session authority. Resource servers validate EDGE-issued device tokens the same way
they validate ACS tokens — via a published **JWKS** — so EDGE's signing key is trusted
alongside ACS's across the resource servers (GWY/PAT/EVNT). Immediate revocation is owned by
EDGE; the concrete mechanism (an EDGE introspection endpoint checked on sensitive calls, or
a short token TTL refreshed on heartbeat) is finalized in specs (Gap G1), defaulting to
heartbeat-coupled short-TTL refresh with an introspection fallback.

## Consequências
- Positive: realizes ACS ADR-002 and ADR-014 D1 without ACS minting a device token;
  least-authority by construction — a leaked device credential reaches no management scope.
- Positive: a single JWKS-based validation fabric for both human and device tokens keeps
  resource servers uniform.
- Negative / trade-off: EDGE now carries signing-key custody and a revocation path — more
  security surface than a pure resource server. Accepted because the device identity is
  core to the product and must not be grafted onto ACS's human-identity model. The exact
  immediate-revoke mechanism remains an open gap to close in specs (G1).
