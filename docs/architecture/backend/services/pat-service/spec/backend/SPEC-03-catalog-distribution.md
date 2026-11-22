# SPEC-03 — Catalog distribution and read contract (critical sub-feature)

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`
> Decision: `../../adr/ADR-004-catalog-distribution.md` (resolves doc 06 G3). Also owns the
> gesture-type vocabulary read/write.

## Objetivo

Pin down the contract by which detection and notification actors (GEST, EDGE, EVNT, DASH,
CONV) obtain the active command catalog and the primitive vocabulary — the seam ADR-004 left
as "directional". Resolves **G3**: endpoint shape, caching/ETag, and the service-client
authority.

## Escopo

- **In:** the catalog-pull endpoint, single-command read, the gesture-type list/read/register,
  the ETag/conditional-read protocol, and the service-client authority model.
- **Out:** detection logic (GEST), device pairing/heartbeat and offline staleness bound (EDGE),
  alarm routing (EVNT).

## Decisões técnicas (G3 resolved)

1. **Endpoint shape.** The catalog is pulled at
   `GET /pat/patients/{patientId}/commands?status=active` (api-contract §2.2); a single command
   at `GET /pat/commands/{commandId}` (§2.3); the vocabulary at `GET /pat/gesture-types` (§3.1).
   Primitives are **resolved inline** (`{id, code, displayName}`) so the agent needs no second call.
2. **ETag / cache.** Catalog and gesture-type reads return a strong `ETag` derived from the
   resource version signature (`max(updated_at)` + count for a patient's commands;
   `max(created_at)` + count for gesture-types). `If-None-Match` ⇒ `304 Not Modified`.
   `Cache-Control: private, max-age=30` is a refresh hint; the **offline** staleness bound is
   owned by EDGE (ADR-004 trade-off), which runs the last-fetched catalog until it can refresh.
3. **Service-client authority.** The detection-side *service* (GEST/EDGE backend) reads with a
   `pat.command.read` authority carried by an ACS-issued **service-client** token — never the
   patient-session token (ACS INV-3 preserved; INV-PAT-7). `pat.gesture-type.read` likewise.
   This mirrors ACS's service-client introspection path.

## Implementação

- `ReadCatalog(patientId, status)` → tenant-scoped query `command(patient_id, status)` (the hot
  index, SPEC-04), primitive resolution via `gesture_type`, ETag computed in `infrastructure/`.
- `ListGestureTypes()` / `ReadGestureType(id)` → global `gesture_type`; tenant-independent.
- `RegisterGestureType(code, displayName, description)` → append-only, `409` on duplicate `code`,
  audit `GestureTypeRegistered`. Authority `pat.gesture-type.create` (CLINIC_COORDINATOR).
- A `GestureType` is a **name in the vocabulary only** — PAT asserts no engine support (INV-PAT-6);
  surfacing the "name ≠ supported" distinction is a DASH/UI concern (doc 06 R2).

## Casos de borda

- Patient-session token on any read → `403` (INV-PAT-7).
- `status=active` (default) excludes `retired` commands (INV-PAT-5); `status=all` includes them for DASH review.
- Offline edge: last-fetched catalog remains in force (EDGE owns the tolerance; PAT is stateless about it).

## Critérios de aceite (EARS)

- WHEN a detection service client with `pat.command.read` reads a patient's active catalog, THE SYSTEM SHALL return the active commands with primitives resolved and an `ETag`, and respond `200`.
- WHEN a catalog read carries `If-None-Match` equal to the current `ETag`, THE SYSTEM SHALL respond `304 Not Modified` with no body.
- IF a patient-session token reads any PAT catalog or patient endpoint, THEN THE SYSTEM SHALL respond `403` (INV-PAT-7, ACS INV-3 preserved).
- THE SYSTEM SHALL serve `GET /pat/gesture-types` as the global vocabulary independent of tenant, and SHALL NOT assert detection-engine support for any entry (INV-PAT-6).
- IF `POST /pat/gesture-types` supplies an existing `code`, THEN THE SYSTEM SHALL respond `409 gesture-type-code-taken`.
