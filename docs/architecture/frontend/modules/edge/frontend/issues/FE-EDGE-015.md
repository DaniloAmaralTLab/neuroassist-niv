## [FE-EDGE-015] EdgeDeviceCardComponent + DeviceLifecycleActionsComponent + ConfirmDialogComponent wiring

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EdgeDeviceCardComponent` renders the device status VM (badge, version WHERE present, `lastSyncRelative`) and `DeviceLifecycleActionsComponent` presents the RBAC-gated lifecycle CTAs (unpair / deactivate / reactivate / revoke), each behind a confirm dialog.

**Context / Problem statement:**
- SPEC-02 §2 defines the presentational tree; components are pure (inputs → outputs).
- `EdgeDeviceCardComponent` renders `version` only WHERE the BE supplies it (G-EDGE-2 / SPEC-03 §1) — never prints `null` or a placeholder.
- `DeviceLifecycleActionsComponent` receives `canUnpair`, `canDeactivate`, `canReactivate`, `canRevoke` as inputs; it hides/disables CTAs accordingly — no inline role check.
- Confirm dialog (`@neuroassist/shared/ui-components`) must precede every destructive output (SPEC-04 §4, SPEC-07 §3).
- `revoke` is terminal: once invoked, Reactivate is gone — the page-level logic derives this from `lifecycleState='revoked'`.
- Bloqueia: none (leaf components)

**Approach (execution path):**
1. Create `EdgeDeviceCardComponent` with inputs: `vm: DeviceStatusVM`; renders `DeviceStatusBadge`, `lastSyncRelative` (via relative-time pipe — FE-EDGE-022), and `version` text node with `@if (vm.device?.version)`.
2. Create `DeviceLifecycleActionsComponent` with inputs `canUnpair`, `canDeactivate`, `canReactivate`, `canRevoke`, `device`; outputs `unpairRequested`, `deactivateRequested`, `reactivateRequested`, `revokeRequested`.
3. Each destructive CTA opens a confirm dialog from `@neuroassist/shared/ui-components`; only on confirmation does the component emit the output.
4. `reactivateRequested` only emits WHILE `canReactivate === true`; CTA is absent on `revoked` device.

**Non-goals:**
- No `HttpClient` or facade injection.
- Do not render a placeholder version string when `version === null`.

**Layer(s):**
frontend / Feature lib — `libs/edge/feature-device-status/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§2)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§1, §3)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Feature lib**
- 🔲 `libs/edge/feature-device-status/src/lib/edge-device-card/edge-device-card.component.ts`
- 🔲 `libs/edge/feature-device-status/src/lib/device-lifecycle-actions/device-lifecycle-actions.component.ts`

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
- `EdgeDeviceCardComponent` renders version line only WHEN `vm.device.version` is truthy.
- `DeviceLifecycleActionsComponent`: `revokeRequested` emitted only after confirm dialog.
- Reactivate CTA is absent when `canReactivate === false`.
- No service or `HttpClient` injected in either component.
- `npx nx test edge-feature-device-status` PASS

**Dependencies:**
- FE-EDGE-016 (DeviceStatusBadge used by EdgeDeviceCardComponent)
- FE-EDGE-022 (relative-time pipe)

**Data impact:**
Nenhum

**API / Contract impact:**
- `DeviceLifecycleActionsComponent` outputs trigger facade calls that map to api-contract §2.4–§2.8

**Testing / Evidence required:**
- Component test: `vm.device.version = null` → version row absent in DOM; `revoked` lifecycle state → reactivate button absent.

**Risks / Notes:**
- Confirm dialog must return focus to the trigger element after close (a11y carry-forward `fe-component:modal-focus-return` — also covered in FE-EDGE-022/025).
