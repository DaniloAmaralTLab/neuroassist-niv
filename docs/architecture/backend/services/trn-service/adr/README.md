# TRN — Architecture Decision Records (service-local)

Service: `trn-service` · Module: TRN — AI-Assisted Training (Speech Tree Authoring) · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | Service boundary: single service, single bounded context | aceita | local |
| ADR-002 | Dual-authorization model for content approval (SAFETY/COMPLIANCE) | aceita | local |
| ADR-003 | Proposal lifecycle and the human-in-the-loop gate (SAFETY) | aceita | local |
| ADR-004 | LLM provider boundary and PII policy (SAFETY/COMPLIANCE) | aceita | local |
| ADR-005 | ElevenLabs TTS boundary, voice consent and erasure (SAFETY/COMPLIANCE) | aceita | local |
| ADR-006 | Indexing approved content in Elasticsearch (tenant isolation) | aceita | local |
| ADR-007 | Draft storage, audit facts and external-provider failure policy (SAFETY/privacy) | aceita | local |

> All seven are orchestrator defaults (recommendations) adopted as `aceita`, revisable by the owner.

Shared (project-level) ADRs that govern this service live in
`docs/architecture/backend/adr/` and are **not** re-emitted here:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters), all Java services.
- `ADR-002-modular-monolith.md` — service-decomposition direction.
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation.

Messaging is disabled for this project, so no shared messaging-strategy ADR applies.

## Relationship map

- ADR-001 (single service) is the boundary within which ADR-002..007 apply; each external system
  (Anthropic, ElevenLabs, Elasticsearch, CONV) is isolated behind a port inside the one service.
- ADR-002 (dual authorization) and ADR-003 (proposal lifecycle + human-in-the-loop) together guarantee
  no LLM output becomes the patient's voice without two distinct human approvals; ADR-002 resolves the
  ACS **INV-3** tension (patient-session token restricted to `conv.*`/`gest.*`) by making the patient
  half a domain fact, not a `trn.*` authority.
- ADR-004 (LLM boundary + PII) governs what reaches Anthropic (minimisation) and that model output is
  untrusted data; it feeds the `draft`/`proposed` states of ADR-003.
- ADR-005 (TTS boundary + consent + erasure) realises CONV **ADR-005** from the authoring side:
  synthesis, consent and voice storage are TRN's; erasure is crypto-shred aligned with HIST **ADR-006**
  and CONV `conv.audio.delete`.
- ADR-006 (ES indexing) indexes only approved content, authoring-side, tenant-isolated; reconciles the
  registry's "indexed in Elasticsearch" with CONV **ADR-002** (ES off the patient runtime path).
- ADR-007 (persistence + audit + provider failure) maps TRN's facts onto HIST **ADR-005**
  (creation/approval/publish = hard-502; revocation/erasure = commit+durable-retry) and defines
  broker-free resilience that never touches CONV runtime.

Upstream contracts respected (history): CONV `ADR-005` (TTS boundary) + `ADR-006` (persistence/audit;
CONV expects TRN to own `approvalId` and capture consent upstream) + CONV api-contract §5–7
(publish/retire/erase, idempotency `trn:publish:<approvalId>`, dangling asset `422`); ACS
`ADR-002-identity-and-authority-model` (INV-3; TRN service-client token, amendment INT-CONV-2); HIST
`ADR-005` (audit-write failure policy) and `ADR-006` (retention vs erasure); PAT api-contract
`pat.patient.read` + INV-PAT-7.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN` (superseded).
A decision with a visible trade-off becomes an ADR here rather than prose in docs 01–06. Numbers are
stable and never reused; a superseded ADR keeps its number with a strike-through note.
