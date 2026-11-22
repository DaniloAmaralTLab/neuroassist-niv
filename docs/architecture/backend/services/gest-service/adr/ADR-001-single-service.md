<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — Single thin service for GEST

## Status
accepted

## Contexto
GEST's backend responsibility is small (ADR-002): the detection-engine capability registry. The
question is whether to stand up a dedicated `gest-service` at all, fold it into PAT, or split it.
Forces: INV-PAT-6 explicitly names GEST (not PAT) as the owner of engine-support truth; PAT must stay
free of detection-engine knowledge; the registry is read-mostly and low-volume; the project is a
modular monolith of per-module services (shared ADR-002-modular-monolith) with one service per module
prefix, and `GEST` is already a registered module with `backendService = gest-service`.

## Decisão
We ship **one single, thin `gest-service`** — not decomposed, not folded into PAT. Keeping it separate
honours the module boundary and INV-PAT-6 (the support truth lives in a service PAT *consumes*, not in
PAT itself). It exposes two application services under two path roots (`/gest/engines`,
`/gest/capabilities`, D-640); no internal sub-services, no sagas, no second datastore.

## Consequências
- Positive: clean ownership of the INV-PAT-6 seam; PAT stays ignorant of engine internals; the service
  is trivial to operate and reason about.
- Positive: the `gest.*` authority namespace reserved by ACS gets a real resource server.
- Negative: one more deployable for a very small surface; mitigated by how little it changes (only on
  engine releases).
- Trade-off accepted: a dedicated service for a thin domain is justified by boundary clarity over
  minimising service count.
