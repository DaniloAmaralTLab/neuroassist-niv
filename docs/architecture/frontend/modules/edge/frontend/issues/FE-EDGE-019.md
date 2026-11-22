## [FE-EDGE-019] EdgeShellIntegrationService — breadcrumbs, topbar badge contribution, audit hand-off

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EdgeShellIntegrationService` in `libs/edge/integration` wires the shell's topbar badge to `DeviceFacade`, registers the EDGE breadcrumb trail, ensures the badge is always visible (never hidden behind a submenu), and forwards lifecycle actions to `@neuroassist/shared/observability` for HIST consumption.

**Context / Problem statement:**
- SPEC-06 §2 defines the service responsibilities: topbar badge, breadcrumbs, menu visibility, audit hand-off.
- The badge must be **always** visible on every dashboard screen — never behind a submenu (Principle 2.6 / SPEC-06 §3).
- Breadcrumbs: `Care → Edge device → {patient}` for the status page; `Care → Edge device → {patient} → Pair device` for the pair route.
- Audit hand-off: pair / unpair / deactivate / revoke actions are forwarded to `@neuroassist/shared/observability` so HIST module can consume them (EDGE does not render history).
- This service holds NO `HttpClient` and NO business state — it only observes facade signals.
- Bloqueia: INT-FE-EDGE-001 (observability wiring)

**Approach (execution path):**
1. Create `libs/edge/integration/src/lib/edge-shell-integration.service.ts` as an `@Injectable({ providedIn: 'root' })` or module-scoped service.
2. Inject `DeviceFacade`, shell `NavigationService`, and `@neuroassist/shared/observability`.
3. `mountTopbarBadge()`: contribute `DeviceStatusBadge` to the shell topbar, fed by `DeviceFacade.statusVm()` signal.
4. `registerBreadcrumbs()`: register the breadcrumb trails for the two EDGE routes.
5. `forwardAuditEvents(actions$)`: on pair/unpair/deactivate/revoke outputs from the page components, call `observability.emit(...)` with action type and device id.
6. `unmount()`: removes the badge and unregisters breadcrumbs (called by bootstrap destroy).

**Non-goals:**
- Do not render any HIST records here — HIST module owns history display.
- Do not emit `console.log` for audit — only `observability.emit`.

**Layer(s):**
frontend / Integration — `libs/edge/integration/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Integration lib**
- 🔲 `libs/edge/integration/src/lib/edge-shell-integration.service.ts`

**Tests**
- 🔲 `npx nx test edge-integration` PASS
- 🔲 `npx nx lint edge-integration` PASS

**Milestone:**
Wave 6 / P6 Navigation/Breadcrumbs

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P6

**Acceptance criteria:**
- Topbar badge is mounted on `init` and unmounted on `destroy`.
- Breadcrumbs registered for both EDGE routes.
- `console.log` is NOT called for any audit event — only `observability.emit`.
- Service has no `HttpClient` injection.
- `npx nx test edge-integration` PASS

**Dependencies:**
- FE-EDGE-016 (DeviceStatusBadge component)
- FE-EDGE-009 (DeviceFacade signals)
- INT-FE-EDGE-001 (observability service contract)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum direto (observes facade, no direct BE calls)

**Testing / Evidence required:**
- Service test: `mountTopbarBadge` called → badge slot registered with shell NavigationService.

**Risks / Notes:**
- If the shell's `NavigationService` API for topbar contribution differs from what SPEC-06 describes, align the integration service accordingly without changing the SPEC.
