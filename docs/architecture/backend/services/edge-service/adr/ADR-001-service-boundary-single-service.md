<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — EDGE service boundary: single service

## Status
aceita

## Contexto
EDGE owns the edge-device lifecycle: enrollment, the pairing-code claim flow, `edge.device`
token issuance and revocation, heartbeat liveness, and the offline command-catalog cache.
These concerns share one aggregate (`EdgeDevice`) and one invariant surface — tenant
isolation, least-authority device token, pair-before-operate, single-use pairing code. The
project direction is a modular monolith (shared ADR-002, placeholder), and the sibling
services ACS and PAT are each a single service. The question is whether to split EDGE
further (e.g. a separate token service or a separate catalog-cache service).

## Decisão
We keep EDGE as a **single service** (`edge-service`), one bounded context. Pairing-code,
device-token and cached-catalog logic are not split out, because they must enforce the same
tenant and lifecycle invariants transactionally and splitting them would scatter the device
authority surface and multiply tenant-scope checks. `Patient` (PAT) and `Caregiver`/
`PatientSession` (ACS) stay outside EDGE and are referenced by id, with no cross-service FK.

## Consequências
- Positive: one cohesive device-authority surface; the `EdgeDevice` state machine and its
  invariants live in a single transactional boundary; matches the ACS/PAT pattern.
- Positive: simplest unit to reason about for a single-device pilot.
- Negative / trade-off: EDGE concentrates issuance, liveness and catalog caching; if one
  later needs independent scaling (unlikely at pilot volume) a split would be required.
  Accepted — decomposition is a reversible, per-service decision that does not touch other
  modules.
