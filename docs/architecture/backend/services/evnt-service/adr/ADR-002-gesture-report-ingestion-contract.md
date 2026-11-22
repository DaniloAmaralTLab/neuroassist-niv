<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Gesture-report ingestion contract and edge-device trust (closes G5 / INT-EDGE-001)

## Status
aceita

## Contexto
EDGE deliberately left gap **G5 / INT-EDGE-001** OPEN: the edge station reports a recognized gesture
to EVNT using its `edge.device` token, but "the report endpoint and payload belong to EVNT" (EDGE
`integration-contracts.md` §6). EDGE fixed only its own side — the `edge.device` token carries
`deviceId`, `patientId`, `tenantId`, `actorType = edge-device`, is signed by EDGE and verifiable via
EDGE JWKS (`/edge/.well-known/jwks.json`) and revocation-checkable via EDGE introspection
(`POST /edge/device-tokens/introspect`) — and embedded a reserved "EVNT gesture-report right" whose
**authority string EVNT must name**. EVNT must define: the endpoint, the payload, the idempotency
rule, the trust/validation chain, and that authority string. The station delivers at-least-once and
may retry.

## Decisão
EVNT **owns and hereby fixes the gesture-report contract**, closing G5:

- **Endpoint:** `POST /evnt/gesture-reports` — the single ingestion endpoint; authenticated by the
  `edge.device` token (no caregiver JWT accepted on this path).
- **Authority:** the `edge.device` token must carry **`evnt.event.ingest`** (D-639: `ingest` is a
  domain verb kept as its own action). This is the authority string EDGE embeds in the `edge.device`
  token — aligning EDGE's reserved "EVNT report right" with EVNT's namespace and closing EDGE's
  TODO[architect]. EVNT's controller `@PreAuthorize` equals this constant.
- **Trust chain:** EVNT is an **EDGE resource server** on this path — it validates the token
  signature against **EDGE JWKS**, and consults **EDGE introspection** on this revoke-sensitive path
  so a revoked/unpaired device is rejected `401` within one TTL at worst and immediately when
  introspected (EDGE G1).
- **Identity from claims, never body:** `deviceId`, `patientId`, `tenantId` are taken from the token
  claims; any value in the request body is ignored (INV-EVNT-6, anti-forgery).
- **Payload (minimum, finalized at specs):** `{ commandId, reportId, occurredAt }`. The station
  resolves the recognized Command locally from the offline catalog (GEST/EDGE truth) and reports the
  `commandId`; it does not send landmarks.
- **Idempotency:** exactly-once on `(deviceId, reportId)` (DB UNIQUE + application dedup, INV-EVNT-4);
  a replay of a consumed `reportId` returns the existing event (`200`) with no second audit; a new
  report creates one event (`201`) and audits `EventGenerated`.

## Consequências
- Positive: G5 / INT-EDGE-001 is closed with a self-contained, idempotent, forgery-resistant contract
  that reuses EDGE's existing JWKS + introspection machinery — no new trust infrastructure.
- Positive: the authority `evnt.event.ingest` gives EDGE the exact string to embed, removing the
  cross-team ambiguity EDGE flagged.
- Negative / trade-off: EVNT must trust a **second** JWT issuer (EDGE) in addition to ACS on
  different paths — a dual resource-server security config. Accepted; mirrors EDGE's own
  dual-role setup.
- Follow-up: `ingest` must be registered in `scripts/arch_decisions.py _OP_VERB_TO_ACTION` before
  `/be-architect-scaffold` (Learning D-531) or controller generation fails. The full request/response
  schema and PAT-resolution degrade policy are finalized at `/be-architect-specs`.
