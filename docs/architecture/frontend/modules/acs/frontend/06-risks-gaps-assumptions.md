# 06 — Risks, Gaps, Assumptions — acs (ACS)

## 1. Risks

| # | Risk | Area | Mitigation |
|---|---|---|---|
| R1 | Revocation not reliably immediate undermines SEC-001 (a lost phone keeps access). | Security / UX | Default to **pessimistic** revoke (await server blacklist confirmation); always-visible `RevokeButton`; show `revokedAt`/`revokedBy`. |
| R2 | The patient-with-session actor model (ADR-012 Option C) is decided but the `acs-service` schema/issuance flow is still a BE TODO[architect] — the FE contract may shift. | BE contract | Keep `PatientSessionApiService` behind a mapper over `<PatientSessionWire>`; treat the contract as provisional until `acs-service` specs land. |
| R3 | Ops-only tenant screen relies on **network restriction**, not app RBAC (ADR-011 Option 1) — weaker if the admin network is not isolated. | Security | `opsHostGuard` hides and blocks the route off-host; flag page as host-restricted; revisit if a 2nd human operator appears. |
| R4 | Login/session ownership is in `shared/auth-session`, not ACS — a boundary slip could pull auth UX into ACS. | Boundary | Enforce access-layer-contracts: ACS never implements login; lint + review gate. |
| R5 | Bundle growth of the ACS lazy chunk hurts TTI on the modest pilot machine. | Performance | Lazy `loadComponent` per feature; CDK primitives (no Material); OnPush. |
| R6 | Downstream scaffold emits Playwright stubs with vacuous assertions under `test.skip` (Learning: 45 prior occurrences on `acs-e2e`). | Test integrity | Carry-forward: stubs must use `test.fixme()` or `throw new Error('TODO[<ISSUE>]')`, never `await expect(page).toHaveURL(/.*/)` under skip. |

## 2. Known gaps

- `acs-service` BE specs for the patient-session actor (table, issuance, revocation-via-blacklist
  integration) are not yet written — ADR-012 leaves these as TODO[architect].
- Whether the patient runtime is the **same shell with a conditional "Patient Mode" badge** or a
  **separate restricted shell** is open in ADR-012/wireframe §3.2.B — it affects whether ACS merely
  provisions, or also drives, a mode switch. ACS FE assumes "provision only"; the runtime shell is
  out of scope.
- No shared `@neuroassist/shared/auth-session` / `tenant-context` libraries exist in code yet
  (precondition in `module-pattern.md`): ACS cannot be scaffolded until the shared Access Layer and
  the Shell `neuroassist-niv-web` exist.
- The ops-host detection mechanism (how `opsHostGuard` decides "admin host/network") is
  unspecified — needs a SPEC decision (header, origin allowlist, or served-from-host flag).

## 3. Assumptions to validate

- Pilot data volume is tiny (1 tenant, ~2 caregivers, 1 patient, few sessions) → no pagination,
  no cache in v1.
- A tenant always keeps ≥ 1 active caregiver (enforced both client- and server-side).
- `role` stays a closed 2-value set (`caregiver`, `clinic_coordinator`) for the MVP; no
  `PLATFORM_ADMIN` (ADR-011).
- Target device for ACS screens is the caregiver's desktop/laptop browser (dashboard), not the
  patient's phone.
- English-only copy is acceptable for all ACS users in the pilot (ADR-018).

## 4. Critical dependencies

- **BE:** `acs-service` endpoints for caregivers (list/invite/role), patient sessions
  (provision/revoke), and `platform-ops` tenant creation; the existing JWT blacklist
  (`rbac/session-policy.md`) for immediate revocation (ADR-012).
- **Shared libs:** `@neuroassist/shared/{auth-session, tenant-context, access-decision,
  access-http-base, contracts, ui-components, ui-feedback, ui-tokens, observability, error-model}`.
- **Shell:** `neuroassist-niv-web` must register `@neuroassist/acs` (shared ADR-006).
- **Design system:** `theme.css` oklch tokens vendored into the app (`design-system-tokens.md`).
- **Audit:** HIST consumes ACS action events (provision/revoke/invite).
