# SPEC-01 — API Surface

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.
> Canonical contract: `../../contracts/api-contract.md`.

## Objetivo
Define the complete REST surface of GEST under base `/gest`: two path roots (`/gest/engines`,
`/gest/capabilities`) plus the station-facing `support-check`, all advisory and global.

## Escopo
- **In:** engine-version CRUD-lite (register/deprecate/read), capability declare/retire/read, and the
  primary station read `POST /gest/capabilities/support-check` (the "detectable" gate, INV-GEST-7).
- **Out:** detection runtime, catalog, device, event endpoints (owned by `gest-ui`/PAT/EDGE/EVNT).

## Decisões técnicas
- Hexagonal (`../../../adr/ADR-001-hexagonal-architecture.md`, key `hexagonal_java`): controllers in
  `api`, use cases in `application`.
- Local ADR-001 (single thin service), ADR-002 (engine-capability registry), ADR-003 (global
  persistence).
- Naming D-639/D-640/D-641: one application service per path root; `resource` (`engine`,
  `capability`) declared explicitly; no operation named `read`.

## Implementação
- `EngineController` (`/gest/engines`) → `EngineVersionService`.
- `CapabilityController` (`/gest/capabilities`, incl. `/support-check`) → `CapabilityService`.
- DTOs/mappers in `api`; `ETag` computed from the result projection for reads and support-check.

## Casos de borda
- Unknown engine on support-check → `200` with all codes `unknown` (not `404`).
- `If-None-Match` hit → `304` with no body. Empty `codes` → `400`.

## Critérios de aceite (EARS)
- THE SYSTEM SHALL expose exactly the endpoints in `api-contract.md` §2–§3 and no others.
- WHEN `support-check` is called, THE SYSTEM SHALL return one result per requested code with a
  derived `detectable` flag (INV-GEST-7).
- IF a write path receives a read-only token, THEN THE SYSTEM SHALL respond `403` (INV-GEST-5).
