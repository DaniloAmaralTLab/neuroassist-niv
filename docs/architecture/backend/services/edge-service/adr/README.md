# EDGE — Architecture Decision Records (service-local)

Service: `edge-service` · Module: EDGE — Edge Device Integration · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | EDGE service boundary: single service | aceita | local |
| ADR-002 | Edge device token issuance and validation | aceita | local |
| ADR-003 | Code-based pairing and claim flow | aceita | local |
| ADR-004 | Offline catalog distribution to the edge | aceita | local |
| ADR-005 | Detection state on the heartbeat and the detection-lapse alert | aceita | local |

Shared (project-level) ADRs that govern this service live in
`docs/architecture/backend/adr/` and are **not** re-emitted here:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters), all Java services.
- `ADR-002-modular-monolith.md` — service-decomposition direction (placeholder stub).
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation (placeholder stub).

Handoff ADRs that originate these decisions (history, `_inbox/adr/`): ADR-002 (AI embedded
on the edge), ADR-006 (hybrid edge+cloud), ADR-014 (GEST on the mobile phone + pairing
reuse), ADR-012 (patient identity / persistent session — device token kept distinct).

## Relationship map

- ADR-001 (single service) is the boundary within which ADR-002, ADR-003 and ADR-004 apply.
- ADR-002 (device token) realises ACS `ADR-002-identity-and-authority-model` ("EDGE owns the
  device token; ACS validates, does not mint") and ADR-014 D1 (`edge.device`, never a
  person); it depends on shared `ADR-001-hexagonal-architecture` (layering).
- ADR-003 (pairing/claim) realises handoff ADR-014 (reuse the existing pairing for fixed and
  mobile stations) and feeds ADR-002 (claim mints the token); it depends on shared
  `ADR-003-multi-tenancy` (global code → tenant resolution).
- ADR-004 (offline catalog) realises handoff ADR-006 (offline-first) and honours PAT's
  api-contract §3.3.1 (ETag/304, staleness owned by EDGE) with a `pat.command.read`
  service-client identity.
- ADR-005 (detection state + lapse alert) extends ADR-002's `edge.device` heartbeat and the
  ADR-003/ADR-014 liveness model: it adds a detection-state dimension distinct from
  connectivity and a scheduled lapse-escalation to EVNT (product decision **SAFETY-GEST-1**).
  EVNT owns the alerting/escalation it hands off to (EVNT ADR-005); EDGE's side only.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than prose in
docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its number with a
strike-through note.
