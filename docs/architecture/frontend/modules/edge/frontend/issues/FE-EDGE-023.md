## [FE-EDGE-023] EDGE telemetry events — emit lifecycle transitions via @neuroassist/shared/observability

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
Pair, unpair, deactivate, and revoke action completions are emitted to `@neuroassist/shared/observability` with device id, action type, and tenant context — no `console.log`, no raw HTTP logging.

**Context / Problem statement:**
- SPEC-06 §2 and §5 mandate forwarding these transitions to `@neuroassist/shared/observability` so the HIST module can consume them downstream.
- EDGE does not render history — it only emits the signal.
- `console.log` is explicitly forbidden as an audit substitute (SPEC-06 EARS §5).
- Bloqueia: none (depends on FE-EDGE-019 integration service)

**Approach (execution path):**
1. In `EdgeShellIntegrationService` (FE-EDGE-019): inject `@neuroassist/shared/observability` service.
2. On pair action completion (facade signals `pairing='paired'`): emit event `{ type: 'edge.device.paired', deviceId, patientId, tenantId }`.
3. On unpair completion: emit `{ type: 'edge.device.unpaired', deviceId }`.
4. On deactivate completion: emit `{ type: 'edge.device.deactivated', deviceId }`.
5. On revoke completion: emit `{ type: 'edge.device.revoked', deviceId }`.
6. Each emission must NOT use `console.log` or `console.info`.

**Non-goals:**
- Do not persist events locally — only forward to the observability service.
- Do not emit events for read operations (badge refresh, status poll).

**Layer(s):**
frontend / Integration — `libs/edge/integration/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2, EARS §5)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Integration lib**
- 🔲 `libs/edge/integration/src/lib/edge-shell-integration.service.ts` (observability.emit calls)

**Tests**
- 🔲 `npx nx test edge-integration` PASS
- 🔲 `npx nx lint edge-integration` PASS

**Milestone:**
Wave 8 / P8 Observability

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P8

**Acceptance criteria:**
- Pair completion → `observability.emit({ type: 'edge.device.paired', ... })` called.
- Revoke completion → `observability.emit({ type: 'edge.device.revoked', ... })` called.
- No `console.log` or `console.info` in any EDGE file for audit purposes.
- `npx nx test edge-integration` PASS

**Dependencies:**
- FE-EDGE-019 (integration service)
- INT-FE-EDGE-001 (observability service contract)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum direto (events forwarded to observability, not to BE)

**Testing / Evidence required:**
- Integration service test: mock facade signals → verify `observability.emit` called with correct type strings.

**Risks / Notes:**
- Observability event type strings must align with the HIST module's event contract — coordinate with the HIST architect if the event schema is not yet published.
