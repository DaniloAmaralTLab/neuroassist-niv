# FE-DASH-007 -- DashShellIntegrationService — setActivePatient fan-out to HIST/EDGE/PAT/EVNT seams; refresh relay; composed read-only slices for DashboardFacade

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/dash/integration/src/lib/dash-shell-integration.service.ts` is authored as an `@Injectable({ providedIn: 'root' })` service that (1) fans out the active patient id to each composed module's integration seam, (2) exposes composed read-only slices to `DashboardFacade`, and (3) relays a caregiver-initiated refresh to all composed facades — conforming to SPEC-06 §2.

## Approach (execution path)
1. Create `libs/dash/integration/src/lib/dash-shell-integration.service.ts`.
2. Inject: `HistShellIntegrationService` (HIST), `DeviceFacade` (EDGE), `CommandFacade` (PAT), `PatientFacade` (PAT), `AlarmFacade` (EVNT).
3. Implement `setActivePatient(patientId: string): void`:
   - `HistShellIntegrationService.setActivePatient(patientId)` — HIST seam
   - `DeviceFacade.loadForPatient(patientId)` — EDGE seam
   - `CommandFacade.loadForPatient(patientId)` — PAT seam (or equivalent load)
   - `AlarmFacade.startMonitoring([patientId])` — EVNT seam
   - Does NOT start any new timer (EVNT owns the poll loop)
4. Implement `refresh(): void` that asks each composed facade to re-read (HIST `refresh()`, EDGE `loadForPatient(currentId)`, PAT `loadForPatient(currentId)`, EVNT `AlarmFacade.refresh()` or poll-trigger).
5. Expose read-only signal slices that `DashboardFacade` reads (delegating to the composed facades' own signals — no duplication).
6. Create `libs/dash/integration/src/index.ts` exporting `DashShellIntegrationService`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/integration/src/lib/dash-shell-integration.service.ts` created
- [ ] `setActivePatient()` fans out to all 4 module seams (HIST/EDGE/PAT/EVNT)
- [ ] No timer started in `setActivePatient()` or `refresh()`
- [ ] `refresh()` relays to all composed facades
- [ ] Read-only signal slices exposed for `DashboardFacade`
- [ ] `libs/dash/integration/src/index.ts` exports `DashShellIntegrationService`
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS
- [ ] Integration lib registered in `libs/dash` Nx project (project.json tags `scope:dash`, `type:util`)

## Acceptance criteria
- [ ] `setActivePatient()` calls HIST/EDGE/PAT/EVNT seams exactly once each
- [ ] No `setInterval` / `timer()` in this service
- [ ] `refresh()` triggers re-reads in all composed facades
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-005 (freshness constants, used to gate staleness in DashboardFacade)
- Composed module facades must be resolvable via DI (HIST/EVNT/EDGE/PAT modules must be in the DI tree)

## Tenant-context impact
None — the patient id comes from the authenticated-caregiver shell context (INV-6); the composed facades carry the tenant context via the ACS JWT interceptor.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-04-data-access.md` (§3)

## Architecture alignment
- DASH owns no patient-picker (INV-6) — patient comes from shell
- No timer ownership (EVNT poll loop is EVNT's)
- Tags Nx: `scope:dash`, `type:util`

## Milestone
Wave 2 / Composition wiring

## Labels
type:feature
layer:frontend
scope:dash
priority:P2

## Prioridade
P2
