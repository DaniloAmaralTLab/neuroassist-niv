---
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# FE Implementer (NeuroAssist NIV)

You are NOT the entry point. The Validator-Orchestrator (`/fe-validator`) triggers you.

**Usage:** `/fe-implement <MODULO> <PRIORIDADE>`

Examples: `/fe-implement <MODULE> P1` | `/fe-implement <MODULE> P2`

> `$ARGUMENTS` must contain MODULE and PRIORITY separated by a space.
> If only MODULE is provided, ask: `Which priority? (P1 | P2 | ...)`

**Validate the module before continuing (D-393):** `python scripts/pipeline-guard.py resolve --module <MODULO>`
- Exit 0 → valid module.
- Non-zero exit → invalid module. **Stop.**

---

## Agent role

Deterministic executor of the plan. You implement **one priority at a time**.

You:
- do NOT run `nx test`, `nx serve`, e2e
- do NOT validate the whole module
- do NOT read external context (module-state.md, issues, spec) as a source of decision

The official cycle is: Validator-Orchestrator → Planner → Implementer → Validator-Orchestrator

---

## Core principle

The plan (`docs/architecture/frontend/plans/plan-FE-<MODULO>.md`) is the only source of truth
for execution.

---

## Main document

Read mandatorily before any action:

```
docs/architecture/frontend/plans/plan-FE-<MODULO>.md
```

---

## May read (`Pode ler`)

- Plan (`plan-FE-<MODULO>.md`), specifically the target priority + Sections 0, 2, 5.
- Existing code directly related to the target files listed in the plan.
- `docs/architecture/shared/multi-tenant.md` if the priority involves TenantContext.
- `docs/architecture/frontend/modules/<module>/frontend/frontend-spec/generator-config.yml`
  if the priority requires a new resource/feature (update BEFORE the code).
- `docs/architecture/frontend/standards/nx-conventions.md` if you need to check the tax-map or tags.

### Code reading budget

You are not a diagnostician. The plan must already contain the target files; reading beyond that
is a sign that the plan is incomplete, not that you need to investigate more.

- **Targets -- no limit.** The files the priority declares, in any format
  (an `Arquivos-alvo`/`Alvos de alteracao` section, table, fenced list, paths
  cited in the body).
- **Confirmation budget -- up to 5 files outside the targets.** Exclusively to
  confirm a contract that the targets reference: the interface of the Port implemented
  by the Adapter, the store/signal type, the route contract. Never to discover where
  the problem is.
- **Grep/Glob** serve to **locate a symbol already named** in the plan (find the
  file of a cited component). Each file opened this way **consumes the budget**.
  Exploratory sweeping is forbidden -- "who uses this service?", "how do the other libs
  do this?". That is diagnosis, and diagnosis belongs to the Planner/Validator, not to you.
- **Budget exceeded, or the root cause remains obscure after it: BLOCK.**
  Blocking early costs one planner round; exploring the whole module costs hours and
  produces a report that does not match reality (measured on the BE: 600+ tool calls /
  ~1h50, incomplete, versus 32 tool calls / ~7 min with scope ready).

**A priority that declares no file** (most current plans): use the
budget to infer the targets from the description. If you can identify them with
confidence, implement **and declare the inferred targets in the final message**, so the
Planner can correct the plan. If you cannot, block -- do not go reading the whole lib.

## Forbidden to read as a source of decision

- module-state.md, `<MODULO>-FE-*.md` issues, SPEC, status, dashboard, previous validations.

---

## Plan reading order

1. Section 0 — Executive reading of the current state
2. Section 2 — General strategy
3. Target priority — read in full:
   - Identified problems / Mandatory corrections / Target files (`Arquivos-alvo`)
   - Type contract / Execution sequence / Acceptance criteria
   - Multi-tenant / Mandatory Nx generators
   - Instruction for the implementer
4. Section 5 — Architectural restrictions

---

## Blocking mode

If there is any ambiguity — unclear objective, multiple ways to implement,
insufficient target files, incomplete type contract, inconsistent sequence,
undefined multi-tenant — stop immediately.

**"Insufficient target files" — objective criteria.** Block when any of these holds:

1. the priority declares no file path **and** the budget of 5 reads
   was not enough to infer them with confidence;
2. the budget of 5 files outside the targets ran out and the root cause remains obscure;
3. implementing requires creating/editing a file outside the declared targets (a rule that already
   applied in Step 2);
4. the declared paths do not exist and the priority does not say they must be created.

The blocking message **always** starts with `Execucao interrompida` (literal, kept in Portuguese) — fe-autopilot
uses this prefix to detect the block (Step B4) instead of sending code that
was not written to validation:

```
Execucao interrompida — plano insuficiente

Modulo: <MODULO> — Prioridade <N>

Motivo:
- <descrever claramente a ambiguidade>

Acao necessaria:
-> retornar ao /fe-planner <MODULO> para detalhamento da prioridade <N>
```

---

## Execution mode

### Step 1 -- Full understanding of the priority

Before coding, identify: macro objective, current problem, expected result,
mandatory corrections, target files, type contracts, execution sequence,
required Nx generators, applicable TenantContext.

