# 04 — Frontend Architecture Direction — trn (TRN)

## 1. Stack

Angular 21, Nx 22.x, TypeScript strict, RxJS 7.8 + Signals, Jest (unit), Playwright (e2e,
`apps/trn-e2e`). Tailwind v4 (oklch tokens, dark default) via `@neuroassist/shared/ui-tokens`; Angular
CDK primitives (no Material). Audio preview via an HTML audio element over a BE-served clip, with
`SpeechSynthesis` (Web Speech API) fallback. English-only (ADR-018). **No vendor SDK in the browser** —
Claude and ElevenLabs are reached only through `trn-service`.

## 2. App boundary (module-as-library, shared ADR-006)

The entry is the **library** `@neuroassist/trn` (`frontend/libs/trn`), not an app module. `apps/trn/`
is a thin host that lazy-loads the lib via
`loadChildren: () => import('@neuroassist/trn').then(r => r.TRN_ROUTES)`. There is **no**
`trn.module.ts` NgModule — routes + components are standalone (the project's ADR-006 supersedes the
generic tax-map lazy-NgModule entry). The caregiver Shell `neuroassist-niv-web` registers the module by
importing `@neuroassist/trn` in `config/module-descriptors.ts` (`scope:web → scope:trn` boundary
allowed). The **Screen 09** feature is additionally mounted by the Patient-Mode host (G1).

> House-convention note: the registry field `modules.registry[TRN].frontendLib` reads `trn-ui`, but the
> on-disk + importPath convention (verified against conv/gest/edge/pat: bare name, `@neuroassist/<m>`)
> is the bare name **`trn`** (`frontend/libs/trn`, `@neuroassist/trn`, confirmed in
> `libs/trn/README.md`). Vision follows the verified convention; the registry label should be
> reconciled (warning in 06).

## 3. Library organization (Nx tags)

| Sub-lib | Nx tag | Responsibility |
|---|---|---|
| `libs/trn` root | `scope:trn,type:lib` | routes, providers, descriptor, permission-map, feature-flags |
| `access/` | `type:domain` | `caregiverAuthoringGuard`, `patientConfirmGuard` (real session; never `return true`) |
| `api/` | `type:data-access` | `TRAINING_SESSION_PORT`, `PROPOSAL_PORT`, `AUDIO_PREVIEW_PORT` + Http/Mock adapters + `<Wire>`+mappers |
| `authoring/` | `type:domain` | `TrainingSessionFacade` (LLM dialog/streaming state) |
| `proposals/` | `type:domain` | `ProposalFacade` (dual-confirm state, lifecycle status) |
| `integration/` | `type:domain` | `NAVIGATION_INTENT_PORT` consumer (Screen 09) + `TrnShellIntegrationService` (both shells) |
| `navigation/` | `type:domain` | switch-scan timing model for Screen 09 (reused from conv) |
| `feature-training/` | `type:feature` | Screen 08 page (OnPush, standalone) — caregiver web Shell |
| `feature-patient-confirm/` | `type:feature` | Screen 09 page (OnPush, standalone) — Patient-Mode host |
| `ui/` (optional) | `type:ui` | ChatConversationPanel, ProposedNodeCard, dual-confirm badge, AudioPreviewButton, PendingConfirmationList, ChannelBadge |

Boundary rule: `scope:trn` imports only `scope:trn` + `scope:shared`.

## 4. Hub library dependencies

`@neuroassist/shared/access-http-base` (base `${ACCESS_HTTP_BASE}`, interceptors),
`@neuroassist/shared/access-decision` (RBAC), `@neuroassist/shared/auth-session` (caregiver JWT **and**
patient session), `@neuroassist/shared/error-model` (`ProblemDetail`→`AppError`),
`@neuroassist/shared/ui-feedback`, `@neuroassist/shared/ui-tokens`, `@neuroassist/shared/observability`.

## 5. Routing strategy

Two mount points, one lib:

```
# Caregiver web Shell (neuroassist-niv-web) → @neuroassist/trn via loadChildren
/training                    → feature-training (Screen 08)   [caregiverAuthoringGuard: trn.session.*]

# Patient-Mode host (G1, shared with CONV/GEST) → feature-patient-confirm
/patient/confirm-training    → feature-patient-confirm (Screen 09)  [patientConfirmGuard: trn.proposal.confirm]
```

Sub-routes lazy via `loadComponent`. Screen 08 lives beside DASH as a **"Training"** menu item
(`section:'care'`, descriptor). Screen 09 is the target of CONV's "N phrases to confirm" banner — the
route string (`/patient/confirm-training`, provisional BA name `conv.training.confirm`) is reconciled
with CONV + the host at Specs. Reconcile the map with the prototype (Screens 08/09 are BA-draft, not in
the current Angular prototype) and SPEC-01.

## 6. State strategy

Signals-first (shared ADR-001 reserved/pending; applied as house rule): facades expose private
`signal<T>` + `.asReadonly()`; derived state via `computed()`. **No NgRx**, no manual `BehaviorSubject`.
`TrainingSessionFacade` holds `sessionState()/messages()/proposals()/consentCaptured()`;
`ProposalFacade` holds `pending()/status(id)/dualAuthorized(id)`. `AudioPreviewService` resolves the
preview source per call (BE clip → device TTS → text). LLM streaming is modelled as an async signal
update per turn, not a long-lived RxJS subscription in components.

## 7. Module contract strategy

`TRN_MODULE_DESCRIPTOR` (`trn.descriptor.ts`): `key:'trn'`, `section:'care'`, `routeBase:'/training'`,
menu metadata `{ title:'Training', icon:'school', order }`, `identity:'caregiver.jwt'` for the Shell
mount; the Screen 09 mount carries `identity:'patient.session'` under the Patient-Mode host.
`permissions` / `MODULE_PERMISSION_MAP` hold the `trn.*` authorities **verbatim** from the BE/ACS
contract (D-639): caregiver `trn.session.create`, `trn.session.read`, `trn.proposal.read`,
`trn.proposal.create`, `trn.proposal.approve`, `trn.proposal.edit`; patient `trn.proposal.confirm`.
`provideTrn({ adapter })` wires the Http/Mock adapters (**default `'mock'`** until trn-service is
published — `scaffold:mock-adapter-default` guard; flip to `'http'` on landing) and the
`NAVIGATION_INTENT_PORT` default `NoOpNavigationIntentPort` — the Patient-Mode host overrides it with
the GEST-fed implementation (same seam CONV uses, ADR-007 of CONV).
