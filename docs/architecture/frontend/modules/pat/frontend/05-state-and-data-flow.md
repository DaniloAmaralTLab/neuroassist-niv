# 05 — State and Data Flow — pat (PAT)

## 1. State topology

| State | Where it lives | Shape |
|---|---|---|
| Active tenant | JWT `tenantId` claim; mirrored in `@neuroassist/shared/tenant-context` (global) | PAT reads for display; the authoritative tenant is the JWT claim, server-side. |
| Session / claims | `@neuroassist/shared/auth-session` (global) | roles, `sub`, expiry; PAT reads for display only. |
| Access decisions | `@neuroassist/shared/access-decision` (global) | `can(<perm>)`, menu/route visibility. |
| Command catalog | `libs/pat/data-access` `CommandFacade` (module-local signal) | `CommandCatalogVM.commands`. |
| Gesture types | `libs/pat/data-access` `GestureTypeFacade` (module-local signal) | `{ id; name }[]`. |
| Active patient | `libs/pat/data-access` `PatientFacade` (module-local signal) | `{ id; name }`. |
| Command editor draft | `feature-command-catalog` local signal | `CommandEditorVM.form` — ephemeral until save. |
| Patient-registration form | `feature-patient-registry` local signal | ephemeral. |

Module state is local to `pat/data-access` facades; cross-cutting identity/tenant/RBAC stays in
`shared/*`, never duplicated inside PAT.

## 2. Data access pattern

```
Component → Facade (signals) → <X>_PORT (adapter) → HttpClient via access-http-base → pat-service
```

- `PatientHttpAdapter`, `CommandHttpAdapter`, `GestureTypeHttpAdapter` are the only holders of
  `HttpClient`. Each returns typed wire records (`PatientWire`, `CommandWire`, `GestureTypeWire`)
  mapped to the VM via `toPatient` / `toCommand` / `toGestureType`.
- Facades expose `signal<T>` private + `.asReadonly()`; no `BehaviorSubject` as source of truth.
- Every call carries the bearer token and a correlation id (interceptor). Tenant scoping is enforced
  server-side from the JWT claim; PAT never sends `X-Tenant-Id` as authority.

> **Carry-forward for promote (Learning, `scaffold:mock-adapter-default`):** the generated
> `pat.providers.ts` must default the adapter to **`http`** (because `pat-service` exists), with the
> HTTP adapters based at `${ACCESS_HTTP_BASE}/pat`; `MockAdapter` only serves fixtures in the same
> wire shape. A providers spec must prove the default is `http`, not mock.

## 3. Cache strategy

Default = **call the API on each navigation** into the command catalog. No PAT cache in v1 (small data
volume — one pilot patient, a handful of commands and gesture types). Gesture types are fetched
alongside the catalog and kept in the module facade for the lifetime of the editor session only. A
`tenant-context` change invalidates any future PAT state explicitly. Cache is introduced only if a
later SPEC justifies it.

## 4. Optimistic updates

- Create / edit / remove and gesture-type registration are **pessimistic** by default (await the
  server, then update the list) — catalog correctness feeds the detection engine and must not drift.
- The live webcam test holds **no server state** at all — it is pure local UI.
- A SPEC may later opt a specific action into optimistic update; the rollback strategy (restore the
  prior list snapshot and surface the error via `ui-feedback`) must be documented there.

## 5. Error handling

```
pat-service ProblemDetail → access-http-base error-normalize interceptor
  → AppError (@neuroassist/shared/error-model)
  → feature maps to: field error (editor / registration) | toast (remove) | page error (list load)
  → rendered via @neuroassist/shared/ui-feedback
```

Reason codes surfaced: `command_label_required`, `gesture_duration_invalid`,
`gesture_type_name_taken`, `patient_not_found`, `permission_denied`, `tenant_resolve_failed`.
`webcam_unavailable` is a **client-only** state (never a BE ProblemDetail): it sets the live-test
error state and never blocks a save.

## 6. Breadcrumbs and navigation state

`libs/pat/navigation` feeds `BreadcrumbItem[]` to the Shell's `NavigationService`:

```
Care → Patients & Commands → <Patient name>
Care → Patients & Commands → <Patient name> → New command | Edit "<label>"
Care → Patients & Commands → Register patient        (onboarding step)
```

Navigation visibility is derived from `pat.permission-map.ts`, never built ad hoc in a component. The
catalog breadcrumb carries the active patient's name resolved by `PatientFacade`.
