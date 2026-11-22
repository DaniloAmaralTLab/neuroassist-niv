## [INT-FE-EDGE-001] INT: @neuroassist/shared/observability — audit hand-off for HIST

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
EDGE forwards pair / unpair / deactivate / revoke lifecycle events to `@neuroassist/shared/observability` using the event schema that HIST consumes — integration contract verified so HIST can replay EDGE device lifecycle events without polling the EDGE API.

**Context / Problem statement:**
- SPEC-06 §2 declares that `EdgeShellIntegrationService` forwards lifecycle transitions to `@neuroassist/shared/observability`; EDGE does not render history (FE-EDGE-019/023).
- This INT issue validates the **integration contract** between EDGE FE and the shared observability service — i.e., the event type strings, payload shape, and tenant context must align with what HIST expects.
- If the observability event schema is not yet published by HIST, this issue raises the dependency and blocks until resolved.

**Approach (execution path):**
1. Identify the observability event contract from `@neuroassist/shared/observability` (read the shared lib API).
2. Confirm the type strings `edge.device.paired`, `edge.device.unpaired`, `edge.device.deactivated`, `edge.device.revoked` are accepted by the observability service.
3. Verify the payload includes `deviceId`, `patientId`, `tenantId` as required fields.
4. Add an integration test (or contract test) verifying EDGE FE emits the correct shape.
5. Document any payload mismatch as a carry-forward for the HIST module.

**Non-goals:**
- Do not implement HIST's history rendering here.
- Do not use `console.log` as a substitute for the observability call.

**Layer(s):**
frontend / Integration — `libs/edge/integration/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2, EARS §5)

**Architecture alignment:**
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Integration lib**
- 🔲 Confirm `@neuroassist/shared/observability` event API (read the shared lib)
- 🔲 `libs/edge/integration/src/lib/edge-shell-integration.service.ts` (emits correct event shapes)

**Tests**
- 🔲 `npx nx test edge-integration` PASS

**Milestone:**
Wave 4 / P4 Hub Integrations

**Labels:**
type:integration
layer:frontend
scope:edge
priority:P4

**Acceptance criteria:**
- Event type strings align with `@neuroassist/shared/observability` accepted event types.
- Payload includes `deviceId`, `patientId`, `tenantId`.
- No `console.log` for audit purposes.
- `npx nx test edge-integration` PASS

**Dependencies:**
- FE-EDGE-019 (integration service)
- FE-EDGE-023 (telemetry emission)

**Data impact:**
Nenhum direto (events flow to observability service, not stored by EDGE)

**API / Contract impact:**
- Observability event schema must be published by the HIST/shared architect before this issue can close

**Testing / Evidence required:**
- Contract test or mock-based integration test verifying event shape.

**Risks / Notes:**
- If the observability event API changes (HIST module evolves), INT-FE-EDGE-001 must be re-verified — treat the event type strings as a versioned contract.
