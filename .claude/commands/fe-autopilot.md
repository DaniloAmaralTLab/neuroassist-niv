---
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# FE Autopilot -- Meta-Orchestrator (NeuroAssist NIV)

> **Context hygiene (D-463):** run `/clear` when starting a new activity.
> Context comes from RAG (injected by this command) — not from accumulated history.
> Within a long activity, prefer `/compact` over `/clear`.
>
> **Never attack issues/tickets directly via `Bash` in the main chat** (build,
> test, manual fix issue by issue) — even for "just a quick fix". This pattern
> (measured: D-622) accumulates all the verbatim output of each issue in the
> orchestrator's context and is resent via cache on every following turn, inflating consumption by
> orders of magnitude without any delegation to a subagent. **Always** go through
> `fe-implementer-agent`/`fe-validator-agent` (Steps B3-B5) — even for 1 standalone issue.
> **Restart the session** (not just `/resume` in the same chat) when switching modules, and
> when resuming after a long gap (> a few hours) of autopilot inactivity.

You are the central orchestrator of the AI-First pipeline of the NeuroAssist NIV frontend (Angular + Nx).

Detects the task type, runs the correct pipeline and saves checkpoints (crash
recovery + manual resume via `--resume`).

**Input:** `$ARGUMENTS`

Accepted formats (D-422 module-oriented):
- `<MODULO> <feature-slug>` (e.g. `<MODULE> cadastro-cliente`) → **Pipeline A** (Architect — new feature in an existing module)
- `<MODULO>` (e.g. `<MODULE>`) → **Pipeline B** (Implement — execution cycle of the module)
- `<MODULO> <feature-slug> --resume` → Resume Pipeline A from a saved checkpoint
- `<MODULO> --resume` → Resume Pipeline B from a saved checkpoint

Valid FE modules: GWY | REG | MIG | GEST | EVNT | PAT | ACS | HIST | DASH | EDGE | CONV | TRN

---

## Core principle

**A single call to resolve everything.** The autopilot delegates to the existing
sub-commands (it does not duplicate logic) and chains the steps automatically in a single
invocation. Checkpoints are saved to disk after each heavy step to allow
resuming if the session is interrupted -- but the autopilot **does NOT interrupt the user's
flow**: it proceeds to the next step immediately.

---

## Step 0 -- Mode detection

1. Extract `$ARGUMENTS`.
2. If it contains `--resume`: read the checkpoint at `tmp/fe-autopilot/<ID>/state.json` and skip
   to the saved step.
3. If the input has 2 tokens where the first is a valid MODULE (GWY/REG/MIG/GEST/EVNT/PAT/ACS/HIST/DASH/EDGE/CONV/TRN)
   and the second is kebab-case: **Pipeline A**. ID = `<MODULO>-<feature-slug>`.
4. If the input has only MODULE (no second token, or the second token is the `--resume` flag):
   **Pipeline B**. ID = `<MODULO>`.
5. If ambiguous: ask the user.
6. **Open the run's trace (F2 / D-423):**
   ```bash
   python scripts/pipeline_events.py trace-start --command /fe-autopilot --module <MODULO>
   ```
   Mint the `trace_id` once at the start. All events from the sub-agents
   (validator/planner/implement) and — in F4 — the calls to techlab-ai inherit this
   `trace_id` (read from `.techlab/trace-context.json`), correlating the cycle.
   On `--resume`, do NOT reopen: reuse the existing trace.

---

## Checkpoint -- how it works

After each heavy step, save state to `tmp/fe-autopilot/<ID>/state.json`:

```json
{
  "id": "<ID>",
  "pipeline": "architect | implement",
  "modulo": "<MODULO>",
  "feature": "<feature-slug>",
  "currentStep": "<nome da etapa concluida>",
  "nextStep": "<nome da proxima etapa>",
  "progressUnit": "1",
  "iteration": 1,
  "timestamp": "2026-05-19T14:30:00Z",
  "notes": "<contexto minimo para retomar>"
}
```

