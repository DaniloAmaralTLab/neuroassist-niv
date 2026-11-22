# SPEC-07 — Error Handling — gest (GEST) Frontend

> BE `ProblemDetail` (RFC 7807) → `AppError` (`@neuroassist/shared/error-model`) → honest station
> state or user-facing message via `@neuroassist/shared/ui-feedback`. Errors are mapped by the stable
> `type` **slug**, never by HTTP status alone (carry-forward
> `http-adapter:error-code-by-status-not-problemdetail-type`); the BE `detail`/`correlationId` are
> preserved — never a raw HTTP body (`fe-error-handler:raw-http-error-detail`) and never a fixed string
> discarding the BE detail (`fe-facade:toast-fixed-text-discards-be-detail`). GEST has **two error
> classes**: BE `ProblemDetail`s from its three device-token calls, and **runtime faults** (camera /
> model / backgrounding / thermal) which are **in-module honest states**, never faked as "watching".
> Sources: EVNT api-contract §2.1/§8, GEST api-contract §4, EDGE api-contract §8,
> `frontend/05-state-and-data-flow.md` §5.

## 1. Pipeline

```
evnt-service / gest-service / edge-service  application/problem+json
  → access-http-base error-normalize interceptor (device-token variant: reads `type` slug + detail + correlationId)
  → AppError { code: <slug>, detail, correlationId }
  → ReportFacade / CatalogFacade maps AppError.code → queue state | honest station state | toast
  → rendered via @neuroassist/shared/ui-feedback (BE detail shown, correlationId attached)
```

## 2. EVNT `POST /evnt/gesture-reports` — the report path (EVNT §2.1 / §8)

| BE `type` slug | HTTP | FE behaviour | FE state / message |
|---|---|---|---|
| (new) | 201 | dequeue item as `sent`; debounce re-arms the loop | — |
| (replay) | 200 | dequeue as `sent` (exactly-once — INV-GEST-1); no duplicate | — |
| `validation-error` | 400 | a malformed report is a bug → surface to status; **do not** blind-retry | "Report rejected (malformed)." + detail |
| `occurred-at-out-of-bounds` | 400 | mark item `expired`; drop; surface (INV-GEST-5) | "Report expired, not delivered." |
| `unauthorized` | 401 | **stop** reporting; station-unpaired state; **do not** retry a dead token | "Station unpaired — re-pair in EDGE." |
| `forbidden` | 403 | token lacks `evnt.event.ingest`; **stop**; provisioning error (INT-GEST-ACS-1 / G5) | "Station not provisioned to report — re-pair in EDGE." |
| `command-not-found` | 404 | cached catalog drifted from PAT; drop the report, trigger an EDGE catalog refresh, surface the drift | "Command no longer in catalog — catalog refreshed." |
| `catalog-unavailable` | 503 | reschedule the queued item after `Retry-After` (EVNT fail-closed) | "Retrying — alarm service busy." (queue stays) |
| `audit-unavailable` | 502 | the event WAS created (EVNT persisted it before audit); treat as delivered, log the degraded audit | — (no re-report; a retry would be a safe `200` replay) |

> EVNT resolves a `(deviceId, reportId)` DB race to the `200` replay path, so the station **never**
> sees a raw `409` on report (EVNT §2.1).

## 3. GEST `POST /gest/capabilities/support-check` — the detectable gate (GEST §4)

| BE `type` slug | HTTP | FE behaviour | FE state |
|---|---|---|---|
| (ok) | 200 (+`ETag`) | set each command's `detectable`; cache by `engineVersion` | — |
| (not modified) | 304 | keep the cached support map | — |
| `validation-error` | 400 | empty `codes` is an FE bug (no primitives to gate) → surface to status | "Detectable gate unavailable." |
| `unauthorized` | 401 | station-unpaired state (same as §2) | "Station unpaired — re-pair in EDGE." |
| `forbidden` | 403 | token lacks `gest.capability.read` (INT-GEST-ACS-1 open) → **fail honest**: mark every command's gate **unknown**, do NOT assume detectable | "Detectable gate unavailable — commands shown as unverified." |

> When the gate is unavailable the station MUST NOT silently treat commands as detectable: the honest
> fallback is an explicit **"unverified / not yet detectable"** marking, never a false-positive arm
> (INV-GEST-7). `GET /gest/engines` failures degrade the engineVersion display only, not the gate.

