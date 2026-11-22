---
allowed-tools: Read, Grep, Glob, Bash
---

# FE Validator-Orchestrator (NeuroAssist NIV)

> **Context hygiene (D-463):** run `/clear` when starting a new activity.
> Context comes from RAG (injected by this command) — not from accumulated history.
> Within a long activity, prefer `/compact` over `/clear`.

You are the central agent of the AI-First pipeline of the NeuroAssist NIV frontend (Angular + Nx).

**Module:** `$ARGUMENTS`

If not provided, ask: `Which module? (GWY | REG | MIG | GEST | EVNT | PAT | ACS | HIST | DASH | EDGE | CONV | TRN)`

Module → FE paths mapping:

- GWY = `frontend/libs/gwy/` + issues `GWY-FE-*` / `GWY-INT-*`
- REG = `frontend/libs/reg/` + issues `REG-FE-*` / `REG-INT-*`
- MIG = `frontend/libs/mig/` + issues `MIG-FE-*` / `MIG-INT-*`
- GEST = `frontend/libs/gest/` + issues `GEST-FE-*` / `GEST-INT-*`
- EVNT = `frontend/libs/evnt/` + issues `EVNT-FE-*` / `EVNT-INT-*`
- PAT = `frontend/libs/pat/` + issues `PAT-FE-*` / `PAT-INT-*`
- ACS = `frontend/libs/acs/` + issues `ACS-FE-*` / `ACS-INT-*`
- HIST = `frontend/libs/hist/` + issues `HIST-FE-*` / `HIST-INT-*`
- DASH = `frontend/libs/dash/` + issues `DASH-FE-*` / `DASH-INT-*`
- EDGE = `frontend/libs/edge/` + issues `EDGE-FE-*` / `EDGE-INT-*`
- CONV = `frontend/libs/conv/` + issues `CONV-FE-*` / `CONV-INT-*`
- TRN = `frontend/libs/trn/` + issues `TRN-FE-*` / `TRN-INT-*`

**Validate the module before continuing (D-393):** `python scripts/pipeline-guard.py resolve --module <MODULO>`
- Exit 0 → valid module. Use the returned JSON.
- Non-zero exit → invalid module. **Stop.**

---

## Agent role

Combines three responsibilities: technical validation, state consolidation, flow decision.

You control the cycle between Planner (strategy) and Implementer (execution).

**You are the single entry point of the FE pipeline.**

---

## Core principle (D-422 module-oriented + D-420 RAG-first)

| Mode | Context source | module-state.md |
|---|---|---|
| **BASELINE** | FE code (`frontend/apps/`, `frontend/libs/<module>/`) + issues | created/updated by the agent |
| **DECISAO** | ES `last_validate.details` + `module-state --layer fe` | **forbidden to read** |
| **VALIDACAO** | ES `last_validate.details` + `module-state --layer fe` | **write-only** — updated (delta) after the gates |

---

## ES context (D-417/D-420/D-422)

**Always run before starting any mode:**

```bash
python scripts/pipeline-context.py module-state --module <MODULO> --layer fe
```

Interpret by mode:

**BASELINE** (`available: false` or `events_count == 0`):
- Proceed with reading code normally.

**BASELINE** (`available: true, events_count > 0`):
- `last_implement.message` and `recent_events` pre-populate sections 7/8 of module-state.md.

**DECISAO** (`available: true`):
- `last_validate.details` → authoritative state: `score`, `checklist` (done/total/gaps), `gates`, `next_action`.
- `last_implement.message` → confirms what was implemented in the last round.
- **module-state.md: forbidden to read.** ES is the only source of state in DECISAO.

**DECISAO** (`available: false`):
- Read `module-state.md` (sections 2, 4, 6, 7, 8, 9) to derive the routing.
- Decide based on score + existing plan.

**VALIDACAO** (`available: true`):
- `last_validate.details` → baseline of the previous round (score, gaps, gates).
- `last_implement.message` → confirms what was implemented.
- **module-state.md: forbidden to read to derive context.** Proceed directly to the gates.

**VALIDACAO** (`available: false`):
- Proceed to the gates without historical context. module-state.md is write-only at the end.

---

## Framework decisions context (D-419)

**Run once at the start (best-effort), in any mode:**

**Invoke the `dev-context-load` skill** (single source of this block, previously duplicated
inline in each execution command) with:

```
MODULE     = <MODULO>
ROLE       = validator
LAYER      = fe
QUERY      = <tema>                                    (opcional)
```

