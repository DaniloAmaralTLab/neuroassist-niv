## [FE-EDGE-006] edge.bootstrap.ts — ModuleBootstrap init/destroy lifecycle

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`edge.bootstrap.ts` exports `edgeBootstrap: ModuleBootstrap` with `init` mounting the topbar `DeviceStatusBadge`, registering EDGE breadcrumbs, and triggering the first device status read; `destroy` unmounting the badge and clearing all DeviceFacade signals with no dangling subscriptions.

**Context / Problem statement:**
- SPEC-06 §3 defines the bootstrap contract: `init` reads active tenant (never writes it), mounts badge, registers breadcrumbs; `destroy` unmounts badge, unregisters breadcrumbs, clears EDGE signals.
- A missing `destroy` leaves a stale device status visible after the user navigates away from EDGE context.
- Bootstrap must NOT perform login (ACS owns auth-session) and must NOT write the active tenant (tenant-context owns that).
- Bloqueia: FE-EDGE-019 (shell integration service calls bootstrap hooks)

**Approach (execution path):**
1. Create `libs/edge/src/lib/edge.bootstrap.ts` exporting `edgeBootstrap: ModuleBootstrap`.
2. `init(ctx)`: (a) read active tenant from `@neuroassist/shared/tenant-context`; (b) inject `DeviceFacade` and call the first `loadDeviceStatus()`; (c) contribute `DeviceStatusBadge` to shell topbar via `EdgeShellIntegrationService`; (d) register EDGE breadcrumbs with shell `NavigationService`.
3. `destroy(ctx)`: (a) unmount topbar badge and unregister breadcrumbs; (b) call `DeviceFacade.reset()` to clear all signals; (c) ensure no active subscriptions remain.
4. Register `edgeBootstrap` in `edge.module.ts` or the providers array so the shell calls it at the right lifecycle hooks.

**Non-goals:**
- Do not perform authentication or token refresh in `init`.
- Do not set up a polling loop in `init` — polling is owned by `DeviceFacade` (SPEC-04 §4).

**Layer(s):**
frontend / Tool entry — `libs/edge/src/lib/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§3)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Lib path: libs/edge/src/lib/**
- 🔲 `libs/edge/src/lib/edge.bootstrap.ts`

**Tests**
- 🔲 `npx nx test edge` PASS
- 🔲 `npx nx lint edge` PASS

**Milestone:**
Wave 1 / P1 Foundation

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P1

**Acceptance criteria:**
- `init` triggers the first device status read via DeviceFacade.
- `destroy` clears all DeviceFacade signals; no subscriptions remain after destroy.
- `init` does NOT call any auth-session login method.
- `init` does NOT write the tenant via tenant-context.
- `npx nx test edge` PASS

**Dependencies:**
- FE-EDGE-004 (descriptor registers the module so the shell calls init)
- FE-EDGE-009 (DeviceFacade must expose reset())
- INT-FE-EDGE-002 (tenant-context read in init)

**Data impact:**
Nenhum

**API / Contract impact:**
- `init` triggers `GET /edge/devices` (via DeviceFacade) to seed the topbar badge

**Testing / Evidence required:**
- Unit test: `destroy` called after `init` → `DeviceFacade.reset()` called once; badge unmounted.

**Risks / Notes:**
- If the shell does not call `destroy` on tenant switch, stale EDGE state will persist (INT-FE-EDGE-002 must handle this as a fallback via tenant-context.switchTo listener).
