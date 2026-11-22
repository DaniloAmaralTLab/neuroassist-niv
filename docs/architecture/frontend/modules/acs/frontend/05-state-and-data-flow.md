# 05 — State and Data Flow — acs (ACS)

## 1. State topology

| State | Where it lives | Shape |
|---|---|---|
| Active tenant | `@neuroassist/shared/tenant-context` (global) | single source of `X-Tenant-Id`; ACS reads, never writes. |
| Session / claims | `@neuroassist/shared/auth-session` (global) | roles, `sub`, expiry; ACS reads for display only. |
| Access decisions | `@neuroassist/shared/access-decision` (global) | `can(<perm>)`, menu/route visibility. |
| Caregiver list | `libs/acs/data-access` facade (module-local signal) | `CaregiverListVM`. |
| Patient sessions | `libs/acs/data-access` facade (module-local signal) | `PatientSessionsVM`. |
| Tenant-admin form | `feature-tenant-admin` local signal | ops-only, ephemeral. |

Module state is local to `acs/data-access` facades; cross-cutting identity/tenant/RBAC stays in
`shared/*`, never duplicated inside ACS.

## 2. Data access pattern

```
Component → Facade (signals) → <Resource>ApiService (HttpClient via access-http-base) → acs-service
```

- `CaregiverApiService`, `PatientSessionApiService`, `TenantAdminApiService` are the only holders of
  `HttpClient`. Each returns typed wire records (`<X>Wire`) mapped to the VM via a `toX` mapper.
- Facades expose `signal<T>` private + `.asReadonly()`; no `BehaviorSubject` as source of truth.
- Every call carries `X-Tenant-Id` automatically (interceptor). `tenant.create` on `platform-ops`
  is tenantless by design (ADR-011) and uses the ops endpoint.

> **Carry-forward for scaffold (Learning, D-487/scaffold pitfalls):** the generated
> `acs.providers.ts` must default the adapter to **`http`** (because `acs-service` exists), with
> `HttpAdapter` based at `${ACCESS_HTTP_BASE}/acs`; `MockAdapter` only serves fixtures in the same
> wire shape. A providers spec must prove the default is `http`, not mock.

## 3. Cache strategy

Default = **call the API on each navigation** into caregivers / patient-sessions. No ACS cache in
v1 (small data volume, single pilot tenant). A `tenant-context.switchTo(...)` invalidates any
future ACS cache explicitly (bootstrap-flow rule). Cache is introduced only if a later SPEC
justifies it.

## 4. Optimistic updates

- **Revoke** is the one candidate: optimistically mark the session `revoked` on click, then reconcile
  with the server response. **Rollback strategy:** on error, restore the prior `active` status and
  surface the error via `ui-feedback`. Given SEC-001 (revocation must be reliably immediate), the
  default is **pessimistic** (await the server) unless a SPEC explicitly opts into optimistic with
  the rollback above. Invite and provision are always pessimistic.

## 5. Error handling

```
acs-service ProblemDetail → access-http-base error-normalize interceptor
  → AppError (@neuroassist/shared/error-model)
  → feature maps to: field error (invite form) | toast (revoke/provision) | page error (list load)
  → rendered via @neuroassist/shared/ui-feedback
```

Reason codes surfaced: `invite_email_taken`, `session_already_revoked`, `last_caregiver_block`,
`not_on_admin_host`, `permission_denied`, `tenant_resolve_failed`.

## 6. Breadcrumbs and navigation state

`libs/acs/navigation` feeds `BreadcrumbItem[]` to the Shell's `NavigationService`:

```
Access → Caregivers
Access → Patient sessions → <Patient name>
Ops → Tenants            (only on the admin host)
```

The ops breadcrumb/menu entry is emitted only when `opsHostGuard` resolves `onAdminHost = true`;
otherwise ACS contributes only the two caregiver-shell destinations. Navigation visibility is
derived from `acs.permission-map.ts`, never built ad hoc in a component.
