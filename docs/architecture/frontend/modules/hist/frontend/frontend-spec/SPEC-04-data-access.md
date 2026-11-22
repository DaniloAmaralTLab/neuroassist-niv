# SPEC-04 — Data Access — hist (HIST) Frontend

> `Component → HistoryFacade (signals) → HISTORY_PORT (Http/Mock adapter) → HttpClient via
> access-http-base → hist-service`. The HTTP adapter is the only holder of `HttpClient`; the facade
> exposes `signal<T>` private + `.asReadonly()` and `computed` derivations. Every call carries the bearer
> token + correlation id via the interceptor; **tenant scope is derived server-side from the JWT claim,
> never from `X-Tenant-Id`** (BE api-contract §0/§6, doc 01 §6). Base path is the **gateway** prefix
> `/hist`, **never** `/api/v1` (doc 01 §6, carry-forward `http-adapter:wrong-prefix`). HIST is
> **read-only** and **does not poll** (ADR-005, doc 05 §2). Sources: BE
> `../../../../backend/services/hist-service/contracts/api-contract.md` §2/§3, `frontend/05-state-and-data-flow.md`.

## 1. Master resource table

The FE caregiver dashboard consumes **only** the caregiver timeline (BE api-contract §2). The producer
ingest `POST /hist/audit` (§1, `hist.audit.record`, service-client), the operator audit trail
`GET /hist/audit` (§3, `hist.audit.read`) and the operator erasure `POST /hist/subjects/{id}/erasure`
(§4, `hist.erasure.create`) are **out of caregiver-FE scope** (§3 of this spec, decision in
`../contracts/backend-api-cross-link.md` §2).

| Resource | Endpoint (BE-canonical) | Service | Facade | Operations | Cache? |
|---|---|---|---|---|---|
| PatientHistory | `GET /hist/patients/{patientId}/history?period=today\|week\|month` | `HistoryApiService.getHistory` | `HistoryFacade` | getHistory | in-memory window (doc 05 §3) |
| PatientHistory (range) | `GET /hist/patients/{patientId}/history?from={iso}&to={iso}` | `HistoryApiService.getHistory` | `HistoryFacade` | getHistory (explicit range; both required) | in-memory window |
| PatientHistory (page) | `GET /hist/patients/{patientId}/history?...&cursor={opaque}&size={1..100}` | `HistoryApiService.getHistoryPage` | `HistoryFacade` | loadMore (keyset) | appends to window |