## 4. EDGE `GET /edge/catalog` — the offline command catalog (EDGE §8)

| BE `type` slug | HTTP | FE behaviour | FE state |
|---|---|---|---|
| (ok) | 200 (+ EDGE `ETag`) | project the active command set; recompute detectable | — |
| (not modified) | 304 | keep the cached catalog | — |
| `unauthenticated` | 401 | station-unpaired state | "Station unpaired — re-pair in EDGE." |
| `forbidden` | 403 | device not `paired` (EDGE INV-EDGE-4) | "Station not paired — pair the device in EDGE." |
| `catalog-unavailable` | 503 | no cache yet and PAT unreachable → detection cannot start; honest status, retry | "Catalog unavailable — detection not started." |

## 5. Runtime faults (NOT HTTP — in-module honest states, INV-GEST-6)

| Fault | Trigger | FE state (always honest, never "watching") |
|---|---|---|
| camera denied | `getUserMedia` → `NotAllowedError` | `camera = denied`; `detection = unavailable`; **no implied alarm** |
| no camera device | `getUserMedia` → `NotFoundError` | `camera = no-device`; `detection = unavailable` |
| model failed | worker model load rejects | `model = failed`; `detection = unavailable`; honest error + Retry |
| backgrounded / asleep | `document.hidden` / `visibilitychange` | `detection = paused`; always-visible "detection paused" overlay (SPEC-09) |
| fps / thermal throttle | measured fps below budget | `detection = degraded`; honest "degraded" state (SPEC-09) |

## 6. Toast vs banner vs honest-state vs modal — criteria

- **Honest station state (primary):** camera / model / backgrounded / degraded are rendered as the
  station's own state (chips + the always-visible paused/degraded overlay), **never** a toast — the
  absence of detection must be visible, not a transient notification (SPEC-09, INV-GEST-6).
- **Queue panel:** report outcomes (`sending`, `expired`, `next retry in N`) render in the report-queue
  panel (SPEC-02 §2), not a global toast.
- **Toast:** transient, non-blocking surface for a rejected report (`validation-error`,
  `command-not-found` refresh notice).
- **Modal / blocking banner:** the terminal **station-unpaired** state (`401`/`403` on any path) — the
  station cannot report; it must be re-paired in EDGE, shown as a blocking banner with the re-pair
  instruction, not a dismissible toast.

## 7. Retry strategy

- **Report path:** the durable queue + `RetryScheduler` own all retries (SPEC-04 §4.2) — backoff on
  network/`503`, reuse the `reportId`, stop on `401`/`403` (dead token), drop on `expired`. No ad-hoc
  component retry.
- **Reads (catalog / support-check):** a single manual **Retry** affordance on the honest error state;
  `304` is the common cached case. No silent auto-retry loop on a `401`/`403`.

## Criterios de aceite (EARS)

- IF the backend responds `unauthorized` or `forbidden` on any GEST device-token call, THEN THE SYSTEM SHALL stop reporting, render the blocking station-unpaired state, and SHALL NOT retry the dead token.
- IF the backend responds `occurred-at-out-of-bounds`, THEN THE SYSTEM SHALL mark the queued report expired and surface "report expired, not delivered" (INV-GEST-5).
- IF the backend responds `503 catalog-unavailable` on the report path, THEN THE SYSTEM SHALL reschedule the queued report after `Retry-After` and SHALL NOT drop it.
- IF the backend responds `command-not-found` on a report, THEN THE SYSTEM SHALL drop the report, trigger an EDGE catalog refresh, and surface the drift.
- IF the support-check call fails with `forbidden`, THEN THE SYSTEM SHALL mark every command's detectable gate as unverified and SHALL NOT treat any command as detectable (INV-GEST-7).
- IF the camera is denied or absent or the model fails to load, THEN THE SYSTEM SHALL render `detection = unavailable` as an honest station state and SHALL NOT imply an active alarm.
- THE SYSTEM SHALL preserve the backend `detail` and `correlationId` in every surfaced GEST error and SHALL NOT display a raw HTTP response body.
- WHEN EVNT responds `200` for a replayed `(deviceId, reportId)`, THE SYSTEM SHALL treat the report as delivered exactly once and SHALL NOT create or surface a duplicate.
