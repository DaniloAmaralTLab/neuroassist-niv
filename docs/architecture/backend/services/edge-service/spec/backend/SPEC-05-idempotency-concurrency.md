# SPEC-05 — Idempotency + concurrency

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).

## Objetivo

Specify the idempotency and concurrency guarantees for EDGE's lifecycle actions, the single-use
pairing claim, the watchdog transitions and the catalog refresh — so retries and concurrent scans
never double-apply or double-audit.

## Escopo

- **In:** idempotent re-invocation of deactivate/reactivate/revoke/unpair; single-use pairing-code
  consumption under a race; transition-only connectivity auditing; cache-refresh dedup;
  detection-lapse episode idempotency (one open episode per device + per-episode EVNT idempotency key,
  ADR-005).
- **Out:** business transitions (SPEC-02), persistence DDL (SPEC-04).

## Decisões técnicas

- **Pairing claim** is atomic single-use: `UPDATE device_pairing_code SET consumed_at = now() WHERE
  code_hash = ? AND consumed_at IS NULL AND expires_at > now()` — the mint proceeds only if the
  update affected one row (compare-and-set), so two concurrent claims cannot both pair (INV-EDGE-3).
- **Lifecycle idempotency**: a terminal/no-op transition returns the success status with no second
  audit (re-revoke `204`, re-deactivate `204`, reactivate-of-paired `200`).
- **Watchdog** audits connectivity **transitions only** (guarded by the current `connectivity`
  value), so repeated scans of an already-`offline` device emit nothing; the scan uses an
  optimistic update on `(id, connectivity)`.
- **Detection-lapse sweep** (ADR-005) is episode-idempotent: a partial unique index
  (`uq_edge_detection_lapse_open`, one open episode per device) means a concurrent or repeated sweep
  inserts at most one open row; the EVNT raise carries a stable per-episode `Idempotency-Key`
  (`evnt_idempotency_key`, also uniquely indexed) so a retried raise is deduped by EVNT; `resolved_at`
  closes the episode exactly once on the first `RUNNING` beat (INV-EDGE-10).
- **Catalog refresh** dedup: a `304` keeps the cache and audits nothing; a `200` with an unchanged
  `pat_etag` is a no-op.

## Implementação

- Compare-and-set on `device_pairing_code.consumed_at` for the claim.
- Optimistic concurrency (`updated_at` / version) on `edge_device` transitions.
- Watchdog update: `UPDATE edge_device SET connectivity='offline' WHERE id=? AND connectivity='online' AND lifecycle_state='paired'`; audit only when the update affected a row.

## Casos de borda

- Two stations racing the same code → exactly one pairs; the loser gets `401 invalid-pairing-code`.
- A heartbeat landing during a watchdog scan → last-writer-wins on `last_heartbeat_at`; a beat that
  arrives after an `offline` flip re-flips `online` with a `DeviceCameOnline` audit.
- A duplicated enroll retry (same correlationId) → a new device+code (no body-level idempotency key
  in the MVP); documented as acceptable at pilot scale.

## Critérios de aceite (EARS)

- WHEN two concurrent claims present the same pairing code, THE SYSTEM SHALL pair exactly one and reject the other `401`, minting at most one credential (INV-EDGE-3).
- WHEN `RevokeDevice` / `DeactivateDevice` / `UnpairDevice` is re-invoked on a device already in that terminal/soft state, THE SYSTEM SHALL return the success status with no second audit.
- WHEN the watchdog scans a device already `offline`, THE SYSTEM SHALL NOT re-emit `DeviceWentOffline` (transition-only).
- WHEN a catalog refresh returns `304`, THE SYSTEM SHALL keep the cache and audit nothing.
- WHEN two concurrent or repeated sweeps evaluate the same lapsing device, THE SYSTEM SHALL open at most one lapse episode and raise it to EVNT at most once (`uq_edge_detection_lapse_open` + per-episode `Idempotency-Key`, INV-EDGE-10).
- WHEN a device reports `RUNNING` while a lapse episode is open, THE SYSTEM SHALL resolve that episode exactly once (`resolved_at` set once) and notify EVNT once (ADR-005).
