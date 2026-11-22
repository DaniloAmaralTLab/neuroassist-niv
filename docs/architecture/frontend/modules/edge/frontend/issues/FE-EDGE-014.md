## [FE-EDGE-014] EdgeDeviceStatusPageComponent — smart OnPush, feature-device-status route

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EdgeDeviceStatusPageComponent` is the smart container for the device status and lifecycle view: reads `DeviceFacade.statusVm()` and `DeviceFacade.lifecycleVm()` signals, reads RBAC booleans from `AccessDecisionService`, and delegates renders to `EdgeDeviceCardComponent` and `DeviceLifecycleActionsComponent`.

**Context / Problem statement:**
- SPEC-02 §2 defines the smart component tree; the page reads five authority checks from `AccessDecisionService` (read, unpair, deactivate, revoke + derived canReactivate from `lifecycleState='deactivated'`).
- Liveness is derived from the facade's `statusVm().badge` — never from a client timer (ADR-005).
- Destructive actions (unpair, deactivate, revoke) are behind an explicit confirm dialog before dispatch (SPEC-04 §4).
- Bloqueia: FE-EDGE-015

**Approach (execution path):**
1. Create `libs/edge/feature-device-status/src/lib/edge-device-status-page/edge-device-status-page.component.ts` as `standalone: true`, `changeDetection: OnPush`.
2. Inject `DeviceFacade` and `AccessDecisionService`; expose signals: `statusVm`, `lifecycleVm`, `canUnpair`, `canDeactivate`, `canRevoke`, `canReactivate`.
3. Create `libs/edge/feature-device-status/src/lib/device-status.routes.ts` for the lazy route.
4. Handle lifecycle action outputs from `DeviceLifecycleActionsComponent`: confirm dialog → dispatch to facade method (unpair/deactivate/reactivate/revoke).
5. On navigation into this route, call `DeviceFacade.loadDeviceStatus(patientId)` to refresh state (SPEC-04 §1 — no stale cache).

**Non-goals:**
- No `HttpClient` injection.
- No inline role string evaluation.
- Reactivate is offered only WHILE `lifecycleState='deactivated'`; revoke is terminal (no reactivate offered after revoke — SPEC-03 §3).

**Layer(s):**
frontend / Feature lib — `libs/edge/feature-device-status/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§2)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-01-route-map.md` (§1, §4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Feature lib**
- 🔲 `libs/edge/feature-device-status/src/lib/edge-device-status-page/edge-device-status-page.component.ts`
- 🔲 `libs/edge/feature-device-status/src/lib/device-status.routes.ts`

**Tests**
- 🔲 `npx nx test edge-feature-device-status` PASS
- 🔲 `npx nx lint edge-feature-device-status` PASS

**Milestone:**
Wave 3 / P3 Feature libs

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P3

**Acceptance criteria:**
- On route activation, `DeviceFacade.loadDeviceStatus(patientId)` is called.
- `canRevoke` from `AccessDecisionService.can('edge.device.revoke')`, not from a role string.
- Reactivate CTA is hidden WHILE `lifecycleState !== 'deactivated'`.
- Destructive action CTA is behind a confirm dialog.
- `npx nx test edge-feature-device-status` PASS

**Dependencies:**
- FE-EDGE-009 (DeviceFacade.statusVm, lifecycleVm)
- INT-FE-EDGE-004 (AccessDecisionService)

**Data impact:**
Nenhum

**API / Contract impact:**
- Route activation triggers `GET /edge/devices` and `GET /edge/devices/{id}` via facade

**Testing / Evidence required:**
- Component test: mock facade statusVm with `revoked` → reactivate button absent; `deactivated` → reactivate button present.

**Risks / Notes:**
- If `lifecycleVm` is undefined on first render (device not loaded yet), guard against null in template.
