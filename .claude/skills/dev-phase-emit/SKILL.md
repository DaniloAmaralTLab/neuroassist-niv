---
name: dev-phase-emit
description: Emits the phase event via pipeline_events.py. Invoke when finishing each execution phase (planner, implementer, validator). Requires CATEGORY, ACTOR, STAGE, STATUS, MODULE and MESSAGE in context; LAYER and DETAILS as applicable.
user-invocable: false
tools: Bash
---

# Dev Phase Emit

Single source of the emission block that was duplicated across the 6 execution commands
(`{be,fe}-{planner,implement,validator}`). Written **from** those blocks, not from
a generic template: the parameters below exist because some real command uses them, and
no flag those commands used was lost.

## Parameters

| Variable | Required | Real values in use |
|---|---|---|
| `CATEGORY` | yes | `PLANNER`, `IMPLEMENTER`, `VALIDATOR-VALIDATION`, `VALIDATOR-BASELINE`, `VALIDATOR-DECISION`, `DECISION` |
| `ACTOR` | yes | `/be-planner`, `/be-implement`, `/be-validator`, `/fe-*` |
| `STAGE` | yes | `plan`, `implement`, `validate` |
| `STATUS` | yes | `completed`, `failed`, `started`, `blocked` |
| `MODULE` | yes | the target module |
| `MESSAGE` | yes | summary line **specific to the command** -- never a fixed template |
| `LAYER` | FE only | `fe`. The BE commands do **not** pass this flag |
| `DETAILS` | validation only | JSON of `last_validate.details` (score, checklist, gates, next_action) |

`MESSAGE` and `DETAILS` are what make the event useful downstream: `module-state` returns
`last_validate.details` to all the other commands in the context phase. Emitting without
them degrades the whole pipeline, not just this event.

## Command

```bash
python scripts/pipeline_events.py emit \
  --category <CATEGORY> \
  --actor "<ACTOR>" \
  --message "<MESSAGE>" \
  --module <MODULE> \
  --stage <STAGE> \
  --status <STATUS>
```

Add `--layer <LAYER>` when the phase is a frontend one.
Add `--details "$DETAILS"` when the phase is a validation one.

The tokens of the four buckets (`input`, `cache_read`, `cache_creation`, `output`) are
read automatically from the session delta when the flags are not passed -- there is
nothing to supply here.

Best-effort: if the emit fails, record "journal degraded" in the final summary and
continue. **Never block the phase because of telemetry.**
