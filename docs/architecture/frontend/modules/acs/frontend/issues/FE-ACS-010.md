# FE-ACS-010 -- TenantAdminApiService + TenantAdminFacade — onboard + TenantWire + submitState()

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`TenantAdminApiService` exposes `onboard(name, type)` routed to `POST /acs/ops/tenants` with `TenantWire` mirroring the BE response, and `TenantAdminFacade` exposes `submitState()` and `fieldErrors()` signals for the ops wizard (SPEC-03 §4, SPEC-04 §1, INV-5).

## Approach (execution path)
1. Define `TenantWire` in `dto/tenant.wire.ts`: `{ id, type: 'family'|'clinic', name }`.
2. `TenantAdminApiService.onboard(body: { type, name })` → `POST /acs/ops/tenants` → `TenantWire`.
3. `onboard` body must send ALL required fields — `{ type, name }` — not omit either (carry-forward `http-adapter:request-body-field-whitelist`).
4. Create `TenantAdminFacade` with `WritableSignal<SubmitState>` exposed as `submitState()` and `WritableSignal<FieldErrors>` exposed as `fieldErrors()`.
5. `onboard(form)`: pessimistic — set `submitState = 'submitting'` → call api → on 201 navigate to tenant confirmation; on 400/422 map field errors (SPEC-07).
6. `type` closed set: `'family' | 'clinic'` only — no `PLATFORM_ADMIN` option (ADR-011, SPEC-02 §3).
7. The route is accessible only when `opsHostGuard` resolves `onAdminHost = true` (SPEC-05 §4); BE further enforces `acs.tenant.onboard` authority (INV-5).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/tenant-admin.api.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/dto/tenant.wire.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/tenant-admin.facade.ts`
- [ ] `onboard` body: `{ type, name }` — toEqual asserted in spec
- [ ] `type` closed set: `'family'|'clinic'` (no `PLATFORM_ADMIN`)
- [ ] `submitState()` and `fieldErrors()` exposed as readonly signals
- [ ] `npx nx test acs-data-access` PASS

## Acceptance criteria
- [ ] `TenantAdminApiService.onboard` sends `POST /acs/ops/tenants` with `{ type, name }`
- [ ] `TenantAdminFacade.submitState()` starts at `'idle'`; moves to `'submitting'` on form submit
- [ ] `type` accepts only `'family'` or `'clinic'` (TypeScript union enforced)
- [ ] `npx nx build acs-data-access` PASS

## Dependencies
FE-ACS-004 (acs.providers.ts), INT-FE-ACS-003 (real endpoint + ops-host gating).

## Tenant-context impact
`POST /acs/ops/tenants` **creates** a new tenant; it is a platform-ops action protected by `acs.tenant.onboard` + `opsHostGuard` — only reachable on the admin host (INV-5).

## Prioridade
P2
