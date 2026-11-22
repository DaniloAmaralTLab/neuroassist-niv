# INT-FE-TRN-003 -- modules.registry[TRN].frontendLib trn-ui → trn — label reconcile done in promote (fe-architect-promote)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`project-context.json` `modules.registry[TRN].frontendLib` is updated from `trn-ui` to `trn` during the `fe-architect-promote` phase; this issue tracks the reconcile as a cross-cutting concern so promote does not miss it.

## Context / Problem statement
- `project-context.json` currently carries `modules.registry[TRN].frontendLib = "trn-ui"` (legacy generator name from initial scaffold intent).
- All FE TRN issues and specs reference the library as `libs/trn/` and `scope:trn` (the correct canonical name).
- During `fe-architect-promote`, when the Nx library is registered and the Shell wires `TrnShellIntegrationService`, the `frontendLib` field must be updated to `"trn"`.
- If not corrected, `sync-architecture.py` module resolution and any script that reads `frontendLib` will resolve to `trn-ui` (a non-existent library path).

## Coordination required
- **fe-architect-promote agent:** when registering the `trn` Nx library (libs/trn/), update `project-context.json.modules.registry[TRN].frontendLib` from `trn-ui` to `trn`.
- **backlog-gen / sync-architecture:** if any script reads `frontendLib` to construct Nx library paths, the rename is a one-time migration.

## Approach (promote phase)
1. In `fe-architect-promote --client neuroassist-niv --module TRN`:
   - After registering `libs/trn/` as the Nx library, run:
     ```bash
     python scripts/context.py set modules.registry.TRN.frontendLib trn
     ```
2. Verify no scripts or templates still reference `trn-ui`.

## Non-goals
- No code changes in `libs/trn/` itself — this is a metadata-only reconcile.

## Layer(s)
frontend / Registry metadata

## Bounded context
trn

## Service execution spec(s)
- `project-context.json` schema (generator-config.yml `frontend_lib: trn`)

## Architecture alignment
- `frontendLib` = Nx project name without `@neuroassist/` scope prefix
- Canonical name: `trn` (matches `libs/trn/` directory and all SPEC references)

## Implementation checklist

- 🔲 `fe-architect-promote` agent: `python scripts/context.py set modules.registry.TRN.frontendLib trn`
- 🔲 Verify no other scripts/templates reference `trn-ui`
- 🔲 After promote: `python scripts/sync-architecture.py pull --client neuroassist-niv --module TRN --no-index` exits 0

## Milestone
Wave 1 / Foundation (promote pre-condition)

## Labels
type:integration
layer:frontend
scope:trn
priority:P1

## Acceptance criteria
- `project-context.json modules.registry.TRN.frontendLib === "trn"` after promote.
- `sync-architecture.py pull --module TRN` resolves TRN correctly (exit 0).

## Dependencies
- FE-TRN-004 (TRN_MODULE_DESCRIPTOR — shell registration during promote)

## Risks / Notes
- If this reconcile is missed, `fe-implement` agents picking up `frontendLib` from project-context will resolve the wrong Nx library path.
