# SPEC-04 — Data Access — gest (GEST) Frontend

> `detection (worker) → RuntimeFacade.onRecognised → ReportFacade → GESTURE_REPORT_PORT → HttpClient
> via access-http-base (device-token variant) → evnt-service`. GEST's entire network boundary is
> **three device-token calls**: the one write to EVNT (`POST /evnt/gesture-reports`), the read to GEST
> (`POST /gest/capabilities/support-check`, the detectable gate), and the read to EDGE
> (`GET /edge/catalog`, the offline command catalog). **All three are authenticated by the station's
> `edge.device` token** (device-token interceptor variant), **not** the caregiver `access-http-base`
> bearer. GEST never calls PAT directly at runtime. Sources: EVNT api-contract §2.1, GEST api-contract
> §3.3, EDGE api-contract §4.1, `frontend/05-state-and-data-flow.md`.

## 1. Master resource table

| Resource | Endpoint (BE-canonical) | Service | Facade | Operations | Cache? |
|---|---|---|---|---|---|
| GestureReport | `POST ${ACCESS_HTTP_BASE}/evnt/gesture-reports` (EVNT §2.1) | `GestureReportApiService` | `ReportFacade` | report | no (durable queue, §3) |
| CapabilitySupport | `POST ${ACCESS_HTTP_BASE}/gest/capabilities/support-check` (GEST §3.3); `GET ${ACCESS_HTTP_BASE}/gest/engines` (GEST §2.1) | `CapabilityApiService` | `CatalogFacade` | checkSupport, listEngines | yes — `ETag` per `engineVersion` (§3.3) |
| Catalog | `GET ${ACCESS_HTTP_BASE}/edge/catalog` (EDGE §4.1) | `EdgeCatalogApiService` | `CatalogFacade` | read | yes — EDGE `ETag` / `If-None-Match` (§4.2) |

The engine the landmark model loads against is `libs/gest/detection` local code (ADR-005), **not** a
port. `GET /gest/engines` is read only WHERE the station needs to resolve/display the active
`engineVersion`; the primary GEST read is `support-check`.

## 2. Adapter default — HTTP (carry-forward `scaffold:mock-adapter-default`)

`gest.providers.ts` → `provideGest({ adapter })` MUST default the report + support + catalog adapters
to **`http`**, because `evnt-service` (the report target) and `gest-service` (support-check) **exist**
(their api-contracts are published). A **providers spec MUST prove the default resolves to the HTTP
adapter**, not mock (`scaffold:mock-adapter-default:shell-provider-not-switched-to-http`, 7 prior
occurrences). `GestureReportMockAdapter` / `CapabilityMockAdapter` / `CatalogMockAdapter` serve the
same wire shapes through the same mappers, available only under an explicit mock provider for tests /
offline dev (Playwright uses them with a stub classifier — doc 04 §1).

> This supersedes no prior default: GEST's honest default is `http` (unlike EDGE, which defaulted to
> `mock` only while `edge-service` was unarchitected). `evnt-service` + `gest-service` both exist.

## 3. Wire records (mirror BE 1:1) and mappers

```ts
// mirror of POST /evnt/gesture-reports request (EVNT §2.1) — the ONE write
interface GestureReportWire {
  commandId: string; reportId: string; occurredAt: string;   // required core
  confidence?: number; recognitionWindowMs?: number;         // optional, stored verbatim; never branch v1 logic
}
// mirror of the 201/200 response (EVNT §2.1) — the generated Event
interface EventWire {
  id: string; patientId: string; commandId: string; commandLabel: string;
  urgency: 'emergency' | 'routine'; deviceId: string; reportId: string;
  occurredAt: string; confirmedAt: string | null; feedback: string; createdAt: string;
}
// mirror of POST /gest/capabilities/support-check (GEST §3.3)
interface SupportCheckRequestWire { engineVersion: string; codes: string[]; }
interface SupportCheckResultWire {
  engineVersion: string;
  results: { code: string; supportStatus: 'supported'|'experimental'|'unsupported'|'unknown'; detectable: boolean }[];
}
// mirror of GET /edge/catalog command (EDGE §4.1)
interface CatalogCommandWire {
  id: string; label: string; urgency: 'emergency'|'routine'; sensitivity: 'low'|'medium'|'high';
  primaryPrimitive: { id: string; code: string; displayName: string };
  secondaryPrimitive: { id: string; code: string; displayName: string } | null;
  minGestureTimeMs: number; maxGestureTimeMs: number; status: string;
}
```

- `toRecognitionReport(recognition)` builds `GestureReportWire` with every required field and no more
  (carry-forward `http-adapter:request-body-field-whitelist`): `deviceId`/`patientId`/`tenantId` are
  **never** in the body — EVNT takes them from the `edge.device` token claims (EVNT INV-EVNT-6).
