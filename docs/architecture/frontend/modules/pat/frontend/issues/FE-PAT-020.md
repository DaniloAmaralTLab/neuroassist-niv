# FE-PAT-020 -- PatShellIntegrationService — breadcrumbs, menu visibility, audit hand-off, onboarding wizard hand-off

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`PatShellIntegrationService` feeds breadcrumbs to the shell `NavigationService`, contributes menu entries derived from the permission map, hands off wizard completion for the patient-registration step, and forwards audit actions to `@neuroassist/shared/observability`.

## Approach (execution path)
1. Create `libs/pat/integration/src/lib/pat-shell-integration.service.ts` (injectable, no HttpClient, no business state): observe `PatientFacade.active()` signal for breadcrumb patient name.
2. Register breadcrumbs: `Care → Patients & Commands → {patient}` for the catalog; `… → Register patient` for the registry (SPEC-06 §2).
3. Contribute menu entries to shell `NavigationService` only when the permission map grants them (SPEC-05 §1 menu entries require `pat.command.read` / `pat.patient.create`).
4. Onboarding hand-off: expose a completion signal consumed by the shell wizard when the patient-registration step succeeds (SPEC-06 §2).
5. Observability: forward create/calibrate/retire/register UI action completions to `@neuroassist/shared/observability`; never call `console.log` (SPEC-06 EARS).
6. Export from `libs/pat/integration/src/index.ts`. Used by `pat.bootstrap.ts` (FE-PAT-006).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/integration/src/lib/pat-shell-integration.service.ts`
- [ ] exportar de `libs/pat/integration/src/index.ts`
- [ ] unit tests (breadcrumb registration, menu visibility, audit forwarding)
- [ ] `npx nx test pat-integration` PASS
- [ ] `npx nx lint pat-integration` PASS

## Acceptance criteria
- [ ] Menu entries appear only when the permission map grants the required authority (SPEC-05 §1).
- [ ] `destroy` (called by `patBootstrap.destroy`) unregisters all PAT breadcrumbs and menu entries.
- [ ] Audit actions are forwarded to `@neuroassist/shared/observability`, not `console.log` (SPEC-06 EARS).
- [ ] `npx nx build pat-integration` PASS.

## Dependencies
FE-PAT-008 (PatientFacade.active() for patient name in breadcrumb).
FE-PAT-006 (pat.bootstrap calls PatShellIntegrationService).
FE-PAT-024 (observability events defined there; integration service calls them).

## Tenant-context impact
Nenhum (integration service observes facade signals; no direct tenant logic).

## Prioridade
P6
