# FE-CONV-019 -- ConvShellIntegrationService — NAVIGATION_INTENT_PORT subscription, intent-to-node resolution (engineFeatureRef), ignore absent/unauthorized

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-06 §2–3, ADR-007, contracts/backend-api-cross-link.md §3 INT-FE-CONV-1

## Outcome
`ConvShellIntegrationService` subscribes to the `NAVIGATION_INTENT_PORT` and routes incoming gesture navigation intents to `SpeechTreeFacade` mutations. An intent carrying an `engineFeatureRef` resolves to the current-level node with the matching ref; if no node matches or the node is not authorized, the intent is **ignored** (touch + switch-scan are unaffected). This is the in-process seam described in ADR-007 (GEST = publisher, CONV = consumer, no network call).

## Approach (execution path)
1. Create `frontend/libs/conv/integration/src/lib/conv-shell-integration.service.ts`.
2. Inject: `NAVIGATION_INTENT_PORT` (may be `NoOpNavigationIntentPort`), `SpeechTreeFacade`, `NavigationService`.
3. `subscribe(): void` — called by `conv.bootstrap.ts` on init; listens on `NAVIGATION_INTENT_PORT` for the three intent types:
   - `selectByFeatureRef(ref)` → find node in `SpeechTreeFacade.nodes()` where `engineFeatureRef === ref`; if found and `node.active === true` → `SpeechTreeFacade.select(node.id)`; else → no-op (intent ignored).
   - `descend(ref)` → find category node where `engineFeatureRef === ref`; if found → `SpeechTreeFacade.descend(node.id)`; else → no-op.
   - `back()` → `SpeechTreeFacade.back()`.
4. `unsubscribe(): void` — called by `conv.bootstrap.ts` on destroy.
5. All three paths go through the same `SpeechTreeFacade` as touch/switch-scan (ADR-007 — no channel forks the state).
6. Unit tests: `selectByFeatureRef` for present+active node → `select()` called; absent node → no-op; inactive (not dual-auth) → no-op.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/integration/src/lib/conv-shell-integration.service.ts` — ConvShellIntegrationService
- [ ] `subscribe()` / `unsubscribe()` lifecycle methods
- [ ] `selectByFeatureRef(ref)` → resolves to current-level node by `engineFeatureRef`; absent or unauthorized → ignored
- [ ] `descend(ref)` → resolves category node; absent → ignored
- [ ] `back()` → `SpeechTreeFacade.back()` unconditionally
- [ ] No separate state fork for the gesture channel — same facade as touch (ADR-007)
- [ ] Re-exported from `frontend/libs/conv/integration/src/index.ts`
- [ ] `npx nx test conv-integration` PASS — present+active→select, absent→no-op, inactive→no-op
- [ ] `npx nx lint conv-integration` PASS

## Acceptance criteria
- [ ] Gesture intent for a present+active node calls `SpeechTreeFacade.select()` with the same result as a touch select
- [ ] Gesture intent for an absent or unauthorized node is a no-op (touch + switch-scan remain unaffected)
- [ ] Service is stateless between subscriptions (no dangling side effects after `unsubscribe()`)
- [ ] `npx nx test conv-integration` PASS; `npx nx lint conv-integration` PASS

## Dependencies
FE-CONV-004 (NAVIGATION_INTENT_PORT).
FE-CONV-012 (SpeechTreeFacade.nodes(), select(), descend(), back()).
FE-CONV-013 (NavigationService — current level for node resolution).
INT-FE-CONV-1 (GEST must implement the producer side — this service is the consumer).

## Tenant-context impact
None — navigation intents carry no tenant identity; the patient-session token governs what nodes are visible.