- `toActiveCommand(catalogCmd, supportMap)` maps EDGE `minGestureTimeMs`→VM `minGestureDurationMs`,
  `maxGestureTimeMs`→`maxGestureDurationMs`, and crosses each primitive `code` with the support map to
  set `detectable` (INV-GEST-7). The mapper never invents fields absent from a wire record.

## 4. Operations — semantics (exactly-once, pessimistic — reconciliation #6)

| Operation | Verb · path | Identity | Idempotent? | Optimistic? |
|---|---|---|---|---|
| report | `POST /evnt/gesture-reports` | `edge.device` | yes — `(deviceId, reportId)` (EVNT INV-EVNT-4) | **pessimistic** (held `sending` until `201`/`200`) |
| checkSupport | `POST /gest/capabilities/support-check` | `edge.device` | n/a (read, cached by `ETag`) | — |
| listEngines | `GET /gest/engines` | `edge.device` | n/a (read, `ETag`) | — |
| read (catalog) | `GET /edge/catalog` | `edge.device` | n/a (read, EDGE `ETag`) | — |

### 4.1 Reporting is exactly-once and pessimistic (INV-GEST-1, INV-GEST-5)

- On `commandRecognised` the station mints a **station-unique idempotent `reportId`** once, stamps
  `occurredAt` at capture, and enqueues the item. The item is `sending` until EVNT confirms `201` (new)
  or `200` (idempotent replay); only then is it `sent` and dequeued. There is **no** optimistic "sent"
  — a missed help request must never be hidden behind an optimistic UI (doc 05 §4, the opposite of a
  normal CRUD screen; no rollback because there is no optimistic state).
- The **same `reportId`** is reused across **every** retry so EVNT resolves replays to `200` and raises
  **exactly one** alarm (INV-GEST-1; EVNT INV-EVNT-4 `(deviceId, reportId)` uniqueness).

### 4.2 Offline queue + retry (durable — reconciliation #6)

- Reports queue in a **durable** per-station store (survives network gap AND reload); a `RetryScheduler`
  drains on reconnect (`navigator.onLine` / browser `online`) and on a backoff timer.
- Retry honours EVNT's bounds: `201/200` → dequeue; `503 catalog-unavailable` (`Retry-After`) →
  reschedule after the header delay; `400 occurred-at-out-of-bounds` or an item aged > 24h → `expired`,
  dropped, **surfaced** as "report expired, not delivered" (never silently lost, never re-stamped —
  INV-GEST-5); `401`/`403` → **stop** reporting, surface the station-unpaired / provisioning state
  (SPEC-07), never loop a dead token.

### 4.3 Support-check / detectable gate (INV-GEST-7, reconciliation #3)

- At station bootstrap / catalog-load, `CatalogFacade` calls `support-check` with the running
  `engineVersion` and every primitive `code` in the active catalog, caching the result by `engineVersion`
  via `ETag` + `If-None-Match` (`304` is the common case — the registry is read-mostly). An `unknown`
  code (no row) resolves to `detectable = false` (GEST §3.3). The result sets each `ActiveCommandVM`'s
  `detectable`; a non-detectable command is marked "not yet detectable" and is **never armed**.

## Criterios de aceite (EARS)

- THE SYSTEM SHALL route the GestureReport write, the support-check read, and the catalog read through `@neuroassist/shared/access-http-base` with the `edge.device` device-token interceptor variant, and SHALL NOT attach the caregiver session bearer.
- THE SYSTEM SHALL default the GEST report, support, and catalog adapters to `http` and SHALL use a mock adapter only under an explicit mock provider.
- WHEN a command is recognised, THE SYSTEM SHALL POST `${ACCESS_HTTP_BASE}/evnt/gesture-reports` with `{commandId, reportId, occurredAt}` and SHALL NOT include `deviceId`, `patientId`, or `tenantId` in the body.
- WHEN a gesture report is sent, THE SYSTEM SHALL hold the queue item in `sending` until EVNT confirms `201` or `200` and SHALL NOT mark it sent optimistically.
- WHEN a queued report is retried, THE SYSTEM SHALL reuse the original `reportId` across every attempt so that exactly one event is created.
- WHILE the station is offline, THE SYSTEM SHALL enqueue each recognition in a durable store that survives reload and SHALL drain it with backoff when connectivity returns.
- IF the backend responds `503 catalog-unavailable` with `Retry-After`, THEN THE SYSTEM SHALL reschedule the queued report after the header delay and SHALL NOT drop it.
- IF a queued report is older than 24 hours or the backend responds `occurred-at-out-of-bounds`, THEN THE SYSTEM SHALL mark it expired, drop it, and surface "report expired, not delivered" (INV-GEST-5).
- WHEN the station loads its catalog, THE SYSTEM SHALL call `support-check` for the running engine version and cache the result by `engineVersion` via `ETag`, treating an absent row as not detectable.
- THE SYSTEM SHALL read the active command catalog from EDGE's cached catalog and SHALL NOT call PAT directly at runtime.
