# CONV — Architecture Decision Records (service-local)

Service: `conv-service` · Module: CONV — Conversation via Speech Tree · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | Service boundary: single service, single bounded context | aceita | local |
| ADR-002 | Retrieval without Elasticsearch: a SearchPort with a PostgreSQL v1 adapter | aceita | local |
| ADR-003 | Offline-first tree + audio cache (SAFETY) | aceita | local |
| ADR-004 | Input-channel-agnostic navigation via an in-process station seam | aceita | local |
| ADR-005 | Patient-voice TTS: runtime/authoring boundary and consent (SAFETY/COMPLIANCE) | aceita | local |
| ADR-006 | What CONV persists, which facts go to HIST, and the conv.* authorities (SAFETY/privacy) | aceita | local |

> All six are orchestrator defaults (recommendations) adopted as `aceita`, revisable by the owner.

Shared (project-level) ADRs that govern this service live in
`docs/architecture/backend/adr/` and are **not** re-emitted here:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters), all Java services.
- `ADR-002-modular-monolith.md` — service-decomposition direction.
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation.

## Relationship map

- ADR-001 (single service) is the boundary within which ADR-002..006 apply; retrieval and audio
  concerns are isolated behind `SearchPort` / `AudioAssetPort`.
- ADR-002 (retrieval) resolves the registry's "Elasticsearch/kNN" intent against the project's
  **disabled Elastic Stack**: v1 is PostgreSQL FTS/trigram + client-side cache search behind a
  `SearchPort`; ES/pgvector is a future adapter with no contract change.
- ADR-003 (offline-first cache) realises the SAFETY requirement that the patient's voice survive a
  CONV/network outage; it reuses **EDGE `ADR-004-offline-catalog-distribution`** (ETag/304,
  last-cache-never-hard-fail) for the published tree + audio bundle.
- ADR-004 (navigation seam) honours the "input-channel-agnostic" registry intent and GEST's
  in-process station pattern; it guarantees **no CONV call per navigation step** (depends on
  ADR-003's cached bundle).
- ADR-005 (TTS boundary + consent) confirms CONV is **runtime only**: synthesis, consent and
  voice-sample storage live in **TRN**; erasure aligns with HIST **ADR-006 crypto-shred**.
- ADR-006 (persistence + audit + authorities) maps CONV's facts onto HIST **ADR-005** (TreePublished
  hard-502; erasure commit+durable-retry; PhraseSpoken never audited) and lists the `conv.*`
  authorities under ACS **INV-3** (`conv.tree.read`/`conv.audio.read`/`conv.usage.record`;
  `conv.tree.publish` is a TRN service-client authority).

Upstream contracts respected (history): ACS `ADR-002-identity-and-authority-model` +
`SPEC-02-patient-session-orchestration` (INV-3 token); PAT api-contract §1.3 + INV-PAT-7
(`pat.patient.read` service-client; patient-session `403` on `/pat`); EDGE `ADR-004` (offline
catalog pattern); HIST `ADR-005` (audit-write failure policy) and `ADR-006` (retention vs erasure);
EVNT `ADR-005` (escalation is EVNT's, out-of-band — CONV is not wired for escalation).

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than prose in
docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its number with a
strike-through note.
