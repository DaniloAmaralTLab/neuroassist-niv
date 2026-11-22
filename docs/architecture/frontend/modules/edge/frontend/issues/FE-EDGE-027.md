## [FE-EDGE-027] Heartbeat egress — POST /edge/heartbeat body, keepalive fetch, token rotation

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
The EDGE data-access layer gains the heartbeat egress used by `StationLivenessService`:
`POST /edge/heartbeat` with the `HeartbeatRequestWire` body (`detectionState?`, `detectionStateSince`,
`reason`, `engineVersion`) on the `edge.device` token, a normal `fetch`/`HttpClient` beat for periodic
and transition beats, and a **`fetch(…, { keepalive: true })`** beat for the `visibilitychange → hidden`
case. `navigator.sendBeacon` is NOT used (it cannot carry the bearer `Authorization` header). The
`refreshedToken` in the response is surfaced so the service can rotate the stored token.

**Context / Problem statement:**
- SPEC-04 §1 (amended) now scopes `POST /edge/heartbeat` to the `libs/edge` station-liveness sender
  (NOT the dashboard); SPEC-04 §3 adds `HeartbeatRequestWire` / `HeartbeatResultWire`.
- SPEC-06 §5.1: keepalive beat on hidden; sendBeacon rejected; ≤30 s periodic.
- An omitted `detectionState` is recorded by the BE as `UNKNOWN`, never `RUNNING` (INV-EDGE-9) — the
  request body MUST be able to omit it, not send a defaulted value.
- Blocks: FE-EDGE-026 (service wiring).

**Approach (execution path):**
1) Add `heartbeat(body: HeartbeatRequestWire, opts?: { keepalive?: boolean })` to the EDGE egress port +
   HTTP adapter, based at `${ACCESS_HTTP_BASE}/edge/heartbeat`.
2) Normal path via the access-http-base client (bearer `edge.device` token + correlation id); hidden
   path via `fetch(url, { method: 'POST', keepalive: true, headers: { Authorization } })`.
3) Omit `detectionState` from the JSON body when the service passes none (do not serialize a default).
4) Parse `HeartbeatResultWire.refreshedToken` and return it to the caller for rotation.

**Non-goals:**
- Does NOT own the cadence or the state buffer (FE-EDGE-026).
- Does NOT add a dashboard heartbeat call (the dashboard never beats — SPEC-04 §1).

**Layer(s):**
frontend / Data access — `libs/edge/data-access/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§1 exception, §3.1 wire)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§5.1)

**Architecture alignment:**
- HTTP adapter is the only holder of `HttpClient`/`fetch`; base path is the gateway prefix `/edge` (carry-forward `http-adapter:wrong-prefix`)
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Lib path**
- 🔲 `libs/edge/data-access/src/lib/models/heartbeat.wire.ts` (`HeartbeatRequestWire`, `HeartbeatResultWire`)
- 🔲 `libs/edge/data-access/src/lib/ports/edge-heartbeat.port.ts`
- 🔲 `libs/edge/data-access/src/lib/adapters/edge-heartbeat.http-adapter.ts` (normal + keepalive paths)

**Tests**
- 🔲 `nx test edge-data-access` PASS (body omits `detectionState` when absent; keepalive flag set on hidden; `refreshedToken` parsed; sendBeacon never called)
- 🔲 `nx lint edge-data-access` PASS

**Milestone:**
Wave 2 / Data access (SAFETY-GEST-1 increment)

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P2

**Acceptance criteria:**
- `npx nx test edge-data-access` PASS
- `npx nx lint edge-data-access` PASS
- `npx nx build edge` PASS
- A unit test asserts the hidden beat uses `keepalive: true` and that `navigator.sendBeacon` is never invoked.

**Dependencies:**
- FE-EDGE-005 (providers / http adapter default)

**Data impact:**
- Nenhum

**API / Contract impact:**
- `POST /edge/heartbeat` (BE api-contract §3.1); response may carry `refreshedToken` (G1).

**Testing / Evidence required:**
- Adapter spec with `HttpClientTestingModule` + a `fetch` spy for the keepalive path.

**Risks / Notes:**
- `keepalive` fetch is best-effort and ~64 KB capped (ample here); it bypasses `HttpClient` interceptors, so the `Authorization` header and correlation id MUST be attached manually on that one path.
