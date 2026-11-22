<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — Command catalog distribution to detection actors

## Status
proposta

## Contexto

GEST (detection) and EDGE (device agent) need the **active command catalog** for a
patient — primitives, calibration window and sensitivity — to detect anything. But the
runtime actor on the patient's device holds an ACS **patient-session** token whose
authorities are restricted to `conv.*` / `gest.*` only, with no `acs.*` and (by the same
INV-3 principle) no `pat.*` (ACS api-contract §0.2, INV-3). So the obvious "edge reads
PAT with the patient's token" path is closed by design, and we must not weaken INV-3 by
granting the patient session a `pat.*` authority. Messaging is disabled, so there is no
broker to push the catalog either.

## Decisão

We will distribute the catalog by **sync REST pull using a service-client identity, not
the patient-session token**. The detection-side *service* (GEST/EDGE backend) reads
`GET /pat/patients/{patientId}/commands?status=active` authorized by a `pat.command.read`
authority held by the service client (analogous to ACS's service-client introspection),
and relays the thresholds to its local agent. The caregiver-facing read path (DASH) uses
the caregiver token with `pat.command.read`. The exact endpoint shape, a cache/ETag
strategy for the edge, and the precise service-client authority are finalized in Specs.

## Consequências

- **Positive:** ACS INV-3 is preserved — the patient session never gains a `pat.*`
  authority; the catalog reaches the edge through a trusted service hop.
- **Positive:** pull + sync REST matches the messaging-disabled constraint; a later
  broker can publish `CommandCalibrated` to invalidate edge caches without changing
  ownership.
- **Negative / trade-off:** the edge depends on connectivity to read/refresh the catalog;
  an offline edge runs the last-fetched catalog (define staleness tolerance + cache in
  Specs / EDGE).
- **Negative / trade-off:** introduces a service-client authority surface that Specs must
  pin down precisely; left `proposta` until that contract exists (doc 06 G3).
