# Plan — FE ACS (Caregivers and Access)

**Client:** neuroassist-niv
**Module:** ACS
**Layer:** Frontend (Angular 21 / Nx / `@neuroassist` scope)
**Mode:** prototype-to-production (D-493)
**Generated:** 2026-11-19
**Backlog:** 28 functional + 6 integration = 34 issues

---

## 1. Project summary

The ACS module delivers caregiver management, patient-session provisioning/revocation, and tenant onboarding for the NeuroAssist NIV platform. It is served from two distinct contexts: the standard user-facing app (caregivers and patient sessions) and an ops-restricted admin host (tenant onboarding).

The prototype-to-production mode means the Angular prototype in `design-reference/angular-prototype/` is promoted directly to `libs/acs/` — issues connect existing prototype components to the real `acs-service` APIs rather than scaffolding Angular components from scratch. The critical security invariant (SEC-001) mandates persistent, never-expiring patient sessions with an always-visible revoke affordance.

A reconciliation gap (G3) is tracked throughout: `GET /acs/caregivers` (list-all) does not yet exist in `acs-service`. The FE degrades gracefully by seeding the roster from `me()` + `links()` and surfacing a DegradedRosterBanner until the endpoint lands.

---

## 2. Execution waves — P1 through P9

| Wave | Issues | Estimated effort | Exit criteria |
|---|---|---|---|
| **P1 — Foundation** | FE-ACS-001..005 | 1–2 days | Shell registers ACS; routes declared; providers inject http by default |
| **P2 — Data access** | FE-ACS-006..010 | 2–3 days | API services + facades compilable; unit tests pass with mock HTTP |
| **P3 — Feature libs** | FE-ACS-011..018 | 3–4 days | All ACS pages render (dev mode); SEC-001 flows complete |
| **P4 — Integration** | INT-FE-ACS-001..006 | 1–2 days | Real acs-service responds; wire types verified; proxy routes correct |
| **P5 — Guards** | FE-ACS-019..020 | 0.5 day | canManageAccessGuard + opsHostGuard block correctly |
| **P6 — Navigation** | FE-ACS-021 | 0.5 day | Breadcrumbs registered; ops entry host-gated |
| **P7 — UX polish** | FE-ACS-022..024 | 1 day | Loading/empty/error states; error mapper; degraded banner |
| **P8 — Observability** | FE-ACS-025 | 0.5 day | provision/revoke/register events forwarded to observability |
| **P9 — E2E** | FE-ACS-026..028 | 1–2 days | 4 stubs + 11 scenarios green (real acs-service) |
| **Total** | **34 issues** | **~11–15 days** | |

---

## 3. Critical path

```
P1 (001-005) → P2 (006-010) → P3 (011-018) → P4 (INT-001..006) → P9 (026-028)
                                     ↓
                               P5 (019-020) → P6 (021)
                                     ↓
                               P7 (022-024) → P8 (025)
```

The longest chain is `P1 → P2 → P3 → P4 → P9`. P4 integration must follow P3 (pages must exist for contract smoke to have anything to test through) and precedes the E2E runs.

P5 guards (FE-ACS-019, FE-ACS-020) depend on P1 (routes reference them) but can be developed in parallel with P3.

---

## 4. Top risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **G3 gap** — `GET /acs/caregivers` list-all missing; roster appears incomplete | FE-ACS-007 always seeds from `me()+links()` with `degradedRoster=true`; FE-ACS-024 banner informs users; feature flag `acs.caregiver-list` gates full roster display |
| R2 | **SEC-001 regression** — pessimistic provision or revoke accidentally turned optimistic | FE-ACS-009 unit spec + FE-ACS-028 e2e both assert row appears only after server confirms; RevokeButton always-visible constraint tested in FE-ACS-028 |
| R3 | **Gateway prefix drift** — acs-service endpoint shapes or gateway routing change between spec and integration | INT-FE-ACS-001..003 contract smokes catch wire-shape drift; proxy.conf.json wired to correct port (INT-FE-ACS-006) |

---

## 5. Definition of Done — per wave

**P1 done** when:
- `acs.contract.ts` exports `MODULE_PERMISSION_MAP` with 7 authority strings matching BE constants exactly (INV-7)
- `acs.routes.ts` declares 5 lazy routes; opsHostGuard on `/ops/tenants`
- `acs.providers.ts` defaults to `http` adapter (not mock)
- `npx nx lint acs-shell-entry` PASS

**P3 done = MVP navigable in dev** when:
- All ACS pages render without error on `npx nx serve neuroassist-niv-web`
- Provision + revoke flow reachable from the UI
- PersistentSessionWarningComponent renders on provision click (SEC-001)

**P4 done** when:
- `GET /acs/caregivers/me` returns 200 through dev proxy
- `POST /acs/patient-sessions` + `DELETE` return correct status codes
- All 6 ACS ProblemDetail slugs map to AppError codes (INT-FE-ACS-004)

**P9 done** when:
- 4 Playwright stub files exist with `test.fixme()` (not vacuous skip)
- 11 register/provision/revoke/tenant e2e scenarios pass with real `acs-service`
- JUnit XML report generated

---

## 6. Approval milestones

| Milestone | Gate | Who approves |
|---|---|---|
| M1 — Foundation complete | `nx build acs-shell-entry` PASS; routes unit-tested | FE Lead |
| M2 — MVP navigable | All ACS pages render in dev; SEC-001 flows manually verified | Product + FE Lead |
| M3 — Integration verified | INT smoke tests pass; wire types confirmed | BE Lead + FE Lead |
| M4 — E2E green | 11 scenarios PASS; JUnit report archived | QA |

---

## 7. Architecture anchors

- **SPEC-01** (routes): guards, lazy loading, ops-host restriction
- **SPEC-04** (data access): API service + DTO + mapper pattern per resource
- **SPEC-07** (error handling): ProblemDetail → AppError; never map by HTTP status
- **SPEC-08** (e2e): Playwright scenarios from SPEC-08 §2 implemented in P9
- **SEC-001**: persistent session, always-visible revoke, pessimistic UI
- **ARCH-033**: in-memory JWT, no localStorage
- **D-493**: prototype-to-production — no greenfield scaffold; promote from `design-reference/angular-prototype/`