After saving, emit a short status line and proceed:

```
Checkpoint: <currentStep> -> <nextStep> (progressUnit=<N>, iter=<N>)
```

The autopilot ends the invocation only in 3 cases:
- **Safety cap** reached (5 iterations of the B2->B5 loop).
- **Unrecoverable error** or mandatory manual intervention (`nextStep: "blocked"`).
- **Finalization** of the pipeline.

In these cases, report the reason and instruct `/fe-autopilot <ID> --resume` if applicable.

---

## Pipeline A -- Architect (new feature in an existing module)

Input: `<MODULO> <feature-slug>` (e.g. `<MODULE> cadastro-cliente`).

Derived ID: `<MODULO>-<feature-slug>` (e.g. `<MODULE>-cadastro-cliente`).

### Step A0 -- Prototype seed (automatic — D-383)

The populated Angular prototype of Stage 0 (Tailwind v4 + CDK + theme.css oklch)
has already been vendored into `frontend/design-reference/` by `/new-project` (P5). There
is no separate "from prototype" step (command retired in D-382): the
seed screens are **adopted** during backlog/scaffold/implement — the issue's contract
points to the corresponding screen. Go straight to A1.

### Step A1 -- Discover

1. Verify prerequisites: module SPECs + generator-config.yml + issues-map.md +
   accepted ADRs + multi-tenant.md.
   - If missing: report and block (`nextStep: "blocked"`).
2. Check whether `docs/architecture/frontend/modules/<modulo>/frontend/frontend-spec/features/<feature-slug>/conformance-report.md`
   already exists.
   - If it exists and status == aderente: skip to A2.
3. Run the protocol of `.claude/commands/fe-feature-architect-discover.md`.
4. If status == ❌ Violador: block (`nextStep: "blocked"`).
5. Checkpoint (`currentStep: "discover"`, `nextStep: "spec-delta"`).
6. Proceed automatically to A2.

### Step A2 -- Spec Delta

1. Verify the conformance-report exists and status != ❌ Violador.
2. Check whether `spec-delta.md` already exists.
   - If it exists: skip to A3.
3. Run the protocol of `.claude/commands/fe-feature-architect-spec-delta.md`.
4. Checkpoint (`currentStep: "spec-delta"`, `nextStep: "backlog"`).
5. Proceed to A3.

### Step A3 -- Backlog

1. Verify `spec-delta.md` + `generator-config.yml` (updated) exist.
2. Check whether the feature's `<MODULO>-FE-NNN` issues already exist (read `issues-map.md`).
   - If they exist: skip to A4.
3. Run the protocol of `.claude/commands/fe-feature-architect-backlog.md`.
4. Checkpoint (`currentStep: "backlog"`, `nextStep: "scaffold"`).
5. Proceed to A4.

### Step A4 -- Scaffold

1. Verify prerequisites: issues + plan + generator-config.yml.
2. Run the protocol of `.claude/commands/fe-feature-architect-scaffold.md`.
3. Verify gates: `nx lint`, `nx test`, `nx build`.
4. Checkpoint (`currentStep: "scaffold"`, `nextStep: "done"`).
5. Go to Finalization.

### Pipeline A Finalization

```
Pipeline Architect concluido para <MODULO>/<feature-slug>
Etapas executadas: discover -> spec-delta -> backlog -> scaffold
Issues geradas: <lista <MODULO>-FE-NNN..NNN+K>

Para comecar o ciclo de execucao do modulo (D-422 module-oriented):
-> /fe-autopilot <MODULO>
```

---

## Pipeline B -- Implement (execution cycle of the FE module)

Input: `<MODULO>` (e.g. `<MODULE>`). D-422: module-oriented.

### Step B1 -- Baseline (Validator Mode 1)

1. **Skip check:** query ES `module-state --module <MODULO> --layer fe`.
   If `last_validate.details.score >= 80` and checklist DONE: go to Finalization.
