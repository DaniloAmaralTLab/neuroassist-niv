# 05 — State and Data Flow — edge (EDGE)

## 1. State topology

| State | Where it lives | Shape |
|---|---|---|
| Active tenant | JWT `tenantId` claim; mirrored in `@neuroassist/shared/tenant-context` (global) | EDGE reads for display; authoritative tenant is the JWT claim, server-side. |
| Session / claims | `@neuroassist/shared/auth-session` (global) | roles, `sub`, expiry; EDGE reads for display only. |
| Access decisions | `@neuroassist/shared/access-decision` (global) | `can(<perm>)`, menu/route visibility. |
| Device read-model | `libs/edge/data-access` `DeviceFacade` (module-local signal) | `EdgeDevice[]` → `DeviceStatusVM`. Server-derived `status`/`lastSyncAt`. |
| Topbar badge state | `DeviceStatusBadge` bound to `DeviceFacade` (Shell-hosted) | `isOnline` + `lastSyncRelative` computed; no local liveness logic. |
| Pairing draft | `feature-device-pairing` local signal | `pairing: 'idle' \| 'pairing' \| 'paired' \| 'error'` — ephemeral until the claim confirms. |
| Lifecycle (unpair) | `feature-device-status` local signal | `confirming` / `submitting` — ephemeral. |

Module state is local to `edge/data-access`; cross-cutting identity/tenant/RBAC stays in `shared/*`,
never duplicated inside EDGE.

## 2. Data access pattern

```
Component → DeviceFacade (signals) → EDGE_DEVICE_PORT (adapter) → HttpClient via access-http-base → edge-service
```

- `EdgeDeviceHttpAdapter` is the only holder of `HttpClient`. It returns typed wire records
  (`EdgeDeviceWire`) mapped to the VM via `toEdgeDevice`.
- `DeviceFacade` exposes `signal<EdgeDevice[]>` private + `.asReadonly()`; no `BehaviorSubject` as
  source of truth. `status`/`lastSyncAt` are stored exactly as the server reports them.
- Every call carries the bearer token and a correlation id (interceptor). Tenant scoping is enforced
  server-side from the JWT claim; EDGE never sends `X-Tenant-Id` as authority.

> **Carry-forward for promote (Learning, `scaffold:mock-adapter-default`):** `edge.providers.ts` must
> default the adapter to **`mock`** *for now*, because `edge-service` is not yet architected — with the
> HTTP adapter already based at `${ACCESS_HTTP_BASE}/edge` behind the `toEdgeDevice` mapper, ready to
> flip the default to `http` when `edge-service` lands. A providers spec must prove the **intended**
> default so it never silently diverges from the BE reality.

## 3. Cache strategy

Default = **read the device status on each navigation** into a screen that shows it, plus a refresh on
topbar mount. No EDGE cache in v1 (one device per patient; a tiny read). Liveness is **pull**, not a FE
timer: the FE reads the server's heartbeat projection; it does not poll a socket or synthesize status
between reads (ADR-005). A `tenant-context` change invalidates any future EDGE state explicitly. A
polling cadence or push channel is introduced only if a later SPEC justifies it (and the cadence lives
server-adjacent, never as client-inferred liveness).

## 4. Optimistic updates

- **Pairing** is **pessimistic** — the UI shows `paired` only after the claim confirms (a device must
  not appear paired before `edge-service` records it; a false "paired" would mislead the lead into
  handing over a non-working detector).
- **Unpair** is **pessimistic** by default (await the server, then drop the device) — removing a
  detector is safety-relevant and must not drift.
- **Status reads** hold no write state at all — they render the server read-model as-is.
- A SPEC may later opt a specific action into optimistic update; the rollback strategy (restore the
  prior device snapshot and surface the error via `ui-feedback`) must be documented there.

## 5. Error handling

```
edge-service ProblemDetail → access-http-base error-normalize interceptor
  → AppError (@neuroassist/shared/error-model)
  → feature maps to: inline pairing error (pairing panel) | toast (unpair) | neutral "status unavailable" (status read)
  → rendered via @neuroassist/shared/ui-feedback
```

Reason codes surfaced: `device_pairing_failed`, `device_already_paired`, `platform_unsupported`
(Android/Chromium, PLAT-001), `device_not_found`, `permission_denied`, `tenant_resolve_failed`.
`status_unavailable` is a **client-rendered** state when `edge-service` is unreachable — it shows a
neutral "status unavailable", **never** a defaulted "online".

## 6. Breadcrumbs and navigation state

`libs/edge/navigation` feeds `BreadcrumbItem[]` to the Shell's `NavigationService`:

```
Care → Edge Device → <Patient name>
Care → Edge Device → <Patient name> → Pair device        (onboarding / phone-activation step)
```

The topbar `DeviceStatusBadge` is **not** a breadcrumb — it is a persistent, always-visible connectivity
indicator (§3.2.B), fed by `DeviceFacade`, not derived ad hoc in a component. Navigation visibility is
derived from `edge.permission-map.ts`, never built inline.