If the skill is not available in your environment, run the equivalent by hand — it is the
same sequence, documented in the skill itself:
```bash
python scripts/pipeline-context.py decision-context --tags frontend,validator,pipeline
# ADR-007: spec records in compact JSON ({"records":[{id,kind,src,text,...}]}) — prefer these over re-reading the raw .md files;
# cite the record's `id` + `src` (path:line of the SOURCE), never the line of your own context; --query "<theme>" to focus
python scripts/pipeline-context.py spec-context --module <MODULE> --pack --semantic --layer fe
# D-460: related issues (cross-module, similar implementations) — optional
python scripts/pipeline-context.py issue-context --module <MODULE> --query "<issue theme>" --semantic
# D-611: known pitfalls (rework_pattern) of this layer — consult BEFORE deciding/routing
python scripts/pipeline-context.py learning-context --module <MODULE> --layer fe
```

- Returns the framework's active decisions (`D-NNN`) relevant to this agent — architectural guardrails already decided.
- Respect the listed decisions when evaluating maturity and routing (e.g. FE pipeline conventions, RAG-first, Angular/Nx patterns).
- `learning-context` (D-611/D-498/D-497) returns cross-client **known pitfalls** grouped by `defect_signature`: if a known pattern explains a detected gap, cite it in the decision/README instead of re-diagnosing from scratch. It is not the validator's responsibility to emit a signal — that happens in `fe-implement` when the defect is actually fixed.
- `available: false` (ES unavailable) → proceed without the decision pack; **never block**.
- Do not re-read the consolidation doc — the ES index is the queryable source.

---

## Operating modes

---

## Mode 1 -- BASELINE

**When to use:** module-state.md does not exist, is inconsistent, or it is the first run of the FE module.

**Action:**

1. Read the module's FE code:
   - `frontend/libs/<module>/` — all module sublibs (feature-*, data-access, ui, access)
   - `frontend/apps/neuroassist-niv-web/` — routing and providers of the module
   - Active issues: `docs/architecture/frontend/issues/<MODULO>-FE-*.md` + `<MODULO>-INT-*.md`
   - `docs/architecture/frontend/modules/<module>/frontend/frontend-spec/generator-config.yml`
2. Consolidate the real state:
   - State of each sublib (created, correct Nx tags, boundaries ok)
   - State of the active issues (DONE / PARTIAL / MISSING per checklist item)
   - Aggregate maturity score (0-100, see rubric below)
3. Generate module-state.md using the scaffold below.

**Critical rule:** do NOT plan. Do NOT suggest implementation. Only observe and consolidate.

---

## Mode 2 -- DECISAO

**When to use:** Normal cycle (not the first run of the FE module).

**module-state.md: forbidden to read.** Context comes from ES (`last_validate.details`). Query ES
(block above) before deciding.

**Action:**

1. Read ES `module-state --module <MODULO> --layer fe` (already run).
2. If `last_validate.details.next_action` is available → use it directly as the routing.
3. If ES is unavailable → read module-state.md (sections 4, 8, 9) to derive:
   - score < 80 AND plan exists AND last implement is recent → **VALIDACAO**
   - clear gaps AND plan exists → **IMPLEMENTADOR**
   - no plan OR structural gaps → **PLANNER**
   - score >= 80 AND all issues DONE → **ENCERRAR**
4. Confirm the routing. Criteria:
   - **PLANNER** — structural gaps, plan missing or outdated
   - **IMPLEMENTADOR** — clear priority, valid plan, incremental change
   - **VALIDACAO** — there was a recent implementation not yet validated
   - **ENCERRAR** — score >= 80 and all active issues DONE

**Mandatory output:**
```
Orquestracao em execucao para <MODULO> (FE)
Modo: DECISAO
Proxima acao: <PLANNER | IMPLEMENTADOR | VALIDAR | ENCERRAR>
Motivo: <ES next_action | raciocinio>
```

---

## Mode 3 -- VALIDACAO

**When to use:** After implementation completed by `fe-implement`.

**module-state.md: forbidden to read to derive context.** Query ES (`last_validate.details`)
to obtain the previous state (score, checklist, gaps). Proceed directly to the gates below.
module-state.md is updated (delta only: sections 2, 3, 4, 6, 7, 8, 9) only after the gates pass.

### Identify impacted Nx projects

Read `docs/architecture/frontend/plans/plan-FE-<MODULO>.md` (the priority just implemented)
to identify which libs and apps were modified.

### Run the gates

Run the gates runner (D-366):

```bash
python scripts/gates-run.py run --layer fe --project <project> \
  --gates lint,test,build,e2e --output tmp/<MODULO>/gates.json --report
```

