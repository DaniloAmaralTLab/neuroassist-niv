# FE-ACS-016 -- ActiveSessionsListComponent + SessionRowComponent — revoke always visible per SEC-001

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`ActiveSessionsListComponent` (presentational) renders the list of patient sessions; `SessionRowComponent` (presentational) renders each row with label, "active since" text (never an expiry countdown), and a **always-visible RevokeButton** when the session is active — the button is never hidden or placed behind advanced settings (SEC-001, SPEC-02 §2).

## Approach (execution path)
1. Promote the prototype's sessions list into `ActiveSessionsListComponent`: `sessions: input<PatientSessionRowVM[]>()`, `canRevoke: input<boolean>()`, output `revoke: output<string>()`.
2. `SessionRowComponent`: `row: input<PatientSessionRowVM>()`, `canRevoke: input<boolean>()`, output `revoke: output<string>()`.
3. Active row: display label + "active since {activeSince}" (locale-formatted date/time, no countdown — carry-forward `fe-component:kpi-decimal-format`).
4. Active row with `canRevoke = true`: RevokeButton always visible in one click — never behind a "..." menu or advanced settings toggle (SEC-001).
5. Revoked row: display revoked badge with `revokedAt` and `revokedBy`.
6. When `canRevoke = false` on an active session: RevokeButton rendered but disabled (visible but non-interactive).
7. No `aria-activedescendant` pointing to missing elements (carry-forward `fe-component:combobox:aria-activedescendant-points-to-missing-option`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/active-sessions-list.component.ts`
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/session-row.component.ts`
- [ ] RevokeButton is always visible (not behind a menu or advanced settings) — SEC-001
- [ ] Active row shows "active since {activeSince}" with locale-formatted date; no countdown
- [ ] Revoked row shows revoked badge with `revokedAt` and `revokedBy`
- [ ] `canRevoke = false` → button rendered as disabled, not removed from DOM
- [ ] Both components: `standalone: true`, `changeDetection: OnPush`
- [ ] `npx nx test acs-feature-patient-sessions` PASS

## Acceptance criteria
- [ ] WHILE session `status = 'active'` and `canRevoke = true`, THE SYSTEM SHALL render the revoke action in one click (not behind advanced settings)
- [ ] WHILE session `status = 'active'`, THE SYSTEM SHALL display "active since {activeSince}" and SHALL NOT display any expiry countdown
- [ ] WHILE session `status = 'revoked'`, THE SYSTEM SHALL display the revoked badge with `revokedAt` and `revokedBy`
- [ ] `npx nx lint acs-feature-patient-sessions` PASS

## Dependencies
FE-ACS-014 (PatientSessionsPageComponent consumes this component).

## Tenant-context impact
None — presentational; all data passed via inputs.

## Prioridade
P3
