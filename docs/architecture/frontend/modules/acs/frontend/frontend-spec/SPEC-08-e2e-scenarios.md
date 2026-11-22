# SPEC-08 — E2E Scenarios — acs (ACS) Frontend

> Gherkin scenarios for `apps/acs-e2e` (Playwright). Each scenario below becomes a `Scenario:` in a
> `.feature` under `../e2e/`. Scenarios are authored in **English** — the FE stub generator parses
> English Gherkin only (carry-forward `fe_nx_register_module_parses_only_english_gherkin`).
> Scenarios share domain nouns with the EARS acceptance statements in SPEC-01..07 so the
> EARS-coverage matcher (`fe-ears-coverage.py`) can pair them. This SPEC has no EARS section.

## 1. Feature files

| `.feature` | Covers | Primary EARS source |
|---|---|---|
| `register-caregiver.feature` | register flow, username-taken field error, RBAC hiding | SPEC-01, SPEC-03, SPEC-04, SPEC-05, SPEC-07 |
| `provision-patient-session.feature` | persistent-session warning, provision, no countdown | SPEC-02, SPEC-03, SPEC-04 |
| `revoke-patient-session.feature` | always-visible revoke, immediate invalidation, idempotency | SPEC-03, SPEC-04, SPEC-07 (SEC-001) |
| `tenant-onboarding.feature` | ops-host gating, onboard, off-host hidden | SPEC-01, SPEC-05, SPEC-06 |

## 2. Scenario inventory

### register-caregiver
- Register a caregiver with a valid username, password and role.
- Reject a duplicate username with a field error (not a global toast).
- Hide the "Register caregiver" action when the session lacks `acs.caregiver.create`.
- Redirect to login when the session is absent.

### provision-patient-session
- Confirm the persistent-session warning, then provision the patient phone.
- Show "active since" and never a countdown for an active session.
- Keep provision pessimistic: the active row appears only after the server confirms.

### revoke-patient-session
- Revoke button is visible in one click from the session list (SEC-001).
- Revoking an active session marks it revoked with revokedAt and revokedBy.
- Revoking an already-revoked session is an idempotent no-op with a confirmation toast.

### tenant-onboarding
- On the admin host, onboard a tenant of type family.
- Off the admin host, the Ops menu entry and the `/ops/tenants` route are not available.

## 3. Stub-integrity rule (carry-forward, Learning ev=45 on acs-e2e)

Generated Playwright stubs MUST fail explicitly until implemented — `test.fixme()` or
`throw new Error('TODO[<ISSUE>]: implement')` — and MUST NOT use a vacuous
`await expect(page).toHaveURL(/.*/)` under `test.skip` (which turns green when the skip is removed
without writing a real assertion). RBAC scenarios seed the role via the session mechanism the shell
reads (sessionStorage / refresh endpoint — `fe-e2e:auth`), not an unrelated header
(`fe-e2e:rbac-access-decision:setExtraHTTPHeaders-vs-localStorage`). Each spec resets its own seed
to avoid state leak across specs (`fe-e2e:shared-seed:state-leak-across-specs`).
