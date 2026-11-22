# SPEC-03 — Offline catalog distribution (sub-feature)

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).
> Decision: `../../adr/ADR-004-offline-catalog-distribution.md`.

## Objetivo

Specify how EDGE keeps a paired device operational offline by caching the PAT command catalog and
serving the last-good copy (ADR-004, INV-EDGE-5) — the critical sub-feature behind OPS-001 (the
alarm must work offline).

## Escopo

- **In:** the PAT pull (service-client `pat.command.read`, ETag/304), the `cached_catalog` store,
  the device-facing `GET /edge/catalog` with EDGE's own ETag, staleness surfacing (`fetchedAt`,
  `stale`).
- **Out:** PAT's own catalog contract (owned by PAT api-contract §2.2/§3.3.1), detection semantics
  (GEST).

## Decisões técnicas

- **G2** — EDGE pulls PAT with an **ACS-issued service-client token** carrying `pat.command.read`
  (+ `pat.gesture-type.read`), never a device or patient-session token (PAT INV-PAT-7).
  `../../contracts/integration-contracts.md` §1.
- **Cache-first**: `GET /edge/catalog` serves `cached_catalog`; EDGE refreshes from PAT
  opportunistically with `If-None-Match` = stored `pat_etag` (`304` ⇒ keep; `200` ⇒ replace +
  audit `CatalogRefreshed`).
- **EDGE owns the device-facing ETag** (derived from `pat_etag` + `fetched_at`), distinct from PAT's
  upstream ETag, and owns staleness tolerance (ADR-004) — PAT's `max-age=30` is a hint only.
- A PAT outage **never** hard-fails the device read (INV-EDGE-5); only a never-fetched patient with
  PAT down yields `503 catalog-unavailable`.

## Implementação

- `RefreshCatalog` (triggered on pair, on a heartbeat-coupled schedule, or on a catalog miss):
  call PAT with the service-client token + `If-None-Match`; persist on `200`.
- `ReadCatalog`: return `cached_catalog.payload` behind the EDGE ETag; honor device `If-None-Match`
  → `304`.
- `stale` computed from `now - fetched_at` vs EDGE's staleness hint.

## Casos de borda

- Catalog recalibrated in PAT during a long offline window → not reflected until the next `200`
  refresh (Risk R3, accepted); `fetchedAt` makes it observable.
- PAT returns `404` for the patient (deactivated upstream) → keep serving the last cache; log; do
  not drop (device must keep detecting until unpaired).
- First-ever read with PAT unreachable and no cache → `503 catalog-unavailable`.

## Critérios de aceite (EARS)

- WHEN EDGE refreshes a catalog, THE SYSTEM SHALL call PAT with a service-client `pat.command.read` token and `If-None-Match` = stored `pat_etag` (ADR-004, G2).
- WHEN PAT responds `304`, THE SYSTEM SHALL keep the cache and audit nothing; WHEN PAT responds `200`, THE SYSTEM SHALL replace the cache and audit `CatalogRefreshed`.
- WHEN a paired device reads `GET /edge/catalog`, THE SYSTEM SHALL return the cached payload with an EDGE `ETag`, and `304` to a matching `If-None-Match`.
- IF PAT is unreachable, THEN THE SYSTEM SHALL serve the last `CachedCatalog` and SHALL NOT hard-fail (INV-EDGE-5), marking `stale = true` past the staleness hint.
- THE SYSTEM SHALL NOT call PAT with the `edge.device` or a patient-session token (INV-EDGE-2, PAT INV-PAT-7).
