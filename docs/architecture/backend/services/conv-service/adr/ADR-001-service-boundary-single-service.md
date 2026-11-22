<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — Service boundary: single service, single bounded context

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner.

## Contexto
CONV owns the published-tree runtime for a patient: the immutable, versioned tree bundle
(structure + audio manifest), the cached audio it serves, the offline-bundle contract to the
station, and an optional minimal usage signal. These concerns share one `PublishedTree` lifecycle
and the same schema-per-tenant invariants. Authoring/curation and audio synthesis (TRN), gesture
detection (GEST), events/alarms (EVNT), patient/command data (PAT), caregiver identity and sessions
(ACS) and device identity (EDGE) are owned elsewhere. The question is whether CONV should be one
service or be decomposed (e.g. a separate audio-serving service).

Options: **(A) single service, single bounded context**; **(B) decompose** tree-serving from
audio-serving (or carve out a search service).

## Decisão
**Adopt Option A — a single service, single bounded context.** Tree serving, audio serving, the
offline bundle and usage all turn on the same `PublishedTree`/`TreeVersion` aggregate and tenant
rules; splitting them would scatter one lifecycle across services and add network hops to a runtime
whose defining constraint is *no network on the patient's path*. Retrieval and audio-store concerns
are isolated behind ports (`SearchPort`, `AudioAssetPort`), which gives the extensibility a
decomposition would, without the operational cost. CONV stays runtime-only; authoring stays in TRN.

## Consequências
- Positive: one lifecycle, one set of invariants, fewer moving parts; no intra-CONV network hop.
- Positive: ports (`SearchPort`, `AudioAssetPort`) leave room to swap implementations or extract a
  component later without a contract change.
- Negative: audio serving and tree serving scale together (one deployable); acceptable for MVP
  volume and revisable if audio egress later dominates.