> The escalation attempts and detection-lapse facts are **not** a separate resource: BE api-contract §2
> interleaves `EscalationAttempted` and the detection-lapse facts **inside** the same
> `GET /hist/patients/{patientId}/history` response. The `feature-trail` surface filters the **same**
> `HistoryFacade` window by `kind` — it issues **no** extra call and needs **no** extra authority
> (decision, `../contracts/backend-api-cross-link.md` §2; corrects the vision's `hist.audit.read` gating).

> **Period summary (G-HIST-4 CLOSED).** The whole-period `summary` is **not** a separate resource either:
> BE api-contract §2 returns it **inline on the first page** (cursor absent) of the **same**
> `GET /hist/patients/{patientId}/history` read. `getHistory` maps `wire.summary` → `PeriodSummaryVM`
> (`scope='period'`, SPEC-03 §3); `getHistoryPage` (keyset `loadMore`) carries **no** summary, so the FE
> keeps the first-page summary and never recomputes it per page. No extra call, no extra authority.

> **Structured entry fields (G-HIST-1/2/3/5 CLOSED).** The same read now carries `commandId`/`commandLabel`/
> `urgency`, `relatedEventId` + folded `confirmation`, structured `channel`/`maskedTarget`, and an
> enumerated `outcome` (BE api-contract §2). The HTTP adapter maps them 1:1 into `HistoryEntryWire`
> (SPEC-03 §1); the mock adapter serves the **same** shape. `maskedTarget` is rendered verbatim — the FE
> never unmasks (doc 01 §6).

## 2. Adapter default — HTTP (carry-forward `scaffold:mock-adapter-default`)

`hist.providers.ts` MUST default the adapter to **`http`**: `hist-service` exists and its api-contract
(§2) is published. `HistoryHttpAdapter` is based at **`${ACCESS_HTTP_BASE}/hist`**; `HistoryMockAdapter`
serves fixtures in the **same wire shape** via the same mappers, under an **explicit** mock provider for
tests / offline dev only. `provideHist({ adapter })` defaults to `http`; a providers spec MUST prove the
default is `http`, not mock (`scaffold:mock-adapter-default:shell-provider-not-switched-to-http`). This
resolves the vision pre-condition that assumed a mock default while the BE read-model was pending (doc 05
§2, now closed since the contract is published).

## 3. Operations — semantics

| Operation | Verb · path | Idempotent? | Optimistic? | Notes |
|---|---|---|---|---|
| getHistory | `GET /hist/patients/{id}/history?period=` | n/a (read) | — | default `period=today` if neither period nor from/to given (BE §2) |
| getHistory (range) | `GET /hist/patients/{id}/history?from=&to=` | n/a (read) | — | both `from` and `to` required together; one alone → `400` (BE §2) |
| loadMore | `GET /hist/patients/{id}/history?...&cursor=&size=` | n/a (read) | — | keyset on `occurredAt desc, id desc`; appends; never re-orders |
| refresh | re-issues the current `getHistory` | n/a (read) | — | explicit caregiver action; HIST does **not** poll (doc 05 §2) |

- **Read-only — zero write methods.** `HISTORY_PORT` and `HistoryHttpAdapter` expose **no** POST/PUT/PATCH/
  DELETE method. There is nothing to send: reads carry no body. This is enforced by review + lint (doc 01 §7,
  ADR-005) — `@neuroassist/hist` binds **zero** write endpoints.
- **Period default & nesting.** The FE sends the selected `period`; `today ⊂ week ⊂ month` (assumption A2),
  so narrowing re-filters the in-memory window and widening refetches (doc 05 §3). The prototype default
  `week` is kept as the FE's initial selection; the BE endpoint default is `today` (BE §2) — the FE always
  sends `period` explicitly so the two defaults never conflict.
- **No tenant/patient as a trusted param for scope.** `patientId` is a resource path segment; the **tenant**
  and link-scope are enforced server-side from the JWT (BE §2 returns `403` for an unlinked/cross-tenant
  patient and leaks no record). The FE never sends `X-Tenant-Id` (doc 01 §6).

## 4. Feedback write — delegated to EVNT, never owned by HIST (ADR-005)

- The "Was it real?" affordance on an event row (if surfaced here, decision §SPEC-05 §4) calls **EVNT's**
  feedback write, **not** a HIST endpoint. It is routed through the shell to EVNT's public port:
  `EVNT POST /evnt/events/{eventId}/feedback`, authority **`evnt.event.record`** (EVNT api-contract §5.1 /
  EVNT SPEC-05; the HIST vision referred to this as `evnt.feedback.record` — reconciled to EVNT's canonical
  `evnt.event.record`, see `../contracts/backend-api-cross-link.md` §3).
- On EVNT success, `HistoryFacade.refresh()` re-reads HIST's **own** read-model; HIST **never** patches a
  local entry to reflect a write it did not own (doc 05 §4). On EVNT failure, HIST does **not** re-read and
  does **not** claim the outcome changed (SPEC-07 §2.3).

## 5. Cache strategy — load-on-navigation, in-memory window; no poll

- HIST loads the history window on navigation to `/history` (or on widening the period) and keeps it in a
  signal for the session. Switching to a **narrower** period re-filters in memory; a **wider** period
  refetches (doc 05 §3, assumption A2). This matches the prototype `PERIODO_DIAS` filter over one in-memory
  list while honouring the project default "call the API per navigation, cache only when justified" — the
  justification here is a strictly larger window reusing a strictly smaller one.
- **No polling, no optimistic cache** (doc 05 §2/§4): history is not a live surface (EVNT owns live
  awareness), and HIST has no write path to apply optimistically. A `tenant-context` change invalidates any
  future HIST window.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL route every HIST read through `@neuroassist/shared/access-http-base` based at `${ACCESS_HTTP_BASE}/hist` and SHALL NOT call `HttpClient` from a component.
- THE SYSTEM SHALL default the HIST data adapter to `http` and SHALL use the mock adapter only under an explicit mock provider.
- WHEN the caregiver opens `/history` or widens the period beyond the loaded window, THE SYSTEM SHALL read `GET /hist/patients/{patientId}/history` under `hist.history.read` and SHALL NOT poll the history on a timer.
- WHEN the caregiver narrows the period within the loaded window, THE SYSTEM SHALL re-filter the timeline in memory and SHALL NOT refetch the history.
- WHEN more entries exist for the period, THE SYSTEM SHALL request the next page using the backend `nextCursor` keyset and SHALL NOT drop or re-order earlier entries.
- WHEN an explicit range is requested, THE SYSTEM SHALL send both `from` and `to` together and SHALL NOT send only one bound.
- THE SYSTEM SHALL bind zero write methods in the HIST port and adapter and SHALL NOT expose any POST, PUT, PATCH or DELETE operation on `hist-service`.
- WHEN a delegated EVNT feedback write succeeds, THE SYSTEM SHALL call `HistoryFacade.refresh()` to re-read its own history and SHALL NOT patch the entry locally.
- THE SYSTEM SHALL derive the tenant scope from the JWT claim and SHALL NOT send the tenant as a path or query parameter.
