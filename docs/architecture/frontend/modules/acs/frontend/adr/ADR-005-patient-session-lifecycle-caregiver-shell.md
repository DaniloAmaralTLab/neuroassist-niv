# ADR-005 (module-local, ACS) — Patient-session lifecycle operated from the caregiver shell

- **Status:** proposed (2026-11-19)
- **Scope:** module ACS frontend (`libs/acs/feature-patient-sessions`, `libs/acs/data-access`,
  `libs/acs/access`). Module-local record — does not occupy the reserved shared ADR-005 slot
  (design tokens); see this module's `adr/README.md`.

## Context

ADR-012 (accepted, Option C) introduces a first-class "patient with session" actor in
`acs-service`: a persistent, **non-expiring**, caregiver-provisioned session on the patient's own
phone, revocable at any time. SEC-001 makes immediate revocation a **mandatory** mechanism, reusing
the existing stateless-JWT blacklist (`rbac/session-policy.md`) — not a new mechanism. The wireframe
puts provision/revoke on Screen 07 (caregiver dashboard), while the patient's *runtime* (speech
tree / gesture capture) is a separate concern (CONV/GEST), and ADR-012/wireframe §3.2.B leave open
whether that runtime is the same shell with a "Patient Mode" badge or a separate restricted shell.

The frontend must decide **where the session lifecycle UI lives**, **how revocation is surfaced**,
and **what ACS does not own**.

## Decision

1. **Lifecycle UI lives in the caregiver shell**, inside `libs/acs/feature-patient-sessions`
   (Screen 07). ACS **provisions and revokes** sessions; it does **not** render or drive the patient
   runtime shell.
2. **Revocation is delegated to the server-side JWT blacklist** (ADR-012 / SEC-001): the FE issues a
   revoke call via `PatientSessionApiService`; the authority is server-side and immediate. The
   default interaction is **pessimistic** (await server confirmation) so the UI never shows a session
   as revoked before the blacklist entry exists.
3. **The revoke action is always visible** next to each active session (`ActiveSessionsList` +
   `RevokeButton`), never hidden behind advanced settings (SEC-001), with `PersistentSessionWarning`
   shown before provisioning.
4. **ACS does not implement authentication**, does not store the patient-session token in the
   component layer, and does not switch the runtime mode — those are, respectively,
   `@neuroassist/shared/auth-session`, the Access Layer, and the CONV/GEST runtime concern.

## Alternatives considered

1. **Optimistic revoke by default** — rejected as the default: SEC-001 requires reliably immediate,
   confirmed revocation; showing "revoked" before the server blacklists risks a false sense of safety
   for a lost phone. Optimistic remains available only if a later SPEC opts in with an explicit
   rollback.
2. **A dedicated patient-session facade in a shared lib** — rejected: the lifecycle is ACS-owned
   domain, not cross-cutting; putting it in `shared/*` would violate the boundary (`shared` must not
   depend on a module) and leak ACS concerns project-wide.
3. **ACS also driving the patient runtime / Patient Mode switch** — rejected (out of scope): the
   same-shell-vs-separate-shell question (ADR-012 §3.2.B) is a runtime/CONV decision; coupling it to
   ACS would overload the module and pre-empt an open architectural choice.

## Consequences

- **Positive:** a single, auditable place for session control; SEC-001 satisfied by construction;
  clean boundary (ACS = access authority, runtime = elsewhere); revocation reuses an existing BE
  mechanism, no new security surface.
- **Negative:** the FE contract for the patient-session actor is provisional until the `acs-service`
  schema/issuance flow (ADR-012 TODO[architect]) is specified — `PatientSessionApiService` must stay
  behind a wire-record mapper to absorb changes.

## References

- ADR-012 (patient identity model with persistent session, Option C) — `_inbox/adr/`.
- ADR-011 (tenant onboarding authority, Option 1) — `_inbox/adr/`.
- ADR-018 (English-only product) — `_inbox/adr/`.
- Shared ADR-006 (module entry as a library) — `../../../../adr/ADR-006-module-entry-as-library.md`.
- Standards: `access-layer-contracts.md`, `bootstrap-flow.md`, `nx-boundaries.md`.
- Wireframe Screen 07; constraint SEC-001; `rbac/session-policy.md`.