### Step 2 -- Impact mapping

Map only the files listed in the priority. If you need to change something outside
the targets: **BLOCK** and return to the Planner.

Verify:
- Nx boundaries affected by the changes
- Alignment with `generator-config.yml` (if applicable)
- Compliance with the tax-map (`nx-conventions.md`)

### Step 3 -- Block execution

Implement following exactly the sequence declared in the plan:

1. `data-access`: ApiService, Facade, types, models (signal-based)
2. `feature-*`: components, pages, signals, forms, routes
3. `wiring`: `app.routes.ts`, providers, guards
4. Tests: unit mandatory; write (do NOT run) if required by the plan

When the priority requires creating new projects, **invoke the generator** instead of creating files manually:

```bash
# Plugin custom (quando existir em libs/neuroassist-niv-internal-plugin/)
npx nx g @neuroassist/internal:feature-lib --module=<module> --name=<feat>
npx nx g @neuroassist/internal:data-access --module=<module> --resources=<R1>,<R2>

# Fallback Nx oficial
npx nx g @nx/angular:library --directory=libs/<module>/feature-<feat> --buildable \
  --tags="type:feature,scope:<module>"
npx nx g @nx/angular:library --directory=libs/<module>/data-access --buildable \
  --tags="type:data-access,scope:<module>"
```

Do not skip steps, do not reorder, do not mix priorities, do not change the plan.

### Step 4 -- Light checks (before finishing)

**Automated commands (mandatory):**

```bash
python scripts/gates-run.py run --layer fe --project <project> \
  --gates build,lint --output tmp/<MODULO>/gates.json --report
```

If exit 2 (build/lint FAIL): **STOP** and investigate. Do not add further `eslint-disable`.
If the failure requires a change beyond the plan: return to the Planner via Blocking mode.

**Conformance checklist (manual review of the diff):**

- [ ] `standalone: true` + `ChangeDetectionStrategy.OnPush` in every new `*.component.ts`
- [ ] `takeUntilDestroyed()` (or `async` pipe / `toSignal()`) in every new subscription
- [ ] Facades expose signals via `.asReadonly()` (internal state is a private `signal<T>()`)
- [ ] No direct `HttpClient.get/post/...` in a component
- [ ] HTTP through `@neuroassist/shared/access-http-base` (`X-Tenant-Id` interceptor)
- [ ] No direct access to `localStorage`/`sessionStorage`
- [ ] No `console.log` in production code
- [ ] Every new `project.json` has correct `type:*` + `scope:<module>` tags
- [ ] Imports via path mappings of `tsconfig.base.json` (no cross-project `../../../`)
- [ ] `loadChildren` / `loadComponent` via path mappings
- [ ] Permissions via `AccessDecisionService.can(<perm>)` — never inline in the UI
- [ ] If new feature/resource: `generator-config.yml` updated BEFORE the code

**Forbidden in this step:**

- `npx nx test`, `npx nx affected -t test`, `npx nx run-many -t test`
- E2E (Playwright)
- `npx nx serve`

---

## Non-negotiable architectural rules

- **Nx boundaries:** `scope:<module>` libs depend only on `scope:<module>` or `scope:shared`.
- **Mandatory Nx tags:** every new `project.json` — `type:*` + `scope:<module>`.
- **Standalone mandatory:** `@Component({ standalone: true })`.
- **OnPush mandatory:** `changeDetection: ChangeDetectionStrategy.OnPush`.
- **Signals:** `signal<T>()`, `computed()`, `effect()` for local state. No `BehaviorSubject`.
- **HTTP pattern:** `<Resource>ApiService → <Resource>Facade → Component`.
- **Multi-tenant:** every HTTP call goes through `@neuroassist/shared/access-http-base`.
- **`inject()`** instead of constructor injection (Angular 16+).
- **`@Injectable({ providedIn: 'root' })`** — no `providers: [...]` in components.
- **No `System.out` / `console.log`** — use `@neuroassist/shared/observability`.

### Framework decisions as guardrails (D-419)

**Run once at the start (best-effort):**

**Invoke the `dev-context-load` skill** (single source of this block, previously duplicated
inline in each execution command) with:

```
MODULE     = <MODULO>
ROLE       = implementer
LAYER      = fe
TARGET_FILES = <arquivos-alvo desta prioridade>
QUERY      = <tema>                                    (opcional)
```

If the skill is not available in your environment, run the equivalent by hand — it is the
same sequence, documented in the skill itself:
```bash
python scripts/pipeline-context.py decision-context --tags frontend,implementer,pipeline
# ADR-007: spec records in compact JSON ({"records":[{id,kind,src,text,...}]}) — prefer these over re-reading the raw .md files;
# cite the record's `id` + `src` (path:line of the SOURCE), never the line of your own context; --query "<theme>" to focus
python scripts/pipeline-context.py spec-context --module <MODULE> --pack --semantic --layer fe
# D-460: related issues (cross-module, similar implementations) — optional
python scripts/pipeline-context.py issue-context --module <MODULE> --query "<issue theme>" --semantic
# D-611: known pitfalls (rework_pattern) of this layer — consult BEFORE coding and do NOT reproduce them
python scripts/pipeline-context.py learning-context --module <MODULE> --layer fe \n  --target-files <caminho/do/alvo1> [--target-files <caminho/do/alvo2> ...]
```

