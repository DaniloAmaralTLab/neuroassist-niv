# FE-TRN-003 -- provideTrn() — adapter wiring (default http), NAVIGATION_INTENT_PORT no-op, providers spec

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`libs/trn/src/lib/trn.providers.ts` exports `provideTrn({ adapter?, flags? })` that wires all five HTTP adapters as the **default** (`adapter: 'http'`), provides `NoOpNavigationIntentPort` as the default `NAVIGATION_INTENT_PORT`, and is proven by a providers spec that `adapter: 'http'` resolves to the HTTP adapters (carry-forward `scaffold:mock-adapter-default`, Learning D-611).

## Context / Problem statement
- SPEC-04 §2: `provideTrn()` ships default `adapter:'http'` — trn-service is specified. The earlier `'mock'` default is superseded; Mock adapter remains available by explicit override for offline dev / e2e only.
- SPEC-06 §2: `NAVIGATION_INTENT_PORT` defaults to `NoOpNavigationIntentPort`; a Patient-Mode host (G1 optional) may override it with the GEST-fed implementation.
- A providers spec must prove the default resolves to HTTP adapters (guard against `scaffold:mock-adapter-default` regression).
- Bloqueia: FE-TRN-006 through FE-TRN-010

## Approach (execution path)
1. Create `libs/trn/src/lib/ports/navigation-intent.port.ts` defining `NavigationIntentPort` interface and `NAVIGATION_INTENT_PORT` injection token.
2. Create `libs/trn/src/lib/adapters/no-op-navigation-intent.adapter.ts` implementing `NavigationIntentPort` as a no-op.
3. Create `libs/trn/src/lib/trn.providers.ts` exporting `provideTrn({ adapter = 'http', flags? })`. When `adapter === 'http'`, provide all five `*HttpAdapter` classes behind their respective `*_PORT` tokens. When `adapter === 'mock'`, provide `*MockAdapter` classes instead.
4. `provideTrn()` always provides `NoOpNavigationIntentPort` as default for `NAVIGATION_INTENT_PORT` (host may override).
5. Write a providers spec (`trn.providers.spec.ts`) that creates a `TestBed` with `provideTrn()` (no args) and asserts each port token resolves to its HTTP adapter class.
6. Re-export `provideTrn` from `src/index.ts`.

## Non-goals
- No implementation of the HTTP adapters themselves here (FE-TRN-006 through FE-TRN-010).
- No GEST-fed `NAVIGATION_INTENT_PORT` implementation (optional G1 future).

## Layer(s)
frontend / Tool entry (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§2)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/generator-config.yml` (adapter_default: http, ports)

## Architecture alignment
- Default `'http'` (trn-service specified — Learning pitfall `scaffold:mock-adapter-default` explicitly avoided)
- `NAVIGATION_INTENT_PORT` with no-op default (host-portable for G1)

## Implementation checklist (by layer/file)

**Lib path: `frontend/libs/trn/src/lib/`**
- 🔲 `ports/navigation-intent.port.ts` — NavigationIntentPort interface + NAVIGATION_INTENT_PORT token
- 🔲 `adapters/no-op-navigation-intent.adapter.ts` — NoOpNavigationIntentPort
- 🔲 `trn.providers.ts` — provideTrn({ adapter='http', flags? }) wiring all 5 ports
- 🔲 `trn.providers.spec.ts` — providers spec proving default resolves to HTTP adapters
- 🔲 `src/index.ts` — re-exports `provideTrn`

**Tests**
- 🔲 Providers spec: `provideTrn()` resolves `TRAINING_SESSION_PORT` to `TrainingSessionHttpAdapter`
- 🔲 Providers spec: `provideTrn({ adapter: 'mock' })` resolves `TRAINING_SESSION_PORT` to `TrainingSessionMockAdapter`
- 🔲 `npx nx test trn` PASS
- 🔲 `npx nx lint trn` PASS
- 🔲 `npx nx build trn` PASS

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:trn
priority:P1

## Acceptance criteria
- `provideTrn()` with no arguments resolves all 5 TRN ports to their HTTP adapter implementations.
- `provideTrn({ adapter: 'mock' })` resolves all 5 TRN ports to their Mock adapter implementations.
- `NoOpNavigationIntentPort` is provided as the default `NAVIGATION_INTENT_PORT`.
- Providers spec passes with 0 failures.
- `npx nx build trn` PASS; `npx nx lint trn` PASS.

## Dependencies
- FE-TRN-001 (trn.contract.ts)
- FE-TRN-006, FE-TRN-007, FE-TRN-008, FE-TRN-009, FE-TRN-010 (adapters — must exist before spec can inject them)

## Data impact
- None — provider wiring only; no tenant state.

## API / Contract impact
- Binds the HTTP adapters that consume the trn-service endpoints (§2.1–§7.1); no URLs defined here.

## Testing / Evidence required
- Providers spec output: each port token maps to the expected adapter class.

## Risks / Notes
- `scaffold:mock-adapter-default` (D-611, 7 occurrences): default MUST be `'http'`; Mock is explicitly opt-in.
- The providers spec is the evidence gate for this carry-forward issue.
