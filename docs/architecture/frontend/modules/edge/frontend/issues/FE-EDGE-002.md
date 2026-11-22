## [FE-EDGE-002] EDGE_ROUTES — lazy route table with authGuard, canReadDeviceGuard, canPairDeviceGuard

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`libs/edge/src/lib/edge.routes.ts` exports `EDGE_ROUTES`, the canonical lazy route table for the two patient-scoped EDGE surfaces, correctly guarded and lazy-loaded via `loadComponent`.

**Context / Problem statement:**
- SPEC-01 defines the two routes: `/patients/:patientId/device` (guard: `authGuard` + `canReadDeviceGuard`) and `/patients/:patientId/device/pair` (guard: `authGuard` + `canPairDeviceGuard`).
- Each route uses `loadComponent` for lazy feature loading — no eager bundling of a feature lib (SPEC-01 §3).
- `canReadDeviceGuard` is renamed from the vision's `canViewDeviceGuard`; uses `edge.device.read` not `edge.device.view` (G-EDGE-1).
- Bloqueia: FE-EDGE-003, FE-EDGE-011, FE-EDGE-014

**Approach (execution path):**
1. Create `libs/edge/src/lib/edge.routes.ts` exporting `EDGE_ROUTES: Routes`.
2. Add route `/patients/:patientId/device` with `title: 'Edge device'`, `canActivate: [authGuard, canReadDeviceGuard]`, `loadComponent: () => import(...)`.
3. Add child route `pair` with `title: 'Pair device'`, `canActivate: [authGuard, canPairDeviceGuard]`, `loadComponent: () => import(...)`.
4. Register `data: { breadcrumb: [...] }` on each route for breadcrumb state (SPEC-06).
5. Verify that `loadChildren` in the shell points to this file and that neither feature lib is imported eagerly.

**Non-goals:**
- No top-level sidebar route (EDGE has no standalone destination — SPEC-01 §1).
- Do not add `/edge/heartbeat` or `/edge/catalog` routes (device-token paths, out of FE scope).

**Layer(s):**
frontend / Tool entry — `libs/edge/src/lib/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-01-route-map.md` (§1, §3, §4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Lib path: libs/edge/src/lib/**
- 🔲 `libs/edge/src/lib/edge.routes.ts` (EDGE_ROUTES with two patient-scoped routes)

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
- `/patients/:patientId/device` route uses `canActivate: [authGuard, canReadDeviceGuard]` and `loadComponent`.
- `/patients/:patientId/device/pair` route uses `canActivate: [authGuard, canPairDeviceGuard]` and `loadComponent`.
- Neither feature lib is imported eagerly in the route file.
- `edge.device.view` / `canViewDeviceGuard` do NOT appear in the file (G-EDGE-1).
- `npx nx test edge` PASS
- `npx nx lint edge` PASS
- `npx nx build edge` PASS

**Dependencies:**
- FE-EDGE-001 (MODULE_PERMISSION_MAP defines the authority keys)
- FE-EDGE-017 (canReadDeviceGuard)
- FE-EDGE-018 (canPairDeviceGuard)

**Data impact:**
Nenhum

**API / Contract impact:**
- Route guards enforce `edge.device.read` and `edge.device.pair` before any BE call

**Testing / Evidence required:**
- Route-level guard integration test: missing session → redirect to login; missing authority → redirect to forbidden.

**Risks / Notes:**
- If the scaffold generates `canViewDeviceGuard` (old vision name), rename to `canReadDeviceGuard` here and in FE-EDGE-017.
