## [FE-EDGE-026] StationLivenessService — the single station heartbeat sender (StationLivenessPort)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`libs/edge` provides a single `StationLivenessService` implementing `StationLivenessPort`
(`setDetectionState`, `beatNow`). It is the one and only sender of `POST /edge/heartbeat` in the
Patient-Mode station runtime: it owns the periodic cadence (≤ 30 s), sends an immediate beat on every
transition, buffers the last pushed detection state, and holds/rotates the `edge.device` token. No
second heartbeat sender exists anywhere (SAFETY-GEST-1).

**Context / Problem statement:**
- SPEC-06 §5 / §5.1 (new): `libs/edge` is the single heartbeat sender; GEST feeds its mapped detection
  state in-process through the injected `StationLivenessPort` (GEST SPEC-06 §2.1, INV-GEST-8).
- A second sender in GEST would race two writers on the same credential and refreshed token — rejected.
- Depends on the heartbeat egress adapter (FE-EDGE-027) and the detection VM/wire (FE-EDGE-028).
- Blocks: INT-FE-EDGE-006 (GEST consumes the port).

**Approach (execution path):**
1) Define `StationLivenessPort { setDetectionState(state, reason, engineVersion); beatNow(): void }` and
   provide `StationLivenessService` in `libs/edge/integration` (`type:domain`).
2) `setDetectionState` stores the last pushed `detectionState`/`reason`/`engineVersion`; every beat
   (periodic or immediate) carries that last-pushed state; WHILE none pushed, omit `detectionState`.
3) Periodic timer at ≤ 30 s (comfortably below the 120 s BE lapse window), cancelled via
   `takeUntilDestroyed`; `beatNow()` sends an immediate out-of-cadence beat.
4) Rotate the stored `edge.device` token on each response carrying `refreshedToken`.

**Non-goals:**
- Does NOT compute or escalate a detection lapse (server-owned EDGE→EVNT, BE ADR-005).
- Does NOT render UI (caregiver surfaces = FE-EDGE-029/030).
- Does NOT implement the keepalive/visibility wiring transport (FE-EDGE-027) nor GEST's handler.

**Layer(s):**
frontend / Shell integration — `libs/edge/integration/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§5, §5.1)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§3.1 wire)

**Architecture alignment:**
- Standalone + Signals; `takeUntilDestroyed` for the cadence; no `HttpClient` in the service (delegates to the adapter)
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Lib path**
- 🔲 `libs/edge/integration/src/lib/station-liveness.port.ts` (`StationLivenessPort`)
- 🔲 `libs/edge/integration/src/lib/station-liveness.service.ts` (cadence, buffer, beatNow, token rotation)
- 🔲 `libs/edge/integration/src/index.ts` (export the port + provider)

**Tests**
- 🔲 `nx test edge-integration` PASS (fakeAsync: periodic ≤30s; beatNow immediate; last-pushed carried; no-RUNNING-without-push; token rotation)
- 🔲 `nx lint edge-integration` PASS

**Milestone:**
Wave 6 / Shell integration (SAFETY-GEST-1 increment)

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P6

**Acceptance criteria:**
- `npx nx test edge-integration` PASS
- `npx nx lint edge-integration` PASS
- `npx nx build edge` PASS
- A single sender exists; a `beatNow()` on transition is observable before the next period; a beat with no pushed state omits `detectionState`.

**Dependencies:**
- FE-EDGE-027 (heartbeat egress adapter)
- FE-EDGE-028 (detection VM/wire)

**Data impact:**
- Holds the `edge.device` token in station runtime memory only; no new client-side persistence beyond existing station-identity storage.

**API / Contract impact:**
- Consumes `POST /edge/heartbeat` (BE api-contract §3.1). FE contract: `StationLivenessPort` (SPEC-06 §5).

**Testing / Evidence required:**
- fakeAsync tests for cadence/transition/keepalive hand-off; no `console.log`.

**Risks / Notes:**
- The port surface must match GEST SPEC-06 §2.1 exactly or INT-FE-EDGE-006 breaks — verify the shared `DetectionStateEnum`/`DetectionReason` types.
