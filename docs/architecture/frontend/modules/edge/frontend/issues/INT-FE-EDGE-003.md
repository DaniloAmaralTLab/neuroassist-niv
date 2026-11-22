## [INT-FE-EDGE-003] INT: @neuroassist/shared/auth-session — authGuard + unauthenticated redirect

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`authGuard` from `@neuroassist/shared/auth-session` is correctly registered on all EDGE routes; a 401 `unauthenticated` from `edge-service` also redirects to the shell login route — EDGE never renders a device surface to an unauthenticated user.

**Context / Problem statement:**
- SPEC-01 §1: `authGuard` is the first guard on both EDGE routes; it owns the session-absent redirect.
- SPEC-07 §2: `unauthenticated` (401) from any protected edge-service endpoint → redirect to login.
- FE-EDGE-002 registers `authGuard` in the route table; this INT issue validates the actual runtime behavior with the shared auth-session library.
- If the shared `authGuard` redirects to a different login path than EDGE expects, the integration contract must be aligned here.

**Approach (execution path):**
1. Import `authGuard` from `@neuroassist/shared/auth-session` in `edge.routes.ts` (FE-EDGE-002).
2. In `EdgeErrorMapper` (FE-EDGE-010): on `unauthenticated` slug → call shell `AuthSessionService.redirectToLogin()` (not a toast/banner).
3. Write an integration test: mock `authGuard` returning `false` → route not activated, redirected to login.
4. Write an integration test: 401 from edge-service → `EdgeErrorMapper` calls `redirectToLogin`.

**Non-goals:**
- Do not reimplement session management in EDGE — that is `@neuroassist/shared/auth-session`.
- Do not add a session expiry timer in EDGE.

**Layer(s):**
frontend / Access + Data access

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-01-route-map.md` (§1 — authGuard carry-forward)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-07-error-handling.md` (§2 — unauthenticated)

**Architecture alignment:**
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Access / Data access**
- 🔲 `libs/edge/access/src/lib/can-read-device.guard.ts` — authGuard imported (not re-implemented)
- 🔲 `libs/edge/data-access/src/lib/error/edge-error.mapper.ts` — unauthenticated → redirectToLogin

**Tests**
- 🔲 `npx nx test edge-access` PASS

**Milestone:**
Wave 4 / P4 Hub Integrations

**Labels:**
type:integration
layer:frontend
scope:edge
priority:P4

**Acceptance criteria:**
- Both EDGE routes have `authGuard` as the first guard in their `canActivate` array.
- 401 from edge-service → shell login redirect (no EDGE error surface shown).
- `npx nx test edge-access` PASS

**Dependencies:**
- FE-EDGE-002 (route table registers authGuard)
- FE-EDGE-010 (error mapper handles unauthenticated)

**Data impact:**
Nenhum

**API / Contract impact:**
- 401 responses from api-contract §8 must trigger the shared auth-session redirect

**Testing / Evidence required:**
- Guard integration test: absent/expired session → redirect to shell login route.

**Risks / Notes:**
- Carry-forward from SPEC-01: `guard:unauth-redirect:session-absent-must-go-to-login` — if the scaffold generates a custom redirect instead of using `authGuard`, this must be replaced.
