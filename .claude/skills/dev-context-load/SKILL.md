---
name: dev-context-load
description: Loads the execution context via pipeline-context.py — module-state, decision-context, spec-context, issue-context and learning-context. Invoke at the start of each phase (validator, planner, implementer). Requires MODULE, ROLE and LAYER in context.
user-invocable: false
tools: Bash
---

# Dev Context Load

Single source of the context-loading block that was duplicated across the 6 execution
commands. Written **from** those blocks: each flag below exists because a real command
uses it, with the decision that justifies it.

## Parameters

| Variable | Required | Values |
|---|---|---|
| `MODULE` | yes | target module |
| `ROLE` | yes | `validator`, `planner` or `implementer` — goes into `--tags` |
| `LAYER` | yes | `be` or `fe` |
| `CACHE_PATH` | BE only | `tmp/pipeline-cycle/<MODULE>/handoff.json` (D-552) |
| `TARGET_FILES` | implementer only | the priority's target files, for the artifact axis |
| `QUERY` | optional | topic, to focus spec-context/issue-context |

## 1 — Module state (validator and planner only)

```bash
python scripts/pipeline-context.py module-state --module <MODULE>
```

Add `--layer fe` when `LAYER` is `fe`.

Extracts `last_validate.details` (score, checklist, gaps, gates, next_action) and
`recent_events`. **Do not read the README to derive state.** The implementer does **not**
run this step: by protocol it reads no external context, only the plan.

## 2 — Framework decisions (D-419)

```bash
python scripts/pipeline-context.py decision-context --tags <LAYER-long>,<ROLE>,pipeline
```

`<LAYER-long>` is `backend` or `frontend`. In BE, add the cache on both sides:

```bash
  --cache-read <CACHE_PATH> --cache-write <CACHE_PATH>
```

**Always both flags** — this is what reduces "17 spec-context calls per cycle" to 1-2
(D-552). A cache failure is best-effort: it falls back to the normal query and never blocks.

## 3 — Module specs via RAG (D-434)

```bash
python scripts/pipeline-context.py spec-context --module <MODULE> --pack --semantic --layer <LAYER>
```

In BE, the same two cache flags. Use `--query "<QUERY>"` to focus. Prefer this over
re-reading the raw `.md` files. The output is a compact JSON envelope with `records` (ADR-007): each one
carries `id`, `kind`, `src` (`path:line` of the source) and the literal `text`. Cite `id` + `src`;
never the line number from your own context. Rationale (context, alternatives) is left
out by default -- `--include rationale` when you need it.

## 4 — Related issues (D-460, optional)

```bash
python scripts/pipeline-context.py issue-context --module <MODULE> --query "<QUERY>" --semantic
```

Outside the scope of the cache. Omit in general validations.

## 5 — Known pitfalls (D-611 / D-498 / D-497) — mandatory

```bash
python scripts/pipeline-context.py learning-context --module <MODULE> --layer <LAYER>
```

In the implementer, **always** add the target files:

```bash
  --target-files <target1> [--target-files <target2> ...]
```

The script derives the artifact category from each path and surfaces the pitfalls of that
category **from any module** — which are precisely the ones that recur. Apply the
`recommended_generator_fix` proactively, instead of re-solving the same defect.

---

All steps are best-effort: `available:false` (ES down) → record
"degraded" and proceed. **Nothing here is a source of scope**: *what* to implement comes from the
plan; these queries only constrain *how*.
