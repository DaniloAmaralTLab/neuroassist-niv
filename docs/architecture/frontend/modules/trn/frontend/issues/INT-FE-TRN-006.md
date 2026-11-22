# INT-FE-TRN-006 -- G1 host (optional NAVIGATION_INTENT_PORT GEST-fed override) — non-blocking for TRN v1; PatientAssentPageComponent is host-portable by design

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`PatientAssentPageComponent` and `TrnShellIntegrationService` are designed for optional host portability (G1): a future host application can override `NAVIGATION_INTENT_PORT` with a GEST-fed gesture recognizer to drive the assent surface without code changes in TRN. This issue tracks the design seam and the non-blocking deferral; no v1 implementation is required.

## Context / Problem statement
- SPEC-06 §3: G1 — the assent surface must be host-portable. The `NAVIGATION_INTENT_PORT` with `NoOpNavigationIntentPort` default provides the seam.
- G1 is optional and non-blocking for TRN v1 (confirmed in generator-config.yml `open_items`).
- When G1 is activated: a GEST host application overrides `NAVIGATION_INTENT_PORT` with a `GestureNavigationIntentPort`; `TrnShellIntegrationService.init()` picks up the new port's intent stream and routes gestures to the pending-assent node selection.
- In v1: `NoOpNavigationIntentPort` emits no intents; switch-scan and touch channels work unchanged.

## Coordination required
- **GEST module / host application team:** when G1 is activated, provide a `GestureNavigationIntentPort` implementation and override `NAVIGATION_INTENT_PORT` in the host's providers array.
- **TRN owner:** verify that `PatientAssentPageComponent` large-target sizing meets GEST host requirements (ALS/MND accessibility tokens).

## FE design (TRN side, v1)
1. `NAVIGATION_INTENT_PORT` token: defined in `libs/trn/src/lib/ports/navigation-intent.port.ts` (FE-TRN-003).
2. `NoOpNavigationIntentPort`: injectable via `provide: NAVIGATION_INTENT_PORT, useClass: NoOpNavigationIntentPort` in `provideTrn()`.
3. `TrnShellIntegrationService.init()`: subscribes to the port's intent stream. With `NoOpNavigationIntentPort`, no intents arrive.
4. `PatientAssentPageComponent`: large-target tiles, three-channel convergence already wired (FE-TRN-019, FE-TRN-020).

## Non-goals
- No GEST port implementation in TRN.
- No v1 code changes required for G1 beyond what FE-TRN-003 and FE-TRN-022 already provide.

## Layer(s)
Cross-module coordination (future: GEST host)

## Bounded context
trn → GEST (future)

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-06-shell-integration.md` (§3 G1)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/generator-config.yml` (open_items: G1)

## Architecture alignment
- Host-portable design via port injection seam
- NoOpNavigationIntentPort default — no behavioral impact in v1

## Implementation checklist

- 🔲 Confirm `NAVIGATION_INTENT_PORT` token defined and exported from `libs/trn` public API
- 🔲 Confirm `NoOpNavigationIntentPort` registered as default in `provideTrn()`
- 🔲 Document G1 seam in `libs/trn/integration/README.md` (or equivalent)
- 🔲 Coordination note filed to GEST host team

## Milestone
Wave 4 / Shell integration (design seam)

## Labels
type:integration
layer:frontend
scope:trn
priority:P4

## Acceptance criteria
- `NAVIGATION_INTENT_PORT` token exported from `libs/trn` public API.
- `NoOpNavigationIntentPort` is the default and emits no intents.
- When a GEST host overrides the port, `TrnShellIntegrationService.init()` routes intents to pending-assent node selection without TRN code changes.

## Dependencies
- FE-TRN-003 (NAVIGATION_INTENT_PORT token + NoOpNavigationIntentPort)
- FE-TRN-022 (TrnShellIntegrationService — port subscriber)
- FE-TRN-019 (PatientAssentPageComponent — large-target host)

## Risks / Notes
- G1 is explicitly deferred and non-blocking. If the GEST team activates G1 before TRN v1 ships, the seam is already in place and no TRN changes are needed.
