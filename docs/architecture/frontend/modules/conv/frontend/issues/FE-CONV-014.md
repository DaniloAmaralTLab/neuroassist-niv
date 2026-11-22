# FE-CONV-014 -- SpeechTreeNavigatorComponent — smart (OnPush/standalone), injects facades, reads all signals, zero HttpClient, zero network on user action

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-02 §1–2, SPEC-03 §1, generator-config.yml §features

## Outcome
`SpeechTreeNavigatorComponent` is the single smart component for the `/patient/converse` route. It injects `SpeechTreeFacade`, `AudioPlaybackService`, `NavigationService`. It reads all signals and passes them down to the six presentational children via `@Input`. It issues **no** `HttpClient` call and performs **no** network action on any user interaction (ADR-005, INV-CONV-5). It wires user actions (select, descend, back) to the facade mutations.

## Approach (execution path)
1. Create `frontend/libs/conv/feature-converse/src/lib/speech-tree-navigator.component.ts`.
2. Decorator: `@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })`.
3. Inject: `SpeechTreeFacade`, `AudioPlaybackService`, `NavigationService`.
4. Template reads from signals: `nodes()`, `selectedNode()`, `activeChannel()`, `pendingConfirmation()`, `audioSource()`, `offline()`, `snapshotVersion()`, `treeState()`, `currentLevelLabel()`.
5. Pass each as `@Input` to its presentational child component.
6. Wire user actions:
   - `(select)` from `NodeGridComponent` → `facade.select(nodeId)` → `audioPlaybackService.play(node)`.
   - `(descend)` from `NodeGridComponent` → `facade.descend(categoryId)`.
   - `(back)` from `NavFooterComponent` → `facade.back()`.
   - `(open)` from `PendingConfirmationBannerComponent` → `router.navigate(['/patient/confirm-training'])` (link-out to TRN — SPEC-01 §2).
7. No `HttpClient` injection; no `fetch()` calls; all network is in data-access layer.
8. Unit tests: `treeState='cold'` → bounded loading state shown; `select()` triggers `audioPlaybackService.play()`; stub facade typed as `Pick<SpeechTreeFacade, 'nodes' | 'selectedNode' | ...>`.

**Pitfall (test:page-spec:partial-facade-stub-drift):** stub facade is typed `Pick<SpeechTreeFacade, 'nodes' | 'selectedNode' | 'pendingConfirmation' | ...>` — not `Partial<SpeechTreeFacade>`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/feature-converse/src/lib/speech-tree-navigator.component.ts` — standalone, OnPush
- [ ] Injects: SpeechTreeFacade, AudioPlaybackService, NavigationService (no HttpClient)
- [ ] All six presentational children wired with correct `@Input` bindings from signals
- [ ] `(select)` → `facade.select()` + `audioPlaybackService.play()`
- [ ] `(descend)` → `facade.descend()`
- [ ] `(back)` → `facade.back()`
- [ ] `(open)` from banner → router.navigate to TRN confirm-training (not a CONV route)
- [ ] `frontend/libs/conv/feature-converse/src/lib/speech-tree-navigator.component.spec.ts` — stub typed as Pick<SpeechTreeFacade, ...>
- [ ] `npx nx test conv-feature-converse` PASS; `npx nx lint conv-feature-converse` PASS

## Acceptance criteria
- [ ] No `HttpClient` or `fetch()` in this component
- [ ] All signal reads and child input bindings match SPEC-02 §1 signal table exactly
- [ ] `(select)` wired to `facade.select()` and immediately triggers `audioPlaybackService.play()`
- [ ] Stub in spec is typed as `Pick<SpeechTreeFacade, ...>` not `Partial<>`
- [ ] `npx nx test conv-feature-converse` PASS; `npx nx lint conv-feature-converse` PASS

## Dependencies
FE-CONV-012 (SpeechTreeFacade).
FE-CONV-013 (NavigationService).
FE-CONV-009 (AudioPlaybackService).
FE-CONV-015, FE-CONV-016, FE-CONV-017 (presentational children).

## Tenant-context impact
None — the smart component is per-patient-session; no tenant-level rendering differences.
