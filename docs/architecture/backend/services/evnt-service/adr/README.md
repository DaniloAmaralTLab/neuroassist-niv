# EVNT — Architecture Decision Records (service-local)

Service: `evnt-service` · Module: EVNT — Events and Alarms · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | EVNT service boundary: single service | aceita | local |
| ADR-002 | Gesture-report ingestion contract and edge-device trust (closes G5 / INT-EDGE-001) | aceita | local |
| ADR-003 | Notification delivery via caregiver polling (no push) | aceita | local |
| ADR-004 | Command snapshot on the Event (resolves ADR-008's open implementation question) | aceita | local |
| ADR-005 | Out-of-band emergency escalation inside EVNT (closes SAFETY-1) | aceita | local |
| ADR-006 | Detection-lapse alerting inside EVNT (SAFETY-GEST-1) | aceita | local |

Shared (project-level) ADRs that govern this service live in
`docs/architecture/backend/adr/` and are **not** re-emitted here:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters), all Java services.
- `ADR-002-modular-monolith.md` — service-decomposition direction.
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation.

Messaging is disabled (`stack.messaging.enabled = false`), so no shared messaging-strategy ADR
applies; async/push is a future signal only (shared/handoff ADR-006).

Handoff ADRs (history, `_inbox/adr/`) that originate these decisions: **ADR-008** (Event references
Command dynamically, not a fixed type enum) → realised by local ADR-004; **ADR-010** (single Event
entity, "active event" is a query not a table) → honoured by local ADR-001/ADR-003/ADR-004;
**ADR-006** (hybrid edge+cloud, async as future signal) → context for local ADR-003.

## Relationship map

- ADR-001 (single service) is the boundary within which ADR-002, ADR-003 and ADR-004 apply.
- ADR-002 (gesture-report ingestion) **closes EDGE's G5 / INT-EDGE-001**: it names the authority
  `evnt.event.ingest` that EDGE embeds in the `edge.device` token, and reuses EDGE's JWKS +
  introspection (EDGE api-contract §5/§6, G1) as the trust chain; it depends on shared
  `ADR-001-hexagonal-architecture` (layering) and `ADR-003-multi-tenancy` (tenant from claim).
- ADR-003 (polling delivery) realises the BA wireframe alarm/toast behaviour (Screen 02 / §3.2.E)
  under messaging-disabled; it honours ADR-010 (one event surface, confirmation seen everywhere).
- ADR-004 (command snapshot) answers handoff ADR-008's `TODO[architect]` for the EVNT side
  (denormalize urgency/label onto Event while keeping the opaque `commandId`) and composes with
  ADR-010; it consumes PAT api-contract §2.3 (`GET /pat/commands/{id}`) with a `pat.command.read`
  service-client identity.
- ADR-005 (out-of-band escalation) **closes SPEC-03's `SAFETY-1`**: it adds an escalation policy +
  the provider-agnostic `EmergencyNotificationPort` (Web Push → SMS → voice) **alongside** ADR-003's
  in-app polling, inside EVNT (no new module). It reads the same one-source-of-truth `event` surface
  (INV-EVNT-3) and stops on confirmation (INV-EVNT-5); it does **not** reopen the internal message bus
  (`stack.messaging.enabled = false` governs the bus, not an outbound integration). It depends on ACS
  for the caregiver phone number (a cross-module `INT` TODO) and on AWS End User Messaging for
  SMS/voice. Realised by SPEC-11.
- ADR-006 (detection-lapse alerting) **owns the EVNT side of EDGE ADR-005 / integration-contracts §6.2
  (SAFETY-GEST-1)**: EDGE raises a detection lapse (station connected but not detecting) over an
  ACS-issued `edge-service` service-client token; EVNT surfaces a distinct caregiver alert and
  **reuses** ADR-005's escalation ladder + `EmergencyNotificationPort` over an open `detection_lapse`,
  stopping on resolution (EDGE) or caregiver acknowledgement; a real emergency outranks a lapse. It
  does **not** modify EDGE/ACS; it opens `INT-EVNT-ACS-002` for the service-client token. Realised by
  SPEC-12; depends on ADR-005.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN` (superseded).
A decision with a visible trade-off becomes an ADR here rather than prose in docs 01–06. Numbers are
stable and never reused; a superseded ADR keeps its number with a strike-through note.
