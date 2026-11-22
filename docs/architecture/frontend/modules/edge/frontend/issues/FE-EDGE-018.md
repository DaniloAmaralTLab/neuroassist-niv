## [FE-EDGE-018] canPairDeviceGuard — AccessDecisionService.can('edge.device.pair')

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`canPairDeviceGuard` in `libs/edge/access` gates `/patients/:patientId/device/pair` by calling `AccessDecisionService.can('edge.device.pair')` and redirects to the forbidden route on denial — never hardcodes `return true`.

**Context / Problem statement:**
- SPEC-01 §1 declares this guard on the pairing route.
- The authority key is `edge.device.pair` (pairing intent, D-639 op-name parity); the enroll operation additionally requires `edge.device.enroll` on the actual `POST /edge/devices` call — the guard gates the route, the BE enforces the authority on the endpoint.
- Same pitfall risk as FE-EDGE-017: carry-forward `guard:stub-permissive`.
- Bloqueia: FE-EDGE-002

**Approach (execution path):**
1. Create `libs/edge/access/src/lib/can-pair-device.guard.ts` as a functional Angular guard.
2. Inject `AccessDecisionService` from `@neuroassist/shared/access-decision`.
3. Call `accessDecision.can('edge.device.pair')` — if `false`, redirect to forbidden route and return `false`.
4. If `true`, return `true`.
5. Add unit test: missing `edge.device.pair` → guard denies and redirects.

**Non-goals:**
- Do not check `edge.device.enroll` in the guard — that authority is enforced by the BE on the POST call; the guard only gates the route.
- Do not hardcode `return true`.

**Layer(s):**
frontend / Access — `libs/edge/access/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-01-route-map.md` (§1)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-05-tool-contract.md` (§4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Access lib**
- 🔲 `libs/edge/access/src/lib/can-pair-device.guard.ts`

**Tests**
- 🔲 `npx nx test edge-access` PASS
- 🔲 `npx nx lint edge-access` PASS

**Milestone:**
Wave 5 / P5 Access Guards

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P5

**Acceptance criteria:**
- Guard calls `AccessDecisionService.can('edge.device.pair')` — no hardcoded `return true`.
- Denial redirects to the shared forbidden route.
- Guard does NOT also check `edge.device.enroll` (route-level authority is `edge.device.pair` only).
- `npx nx test edge-access` PASS

**Dependencies:**
- FE-EDGE-001 (MODULE_PERMISSION_MAP defines 'edge.device.pair')
- INT-FE-EDGE-004 (AccessDecisionService injected)

**Data impact:**
Nenhum

**API / Contract impact:**
- Route-level guard; `edge.device.enroll` enforced by BE on POST /edge/devices

**Testing / Evidence required:**
- Guard spec: `can('edge.device.pair')` returns false → UrlTree `/forbidden` returned.

**Risks / Notes:**
- `edge.device.pair` is the op-name parity constant (D-639); do not substitute `edge.device.enroll` here.