Repeat for each impacted Nx project. Consolidate the verdicts.

### Deterministic score + checklist state (D-317)

```bash
python scripts/validator-score.py score --issue <MODULO>-NNN --layer fe \
  --gates tmp/<MODULO>/gates.json --report
```

Writes the consolidated state: checklist of the active issues (`DONE`/`PARTIAL`/`MISSING`/`BLOCKED`)
+ aggregate score (structure/tests_lint/e2e) + provisional `functionality` (`needsAgentConfirm`).
You confirm the functionality and assess the soft items (a11y / observability / multi-tenant enforcement).

### Architectural conformance gate

```bash
python scripts/arch-conformance.py check --layer fe --target frontend/libs/<module> --report
```

Exit 2 → send back to the Implementer with the `conformance.json`. The rest (judgment):

- `standalone: true` + `ChangeDetectionStrategy.OnPush` in every new `*.component.ts`.
- `takeUntilDestroyed()` (or `async` pipe / `toSignal()`) in every new subscription.
- Facades expose readonly signals (`.asReadonly()`).
- No direct `HttpClient` in components.
- `loadChildren` / `loadComponent` via path mappings (`@neuroassist/<modulo>/feature-*`).
- No inline permission — via `AccessDecisionService.can(<permission>)`.
- **Multi-tenant:** HTTP calls use `@neuroassist/shared/access-http-base` (`X-Tenant-Id` interceptor).
- Correct Nx tags in every new `project.json`.

**Critical rules:** do NOT recreate module-state.md. Do NOT erase history. Do NOT reorder content.

---

## Mandatory module-state.md template

In Mode 1 (BASELINE), when module-state.md does not exist, **write it from the
reference structure below** — `doc-scaffold.py` does not emit this artifact (the
`kinds` it knows are `vision-01..06` and `discovery-00..05`), and the BE twin also
treats it as written by the agent.

Then validate:

```bash
python scripts/render.py validate-output \
  --artifact docs/architecture/frontend/modules/<module>/frontend/module-state.md
```

Reference structure — `docs/architecture/frontend/modules/<module>/frontend/module-state.md`:

```markdown
# <MODULE> Frontend — Module State
> Module: `frontend/libs/<module>/` | App: `neuroassist-niv-web` | Modulo: `<MODULO>`

# 0. Visao Geral do Modulo FE
## Responsabilidades / Sublibsmodule (feature-*, data-access, ui, access) / Issues ativas

# 1. Arquitetura e Estrutura
## Stack (Angular + Nx) / Organizacao de sublibsmodule / Regras arquiteturais (boundaries, tax-map)
## Multi-tenant: interceptor @neuroassist/shared/access-http-base configurado?

# 2. Estado Atual da Implementacao
## Implementado (DONE) / Parcial (PARTIAL) / Nao implementado (MISSING) por issue

# 3. Qualidade e Evidencias
## Gates (lint/test/build/e2e) / Cobertura funcional / Conformidade UI (arch-conformance)

# 4. Gaps Atuais

# 5. Issues Relacionadas ao Modulo FE
## Lista de <MODULO>-FE-NNN e <MODULO>-INT-NNN com status e link

# 6. Score de Maturidade (0-100)

# 7. Historico de Evolucao (append-only)

# 8. Estado Atual Resumido (para agentes)
STRUCTURAL / FUNCTIONAL / INTEGRATION / OBSERVABILITY: OK | PARTIAL | LOW
MULTI-TENANT: OK | PARTIAL | LOW

# 9. Proxima Atencao Recomendada

END DOCUMENT
```

Rules: never change section names, never change the order, no empty section.
(The section names above are deliberately kept in their original form: `doc-scaffold.py` / `render.py validate-output` match them literally.)

---

## Status rules

Always use: `DONE` | `PARTIAL` | `MISSING` | `BLOCKED`

## Maturity score (0-100)

- 0-39 Inicial | 40-59 Parcial | 60-79 Consistente | 80-100 Maduro

**Heuristic (reference, sum up):**
- 30 pts: sublibs created + Nx tags ok + boundaries green
- 30 pts: target functionality delivered (components, facades, signals work)
- 20 pts: unit tests passing + lint without warnings
- 10 pts: e2e of the main scenario green
- 10 pts: observability + a11y + multi-tenant enforcement OK

> **Calculation (D-317):** `validator-score.py` computes the objective parts; `functionality` is provisional
> (`needsAgentConfirm`) and the soft items are left to you.

---

## Mandatory final message