2. Delegate to `fe-validator-agent` (D-421 — haiku tier):
   - Input: `<MODULO>`
   - The agent reads `.claude/commands/fe-validator.md` and runs Mode 1 (BASELINE).
   - Wait for the agent's final message.
3. If score >= 80 and all issues DONE: go to Finalization.
4. Checkpoint (`currentStep: "baseline"`, `nextStep: "decision"`, notes with score).
5. Proceed to B2.

### Step B2 -- Decision (Validator Mode 2)

1. Read ES `module-state --module <MODULO> --layer fe`:
   - `last_validate.details.next_action` → direct routing
   - If ES is unavailable: derive from score + existing plan
2. Route by `next_action`:
   - **PLANNER** → go to B3
   - **IMPLEMENTADOR** → go to B4
   - **VALIDACAO** → go to B5
   - **ENCERRAR** → Finalization
3. Do not save a checkpoint here (light step). Proceed immediately.

### Step B3 -- Planner

1. Delegate to `fe-planner-agent` (D-421 — sonnet tier):
   - Input: `<MODULO>`
   - The agent reads `.claude/commands/fe-planner.md` and runs the protocol.
   - Wait for the agent's final message.
2. Generated plan: `docs/architecture/frontend/plans/plan-FE-<MODULO>.md`.
3. Checkpoint (`currentStep: "planner"`, `nextStep: "implement"`, `priority: P1`).
4. Proceed to B4 (P1).

### Step B4 -- Implement

1. Delegate to `fe-implementer-agent` (D-421 — sonnet tier):
   - Input: `<MODULO> P<N>`
   - The agent reads `.claude/commands/fe-implement.md` and runs the protocol for the current priority.
   - Wait for the agent's final message.
2. **If the final message starts with `Execucao interrompida`** (Blocking mode of
   `fe-implement.md` — insufficient plan, reading budget exhausted): the agent
   **did not write code**. Do not send it to validation.
   ```bash
   python scripts/autopilot-state.py save --dir tmp/fe-autopilot/<MODULO> \
     --step implement --next planner --module <MODULO> --progress "P<N>" \
     --blocked-reason "<o bloco Motivo: + os alvos inferidos, em uma linha>"
   ```
   - **Exit 0:** go back to **B3 (Planner)** passing the block as input to the
     replanning — the "Alvos que o plano deveria listar" (targets the plan should list) inferred by the agent are
     exactly what the priority needs to gain.
   - **Exit 3** (`consecutiveBlocks >= 2` on the same priority): **stop the invocation**
     with `nextStep: "blocked"` and report to the user. Two consecutive blocks
     mean the replanning did not solve it; insisting becomes ping-pong.
3. Otherwise (normal execution): Checkpoint (`currentStep: "implement"`,
   `nextStep: "validate"`, `priority: P<N>`) — **without** `--blocked-reason`, which resets
   the block counter.
3. Checkpoint (`currentStep: "implement"`, `nextStep: "validate"`, `priority: P<N>`).
3. Proceed to B5.

### Step B5 -- Validation (Validator Mode 3)

1. Delegate to `fe-validator-agent` (D-421 — haiku tier):
   - Input: `<MODULO>`
   - The agent reads `.claude/commands/fe-validator.md` and runs Mode 3 (VALIDACAO).
   - Wait for the agent's final message.
2. If gates pass AND score >= 80 AND all issues DONE: check the agent's citations
   before going to Finalization:
   ```bash
   # mensagem final do fe-validator-agent, literal, em tmp/<MODULO>/fe-validator-report.md
   python scripts/pipeline-context.py verify-citations --report tmp/<MODULO>/fe-validator-report.md
   ```
   - **Exit 0:** Finalization.
   - **Exit 2 (invalid citation, missing block, or empty top-N with a declared source):**
     verdict refused -- send back to the **same `fe-validator-agent`** with the `invalid` list,
     requiring the "Evidencias consultadas" block to be redone from the real JSON
     (`spec-context --ids <id>`), and repeat this step. It does not count toward the safety cap.
   - **Exit 1 (not verified -- ES down or report missing):** Finalization, with
     `citacoes nao verificadas: <reason>` in the checkpoint notes.
