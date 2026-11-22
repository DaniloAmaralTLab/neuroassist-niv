## [FE-EDGE-005] edge.providers.ts — HTTP adapter default (not mock); EdgeDeviceHttpAdapter base ${ACCESS_HTTP_BASE}/edge

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`edge.providers.ts` configures `EDGE_DEVICE_PORT` with the **HTTP** adapter as default; a spec file proves the default is `http`, not mock, closing carry-forward `scaffold:mock-adapter-default:shell-provider-not-switched-to-http`.

**Context / Problem statement:**
- SPEC-04 §2 mandates the HTTP adapter default because `edge-service` api-contract now exists (G-EDGE-3 resolved).
- Learning Layer pitfall `scaffold:mock-adapter-default` (evidence × 7): the scaffold historically generated `adapter=mock`; that must be overridden here.
- `EdgeDeviceHttpAdapter` MUST be based at `${ACCESS_HTTP_BASE}/edge`, NOT `/api/v1` (carry-forward `http-adapter:wrong-prefix`).
- `EdgeDeviceMockAdapter` remains available only under an explicit mock provider for tests / offline dev.
- Bloqueia: FE-EDGE-007 (service needs the port token to inject through)

**Approach (execution path):**
1. Create `libs/edge/data-access/src/lib/adapters/edge-device-http.adapter.ts` implementing `EDGE_DEVICE_PORT` with base path `${ACCESS_HTTP_BASE}/edge` and `HttpClient` injected from `@neuroassist/shared/access-http-base`.
2. Create `libs/edge/data-access/src/lib/adapters/edge-device-mock.adapter.ts` implementing the same port with fixture responses in wire shape.
3. Create `libs/edge/src/lib/edge.providers.ts` exporting `provideEdgeModule()` that registers `{ provide: EDGE_DEVICE_PORT, useClass: EdgeDeviceHttpAdapter }` as default.
4. Add a spec `edge.providers.spec.ts` asserting `EDGE_DEVICE_PORT` resolves to `EdgeDeviceHttpAdapter` (not mock) in the default provider array.
5. Expose `provideEdgeMock()` convenience function for tests.

**Non-goals:**
- Do not register `MockAdapter` as the default under any condition.
- Do not use a hardcoded `/api/v1` prefix — EDGE's gateway prefix is `/edge`.

**Layer(s):**
frontend / Data access — `libs/edge/data-access/src/lib/adapters/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§2)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Data access lib**
- 🔲 `libs/edge/data-access/src/lib/adapters/edge-device-http.adapter.ts`
- 🔲 `libs/edge/data-access/src/lib/adapters/edge-device-mock.adapter.ts`
- 🔲 `libs/edge/src/lib/edge.providers.ts` (provideEdgeModule, provideEdgeMock)
- 🔲 `libs/edge/src/lib/edge.providers.spec.ts` (proves default = http)

**Tests**
- 🔲 `npx nx test edge` PASS (spec proves http default)
- 🔲 `npx nx lint edge` PASS

**Milestone:**
Wave 1 / P1 Foundation

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P1

**Acceptance criteria:**
- `provideEdgeModule()` registers `EdgeDeviceHttpAdapter` (not mock) for `EDGE_DEVICE_PORT`.
- `EdgeDeviceHttpAdapter` uses `${ACCESS_HTTP_BASE}/edge` as the base path.
- `edge.providers.spec.ts` explicitly asserts the default is `http` and not `mock`.
- `npx nx test edge` PASS
- `npx nx lint edge` PASS
- `npx nx build edge` PASS

**Dependencies:**
- FE-EDGE-003 (entry lib wired)
- INT-FE-EDGE-003 (access-http-base token resolution)

**Data impact:**
Nenhum

**API / Contract impact:**
- Base path MUST be `${ACCESS_HTTP_BASE}/edge` matching the gateway routing (api-contract §0.1)

**Testing / Evidence required:**
- `edge.providers.spec.ts` output showing `EDGE_DEVICE_PORT → EdgeDeviceHttpAdapter`.

**Risks / Notes:**
- If the scaffold generates this file with `EdgeDeviceMockAdapter` as default, correct it here — this is the primary target of carry-forward `scaffold:mock-adapter-default`.
