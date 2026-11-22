---
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, Agent
---

# BE Autopilot -- Meta-Orchestrator (NeuroAssist NIV)

> **Context hygiene (D-463):** run `/clear` when starting a new activity.
> Context comes from RAG (injected by this command) — not from accumulated history.
> Inside a long activity, prefer `/compact` over `/clear`.
>
> **Never attack issues/tickets directly via `Bash` in the main chat** (build,
> test, manual issue-by-issue fix) — even for "just a quick fix". That pattern
> (measured: D-622) accumulates the verbatim output of every issue in the
> orchestrator's context and it is resent via cache on every following turn, inflating consumption by
> orders of magnitude without any delegation to a subagent. **Always** go through
> `implementer-agent`/`validator-agent` (Steps B3-B6) — even for a single stray issue.
> **Restart the session** (not just `/resume` in the same chat) when switching modules, and
> when resuming after a long gap (> a few hours) of autopilot inactivity.

You are the central orchestrator of the AI-First backend pipeline of NeuroAssist NIV (Java + Spring Boot, hexagonal architecture).

Detects the module state, runs the correct pipeline (Architect or Implement) and
saves checkpoints (crash recovery + manual resume via `--resume`).

**Input:** `$ARGUMENTS`

Accepted formats:
- `<MODULO>` (e.g. `GWY`) → detects automatically: if the module does not have a scaffold yet → **Pipeline A** (Architect); if it already does → **Pipeline B** (Implement, validator-driven loop).
- `<MODULO> --architect` → forces **Pipeline A** (re-architect / new module).
- `<MODULO> --implement` → forces **Pipeline B** (development cycle).
- `<MODULO> --resume` → resume from a saved checkpoint.

Valid modules: determined at runtime via `pipeline-guard.py resolve` (D-393).

---

## Core principle

**A single call to resolve everything.** The autopilot delegates to sub-agents with
model routing (D-411): `validator-agent` (haiku), `planner-agent` (sonnet),
`implementer-agent` (sonnet). Each agent reads the protocol of its command `.md` and
runs with the correct tier. Architect steps (Pipeline A) remain inline.
Checkpoints are saved to disk after each heavy step to allow resuming if the
session is interrupted, but the autopilot **does NOT interrupt the user's flow**:
it proceeds to the next step immediately.

---

## Step 0 -- Mode detection

1. Parse the invocation with the deterministic detector (D-370), without doing it by hand:
   ```
   python scripts/autopilot-state.py detect "$ARGUMENTS" --layer be
   ```
   It returns `{module, id, mode, pipeline, service}`.
2. Validate module (D-393): `python scripts/pipeline-guard.py resolve --module <MODULO>`
   - Exit 0 → valid module; use the returned JSON to resolve `service` and `serviceDocsDir`.
   - Non-zero exit → module missing from `modules.registry`. **Stop** — the script has already printed the valid ones.
3. If `mode == "resume"`: read the checkpoint (`autopilot-state.py load --dir tmp/be-autopilot/<MODULO>`) and jump to the saved step.
4. If it contains `--architect`: **Pipeline A**.
5. If it contains `--implement`: **Pipeline B**.
6. Otherwise, detect from the state on disk:
   - If `backend/services/<service>/` does NOT exist (module not scaffolded yet) → **Pipeline A**, and when finished, chain into **Pipeline B**.
   - If it already exists → **Pipeline B**.
7. Checkpoint ID = `<MODULO>`.
8. **Open the run trace (F2 / D-423):**
   ```bash
   python scripts/pipeline_events.py trace-start --command /be-autopilot --module <MODULO>
   ```
   Mint the `trace_id` once at the start of the run. All events emitted by the
   sub-agents (validator/planner/implement) and — in F4 — the calls to techlab-ai
   inherit this `trace_id` automatically (read from `.techlab/trace-context.json`),
   correlating the whole cycle. On `--resume`, do NOT reopen: reuse the existing trace.

> `<service>` = name of the module's backend service (default `<modulo-lowercase>-service`), per `modules.registry` in `project-context.json`.

---

## Checkpoint -- how it works

After each heavy step, save via the script (D-370) — do NOT serialize the JSON by hand.
It writes atomically to `tmp/be-autopilot/<MODULO>/state.json`, stamps the
timestamp and (with `--inc-iteration`) applies the safety cap (exit 2 if it goes past 5):

```
python scripts/autopilot-state.py save --dir tmp/be-autopilot/<MODULO> \
  --module <MODULO> --service <service> --pipeline <architect|implement> \
  --step <etapa concluida> --next <proxima etapa> --progress <P> --inc-iteration
```