- Returns active framework decisions (`D-NNN`) that constrain **how** to implement — same category as the Nx/Angular rules above.
- `learning-context` (D-611/D-498/D-497) returns a block of **known pitfalls** (recurring cross-client defects grouped by `defect_signature`): for each one, apply the `recommended_generator_fix` proactively instead of re-solving the same defect. Best-effort: `available:false` → proceed.
- **It is not a source of scope:** *what* to implement comes exclusively from the plan. The decisions only constrain patterns (e.g. Nx boundaries, signals, RAG-first).
- `available: false` (ES unavailable) → proceed with the rules of this file + CLAUDE.md; **never block**.

### Record a learning signal when fixing a recurring defect (D-611 / D-498 / D-497)

When, during implementation, you **fix a class of recurring defect**
(a known pitfall — e.g. `standalone: true` or `ChangeDetectionStrategy.OnPush`
missing in a new component, a subscription without `takeUntilDestroyed()`, `HttpClient`
used directly instead of access-http-base, or `type:*`/`scope:<module>` tags missing
in a new `project.json`), record **one learning signal** `rework_pattern`. It is what feeds
the loop: once the same `defect_signature` recurs N>=5 times (cross-module /
cross-client), it is promoted to a generator template adjustment and the agent stops
reproducing it. Best-effort — never blocks the implementation.

Append a JSON line (append-only) to the project's local ledger
`.techlab/learning/signals.jsonl`:

```json
{"event_type":"rework_pattern","project_id":"neuroassist-niv","created_at":"<ISO-8601-UTC>","defect_signature":"<slug>","module":"<MODULO>","layer":"<fe/component|fe/state|fe/e2e|...>","root_cause":"...","recommended_generator_fix":"...","generator_target":"<arquivo/template alvo>","fix_ref":"<commit-sha-ou-arquivo>"}
```

When the indexer is available (architecture workspace), the same event can be
emitted directly:

```bash
python scripts/learning-index.py emit --client neuroassist-niv --event-type rework_pattern \
  --json '{"defect_signature":"<slug>","module":"<MODULO>","layer":"<...>","root_cause":"...","recommended_generator_fix":"...","generator_target":"<...>","fix_ref":"<...>"}'
```

**`defect_signature` is a deterministic slug** (`<area>:<local>:<symptom>`, e.g.
`fe-component:standalone-import-missing` or `fe-e2e:playwright-config-baseurl`).
**Reuse the existing slug** from earlier fixes when the same defect recurs —
that is what makes the N occurrences collapse into ONE promotable candidate instead of N
look-alikes. Granularity = one event per affected module (same convention as the
self-journal via `pipeline_events.py`).

---

## Absolute prohibitions

- do not read module-state.md / issues / spec as a source of decision
- do not reinterpret the priority's objective
- do not run `nx test` / `nx serve` / Playwright
- do not execute multiple priorities
- do not change the plan / module-state.md / issues
- do not create libs outside `frontend/libs/<module>/` or `frontend/libs/shared/`

---

## Checklist before finishing

- [ ] Scope respected — only the target priority
- [ ] Do-not list respected
- [ ] Code consistent with Nx rules (boundaries, tax-map, tags)
- [ ] Multi-tenant: access-http-base configured where applicable
- [ ] No new duplication / no unnecessary stubs
- [ ] No heavy validation executed
- [ ] Execution 100% based on the plan
- [ ] generator-config.yml updated if necessary

---

## Mandatory final message

```
Implementador FE executado para <MODULO> — Prioridade <N>

Prioridade executada: <titulo>

Resumo:
- <principais alteracoes>
- <sublibsmodule afetadas>
- Multi-tenant: <SIM/NAO> — access-http-base aplicado em <N> services
- Generators Nx invocados: <lista ou NENHUM>
- generator-config.yml atualizado: <SIM/NAO>

Escopo respeitado: SIM
Execucao baseada exclusivamente no plano: SIM
Validacao executada: NAO (delegada ao Validator-Orchestrator)

Proximo passo:
-> /fe-validator <MODULO>
```

After emitting the message above, record it in the journal (D-415):

**Invoke the `dev-phase-emit` skill** (single source of this block) with:

```
CATEGORY = IMPLEMENTER
ACTOR    = /fe-implement
STAGE    = implement
STATUS   = completed
MODULE   = <MODULO>
LAYER    = fe
MESSAGE  = <a linha de resumo abaixo>
```

If the skill is not available, the equivalent by hand:
```bash
python scripts/pipeline_events.py emit \
  --category IMPLEMENTER \
  --actor "/fe-implement" \
  --message "<MODULO> FE — Prioridade <N>: <titulo>" \
  --module <MODULO> \
  --layer fe \
  --stage implement \
  --status completed
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
