<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposicoes a Validar
- Dependencias Criticas
-->

# 06 — Risks, Gaps, Assumptions

## Riscos

- **Authority-string drift (regression, high likelihood).** Controller
  `@PreAuthorize` strings diverging from `RoleAuthorityPolicy` constants cause silent
  403s. Mitigation: the authority-naming convention is fixed in doc 03 and must be the
  single source for both sides (carried over from a known generator pitfall, D-535 /
  ACS test-token learning).
- **Patient-session revocation not supporting "no-expiry, revocable at any time".**
  The reused blacklist (SEC-001) was built for caregiver JWTs with a standard TTL; a
  non-expiring session may need the blacklist to retain entries differently.
  Mitigation: confirm against `rbac/session-policy.md` before specs.
- **Brownfield divergence.** ACS already exists in the real `neuroassist-ai` monorepo;
  this vision may describe a model that differs in detail from production (credential
  placement, exact role names such as `PATIENT_SUPPORT`). Risk of specs that do not
  match the live schema. Mitigation: treat every schema/RBAC statement as a change
  request against the existing service, not greenfield.
- **Leaked patient device.** A non-expiring session on a lost/stolen phone stays valid
  until a caregiver revokes it (SEC-001). Mitigation: least-authority (CONV/GEST only)
  caps the blast radius; immediate revocation is mandatory, not optional.
- **Network-only access control for `platform-ops`** (ADR-011). Tenant onboarding is
  protected by topology, not application RBAC; weaker if the admin network cannot be
  isolated reliably.

## Gaps Conhecidos

- Exact physical placement of the caregiver credential row (global vs per-tenant) is
  not yet reconciled with production (doc 05 TODO).
- The full canonical role set is partially specified here (`CAREGIVER`,
  `CLINIC_COORDINATOR`, `platform-ops`); `PATIENT_SUPPORT` appears in
  `fluxo-e-perfis.md` and must be reconciled in specs.
- No external authentication decision has been formalized as a local ADR beyond
  "framework-native for the pilot" — expansion to OAuth/SSO is deferred.
- HIST audit contract (payload shape for `*Provisioned`/`*Revoked`) is not yet defined
  (belongs to specs / cross-service contract).

## Suposicoes a Validar

- The existing stateless-JWT blacklist can absorb non-expiring patient sessions with,
  at most, an additive extension (not a redesign).
- `caregiver.tenant_id` remains `NOT NULL` and no `PLATFORM_ADMIN` human role is
  introduced (ADR-011 holds).
- Framework-native authentication is acceptable for the single-caregiver pilot (no
  external IdP required in v1).
- The patient session's authorities (`conv.tree.navigate`, `conv.node.select`) are the
  complete runtime set; GEST reporting uses the EDGE device token, not the patient
  session (ADR-012 complementary decision).
- Synchronous REST to HIST is adequate at pilot volume (no broker needed).

## Dependencias Criticas

- **MIG (`neuroassist-niv-migrations`)** — centralized Flyway; ACS cannot provision
  tenant schemas without it.
- **HIST (`hist-service`)** — audit sink for every access-granting/ending action
  (sync REST); required for the SEC-001/LGPD audit guarantee.
- **GWY (API Gateway)** — fronts ACS and validates tokens for the platform.
- **PAT (`pat-service`)** — owns the `Patient` aggregate that links and sessions
  reference by id.
- **EDGE (`edge-service`)** — owns the device identity the patient session binds to.
- **Reused blacklist** (`rbac/session-policy.md`) — the revocation mechanism ACS
  depends on rather than reinvents.
