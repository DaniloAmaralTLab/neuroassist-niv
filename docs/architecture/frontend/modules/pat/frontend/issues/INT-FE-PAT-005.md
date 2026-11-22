# INT-FE-PAT-005 -- Shell integration — PAT_MODULE_DESCRIPTOR registered in neuroassist-niv-web + observability audit hand-off

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
PAT is fully registered in the `neuroassist-niv-web` shell: `PAT_MODULE_DESCRIPTOR` in `MODULE_DESCRIPTORS`, sidebar renders "Patients & Commands" before lazy chunk resolves, and observability audit hand-off is verified end-to-end.

## Approach (execution path)
1. Verify `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts` includes `PAT_MODULE_DESCRIPTOR` in `MODULE_DESCRIPTORS`.
2. Smoke test: shell boot → sidebar shows "Patients & Commands" section from static descriptor without loading the catalog or registry lazy chunk.
3. Verify `PatShellIntegrationService` is bootstrapped by `patBootstrap.init()` when PAT routes are activated.
4. Verify audit events forwarded to `@neuroassist/shared/observability` are received by the shell's observability pipeline (not `console.log`).
5. Verify shell lazy-loads `@neuroassist/pat` only when navigating to a `/patients*` route (Nx bundle analysis).

## Implementation checklist (by layer/file)
- [ ] Verificar/completar `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts`
- [ ] Smoke test: sidebar mostra PAT sem carregar feature libs
- [ ] `npx nx build neuroassist-niv-web` PASS
- [ ] `npx nx lint neuroassist-niv-web` PASS

## Acceptance criteria
- [ ] Shell sidebar shows "Patients & Commands" on boot from static descriptor (no eager load — SPEC-06 §4).
- [ ] Audit events from PAT reach `@neuroassist/shared/observability` and are not lost to `console.log`.
- [ ] `npx nx build neuroassist-niv-web` PASS (no missing descriptor import).

## Dependencies
FE-PAT-004 (PAT_MODULE_DESCRIPTOR defined).
FE-PAT-020 (PatShellIntegrationService).
FE-PAT-024 (observability events).

## Tenant-context impact
Multi-tenant: the shell sidebar filters menu entries via the session permission map which is tenant-scoped; different caregiver roles in different tenants see the entries they are permitted.

## Prioridade
P4
