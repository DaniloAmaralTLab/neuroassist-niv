## [FE-EDGE-010] EDGE error mapping — ProblemDetail type slug → AppError → FE surface

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EdgeErrorMapper` translates BE `ProblemDetail` `type` slugs to the correct FE surface (toast / inline pairing error / banner / modal), preserving `detail` and `correlationId` and never showing a raw HTTP body.

**Context / Problem statement:**
- SPEC-07 §2 defines the full slug → surface mapping (8 slugs mapped for the dashboard; 2 device-token slugs explicitly excluded).
- Errors are mapped by `type` slug, never by HTTP status code alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`).
- The BE `detail` and `correlationId` must be preserved — not discarded behind a fixed string (carry-forward `fe-facade:toast-fixed-text-discards-be-detail`).
- `invalid-pairing-code` and `catalog-unavailable` are NOT FE dashboard surfaces (station-side / device-token paths).
- Bloqueia: FE-EDGE-011, FE-EDGE-014

**Approach (execution path):**
1. Create `libs/edge/data-access/src/lib/error/edge-error.mapper.ts`.
2. Map `unauthenticated` → trigger shell redirect to login (not a UI error surface).
3. Map `forbidden` → toast "You don't have permission for this action." (no device existence revealed).
4. Map `not-found` → toast "That device is no longer available."
5. Map `validation-error` → inline pairing error with per-field messages from BE `detail`.
6. Map `device-not-claimable` → inline pairing error "This device is already paired."
7. Map `device-revoked` → modal "This device was revoked. Enroll and pair a new device."
8. Map network/service-unreachable → `badge='unavailable'` state (no AppError; handled in facade).
9. Each mapped error is emitted via `@neuroassist/shared/ui-feedback` with `correlationId` attached.
10. Add unit tests for each slug mapping.

**Non-goals:**
- Do not map `invalid-pairing-code` or `catalog-unavailable` — those are device-token paths (SPEC-07 §2).
- Do not suppress or transform the `correlationId`.
- Do not show raw HTTP response bodies.

**Layer(s):**
frontend / Data access — `libs/edge/data-access/src/lib/error/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-07-error-handling.md` (all sections)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Data access lib**
- 🔲 `libs/edge/data-access/src/lib/error/edge-error.mapper.ts`
- 🔲 `libs/edge/data-access/src/lib/error/edge-error.mapper.spec.ts`

**Tests**
- 🔲 `npx nx test edge-data-access` PASS
- 🔲 `npx nx lint edge-data-access` PASS

**Milestone:**
Wave 2 / P2 Data Access

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P2

**Acceptance criteria:**
- `forbidden` → toast without device existence detail.
- `device-revoked` → modal with re-enroll guidance.
- `validation-error` → inline pairing panel error mapped from BE `detail`.
- `correlationId` is included in every surfaced error.
- Raw HTTP body is never shown.
- `invalid-pairing-code` and `catalog-unavailable` are NOT handled (no branch for them).
- `npx nx test edge-data-access` PASS

**Dependencies:**
- FE-EDGE-005 (access-http-base error-normalize interceptor must be in place)
- INT-FE-EDGE-003 (unauthenticated redirect via auth-session)

**Data impact:**
Nenhum

**API / Contract impact:**
- BE slugs from api-contract §8 are canonical; this mapper must not invent new slugs

**Testing / Evidence required:**
- Mapper spec covers all 6 dashboard slugs; confirms `invalid-pairing-code` and `catalog-unavailable` are not in the switch/map.

**Risks / Notes:**
- If the access-http-base error-normalize interceptor is not set up, ProblemDetail responses will arrive as raw `HttpErrorResponse`; verify the interceptor is registered before this mapper can work.
