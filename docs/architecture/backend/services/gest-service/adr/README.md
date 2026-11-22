# GEST — Architecture Decision Records

> Service: `gest-service` · Module **GEST — Gesture Detection (Edge)** · Project: NeuroAssist NIV
> Local (service-level) ADRs. Shared project-level ADRs live in `../../../adr/`
> (`ADR-001-hexagonal-architecture.md` key `hexagonal_java`, `ADR-002-modular-monolith.md`,
> `ADR-003-multi-tenancy.md`) — referenced here, not re-emitted.

## Index
| ADR | Title | Status |
|---|---|---|
| ADR-001 | Single thin service for GEST | accepted |
| ADR-002 | Thin backend: detection-engine capability registry is GEST's sole backend responsibility | accepted |
| ADR-003 | Global persistence for the capability registry | accepted |
| ADR-004 | Calibration test-run telemetry deferred | accepted (defer) |

## Relationship Map
- **ADR-002** is the central decision (what the backend owns); **ADR-001** (single service),
  **ADR-003** (global persistence) and **ADR-004** (telemetry deferred) all follow from it.
- **ADR-002** realises PAT **INV-PAT-6** (engine-support truth owned by GEST) and depends on the shared
  hexagonal ADR (`../../../adr/ADR-001-hexagonal-architecture.md`, key `hexagonal_java`).
- **ADR-003** overrides the project multi-tenancy default (shared `ADR-003-multi-tenancy.md`) for
  GEST's global reference data, mirroring PAT's global `GestureType` vocabulary.
- **ADR-004** defines the boundary with EVNT (`report_meta`) and keeps ADR-002's thinness.

## Process
Status values: `proposed` | `accepted` | `superseded`. A superseded ADR keeps its number and is
struck through with a pointer to its replacement. New service decisions get the next local number.
