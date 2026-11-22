# 04 — Frontend Architecture Direction — conv (CONV)

## 1. Stack

Angular 21, Nx 22.x, TypeScript strict, RxJS 7.8 + Signals, Jest (unit), Playwright (e2e). Tailwind
v4 (oklch tokens, dark default) via `@neuroassist/shared/ui-tokens`; Angular CDK primitives (no
Material). Service Worker + Cache Storage + IndexedDB for offline. English-only (ADR-018).

## 2. App boundary (module-as-library, shared ADR-006)

The runtime entry is the **library** `@neuroassist/conv` (`frontend/libs/conv`), not an app module.
`apps/conv/` is a thin host that the Patient-Mode shell lazy-loads via
`loadChildren: () => import('@neuroassist/conv').then(r => r.CONV_ROUTES)`. There is **no**
`conv.module.ts` NgModule — routes + components are standalone (the project's ADR-006 supersedes the
generic tax-map lazy-NgModule entry; see the module ADR index).

> House-convention note: the registry field `modules.registry[CONV].frontendLib` reads `conv-ui`, but
> the on-disk + importPath convention (verified against gest/edge/pat) is the **bare** name `conv`
> (`frontend/libs/conv`, `@neuroassist/conv`). Vision follows the verified convention; the registry
> label should be reconciled (warning in 06).

## 3. Library organization (Nx tags)

| Sub-lib | Nx tag | Responsibility |
|---|---|---|
| `libs/conv` root | `scope:conv,type:lib` | routes, providers, descriptor, permission-map, feature-flags |
| `access/` | `type:domain` | `patientSessionGuard` (conv.* via session) |
| `api/` | `type:data-access` | `TREE_SNAPSHOT_PORT`, `AUDIO_ASSET_PORT` + Http/Mock adapters + `<Wire>`+mappers |
| `offline/` | `type:domain` | `TreeCacheStore` (IndexedDB), `AudioCacheStore` (Cache Storage), `TreeSyncService` |
| `integration/` | `type:domain` | `NAVIGATION_INTENT_PORT` + No-op + `ConvShellIntegrationService` |
| `feature-converse/` | `type:feature` | Screen 06 navigator page (OnPush, standalone) |
| `navigation/` | `type:domain` | level/breadcrumb state + switch-scan timing model |
| `ui/` (optional) | `type:ui` | NodeTile, ChannelBadge, TTSPlayer presentationals |

Boundary rule: `scope:conv` imports only `scope:conv` + `scope:shared`.

## 4. Hub library dependencies

`@neuroassist/shared/access-http-base` (base `${ACCESS_HTTP_BASE}`, interceptors),
`@neuroassist/shared/access-decision` (RBAC), `@neuroassist/shared/auth-session` (patient session),
`@neuroassist/shared/error-model` (`ProblemDetail`→`AppError`), `@neuroassist/shared/ui-feedback`,
`@neuroassist/shared/ui-tokens`, `@neuroassist/shared/observability`.

## 5. Routing strategy

Patient-Mode shell → `@neuroassist/conv` via `loadChildren` at the patient route base (e.g.
`patient`). Sub-routes lazy via `loadComponent`. `canActivate: [patientSessionGuard]`. Draft map
(reconcile with prototype `/patient/converse` + Specs SPEC-01):

```
/patient/converse            → feature-converse (Screen 06)     [patientSessionGuard]
/patient/confirm-training    → OWNED BY TRN (link-out only; CONV renders the banner, not the page)
```

## 6. State strategy

Signals-first (shared ADR-001 reserved/pending; applied as house rule): facades expose private
`signal<T>` + `.asReadonly()`; derived state via `computed()`. **No NgRx**, no manual
`BehaviorSubject`. `SpeechTreeFacade` holds `items()/loading()/selectedNode()/pendingConfirmation()`
reading from `TreeCacheStore`. `AudioPlaybackService` is stateless-ish (resolves source per call).

## 7. Module contract strategy

`CONV_MODULE_DESCRIPTOR` (`conv.descriptor.ts`): `key:'conv'`, `section:'patient'`,
`routeBase:'/patient'`, `identity:'patient.session'`, `stationTokenAuthorities`/`permissions` = the
`conv.*` authorities (verbatim from the BE/ACS contract, D-639). `MODULE_PERMISSION_MAP` holds the
`conv.*` keys for any authority-gated affordance. `provideConv({ adapter })` wires the Http/Mock
adapters (**default `'http'`** once conv-service is published) and the `NAVIGATION_INTENT_PORT`
default `NoOpNavigationIntentPort` — the Patient-Mode host overrides it with the GEST-fed
implementation (mirror of GEST's `STATION_LIVENESS_PORT` wiring, SAFETY seam).
