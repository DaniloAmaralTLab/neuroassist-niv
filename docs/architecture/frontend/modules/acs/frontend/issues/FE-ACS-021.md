# FE-ACS-021 -- AcsShellIntegrationService — breadcrumbs / ops-menu visibility / audit hand-off to observability

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`AcsShellIntegrationService` feeds breadcrumbs to the shell `NavigationService` (Access → Caregivers; Access → Patient sessions → {patient}; Ops → Tenants when admin-host only), emits the Ops sidebar entry only when `opsHostGuard` resolves `onAdminHost = true`, and forwards provision/revoke/register UI actions to `@neuroassist/shared/observability` for HIST consumption — it holds no `HttpClient` and no business state (SPEC-06 §2).

## Approach (execution path)
1. Create `libs/acs/integration/src/lib/acs-shell-integration.service.ts` as an Angular service.
2. Inject `NavigationService`, `opsHostGuard.onAdminHost` (signal/observable), and `ObservabilityService` from `@neuroassist/shared/observability`.
3. On `init()`: register ACS breadcrumb routes with `NavigationService`; subscribe to `onAdminHost` to emit or suppress the "Tenants (ops)" menu entry.
4. On `destroy()`: unregister ACS breadcrumbs; unsubscribe (DestroyRef).
5. When breadcrumb path is `/access/patient-sessions/:patientId`: interpolate patient name from the route param (use `vm().patient.name` from facade).
6. Emit to observability: `provisionOccurred(sessionId)`, `revokeOccurred(sessionId)`, `caregiverRegistered(caregiverId)` — never use `console.log` (carry-forward SPEC-06).
7. No `HttpClient` injection; no business state stored in this service.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/integration/src/lib/acs-shell-integration.service.ts`
- [ ] Breadcrumbs registered for all ACS routes including patient dynamic segment
- [ ] Ops breadcrumb and menu entry suppressed when `onAdminHost = false`
- [ ] `provisionOccurred`, `revokeOccurred`, `caregiverRegistered` forwarded to `ObservabilityService`
- [ ] No `HttpClient` imported; no business state stored
- [ ] `destroy()` unregisters breadcrumbs and cancels subscriptions
- [ ] `npx nx test acs-integration` PASS
- [ ] `npx nx lint acs-integration` PASS

## Acceptance criteria
- [ ] WHILE `onAdminHost = false`, THE SYSTEM SHALL contribute only Caregivers and Patient-sessions destinations
- [ ] WHEN provision/revoke/register completes, THE SYSTEM SHALL forward the action to `ObservabilityService` and SHALL NOT call `console.log`
- [ ] WHEN ACS `destroy` runs, THE SYSTEM SHALL unregister breadcrumbs and clear subscriptions
- [ ] `npx nx build acs-integration` PASS

## Dependencies
FE-ACS-020 (opsHostGuard `onAdminHost` signal), FE-ACS-003 (acsBootstrap.init/destroy calls this service).

## Tenant-context impact
None — this service observes state; it does not create or mutate tenant data.

## Prioridade
P6
