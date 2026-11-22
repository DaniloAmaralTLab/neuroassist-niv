# FE-CONV-018 -- patientSessionGuard + CONV egress patient-session bearer — real patient-session, absent → session-ended, never hardcoded true (guard:stub-permissive)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-01 §4, SPEC-05 §4, SPEC-06 §3, contracts/backend-api-cross-link.md §3 (open items)

## Outcome
`patientSessionGuard` reads from `@neuroassist/shared/auth-session`, checks for an active, non-revoked patient-session, and redirects absent/revoked sessions to the station "session ended" surface. It **never** returns a hardcoded `true` (carry-forward `guard:stub-permissive`, 6 occurrences — SPEC-01 §4 carry-forward note). The fine-grained `conv.*` authority check is deferred to the PLATFORM/frontend routeGuards ledger item (access-decision Wave-0 stub today). `conv-auth.interceptor.ts` attaches the patient-session bearer on CONV HTTP egress (not the `edge.device` token GEST/EDGE use — Q1 open item).

**Open item (Q1):** Two tokens on one station (patient-session for CONV vs edge.device for GEST/EDGE). Interceptor scoping per egress is a host concern; this issue implements the CONV interceptor only.

## Approach (execution path)
1. Create `frontend/libs/conv/access/src/lib/patient-session.guard.ts`:
   - Inject `@neuroassist/shared/auth-session` (AuthSessionService).
   - `canActivate(): boolean | UrlTree`:
     - If `AuthSessionService.hasPatientSession()` → return `true`.
     - If session absent or revoked → redirect to the station session-ended surface (URL TBD — documented as a constant `SESSION_ENDED_PATH`; never redirect to `/login` which is the caregiver path).
   - NEVER return `true` without checking the real session.
   - The fine-grained `can('conv.tree.read')` check is commented out with `// TODO[platform]: deferred to PLATFORM routeGuards (access-decision Wave-0 stub, INT-FE-CONV-005)` — it is not wired until access-decision is fleshed out.
2. Create `frontend/libs/conv/access/src/lib/conv-auth.interceptor.ts`:
   - Intercepts outgoing CONV HTTP requests (URL starts with `${ACCESS_HTTP_BASE}/conv`).
   - Attaches `Authorization: Bearer <patientSessionToken>` from `AuthSessionService`.
   - Does NOT attach the `edge.device` token (that is GEST/EDGE's interceptor, scoped by the host).
3. Unit test: session present → `true`; session absent → `UrlTree` to session-ended path; interceptor adds correct Bearer.

**Pitfall (guard:unauth-redirect):** no session → session-ended surface (patient-specific); never `/login` (caregiver path).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/access/src/lib/patient-session.guard.ts` — reads real patient-session; NEVER hardcodes return true
- [ ] Session absent/revoked → UrlTree to session-ended surface (not /login)
- [ ] `conv.tree.read` authority check deferred to PLATFORM routeGuards (TODO[platform] comment explaining why)
- [ ] `frontend/libs/conv/access/src/lib/conv-auth.interceptor.ts` — attaches patient-session Bearer on CONV egress
- [ ] Interceptor scoped to `${ACCESS_HTTP_BASE}/conv` URLs only
- [ ] Does NOT attach edge.device token
- [ ] `frontend/libs/conv/access/src/lib/patient-session.guard.spec.ts` — session present/absent/revoked cases
- [ ] `npx nx test conv-access` PASS — session present, absent, revoked guard paths
- [ ] `npx nx lint conv-access` PASS

## Acceptance criteria
- [ ] Guard with absent session → redirects to session-ended surface (UrlTree), never to /login
- [ ] Guard with valid patient-session → returns `true`
- [ ] Guard NEVER returns `true` unconditionally (no hardcoded bypass)
- [ ] `conv-auth.interceptor` adds `Authorization: Bearer <token>` only to `${ACCESS_HTTP_BASE}/conv` requests
- [ ] `npx nx test conv-access` PASS; `npx nx lint conv-access` PASS

## Dependencies
FE-CONV-001 (conv.contract.ts for authority constant names).
INT-FE-CONV-005 (access-decision stub — guard defers fine-grained check until this is resolved).

## Tenant-context impact
The patient-session token implicitly scopes the guard to the patient (and their tenant). No cross-tenant access is possible through this guard.
