# RBAC — Access Model (Backend + Frontend)

> Model of roles × permissions (capabilities) × tenants. **Shared between BE and FE.**

## Documents in this folder

| Doc | When to read |
|---|---|
| [`modelo.md`](modelo.md) | Before implementing **any** authorization logic (BE or FE). Covers canonical roles, SQL schema, AccessDecision, Redis cache, anti-patterns |
| [`papeis.md`](papeis.md) | When creating/populating seeds (V1 migration) — canonical roles with their codes, descriptions and permission bundles |
| [`permissoes.md`](permissoes.md) | When adding a new permission to a module — `<module>.<resource>.<action>` namespace catalog |
| [`data-scope.md`](data-scope.md) | Before changing listings/queries that differ by role (VENDEDOR sees only their own, ALMOXARIFE sees only their location). Covers scope types, narrated scenarios, AccessDecision JSON |
| [`enforcement.md`](enforcement.md) | Before implementing an `application.service` with a listing. Technical decision (Hibernate Filter), BE + FE code examples, rejected alternatives |
| [`session-policy.md`](session-policy.md) | Before configuring IAM or adjusting token TTLs. TTL/refresh/idle/MFA table per role + refresh flow + invalidation on RBAC change |
| [`approval-workflow.md`](approval-workflow.md) | When implementing an action that can exceed an operational limit (Accounts Payable > R$ 5k, sale with discount > 10%, etc.). Full rules table + workflow_aprovacao state |

## Principle in one sentence

**RBAC is the responsibility of the `<service>`** (BE) and of `libs/shared/access-*` (FE). No other
service/lib decides access on its own — they only **query** `AccessDecisionService` and act accordingly.

## When this folder changes

- Add/remove a canonical role → edit `papeis.md` + update the V1 migration in `neuroassist-niv-migrations`.
- Add a permission in a new module → edit `permissoes.md` (catalog) + `<modulo>.permission-map.ts` (FE) + constant in `<modulo>-service` (BE).
- Model change (e.g., introducing custom roles, multi-SSO) → create an ADR + edit `modelo.md`.

## Cross-references

- ADR-001 schema-per-tenant: [[../multi-tenant]]
- `neuroassist_global` schema (where the RBAC tables live): [[../modelo-dados/neuroassist-niv-global]]
- Frontend Access Layer: [[../../frontend/standards/access-layer-contracts]]
- Hexagonal backend + tenant guard: [[../../backend/standards/hexagonal-patterns]] §5
