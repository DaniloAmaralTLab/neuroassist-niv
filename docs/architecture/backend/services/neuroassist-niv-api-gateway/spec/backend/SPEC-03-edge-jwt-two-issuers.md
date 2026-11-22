# SPEC-03 — Coarse Edge JWT Check (Two Issuers)

## Objective
Specify the coarse, stateless JWT edge check GWY performs on every protected route:
verify **signature / issuer / expiry-when-present** against **both** the ACS and
the EDGE JWKS, tolerate non-expiring patient-session tokens, and remain **advisory,
never terminal**.

## Scope
**In:** two-issuer signature verification (ACS + EDGE JWKS); issuer validation;
expiry validation only when `exp` is present; deny-by-default for protected routes;
the anonymous allow-list bypass; the reactive (WebFlux) security wiring.
**Out:** RBAC / `@PreAuthorize` (resource servers); `jti`-blacklist / revocation
(downstream); token minting/refresh (ACS/EDGE); tenant-claim parsing (GWY only
strips the header — ADR-003).

## Technical decisions (ADR-002)
- The check verifies the JWT against **two** JWKS (multi-issuer trust fabric):
  ACS (`/acs/.well-known/jwks.json`) and EDGE (`/edge/.well-known/jwks.json`). A
  token signed by **either** is admitted (INV-G6).
- **Expiry is validated only when `exp` exists.** An absent `exp` is valid —
  patient-session tokens are non-expiring by design (ACS §4.1, Risk R2).
- The check is **advisory, not terminal** (INV-G5): a valid-but-under-privileged or
  later-revoked token is admitted at the edge; the resource server re-validates,
  enforces RBAC and the `jti`-blacklist. GWY does **not** call ACS introspect.
- **Reactive runtime:** GWY is Spring Cloud Gateway (WebFlux), so security is
  `@EnableWebFluxSecurity` with a `SecurityWebFilterChain` and a
  `ReactiveAuthenticationManagerResolver` over the two issuers — **not** the servlet
  `@EnableMethodSecurity` (that is for the resource servers). This is the D-642
  hazard inverted for a gateway: the edge check must be PROVEN by a 401 test, and
  the resource servers' `@PreAuthorize` by their own 403 tests.

## Implementation
- `SecurityConfig` (WebFlux): `pathMatchers(<allow-list>).permitAll()`,
  `anyExchange().authenticated()`, `oauth2ResourceServer(jwt)`.
- Multi-issuer: a `ReactiveAuthenticationManagerResolver<ServerWebExchange>` (or two
  `JwtDecoder`s keyed by `iss`) wiring **both** `jwk-set-uri` values from
  `integration-contracts.md` §2 — replacing the single `issuer-uri` the template
  ships (see §7 of integration-contracts — framework gap).
- A custom `JwtValidator` that skips `exp` validation when the claim is absent.
- The anonymous allow-list (api-contract §3) is the `permitAll` set.

## Edge cases
- Token signed by EDGE on a protected route → **admitted** (R1 — must not require
  ACS signature). This is the explicit anti-regression for the "single issuer by
  mistake" bug.
- Patient-session token (no `exp`) → **admitted** (R2); a naive expiry check would
  reject every patient request.
- Unsigned / forged / wrong-issuer token → **401** before any `lb://` call.
- Expired token **with** an `exp` in the past → **401**.
- Valid token, insufficient role → **admitted at the edge**; the resource server
  returns `403` (INV-G5) — GWY makes no RBAC decision.
- Revoked (`jti`-blacklisted) token → still passes the **edge** check (blacklist-blind);
  rejected downstream (accepted trade-off, ADR-002).

## Acceptance criteria (EARS)
`THE SYSTEM SHALL verify the JWT signature against both the ACS and the EDGE JWKS and SHALL admit a token signed by either issuer.` (INV-G6)
`WHEN a protected-route request presents an EDGE-signed edge.device token, THE SYSTEM SHALL admit it (NOT reject it for not being ACS-signed).` (Risk R1)
`WHERE a token has no exp claim, THE SYSTEM SHALL treat it as valid for the edge check.` (Risk R2)
`IF a token is unsigned, forged, wrong-issuer, or expired (exp in the past), THEN THE SYSTEM SHALL return 401 and SHALL NOT call any downstream.`
`THE SYSTEM SHALL NOT make any RBAC/authorization decision and SHALL NOT enforce the jti-blacklist at the edge (the check is advisory, not terminal).` (INV-G5)
`THE SYSTEM SHALL be proven by an automated test that a protected route returns 401 without a valid token and is admitted with one (authz PROVEN — D-642).`