Checkpoint fields: `id, pipeline, module, service, currentStep, nextStep,
progressUnit, iteration, timestamp, notes, capReached`.

After saving, emit a short status line and proceed:

```
Checkpoint: <currentStep> -> <nextStep> (progressUnit=<P>, iter=<N>)
```

The autopilot ends the invocation only in 3 cases:
- **Safety cap** reached (5 iterations of the B2->B5 loop).
- **Unrecoverable error** or mandatory manual intervention (`nextStep: "blocked"`).
- **Finalization** of the pipeline.

In those cases, report the reason and instruct `/be-autopilot <MODULO> --resume` if applicable.

---

## Pipeline A -- Architect (new module / re-architecture)

Input: `<MODULO>`. Produces docs 01..06 + ADR skeleton, contracts, backlog and the
executable skeleton of the service.

### Step A1 -- Vision

1. Check whether `docs/architecture/backend/services/<service>/01-*.md` already exists.
   - If it exists and is complete: skip to A2.
2. Run the protocol of `.claude/commands/be-architect-vision.md` with `<MODULO>`.
3. Checkpoint (`currentStep: "vision"`, `nextStep: "specs"`).
4. Proceed automatically to A2.

### Step A2 -- Specs

1. Check the prerequisite: docs 01..06 of the module exist.
2. Check whether the contracts (`api`, `data-model`, `events`) already exist.
   - If they exist: skip to A3.
3. Run the protocol of `.claude/commands/be-architect-specs.md` with `<MODULO>`.
4. Checkpoint (`currentStep: "specs"`, `nextStep: "backlog"`).
5. Proceed to A3.

### Step A3 -- Backlog

1. Check the prerequisite: the module's contracts exist.
2. Check whether `plan-<MODULO>.md` + issues already exist.
   - If they exist: skip to A4.
3. Run the protocol of `.claude/commands/be-architect-backlog.md` with `<MODULO>`.
4. Checkpoint (`currentStep: "backlog"`, `nextStep: "scaffold"`).
5. Proceed to A4.

### Step A4 -- Scaffold

1. Check the prerequisites: atomic issues + `plan-<MODULO>.md`.
2. Run the protocol of `.claude/commands/be-architect-scaffold.md` with `<MODULO>`
   (the Python script generates the executable skeleton of the service; the autopilot does NOT generate files).
3. Checkpoint (`currentStep: "scaffold"`, `nextStep: "implement-loop"`).
4. Go to Pipeline B (Step B1) automatically -- the module now has a scaffold.

### Pipeline A Finalization (when run with `--architect`, without chaining)

```
Pipeline Architect concluido para <MODULO> (<service>)
Etapas executadas: vision -> specs -> backlog -> scaffold
Para iniciar o ciclo de desenvolvimento:
-> /be-autopilot <MODULO> --implement
```

Record in the journal (D-415):

```bash
python scripts/pipeline_events.py emit \
  --category COMMAND-END \
  --actor "/be-autopilot" \
  --message "<MODULO> (<service>) architect pipeline concluido — vision→specs→backlog→scaffold OK" \
  --module <MODULO> \
  --stage scaffold \
  --status completed
```

---

## Pipeline B -- Implement (validator-driven cycle)

Input: `<MODULO>` already scaffolded. Iterates over the plan's priorities until the checklist
closes or the safety cap is reached.

### Step B1 -- Baseline (Validator Mode 1)

1. Delegate to `validator-agent` (D-411 — haiku tier):
   - Input: `<MODULO> --baseline`
   - The agent reads `.claude/commands/be-validator.md` and runs Mode 1 (BASELINE):
     consolidates the real state, computes the score (0-100), updates plan/issues.
   - Wait for the agent's final message (contains the score and Done/Total).
2. If score >= 80 and checklist 100% DONE: verify the verdict deterministically before
   going to Finalization -- first the citations (**Citation verification**, Step B6;
   exit 2 here = do not close, go on to step 3). Even with those numbers, the
   `state.json` may have `provisional: true`, a non-empty `agentTodo` or slots
   `needsAgentConfirm=true`:
   ```bash
   python scripts/validator-decide.py accept-verdict \
     --issue <ISSUE_ID> --layer be \
     --verdict ENCERRAR
   ```
   - **Exit 0 (accepted):** go to Finalization.
   - **Exit 2 (refused):** the baseline has no confirmed verdict -- **do not close**:
     go on to step 3 (Checkpoint) and proceed to B2 (Decision) normally.
3. Checkpoint (`currentStep: "baseline"`, `nextStep: "decision"`, notes with score and done/total).
4. Proceed to B2.

### Step B2 -- Decision (Validator Mode 2)

