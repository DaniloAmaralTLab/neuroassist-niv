# INT-FE-CONV-001 -- GEST publishes navigation intents to CONV NAVIGATION_INTENT_PORT — in-process seam (no HTTP), GEST-side implementation, non-blocking, default NoOp

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-04 §2, SPEC-06 §2 (ADR-007), contracts/backend-api-cross-link.md §3 INT-FE-CONV-1

**Owner:** GEST team (implements the publisher side); CONV team (implements the consumer side — FE-CONV-004 + FE-CONV-019)

## Outcome
GEST's `GestNavigationService` resolves and calls `NAVIGATION_INTENT_PORT` from `@neuroassist/conv` to publish gesture navigation intents (selectByFeatureRef, descend, back). This is a pure in-process call — no HTTP, no WebSocket, no event bus. CONV defaults to `NoOpNavigationIntentPort` when GEST is not mounted, so CONV is independently deployable. This coordination is **non-blocking** for CONV development (CONV's default is a no-op; GEST wires it up when both are mounted).

## Cross-module coordination (GEST must do)
1. In `libs/gest/integration/src/lib/gest-conv-bridge.service.ts`:
   - Inject `NAVIGATION_INTENT_PORT` from `@neuroassist/conv`.
   - On gesture recognition event from `gest.engine.service.ts`:
     - If recognized gesture maps to a node `engineFeatureRef` → call `port.selectByFeatureRef(ref)`.
     - If recognized gesture maps to descend → call `port.descend(ref)`.
     - If recognized gesture maps to back → call `port.back()`.
   - Guard: inject only when `conv.module.present` context flag is true (GEST must not fail if CONV is not mounted).
2. In `gest.bootstrap.ts` or `provideGest()`: provide `NAVIGATION_INTENT_PORT` with the real `GestNavigationIntentAdapter` (implements `NavigationIntentPort` from `@neuroassist/conv`).

## CONV-side (already in FE-CONV-004 + FE-CONV-019)
- `NAVIGATION_INTENT_PORT` InjectionToken defined in `@neuroassist/conv` with `NoOpNavigationIntentPort` as default.
- `ConvShellIntegrationService` subscribes and routes intents to `SpeechTreeFacade`.

## Implementation checklist (by layer/file — GEST owner)
- [ ] `libs/gest/integration/src/lib/gest-conv-bridge.service.ts` — injects NAVIGATION_INTENT_PORT from @neuroassist/conv
- [ ] Bridge is conditional on `conv.module.present` flag (GEST never fails without CONV)
- [ ] `provideGest()` or `gest.bootstrap.ts` — provides `NAVIGATION_INTENT_PORT` with real GestNavigationIntentAdapter
- [ ] No HTTP call in the bridge — purely in-process method call
- [ ] `libs/gest/integration/src/lib/gest-conv-bridge.service.spec.ts` — gesture recognized → selectByFeatureRef called; CONV absent → no error
- [ ] `npx nx test gest-integration` PASS
- [ ] `npx nx lint gest-integration` PASS
- [ ] Integration verified: CONV + GEST co-mounted → gesture selects the same node as touch (see FE-CONV-025 feature-6)

## Acceptance criteria
- [ ] GEST gesture recognized → `NAVIGATION_INTENT_PORT.selectByFeatureRef(ref)` called in-process (no HTTP)
- [ ] CONV is independently deployable without GEST (default NoOpNavigationIntentPort is a no-op)
- [ ] GEST does not fail when CONV module is not mounted
- [ ] `npx nx test gest-integration` PASS; `npx nx lint gest-integration` PASS

## Dependencies (CONV-side already tracked)
FE-CONV-004 (NAVIGATION_INTENT_PORT InjectionToken — CONV defines the contract).
FE-CONV-019 (ConvShellIntegrationService — CONV consumer side).

## Tenant-context impact
No tenant identity flows through navigation intents; patient-session governs node visibility independently.
