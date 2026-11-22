# 01 — Architectural Vision — acs (ACS) Frontend

> Module: Caregivers and Access · Shell: `neuroassist-niv-web` (caregiver / DASH shell)
> Scope: frontend vision only. No Angular code is produced at this stage.

## 1. Intent (UX-driven)

By the end of an ACS interaction, a caregiver can, from the dashboard and in plain language:

- see exactly **who** has access to a patient and in which role;
- **invite** a second caregiver to the same care unit (tenant);
- **turn the patient's own mobile phone on** as an operable device (provision a persistent
  session) and **turn it off instantly** (revoke), with no technical jargon and no exposed token;
- (from the ops-only host) **create a care unit (tenant)** so the rest of the product can be set up.

ACS is the module that answers "who is allowed, on which device, for which patient" — the trust
boundary of the whole product.

## 2. Problem statement (current journey vs new journey)

**Today (real system, pre-NIV):** access is modelled in `acs-service` with a single human
authenticable actor (caregiver). The patient has no credential; the patient's phone cannot be an
operable device; revoking a lost phone has no first-class UI. Inviting a caregiver happens only
inside the one-off onboarding wizard.

**New journey:** ACS surfaces three first-class flows in the caregiver shell — caregiver
management, patient-session lifecycle (provision/revoke, SEC-001), and (host-restricted) tenant
creation — each backed by `acs-service` and audited in HIST. The patient becomes a provisioned
*subject* (ADR-012 Option C) without ever operating an ACS screen.

## 3. Personas (jobs-to-be-done)

| Persona | Role / identity | Job-to-be-done in ACS |
|---|---|---|
| Family Caregiver | `caregiver` | Invite a co-caregiver; see access; provision/revoke the patient's phone session. |
| Clinic Coordinator | `clinic_coordinator` (expansion) | Manage caregivers of the tenant's patients. |
| Platform operator | `platform-ops` service client (ADR-011) | Create a tenant from the ops-only screen. |
| Patient with session | ADR-012 actor | Subject only — never operates ACS; acts in CONV/GEST runtime. |

## 4. MVP scope (in)

- **Caregiver management** — list, invite (Screen 05 `InviteCaregiverForm`), assign role, show
  patient links.
- **Patient-session lifecycle** — Screen 07: `ActiveSessionsList`, `PersistentSessionWarning`,
  `RevokeButton`. Revocation is immediate and always visible (SEC-001).
- **Ops-only tenant creation** — ADR-011 wizard over `platform-ops`, reachable only from the admin
  host/network, hidden from the caregiver's daily sidebar.

## 5. Out of scope (MVP)

- The patient runtime shell (speech tree / gesture capture) — CONV / GEST.
- A human `PLATFORM_ADMIN` role or nullable `tenant_id` (ADR-011 kept Option 1).
- Login / logout / password / SSO UX — owned by `@neuroassist/shared/auth-session` + `iam-service`.
- The active-tenant selector UX — cross-cutting `@neuroassist/shared/tenant-context`.
- Any i18n / locale switch — the product is English-only (ADR-018).

## 6. Architectural principles

- **Standalone-first** in every feature and component; **NgModule only** in
  `libs/acs/shell-entry/src/lib/acs.module.ts` (the lazy entry — shared ADR-006).
- **Signals-first** state: facades expose `signal<T>` private + `.asReadonly()`; no NgRx, no
  manual `BehaviorSubject` as source of truth.
- **Lazy-by-default**: the Shell loads `@neuroassist/acs` via `loadChildren`; sub-routes via
  `loadComponent`.
- **OnPush mandatory** on all components.
- **Access decisions never inline**: every permission check goes through
  `@neuroassist/shared/access-decision` (`AccessDecisionService.can(...)`), never
  `if (user.role === ...)` in a component.
- **HTTP only through the Access Layer**: `@neuroassist/shared/access-http-base` (auto
  `X-Tenant-Id`); components never touch `HttpClient`.
- **Design tokens only**: Tailwind v4 utilities bound to oklch tokens from
  `@neuroassist/shared/ui-tokens`; no hardcoded colour/spacing; dark is the default theme.
- **English-only** copy (ADR-018); no locale layer in v1.

## 7. Success signals

| Signal | Target |
|---|---|
| Revocation latency (click → session invalid server-side) | perceived immediate; p95 API < 500 ms |
| Time-to-interactive, ACS lazy chunk cold | TTI < 2.5 s on the pilot machine |
| CLS on caregiver/session lists | < 0.1 |
| Caregiver-invite flow completion | ≥ 95% without support |
| Revocation discoverability | `RevokeButton` reachable in ≤ 1 click from the session list (SEC-001) |
| Access-decision correctness | zero inline role checks (lint gate) |
