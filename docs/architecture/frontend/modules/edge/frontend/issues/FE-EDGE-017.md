## [FE-EDGE-017] canReadDeviceGuard — AccessDecisionService.can('edge.device.read')

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`canReadDeviceGuard` in `libs/edge/access` gates `/patients/:patientId/device` by calling `AccessDecisionService.can('edge.device.read')` and redirects to the forbidden route on denial — never hardcodes `return true`.

**Context / Problem statement:**
- SPEC-01 §1 declares this guard on the device-status route.
- Learning Layer pitfall `guard:stub-permissive:hardcoded-return-true-bypasses-access-decision` (evidence × 6): guards that return `true` unconditionally bypass the entire access layer — this must not happen here.
- The authority is `edge.device.read` (not the superseded `edge.device.view` — G-EDGE-1).
- The device-identity token (`edge.device`) is a device actor and must NOT be evaluated by this guard (ADR-014).
- Bloqueia: FE-EDGE-002 (route table references this guard)

**Approach (execution path):**
1. Create `libs/edge/access/src/lib/can-read-device.guard.ts` as a functional Angular guard.
2. Inject `AccessDecisionService` from `@neuroassist/shared/access-decision`.
3. Call `accessDecision.can('edge.device.read')` — if `false`, redirect to the shared forbidden route and return `false`.
4. If `true`, return `true`.
5. Add a unit test: session lacks `edge.device.read` → guard returns `UrlTree` to forbidden.

**Non-goals:**
- Do not hardcode `return true` as a stub.
- Do not check the `edge.device` identity token — that is a device-actor credential (ADR-014).
- Do not duplicate the `authGuard` session check — `authGuard` is applied first in the route.

**Layer(s):**
frontend / Access — `libs/edge/access/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-01-route-map.md` (§1)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-05-tool-contract.md` (§4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Access lib**
- 🔲 `libs/edge/access/src/lib/can-read-device.guard.ts`

**Tests**
- 🔲 `npx nx test edge-access` PASS
- 🔲 `npx nx lint edge-access` PASS

**Milestone:**
Wave 5 / P5 Access Guards

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P5

**Acceptance criteria:**
- Guard calls `AccessDecisionService.can('edge.device.read')` — no hardcoded `return true`.
- Denial redirects to the shared forbidden route.
- Guard does not evaluate `edge.device` identity token.
- `npx nx test edge-access` PASS

**Dependencies:**
- FE-EDGE-001 (MODULE_PERMISSION_MAP defines 'edge.device.read')
- INT-FE-EDGE-004 (AccessDecisionService injected)

**Data impact:**
Nenhum

**API / Contract impact:**
- Guard is the FE enforcement of `edge.device.read` authority (INV-EDGE-7)

**Testing / Evidence required:**
- Guard spec: `can('edge.device.read')` returns false → guard returns UrlTree `/forbidden`.

**Risks / Notes:**
- If the scaffold generates this guard as `return true` (carry-forward), replace with the AccessDecisionService call before merging.