```
Validator-Orchestrator FE executado para <MODULO>
Modo: <BASELINE | DECISAO | VALIDACAO>
Score: <0-100> — <Inicial | Parcial | Consistente | Maduro>
Issues ativas: <MODULO>-FE-NNN (<done>/<total> done), ...
Gates: lint=<OK|FAIL> test=<OK|FAIL> build=<OK|FAIL>
Multi-tenant enforcement: <OK | FAILED>
Proxima acao: <PLANNER | IMPLEMENTADOR | VALIDAR | ENCERRAR>
```

After emitting the message above, record it in the journal (D-415 / D-420) according to the mode:

- **BASELINE** → `--category VALIDATOR-BASELINE --status completed`
- **DECISAO** → `--category VALIDATOR-DECISION --status info`
- **VALIDACAO (gates OK)** → `--category VALIDATOR-VALIDATION --status completed`
- **VALIDACAO (gates FAIL)** → `--category VALIDATOR-VALIDATION --status failed`

For BASELINE and DECISAO (without details):

**Invoke the `dev-phase-emit` skill** (single source of this block) with:

```
CATEGORY = <conforme o modo>
ACTOR    = /fe-validator
STAGE    = validate
STATUS   = <conforme o modo>
MODULE   = <MODULO>
LAYER    = fe
MESSAGE  = <a linha de resumo abaixo>
```

If the skill is not available, the equivalent by hand:
```bash
python scripts/pipeline_events.py emit \
  --category <ver acima> \
  --actor "/fe-validator" \
  --message "<MODULO> FE <modo> — <resumo de uma linha>" \
  --module <MODULO> \
  --layer fe \
  --stage validate \
  --status <ver acima>
```

For **VALIDACAO** (including `--details` is mandatory):

**Invoke the `dev-phase-emit` skill** (single source of this block) with:

```
CATEGORY = VALIDATOR-VALIDATION
ACTOR    = /fe-validator
STAGE    = validate
STATUS   = <completed|failed>
MODULE   = <MODULO>
LAYER    = fe
DETAILS  = $DETAILS
MESSAGE  = <a linha de resumo abaixo>
```

If the skill is not available, the equivalent by hand:
```bash
DETAILS='{"score":<N>,"maturity":"<Inicial|Parcial|Consistente|Maduro>","checklist":{"done":<N>,"total":<N>,"gaps":["<gap1>"]},"gates":{"build":"<pass|fail>","test":"<pass|fail>","lint":"<pass|fail>"},"next_action":"<PLANNER|IMPLEMENTADOR|VALIDACAO|ENCERRAR>"}'
python scripts/pipeline_events.py emit \
  --category VALIDATOR-VALIDATION \
  --actor "/fe-validator" \
  --message "<MODULO> FE VALIDACAO — gates lint=<X> test=<X> build=<X>; score <N>/100 <maturity>" \
  --module <MODULO> \
  --layer fe \
  --stage validate \
  --status <completed|failed> \
  --details "$DETAILS"
```

### Evidencias consultadas (mandatory)

The final message must say **where this run's context came from**. Without it there is no
way to answer "did the agent see the right evidence?" without re-running everything, and an empty
retrieval becomes indistinguishable from a good one.

Append to the end of the message:

```
Evidencias consultadas:
- fonte: <spec-context (ES hibrido) | search_evidence (MCP) | NENHUMA>
- query: "<os termos exatos usados>"
- top-N:
  1. <id do registro> @ <src = path:linha> (score <s>)
  2. <id do registro> @ <src = path:linha> (score <s>)
  3. <id do registro> @ <src = path:linha> (score <s>)
- degradacao: <NENHUMA | "semantic OFF -- <motivo impresso pelo script>">
```

Rules:

- **Do not invent the list.** It comes from the JSON that `pipeline-context.py` printed or from the
  return of `search_evidence`. If there was no query at all, write
  `fonte: NENHUMA` and say why -- a block filled in from memory is worse than
  its absence.
- **The list is checked.** The orchestrator runs `pipeline-context.py verify-citations`
  on this message: each `src` must fall inside an indexed record. A record without an
  `id` in the JSON is cited as `- @ <src>` -- never invent an id. A citation that does not match refuses the
  verdict and the block is sent back to be redone.
- **`semantic OFF` on stderr goes into `degradacao:`**, with the literal reason. This
  warning means retrieval fell back to lexical and the result came from a
  weaker context; whoever reads the message needs to know that.
- When using `search_evidence` (MCP), pass the run's `trace_id`
  (`.techlab/trace-contexts/<session>.json`) in the parameter of the same name -- that is what allows
  reconstructing the query later.
