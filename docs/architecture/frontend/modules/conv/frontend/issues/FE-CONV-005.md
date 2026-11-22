# FE-CONV-005 -- CONV_MODULE_DESCRIPTOR + conv.bootstrap.ts — shell registration, background TreeSyncService.check(), init/destroy lifecycle

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-06 §1–4, generator-config.yml §shell_surfaces, contracts/backend-api-cross-link.md §4 (G1)

## Outcome
`CONV_MODULE_DESCRIPTOR` and `conv.bootstrap.ts` are in place. The descriptor registers CONV in the Patient-Mode host's module list (section='patient', order=0, identity='patient.session'). `conv.bootstrap.ts` wires `provideConv({ adapter: 'http' })`, subscribes `ConvShellIntegrationService` to `NAVIGATION_INTENT_PORT`, and kicks a **background** `TreeSyncService.check()` on init (non-blocking — the cache serves immediately from `TreeCacheStore`). Destroy flushes pending usage signals best-effort and unsubscribes.

**Open item (G1):** The Patient-Mode host that mounts CONV under `/patient` is undecided. `'app: patient-shell'` in generator-config.yml is a placeholder. This issue ships the descriptor + bootstrap as a **library facade**; no concrete host app is assumed.

## Approach (execution path)
1. Create `frontend/libs/conv/integration/src/lib/conv-module-descriptor.ts` — export `CONV_MODULE_DESCRIPTOR: ModuleDescriptor` matching SPEC-06 §1 shape (key, title, icon, section='patient', order=0, routeBase='/patient', identity='patient.session', routePath, loadChildren, permissions array).
2. Create `frontend/libs/conv/src/lib/conv.bootstrap.ts` with an `initConv()` function:
   a. Register `CONV_MODULE_DESCRIPTOR` in the host module registry.
   b. Call `provideConv({ adapter: 'http' })` (HTTP adapter default — conv-service published at M1.5).
   c. Subscribe `ConvShellIntegrationService` to `NAVIGATION_INTENT_PORT` (may be NoOp until host wires GEST).
   d. Call `TreeSyncService.check()` as a **background, non-blocking** task (cache serves immediately from IndexedDB; never blocks rendering).
3. `destroyConv()`: unsubscribe intent port subscription, cancel any in-flight sync, flush `UsageSignalService.flush()` best-effort (fire-and-forget).
4. Export both from `frontend/libs/conv/src/index.ts` and `frontend/libs/conv/integration/src/index.ts`.
5. Unit test: `initConv()` calls `TreeSyncService.check()` exactly once and does not block.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/integration/src/lib/conv-module-descriptor.ts` — `CONV_MODULE_DESCRIPTOR` with identity='patient.session'
- [ ] `frontend/libs/conv/src/lib/conv.bootstrap.ts` — `initConv()` and `destroyConv()` exported
- [ ] `initConv()` calls `TreeSyncService.check()` as background (non-blocking, never awaited on the render path)
- [ ] `initConv()` subscribes `ConvShellIntegrationService` to `NAVIGATION_INTENT_PORT`
- [ ] `destroyConv()` flushes `UsageSignalService` best-effort and unsubscribes
- [ ] G1 open item documented as a risk/note in this file
- [ ] `npx nx test conv` PASS
- [ ] `npx nx lint conv` PASS

## Acceptance criteria
- [ ] `CONV_MODULE_DESCRIPTOR.identity === 'patient.session'` (not a caregiver JWT)
- [ ] `initConv()` does not block rendering — `TreeSyncService.check()` is called without `await` on the synchronous init path
- [ ] `destroyConv()` flushes usage signals best-effort and unsubscribes the intent port
- [ ] `npx nx test conv` PASS; `npx nx lint conv` PASS

## Dependencies
FE-CONV-001 (conv.contract.ts).
FE-CONV-003 (provideConv()).
FE-CONV-004 (NAVIGATION_INTENT_PORT).
FE-CONV-007 (TreeSyncService — TreeSyncService.check()).
FE-CONV-010 (UsageSignalService — flush()).
FE-CONV-019 (ConvShellIntegrationService).

## Tenant-context impact
None — CONV_MODULE_DESCRIPTOR and bootstrap are app-level; per-tenant isolation is in the auth-session interceptor.