1. Run the deterministic decision engine (D-367) — same logic as the validator,
   without re-deriving (do not duplicate the tree here):
   ```
   python scripts/validator-decide.py decide --issue <MODULO>-NNN --layer be
   ```
   Route by the returned `nextAction`:
   - **PLANNER** → go to B3
   - **IMPLEMENTADOR** → go to B4
   - **VALIDACAO** → go to B5
   - **ENCERRAR** → Finalization
2. Do not save a checkpoint here (light step). Proceed immediately.

### Step B3 -- Planner

1. Delegate to `planner-agent` (D-411 — sonnet tier):
   - Input: `<MODULO>`
   - The agent reads `.claude/commands/be-planner.md` and produces/updates `plan-<MODULO>.md`.
   - Wait for the agent's final message (contains the generated priorities and the target priority).
2. Extract the target priority from the planner-agent's final message.
3. Checkpoint (`currentStep: "planner"`, `nextStep: "implement"`, `prioridade: "<target P>"`).
4. Proceed to B4 with the target priority.

### Step B4 -- Implement (one priority at a time)

1. Delegate to `implementer-agent` (D-411 — sonnet tier):
   - Input: `<MODULO> <PRIORIDADE>` (e.g. `PED P2`)
   - The agent reads `.claude/commands/be-implement.md` and implements **a single priority**
     following exactly the order of the plan's phases (without running `./gradlew`).
   - Wait for the agent's final message (confirms the executed priority and that scope was respected).
