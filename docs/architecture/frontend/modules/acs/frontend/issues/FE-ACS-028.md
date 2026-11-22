# FE-ACS-028 -- E2E — provision / revoke / tenant-onboarding scenarios: SEC-001 always-visible / host-gating

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
The 7 e2e scenarios covering provision-patient-session, revoke-patient-session, and tenant-onboarding from SPEC-08 §2 are fully implemented: (1) confirm warning then provision, (2) "active since" shown with no countdown, (3) pessimistic provision row appears only after server confirms, (4) revoke button visible in one click, (5) revoking a session marks it revoked, (6) revoking an already-revoked session is an idempotent no-op, (7) off-host the Ops route and menu entry are absent (SPEC-08 §2, SEC-001).

## Approach (execution path)
1. Provision scenarios: login with `acs.patient-session.provision` authority → navigate to `/access/patient-sessions/:patientId` → assert warning modal appears on "Provision" click → confirm → assert new active-session row appears only after server responds.
2. "Active since" scenario: assert row contains "active since" text; assert no countdown or "expires" text.
3. Revoke visible scenario: assert RevokeButton present in the first viewport without scrolling or opening any menu (SEC-001).
4. Revoke success scenario: click RevokeButton → confirm → assert row shows revoked badge with `revokedAt` and `revokedBy`.
5. Idempotent revoke: attempt to revoke an already-revoked session → assert confirmation toast appears (not an error), session remains revoked.
6. Off-host tenant route: navigate to `/ops/tenants` from a non-admin-host origin → assert redirect/block; assert "Tenants (ops)" absent from sidebar.
7. Auth and seed patterns same as FE-ACS-027 (`acs-auth.ts`, login form, per-scenario seed).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/acs-e2e/src/provision-patient-session.spec.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/revoke-patient-session.spec.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/tenant-onboarding.spec.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/support/acs-real-seed.ts`
- [ ] Provision: warning modal confirmed → row appears only after 201 (pessimistic)
- [ ] Revoke: RevokeButton visible in one click without menu expansion (SEC-001)
- [ ] Idempotent revoke: `204` on already-revoked shown as confirmation toast (not error)
- [ ] Off-host tenant route: blocked; Ops menu entry absent from sidebar

## Acceptance criteria
- [ ] All 7 provision/revoke/tenant-onboarding scenarios pass with real acs-service
- [ ] Active session row shows "active since {date}" — no countdown present
- [ ] RevokeButton is visible in the session row without any menu expansion
- [ ] `npx nx run acs-e2e:e2e` PASS (7 scenarios)

## Dependencies
FE-ACS-014 (PatientSessionsPageComponent), FE-ACS-016 (SessionRowComponent SEC-001), FE-ACS-018 (TenantAdminPageComponent), FE-ACS-020 (opsHostGuard), INT-FE-ACS-002 (real endpoint).

## Tenant-context impact
Tests run against a test tenant; each provision/revoke scenario operates on a dedicated seed patient session.

## Prioridade
P9