3. If gates pass but priorities remain:
   - Increment iteration. If iteration > 5: safety cap.
   - Checkpoint (`currentStep: "validate-partial"`, `nextStep: "decision"`, `priority: P<N+1>`).
   - Go back to B2 (Decision) and proceed automatically.
4. If gates fail:
   - Checkpoint (`currentStep: "validate-failed"`, `nextStep: "decision"`, notes with the error).
   - Go back to B2 (Decision) with the error diagnosis and proceed automatically.

### Pipeline B Finalization

```
Autopilot FE concluido para <MODULO>
Score de maturidade: <0-100> -- <Inicial | Parcial | Consistente | Maduro>
Issues ativas: <lista <MODULO>-FE-NNN> todas DONE
Gates: lint OK | test OK | build OK
Multi-tenant enforcement: OK
Iteracoes: <N>
Modulo encerrado. Score >= 80.

Proximo modulo? Inicie uma sessao nova (D-622) -- nao continue neste chat.
```

After finalization, close the run's trace (F2 / D-423):

```bash
python scripts/pipeline_events.py trace-end
```

---

## Safety cap -- iteration limit

Maximum of **5 iterations** of the B2→B5 loop per invocation. If the limit is reached:

```
Safety cap atingido (5 iteracoes).
Score atual: <score>
Prioridade atual: P<N>
Ultimo gate: <resultado>

O modulo nao esta concluido. Para continuar:
-> /fe-autopilot <MODULO> --resume
   (o contador reinicia ao retomar)

Se a retomada for depois de um gap longo (horas), inicie sessao nova (D-622) em vez
de continuar neste chat -- o checkpoint em disco carrega o estado, nao o historico.
```

---

## General rules

- **Do not duplicate the logic of the sub-commands.** Read and follow the protocol of the referenced `.md`.
- **Chain steps automatically.** After saving a checkpoint, proceed immediately
  to the next step in the same invocation. Do not instruct the user to run `/clear`
  or `--resume` in the normal flow.
- **Always save a checkpoint after a heavy step.** It serves as crash recovery and as a
  manual `--resume` point.
- **Create the checkpoint directory** at the start: `tmp/fe-autopilot/<ID>/`.
- **If `--resume` and `state.json` does not exist**: treat as a fresh start.
- **Do not run steps already completed** -- use prerequisite checks (does the file exist?) to skip.
- **Multi-tenant enforcement** is part of Validator Mode 3 (B5) -- do not skip it.
- **Never implement/fix directly via `Bash` in the orchestrator's context** (D-622) --
  even a 1-line fix in response to a B5 failure goes to `fe-implementer-agent`
  (B3->B4), never to an ad-hoc edit in the autopilot chat. The orchestrator only reads
  diagnostics (score, gates); whoever edits code is always the isolated agent.
- **Switch session when switching module** (D-622, extension of D-463): on finishing
  Finalization or pausing at the safety cap with a long resume gap, explicitly recommend
  that the operator start a new session for the next `/fe-autopilot <MODULO>`
  instead of continuing in the same chat -- see the Finalization/Safety cap messages below.

---

## Impact on existing commands

**ZERO.** This command is purely additive:
- It does not modify the 8 individual FE commands.
- It delegates to them by reading the referenced `.md`.
- The individual commands keep working when called directly.

---

## Mandatory initial message (when starting)

```
FE Autopilot iniciado
Input: <$ARGUMENTS>
Pipeline: <A (Architect) | B (Implement)>
ID: <ID>
Modo: <fresh | resume>
Estado: <checkpoint lido ou "novo">
Iniciando etapa: <nome>
```