2. **If the final message starts with `Execucao interrompida`** (Block mode of
   `be-implement.md` — insufficient plan, reading budget exhausted): the agent
   **did not write code**. Do not send it to validation.
   ```bash
   python scripts/autopilot-state.py save --dir tmp/be-autopilot/<MODULO> \
     --step implement --next planner --module <MODULO> --progress "<P>" \
     --blocked-reason "<o bloco Motivo: + os alvos inferidos, em uma linha>"
   ```
   - **Exit 0:** go back to **B3 (Planner)** passing the block as input to the
     replanning — the "Alvos que o plano deveria listar" (targets the plan should list) that the agent inferred are
     exactly what the priority needs to gain. Does not count toward the safety cap.
   - **Exit 3** (`consecutiveBlocks >= 2` on the same priority): **stop the invocation**
     with `nextStep: "blocked"` and report to the user (see "Checkpoint -- how it
     works"). Two consecutive blocks mean the replanning did not resolve it;
     insisting becomes planner<->implementer ping-pong.
3. Otherwise (normal execution): Checkpoint (`currentStep: "implement"`,
   `nextStep: "validate"`, `prioridade: "<P>"`) — **without** `--blocked-reason`, which
   resets the block counter.
3. Checkpoint (`currentStep: "implement"`, `nextStep: "validate"`, `prioridade: "<P>"`).
3. Proceed to B5.

### Step B5 -- Light Validation (Validator Mode 3 `--light`, D-472)

Runs only `lint` + `arch-conformance` — without `test/build/e2e`. Reduces token cost
per priority; the full suite is deferred to B6 at the end of the cycle.

1. Delegate to `validator-agent` (D-411 — haiku tier) for light Mode 3:
   - Input: `<MODULO> --validacao --light`
   - The agent reads `.claude/commands/be-validator.md` and runs Mode 3 light tier:
     `lint` gate, architectural conformance, updates checklist + status block.
     `test`, `build` and `e2e` stay as `"deferred"` in gates.json.
   - Wait for the agent's final message (contains the lint result and partial score).
2. If lint passes AND checklist 100% DONE AND score >= 80: exit the loop and go to **B6**.
3. If lint passes but the checklist is incomplete:
   - Increment `iteration`.
   - If `iteration` > 5: stop with safety cap (see below); then go to B6.
   - Checkpoint (`currentStep: "validate-partial"`, `nextStep: "decision"`).
   - Go back to B2 (Decision) and proceed automatically (next priority).
4. If lint fails or conformance exit 2:
   - Checkpoint (`currentStep: "validate-failed"`, `nextStep: "decision"`, notes with the error).
   - Go back to B2 (Decision) with the error diagnosis and proceed automatically.

### Step B6 -- Full Validation (Validator Mode 4, D-472)

Executed **only once** after the B2→B5 loop ends (checklist complete or safety cap).
Runs the full test suite: `test,build,e2e,lint`.

1. Delegate to `validator-agent` (D-411 — haiku tier) for Mode 4 (FULL-VALIDACAO):
   - Input: `<MODULO> --full-validacao`
   - The agent runs: `gates-run.py --gates test,build,e2e,lint` + `arch-conformance.py`
     + `validator-score.py` with all gates filled in.
   - If any gate fails, the agent also writes `tmp/pipeline-cycle/<MODULO>/b6-failure.json`
     (D-554) before returning — see `be-validator.md` Mode 4 / Result.
   - Wait for the agent's final message (final score + result of all gates).
2. If all gates pass: verify the agent's verdict deterministically.
   The `validator-agent` returns the verdict in prose; before going to Finalization, check
   its citations (see **Citation verification**, below) and validate the verdict
   against the `state.json` it wrote itself:
   ```bash
   python scripts/validator-decide.py accept-verdict \
     --issue <ISSUE_ID> --layer be \
     --verdict <VEREDITO_DO_AGENTE>
   ```
   - **Exit 0 (accepted):** go to Finalization.
   - **Exit 2 (refused):** the state has `provisional: true`, `statusTag` in
     `REDUCED`/`NEAR-CLOSED`, a non-empty `agentTodo` or slots with `needsAgentConfirm=true`.
     Return to the **same `validator-agent`** with the blocks printed by the script and the
     open `agentTodo`, requiring item-by-item confirmation with `file:line` evidence
     and recalculation of the non-provisional score. Only then re-run this step 2.
     This return does not count toward the safety cap (same rule as B4-fix).

   **Citation verification** -- runs before every `accept-verdict` (here and in B1). The
   "Evidencias consultadas" block of the agent cites `<id> @ <path:line>`; the format is
   checkable, but it only matters if someone checks. Save the agent's final message and run:
   ```bash
   # mensagem final do validator-agent, literal, em tmp/<MODULO>/be-validator-report.md
   python scripts/pipeline-context.py verify-citations --report tmp/<MODULO>/be-validator-report.md
   ```
   - **Exit 0:** go on to `accept-verdict`.
   - **Exit 2 (invalid citation, missing block, or empty top-N with a declared source):**
     verdict refused, like `accept-verdict` exit 2 -- return to the **same
     `validator-agent`** with the printed `invalid` list, requiring the block to be redone from the
     real JSON (`spec-context --ids <id>` checks a record without a new broad search). It does not
     interrupt the loop.
   - **Exit 1 (not verified -- ES down or report missing):** it is not a refusal; go on to
     `accept-verdict` and record `citacoes nao verificadas: <reason>` in the checkpoint notes.
3. If any gate fails, route deterministically (D-554) — **do not decide by hand**:
   ```bash
   python scripts/validator-decide.py b6-fix --failure-report tmp/pipeline-cycle/<MODULO>/b6-failure.json
   ```
   - **`TARGETED_FIX`** (targeted regression — 1-3 tests, no compilation error):
     Checkpoint (`currentStep: "full-validate-failed"`, `nextStep: "fix"`, notes with the
     `failure_type`/`failing_tests`). Go to **Step B4-fix** (below) — skips B2/B3, does not
     count toward the safety cap.
   - **`FULL_CYCLE`** (compilation error, 4+ tests, or no `b6-failure.json`/unreadable —
     the script's safe default): Checkpoint (`currentStep: "full-validate-failed"`,
     `nextStep: "decision"`, notes with the failures). Go back to B2 (Decision); the B2→B5 loop
     resolves the failures; when it closes again, return to B6.
   - B6 and B4-fix **do not count** toward the safety cap's `iteration` counter — the cap
     applies only to the light B2→B5 loop.

### Step B4-fix -- Targeted fix after B6 (D-554)

Reached **only** via the `TARGETED_FIX` routing of Step B6. Deliberately skips B2 (Decision) and B3
(Planner) — the cause has already been isolated by `b6-fix`, replanning would be rework.

1. Delegate to `implementer-agent` (D-411 — sonnet tier) in targeted fix mode:
   - Input: `<MODULO> --fix`
   - The agent reads `.claude/commands/be-implement.md` section "Targeted fix mode
     (`--fix`, D-554)": reads `tmp/pipeline-cycle/<MODULO>/b6-failure.json` instead of the plan,
     fixes **only** the listed `failing_tests`/`failing_files`.
   - If the agent blocks (root cause outside the listed scope): treat as `FULL_CYCLE` —
     Checkpoint (`nextStep: "decision"`) and go to B2 with the block diagnosis.
   - Wait for the agent's final message (confirms which failures were fixed).
2. Checkpoint (`currentStep: "fix"`, `nextStep: "full-validate"`).
3. Go back **directly to B6** (new round of FULL-VALIDACAO) — not to B5, not to B2.

### Pipeline B Finalization

Executed only after B6 (FULL-VALIDACAO) passes successfully.

```
Autopilot concluido para <MODULO> (<service>)
Score de maturidade: <0-100> -- <Inicial | Parcial | Consistente | Maduro>
Done/Total: <X/Y>
Gates: lint OK (per-priority) | test OK | build OK | e2e OK (suite completa B6)
Arquitetura hexagonal: OK
Multi-tenant enforcement: OK
Iteracoes loop leve: <N> | Rodadas FULL-VALIDACAO: <M>
Modulo com checklist 100% DONE.

Proximo modulo? Inicie uma sessao nova (D-622) -- nao continue neste chat.
```

Record in the journal (D-415):

```bash
python scripts/pipeline_events.py emit \
  --category COMMAND-END \
  --actor "/be-autopilot" \
  --message "<MODULO> (<service>) implement pipeline concluido — score <X> — <N> iteracoes leve — FULL-VALIDACAO OK" \
  --module <MODULO> \
  --stage implement \
  --status completed
```

After recording, close the run trace (F2 / D-423):

```bash
python scripts/pipeline_events.py trace-end
```

---

## Safety cap -- iteration limit

Maximum of **5 iterations** of the light B2→B5 loop per invocation. If the limit is reached:

1. Emit a checkpoint + status message.
2. **Proceed to B6 (FULL-VALIDACAO)** — even with an incomplete checklist, the full
   suite runs to capture the real test state before interrupting.
3. After B6 (pass or fail), interrupt and wait for `--resume`.

```
Safety cap atingido (5 iteracoes loop leve).
Score parcial: <score>
Done/Total: <X/Y>
Ultimo gate lint: <resultado>
Iniciando B6 (FULL-VALIDACAO) antes de interromper...
```

After B6:

```
FULL-VALIDACAO concluida.
Gates: test=<X> build=<X> e2e=<X> lint=<X>
Score final: <score>

O modulo nao esta concluido. Para continuar:
-> /be-autopilot <MODULO> --resume
   (o contador de iteracoes reinicia ao retomar)

Se a retomada for depois de um gap longo (horas), inicie sessao nova (D-622) em vez
de continuar neste chat -- o checkpoint em disco carrega o estado, nao o historico.
```

Record in the journal (D-415):

```bash
python scripts/pipeline_events.py emit \
  --category AUTOPILOT-CHECKPOINT \
  --actor "/be-autopilot" \
  --message "<MODULO> (<service>) safety cap atingido — score <X> — <X/Y> done — FULL-VALIDACAO executada" \
  --module <MODULO> \
  --stage implement \
  --status blocked
```

---

## General rules

- **Do not duplicate the logic of the sub-commands.** Read and follow the protocol of the referenced `.md`.
- **Chain steps automatically.** After saving a checkpoint, proceed immediately
  to the next step in the same invocation. Do not instruct the user to run `/clear`
  or `--resume` in the normal flow.
- **Always save a checkpoint after a heavy step.** It serves as crash recovery and as the
  manual `--resume` point.
- **Create the checkpoint directory** at the start: `tmp/be-autopilot/<MODULO>/` (versioned, D-041).
- **If `--resume` and `state.json` does not exist**: treat as a fresh start.
- **Do not run steps already completed** -- use prerequisite checks (does the file exist?) to skip.
- **One priority at a time** in B4 -- never mix priorities in a single be-implement invocation.
- **Multi-tenant enforcement** is part of Validator Mode 3 (B5) -- do not skip it.
- **Never implement/fix directly via `Bash` in the orchestrator's context** (D-622) --
  even a 1-line fix in response to a B5/B6 failure goes to the `implementer-agent`
  (B3->B4), never to an ad-hoc edit in the autopilot chat. The orchestrator only reads
  diagnostics (score, gates, done/total); whoever edits code is always the isolated agent.
- **Switch session when switching module** (D-622, extension of D-463): when finishing
  Finalization or pausing due to the safety cap with a long resume gap, explicitly recommend
  that the operator start a new session for the next `/be-autopilot <MODULO>`
  instead of continuing in the same chat -- see the Finalization/Safety cap messages below.

---

## Impact on existing commands

**ZERO.** This command is purely additive:
- It does not modify the individual BE commands (`be-architect-*`, `be-validator`, `be-planner`, `be-implement`).
- It delegates to them by reading the referenced `.md`.
- The individual commands keep working when called directly.

---

## Mandatory initial message (when starting)

```
BE Autopilot iniciado
Input: <$ARGUMENTS>
Pipeline: <A (Architect) | B (Implement)>
Modulo: <MODULO> (<service>)
Modo: <fresh | resume>
Estado: <checkpoint lido ou "novo">
Iniciando etapa: <nome>
```
