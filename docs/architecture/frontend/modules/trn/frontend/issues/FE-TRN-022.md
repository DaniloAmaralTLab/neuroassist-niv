# FE-TRN-022 -- TrnShellIntegrationService — caregiver-bearer egress, NAVIGATION_INTENT_PORT seam (no-op default → optional G1 override)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`TrnShellIntegrationService` attaches the caregiver-session bearer on TRN egress, subscribes to the `NAVIGATION_INTENT_PORT` (no-op default), and routes incoming navigation intents (from an optional GEST-fed host override) onto the `ProposalFacade` pending-assent node selection.

## Context / Problem statement
- SPEC-06 §2: `TrnShellIntegrationService` has two responsibilities: (1) egress identity — attaches caregiver JWT on every `/trn` call (the Shell wires the caregiver interceptor; TRN adds no second identity); (2) optional navigation-intent seam — subscribes to `NAVIGATION_INTENT_PORT` and routes each intent to the pending-assent node matching its `engineFeatureRef`.
- In the caregiver Shell today, the no-op default is used and no host override is required.
- An intent targeting a node absent or not-authorized at the current level is ignored; touch + switch-scan navigation unaffected.

## Approach (execution path)
1. Create `libs/trn/integration/src/lib/trn-shell-integration.service.ts` (`@Injectable({ providedIn: 'root' })`).
2. Inject `NAVIGATION_INTENT_PORT` with `@Optional() @Inject(NAVIGATION_INTENT_PORT)` defaulting to `NoOpNavigationIntentPort`.
3. `init()`: subscribe to intents from the port; on each intent, resolve `proposalFacade.pending().find(p => p.engineFeatureRef === intent.engineFeatureRef)`; if found, call `selectNode(id)` on a nav state signal; if not found, ignore.
4. Egress: the caregiver interceptor is wired by the Shell; `TrnShellIntegrationService` does not add an extra interceptor — it logs the identity (`caregiver.jwt`) for observability.
5. `destroy()`: unsubscribe from intent port.

## Non-goals
- No GEST-fed port implementation here — that's the host's concern (G1 future).
- No patient-session token handling.

## Layer(s)
frontend / Shell integration (`libs/trn/integration/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2)

## Architecture alignment
- No second identity; caregiver interceptor owned by the Shell
- `NAVIGATION_INTENT_PORT` with `@Optional` injection and no-op default

## Implementation checklist (by layer/file)

- 🔲 `libs/trn/integration/src/lib/trn-shell-integration.service.ts`
- 🔲 Unit test: intent with matching engineFeatureRef selects the pending-assent node
- 🔲 Unit test: intent with no-matching-ref → ignored; no navigation

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 4 / Shell integration

## Labels
type:feature
layer:frontend
scope:trn
priority:P4

## Acceptance criteria
- Service attaches no interceptor of its own (egress is Shell-owned).
- Intent with no matching pending-assent node is silently ignored.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-003 (NAVIGATION_INTENT_PORT token)
- FE-TRN-012 (ProposalFacade — pending() signal)
- FE-TRN-004 (TRN_MODULE_DESCRIPTOR — shell registration)

## Data impact
- None — navigation state only.

## API / Contract impact
- None — no HTTP calls here.

## Testing / Evidence required
- Unit tests: intent routing and ignore-on-miss.

## Risks / Notes
- INT-FE-TRN-6 (G1): the GEST-fed `NAVIGATION_INTENT_PORT` override is optional and not required for v1.
