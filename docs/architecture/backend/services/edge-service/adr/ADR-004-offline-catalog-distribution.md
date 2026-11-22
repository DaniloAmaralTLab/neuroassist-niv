<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — Offline catalog distribution to the edge

## Status
aceita

## Contexto
The edge station detects gestures against the patient's **command catalog**, which PAT
owns. The product is offline-first (ADR-006 hybrid edge+cloud; OPS-001: the alarm must work
offline). PAT's api-contract (§3.3.1) explicitly delegates the staleness question: it sets
`Cache-Control: private, max-age=30` as a hint but states "the authoritative staleness
tolerance of an **offline** edge is owned by EDGE, which runs the last-fetched catalog until
it can refresh." PAT exposes `GET /pat/patients/{patientId}/commands?status=active` with a
strong `ETag` and `304 Not Modified` on `If-None-Match`, and its authority matrix lists the
detection **service client (GEST/EDGE)** as the `pat.command.read` consumer — never a
patient-session token (PAT INV-PAT-7).

## Decisão
EDGE owns offline catalog distribution. It pulls the patient's catalog from PAT using a
**service-client identity carrying `pat.command.read`** (never a patient-session or device
token), sending `If-None-Match` with the stored ETag and treating `304` as "cache valid".
It persists the last good copy in `cached_catalog` (payload + `pat_etag` + `fetchedAt`) and
serves it to the paired device via `GET /edge/catalog` (authority `edge.catalog.read`, device
token) behind EDGE's own ETag. A catalog read **never hard-fails on a PAT outage** — EDGE
returns the last cache (INV-EDGE-5). EDGE, not PAT, decides how stale an offline edge may be.

## Consequências
- Positive: detection keeps working through network drops; the alarm path never depends on a
  live PAT call (OPS-001, ADR-006).
- Positive: ETag/304 keeps refreshes cheap; the device downloads a changed catalog only when
  it actually changed.
- Positive: using a service-client `pat.command.read` identity respects PAT's boundary (a
  patient-session token is rejected `403` on every `/pat` path).
- Negative / trade-off: a catalog recalibrated in PAT during a long offline window is not
  detected until the next successful refresh (Risk R3) — the accepted cost of offline-first;
  `fetchedAt` makes staleness observable. The exact service-client credential EDGE uses is a
  specs-level detail (Gap G2).
