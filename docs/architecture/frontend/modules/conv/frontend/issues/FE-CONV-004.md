# FE-CONV-004 -- NAVIGATION_INTENT_PORT — InjectionToken, NavigationIntentPort interface, NoOpNavigationIntentPort default

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

**SPEC refs:** SPEC-06 §2, ADR-007, generator-config.yml §ports, contracts/backend-api-cross-link.md §3 INT-FE-CONV-1

## Outcome
The `NavigationIntentPort` interface, `NAVIGATION_INTENT_PORT` InjectionToken, and `NoOpNavigationIntentPort` default implementation are defined in `frontend/libs/conv/src/lib/ports/navigation-intent.port.ts`. CONV declares the port; GEST or the Patient-Mode host provides the real implementation (INT-FE-CONV-1). The no-op default lets touch and switch-scan work without a host (ADR-007, SPEC-06 §2).

## Approach (execution path)
1. Create `frontend/libs/conv/src/lib/ports/navigation-intent.port.ts`.
2. Define `NavigationIntentPort` abstract class (or interface) with the three intent methods that GEST pushes:
   - `selectByFeatureRef(engineFeatureRef: string): void` — gesture recognized; resolve to node with matching engineFeatureRef at current level
   - `descend(categoryId: string): void` — descend into a category by engineFeatureRef
   - `back(): void` — navigate back one level
3. Create `NAVIGATION_INTENT_PORT = new InjectionToken<NavigationIntentPort>('NavigationIntentPort')`.
4. Implement `NoOpNavigationIntentPort` as the default: all methods are no-ops (do nothing). This is intentional — CONV functions with touch + switch-scan without GEST.
5. Re-export from `frontend/libs/conv/src/lib/ports/index.ts` and from `frontend/libs/conv/src/index.ts`.
6. Unit test: `NoOpNavigationIntentPort` calls should produce no errors and no state change.

**Cross-module note (INT-FE-CONV-1):** This port is the consumer-side seam. GEST must implement the producer-side (mirror of STATION_LIVENESS_PORT, reversed direction). GEST never HTTP-calls CONV — this is in-process only (ADR-007).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/src/lib/ports/navigation-intent.port.ts` created
- [ ] `NavigationIntentPort` interface/abstract with `selectByFeatureRef`, `descend`, `back` methods
- [ ] `NAVIGATION_INTENT_PORT` InjectionToken exported
- [ ] `NoOpNavigationIntentPort` implements all three methods as no-ops
- [ ] Re-exported from `frontend/libs/conv/src/index.ts`
- [ ] Unit test: no-op methods produce no error; touch + switch-scan unaffected
- [ ] `npx nx lint conv` PASS

## Acceptance criteria
- [ ] `NoOpNavigationIntentPort.selectByFeatureRef('x')` produces no side-effect (pure no-op)
- [ ] `NAVIGATION_INTENT_PORT` InjectionToken is importable from `@neuroassist/conv`
- [ ] Without a host override, touch and switch-scan navigation still work (no-op default provides the token)
- [ ] `npx nx lint conv` PASS

## Dependencies
None — defines the port contract; independent foundation issue.

## Tenant-context impact
None — the port is stateless; navigation intents carry no tenant identity.
