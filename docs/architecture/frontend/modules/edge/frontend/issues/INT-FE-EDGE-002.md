## [INT-FE-EDGE-002] INT: @neuroassist/shared/tenant-context — EDGE observes tenant switch and invalidates DeviceFacade signals

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
EDGE observes `tenant-context.switchTo()` and calls `DeviceFacade.invalidate()` on every tenant switch, ensuring no EDGE device state leaks across tenants — SPEC-04 §1 invariant.

**Context / Problem statement:**
- SPEC-04 §1 (last paragraph): a `tenant-context` change invalidates any future EDGE state.
- SPEC-06 §3 bootstrap `init`: reads active tenant, never writes it; `destroy` clears EDGE signals.
- If a CLINIC_COORDINATOR switches from one clinic to another, the topbar badge must reset and the status page must not show the previous tenant's device.
- The `edge.bootstrap.ts` `destroy` hook handles explicit navigation-away; this INT issue handles the mid-session tenant switch path.

**Approach (execution path):**
1. In `EdgeShellIntegrationService` (FE-EDGE-019) or `edge.bootstrap.ts` (FE-EDGE-006): subscribe to `TenantContextService.onSwitch()` observable.
2. On tenant switch event: call `DeviceFacade.invalidate()` to clear all device signals.
3. If the topbar badge is showing an old device status, it must immediately transition to `'unavailable'` after invalidation.
4. Write an integration test: simulate tenant switch → badge signal becomes `'unavailable'`.

**Non-goals:**
- Do not write the active tenant from EDGE — EDGE only reads it.
- Do not trigger a re-load of device data on tenant switch — the new tenant's device is loaded lazily on the next route entry.

**Layer(s):**
frontend / Integration — `libs/edge/integration/` + Data access

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§1 — tenant-context invalidation)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§3)

**Architecture alignment:**
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Integration lib / Bootstrap**
- 🔲 `libs/edge/integration/src/lib/edge-shell-integration.service.ts` (or `edge.bootstrap.ts`) — tenant switch listener
- 🔲 `libs/edge/data-access/src/lib/device.facade.ts` — `invalidate()` method

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
- Tenant switch event calls `DeviceFacade.invalidate()`.
- After invalidation, `DeviceStatusVM.badge === 'unavailable'` and `DeviceStatusVM.device === null`.
- No EDGE device data from the previous tenant is visible after the switch.
- `npx nx test edge-integration` PASS

**Dependencies:**
- FE-EDGE-006 (bootstrap init reads tenant)
- FE-EDGE-009 (DeviceFacade.invalidate)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum

**Testing / Evidence required:**
- Integration test: mock `TenantContextService.onSwitch()` → verify `DeviceFacade.invalidate` called.

**Risks / Notes:**
- If `TenantContextService` does not expose an `onSwitch` observable yet (shared lib not complete), block this issue and document the dependency.
