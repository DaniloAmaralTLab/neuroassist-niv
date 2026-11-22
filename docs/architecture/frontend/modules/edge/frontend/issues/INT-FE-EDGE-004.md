## [INT-FE-EDGE-004] INT: @neuroassist/shared/access-decision — AccessDecisionService.can() wired for all EDGE authorities

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`AccessDecisionService.can(<authority>)` is correctly wired for all 7 EDGE authorities; no component evaluates a role string inline — RBAC-of-UI rule enforced (SPEC-05 §4).

**Context / Problem statement:**
- SPEC-05 §4: every gating boolean is derived from `AccessDecisionService.can(<authority>)`.
- Learning pitfall `guard:stub-permissive` applies here too: components must not hardcode visibility based on a role string.
- The 7 authorities (`edge.device.enroll`, `edge.device.pair`, `edge.device.read`, `edge.device.activate`, `edge.device.deactivate`, `edge.device.unpair`, `edge.device.revoke`) must all be evaluable by the shared `AccessDecisionService` after the session is loaded.
- This INT issue validates the runtime integration: the session token must carry these authority claims in a form that `AccessDecisionService` can evaluate.

**Approach (execution path):**
1. Confirm `AccessDecisionService.can(authority)` reads from the session token's authority claim list.
2. Verify that each of the 7 EDGE authority strings appears in the token for the appropriate role (CAREGIVER, CLINIC_COORDINATOR per api-contract §9).
3. Write an integration test: mock session with `edge.device.read` present → `can('edge.device.read') === true`; session without it → `false`.
4. Add a component integration test for `EdgeDeviceStatusPageComponent`: mock session lacking `edge.device.revoke` → revoke CTA absent from DOM.

**Non-goals:**
- Do not reimplement the authority resolution — that belongs in `@neuroassist/shared/access-decision`.
- Do not check the `edge.device` identity token in dashboard components (ADR-014).

**Layer(s):**
frontend / Access + Feature libs

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-05-tool-contract.md` (§4)

**Architecture alignment:**
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Access / Feature libs**
- 🔲 Confirm `@neuroassist/shared/access-decision` resolves all 7 EDGE authority strings from session
- 🔲 `libs/edge/feature-device-status/src/lib/edge-device-status-page/edge-device-status-page.component.ts` (all 5 `can()` calls verified)
- 🔲 `libs/edge/feature-device-pairing/src/lib/device-pairing-page/device-pairing-page.component.ts` (`can('edge.device.pair')` verified)

**Tests**
- 🔲 `npx nx test edge-access` PASS

**Milestone:**
Wave 4 / P4 Hub Integrations

**Labels:**
type:integration
layer:frontend
scope:edge
priority:P4

**Acceptance criteria:**
- All 7 EDGE authority strings are evaluable by `AccessDecisionService.can()`.
- No EDGE component evaluates a role string inline (audit the template for `role === 'CLINIC_COORDINATOR'` patterns).
- `can('edge.device.revoke')` returning `false` → revoke CTA absent from status page DOM.
- `npx nx test edge-access` PASS

**Dependencies:**
- FE-EDGE-001 (authority strings defined in MODULE_PERMISSION_MAP)
- FE-EDGE-014 (status page reads 5 can() calls)

**Data impact:**
Nenhum

**API / Contract impact:**
- Authority → role mapping declared in api-contract §9; session token carries the claims

**Testing / Evidence required:**
- Component test with mock session: each `can()` call returning false hides/disables the corresponding CTA.

**Risks / Notes:**
- If `AccessDecisionService` does not support the EDGE authority prefix (`edge.*`) out of the box, a registration step may be needed — flag this as a dependency on the shared lib version.
