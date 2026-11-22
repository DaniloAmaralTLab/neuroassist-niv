# SPEC-07 — Error Handling — acs (ACS) Frontend

> BE `ProblemDetail` (RFC 7807) → `AppError` (`@neuroassist/shared/error-model`) → user-facing
> message via `@neuroassist/shared/ui-feedback`. Errors are mapped by the stable `type` **slug**,
> never by HTTP status alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`),
> and the BE `detail`/`correlationId` are preserved — the FE never shows a raw HTTP body
> (`fe-error-handler:raw-http-error-detail`) and never discards the BE detail behind a fixed string
> (`fe-facade:toast-fixed-text-discards-be-detail`). Sources: BE api-contract §6,
> `frontend/05-state-and-data-flow.md` §5.

## 1. Pipeline

```
acs-service application/problem+json
  → access-http-base error-normalize interceptor (reads `type` slug + detail + correlationId)
  → AppError { code: <slug>, detail, correlationId }
  → feature maps AppError.code → field error | toast | banner/page error | modal
  → rendered via @neuroassist/shared/ui-feedback (BE detail shown, correlationId attached)
```

## 2. BE `type` slug → FE surface (canonical, api-contract §6)

| BE `type` slug | HTTP | Raised by | FE surface | FE message (English, ADR-018) |
|---|---|---|---|---|
| `invalid-credentials` | 401 | login | (owned by shared/auth-session) | "Sign-in failed. Check your credentials." |
| `unauthenticated` | 401 | any protected endpoint / blacklisted token | redirect to login | — (guard-driven) |
| `forbidden` | 403 | authority check failed | toast | "You don't have permission for this action." (no resource existence revealed) |
| `not-found` | 404 | cross-tenant / missing resource | toast | "That record is no longer available." |
| `username-taken` | 409 | `POST /acs/caregivers` | **field error** on `username` | "This username is already taken." |
| `link-exists` | 409 | `POST .../links` | toast (idempotent) | "That patient is already linked." |
| `validation-error` | 400 | malformed body / bad enum | field error(s) | per-field from BE detail |

### 2.1 Conceptual reason codes from the vision (mapped, not new)

The vision (`frontend/05` §5) named `invite_email_taken`, `session_already_revoked`,
`last_caregiver_block`, `not_on_admin_host`, `permission_denied`, `tenant_resolve_failed`. These map
onto BE slugs — the BE contract is canonical:

- `invite_email_taken` → `username-taken` (FE registers by username, not email — G2).
- `session_already_revoked` → **not an error**: `DELETE /acs/patient-sessions/{id}` is idempotent
  (BE §4.2 returns `204`); the FE shows a confirmation toast of the current `revoked` state.
- `last_caregiver_block` → surfaced as `forbidden` / `validation-error` (BE enforces "tenant keeps
  ≥ 1 caregiver"); FE also blocks client-side (SPEC-03 invariant). Gap G6: no dedicated BE slug yet.
- `not_on_admin_host` → **client-side** `opsHostGuard` block (no BE round-trip); off-host the route
  is unreachable (SPEC-01).
- `permission_denied` → `forbidden`.
- `tenant_resolve_failed` → login/session concern (shared/auth-session), not an ACS surface error.

## 3. Toast vs banner vs modal — criteria

- **Field error:** validation tied to a specific input (`username-taken`, `validation-error`) — on
  the register / tenant-wizard form.
- **Toast:** transient, non-blocking outcome of an action (`forbidden`, `not-found`, `link-exists`,
  idempotent revoke confirmation).
- **Banner / page error:** a list/page failed to load (caregiver roster, patient sessions) —
  blocks the content region with a retry affordance.
- **Modal:** only the confirm-before-destructive step (`PersistentSessionWarning` before provision;
  revoke confirmation) — not for error display.

## 4. Retry strategy

- GET reads (list/sessions): a single manual **Retry** affordance on the page/banner error; no
  silent auto-retry (pilot volume is tiny, `frontend/06` §3).
- POST/DELETE mutations: **no automatic retry** (register, provision, onboard are non-idempotent;
  revoke is idempotent but SEC-001 wants an explicit confirmed action). The user re-initiates.

## Criterios de aceite (EARS)

- IF the backend responds `username-taken`, THEN THE SYSTEM SHALL show a field error on the `username` input and SHALL NOT show a global toast.
- IF the backend responds `forbidden`, THEN THE SYSTEM SHALL show a toast and SHALL NOT reveal whether the target resource exists.
- IF the backend responds `not-found`, THEN THE SYSTEM SHALL show a toast and SHALL NOT remove the row optimistically.
- IF the backend responds `validation-error`, THEN THE SYSTEM SHALL map each field detail to its form field.
- IF the backend responds `unauthenticated`, THEN THE SYSTEM SHALL redirect to the login route.
- WHEN a list request fails, THE SYSTEM SHALL render a page error with a Retry affordance and SHALL NOT auto-retry.
- THE SYSTEM SHALL preserve the backend `detail` and `correlationId` in every surfaced ACS error and SHALL NOT display a raw HTTP response body.
- WHEN a revoke targets an already-revoked session, THE SYSTEM SHALL treat the `204` as success and confirm the current revoked state.
