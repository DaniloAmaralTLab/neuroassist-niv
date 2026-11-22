# SPEC-02 — Patient session orchestration (core)

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Specify the module's distinctive use case: provisioning and revoking the
**patient-with-session** actor — the anchor action **PatientSessionProvisioned** and its
terminal counterpart **PatientSessionRevoked**.

## Escopo

- **In:** `ProvisionSession`, `RevokeSession` use cases; token minting for the session;
  blacklist write on revoke; HIST audit; state machine `active → revoked`.
- **Out:** CONV/GEST runtime behavior (consumers of the session token); device identity
  (EDGE); patient aggregate (PAT).

## Decisões técnicas

- Patient-with-session is a first-class actor — local `adr/ADR-002-identity-and-authority-model.md`
  (realises project ADR-012 Option C).
- Revocation reuses the stateless-JWT blacklist — local
  `adr/ADR-003-session-revocation-jwt-blacklist.md` (SEC-001).
- Non-expiring by design: no `expires_at` (data-model §2.5).

## Implementação

```
ProvisionSession(patientId, deviceId, caller):
  assert patientId, deviceId valid within caller.tenant        # INV-2
  jti = newUuid()
  token = TokenIssuer.mintSession(sub=sessionId, tenantId=caller.tenant,
                                  authorities = CONV_GEST_ONLY, jti=jti)   # INV-3
  persist patient_session(status=active, provisioned_by=caller, token_jti=jti)
  AuditPort.record(PatientSessionProvisioned)                  # same request
  return {sessionId, token}

RevokeSession(sessionId, caller):
  s = repo.load(sessionId); if s.revoked -> return 204         # idempotent (SPEC-05)
  s.status = revoked; s.revoked_by = caller; s.revoked_at = now
  TokenBlacklist.add(s.token_jti, reason='session-revoked')    # same tx (INV-4)
  AuditPort.record(PatientSessionRevoked)
  return 204
```

## Casos de borda

- `patientId`/`deviceId` outside caller tenant → `404`.
- Re-revoke of a `revoked` session → `204`, no second blacklist entry, no second audit.
- Blacklist entry for a non-expiring session has `token_expires_at = NULL` (retained).

## Critérios de aceite (EARS)

- WHEN a caller with `acs.patient-session.provision` provisions a session, THE SYSTEM SHALL create an `active` session, mint a token restricted to `conv.*`/`gest.*`, and audit `PatientSessionProvisioned` (INV-2, INV-3).
- THE SYSTEM SHALL issue the session token without an expiry claim.
- WHEN a caller with `acs.patient-session.revoke` revokes an `active` session, THE SYSTEM SHALL set `status = revoked`, blacklist the `jti` in the same transaction, and audit `PatientSessionRevoked` (INV-4).
- WHEN a session is revoked, THE SYSTEM SHALL reject the next request bearing that token with `401` (immediate).
- THE SYSTEM SHALL NOT reactivate a `revoked` session.
