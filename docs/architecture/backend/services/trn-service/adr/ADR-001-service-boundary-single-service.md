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
TRN spans several concerns that could tempt a split: an LLM dialog, voice synthesis, an
Elasticsearch index, consent, and a publication pipeline to CONV. Each touches a different external
system (Anthropic, ElevenLabs, ES, CONV). The question is whether the authoring phase is one service
or several. The project is a modular monolith direction (shared ADR-002) with schema-per-tenant
(shared ADR-003); the other finished services (CONV, PAT, ACS, HIST, EDGE, EVNT, GEST) are each a
single service with vendor concerns isolated behind ports.

## Decisão
**Keep `trn-service` as one service, one bounded context.** The whole authoring lifecycle —
session, assistant dialog, proposal + dual authorization, voice-cloning consent, voice samples/model,
synthesized audio, approved-content index, and the publication to CONV — lives in one service. Each
external system is isolated **behind a port inside the service**: `LlmDialogPort` (Anthropic),
`TtsPort` (ElevenLabs), `SearchIndexPort` (Elasticsearch), `TreePublicationPort` (CONV),
`PatientReferencePort` (PAT), `AuditPort` (HIST). No decomposition in v1. Alternatives rejected:
(A) a separate "synthesis service" and "dialog service" — premature, adds network hops and
distributed-transaction complexity to a human-paced flow; (B) folding authoring into CONV — rejected
by CONV ADR-005 (CONV is runtime only; synthesis/consent belong to TRN).

## Consequências
- Positive: the authoring lifecycle is transactional and simple to reason about; vendor blast radius
  is contained behind ports without a service split.
- Positive: consistent with the other NeuroAssist services and the modular-monolith direction.
- Positive: the TRN↔CONV boundary stays a clean one-directional contract (authoring → runtime).
- Negative / trade-off: one service holds three external-processor integrations; mitigated by the
  port isolation and in-service durable-retry jobs, and revisitable if one integration's scale or
  failure profile later justifies extraction behind the same port.
