# NeuroAssist NIV -- NeuroAssist NIV is an assistive-technology platform that turns residual voluntary micro-movements of people with neurodegenerative diseases such as ALS/MND into structured help requests, captured by an ordinary webcam and processed by computer vision.

> Monorepo: `/backend` (Java 21 services) + `/frontend` (Angular) + `/docs/architecture/` (specification).
>
> **Stack:** Java 21 . Spring Boot 3.5.0 . Gradle 8.x (Kotlin DSL) . PostgreSQL 15+ . Angular 21 . Nx 22

---

## Monorepo layout

```
/backend/                              # Java 21 services

  build.gradle.kts / settings.gradle.kts   # composite build (D-575)

  services/
    gest-service/
    evnt-service/
    pat-service/
    acs-service/
    hist-service/
    dash-service/
    edge-service/
    conv-service/
    trn-service/

    neuroassist-niv-api-gateway/                # GWY: Spring Cloud Gateway
    neuroassist-niv-service-registry/                # REG: Eureka

    neuroassist-niv-migrations/         # Centralized Flyway (all schemas)

/frontend/                             # Nx workspace, npmScope: @neuroassist
  apps/
    neuroassist-niv-web/                       # Angular application
  libs/
    shared/{ui-tokens,ui-feedback,ui-components,error-model,access-http-base}/

/docs/architecture/
  backend/{adr,services,standards,issues,plans}/
  frontend/{adr,libs,standards,issues,plans}/
  shared/{modelo-dados,contratos,rbac}/

```

---

## Business modules (= unit of work of the AI pipeline)

| Code | Name | Microservice | Nx Lib |
|---|---|---|---|
| GWY | API Gateway | `neuroassist-niv-api-gateway` | -- |
| REG | Service Registry | `neuroassist-niv-service-registry` | -- |
| MIG | Migrations | `neuroassist-niv-migrations` | -- |
| GEST | Gesture Detection (Edge) | `gest-service` | -- |
| EVNT | Events and Alarms | `evnt-service` | -- |
| PAT | Patients and Command Catalog | `pat-service` | -- |
| ACS | Caregivers and Access | `acs-service` | -- |
| HIST | History and Audit Trail | `hist-service` | -- |
| DASH | Dashboard and Notifications | `dash-service` | -- |
| EDGE | Edge Device Integration | `edge-service` | -- |
| CONV | Conversation via Speech Tree | `conv-service` | -- |
| TRN | AI-Assisted Training (Speech Tree Authoring) | `trn-service` | -- |

Issue prefix: `<MODULE>-NNN` (e.g.: `GWY-001`, `REG-001`, `MIG-001`). Issues live in `docs/architecture/{backend,frontend}/issues/`; GitHub sync to be set up when repository is created.

---

## Hexagonal -- mandatory structure (each BE service)

Base package: `com.neuroassist.<module>` (e.g.: `com.neuroassist.gwy`).

```
com.neuroassist.<module>/
├── api/
│   ├── controller/          # @RestController
│   ├── dto/                 # Java records (request/response)
│   └── exception/           # @RestControllerAdvice + ProblemDetail (RFC 7807)
├── application/
│   ├── service/             # @Service -- use cases (@Transactional ONLY here)
│   └── port/
│       ├── in/              # Inbound (use cases)
│       └── out/             # Outbound (repos, clients)
├── domain/
│   ├── model/               # POJOs/records -- ZERO Spring/JPA
│   └── service/             # Domain services -- ZERO Spring
└── infrastructure/
    ├── clients/             # @FeignClient
    ├── config/              # @Configuration (includes DomainServiceConfig)
    ├── persistence/{entity,repository,adapter}/
    └── security/            # Spring Security filters, MDC
```

---

## Non-negotiable rules

Enforced by ArchUnit in `:<service>:architectureCheck`.

```
RULE-01  domain.* does not import org.springframework
RULE-02  domain.* does not import jakarta.persistence
RULE-03  @Transactional only in application.service
RULE-04  api.* does not depend on infrastructure.*
RULE-05  infrastructure.* does not depend on api.*
RULE-06  @FeignClient only in infrastructure.clients

RULE-08  spring.jpa.open-in-view=false mandatory
RULE-09  mandatory base package: com.neuroassist.<module>
```

If `./gradlew :<service>:architectureCheck` fails → **do not commit**, fix first.

The blocking gate is the same in every stack: `scripts/arch-conformance.py check
--layer be --target <service>`, which dispatches on the service's language
(D-570). A gate that cannot verify fails loudly — it never passes in silence.

---

## Migrations

**Java — centralized in `neuroassist-niv-migrations` (Flyway).**

- All migrations for ALL schemas live in `backend/neuroassist-niv-migrations/`.
- Naming: `V<N>__<module>_<description>.sql`. Schema-aware: each V indicates which schema it applies to (in path: `db/migration/global/V*.sql`).
- Individual microservices use `spring.jpa.hibernate.ddl-auto=validate` (schema prepared by `neuroassist-niv-migrations`).
- **Local dev:** run `./gradlew :neuroassist-niv-migrations:bootRun` FIRST; then the other services.

---

## Parallel development (pole-position)

When running multiple modules in parallel across `git worktrees`, cross-module state
documents must **only** be edited in the main dev repo — never inside a worktree:

- `docs/architecture/backend/plans/architecture-master-plan.md`
- `docs/architecture/frontend/plans/architecture-master-plan.md`
- `project-journal.md`, `project-checklist.md`

Each worktree runs `git checkout -- <file>` before pushing. Pull master-plan updates
from the dev repo into worktrees with `git pull` — do not author them inside the
worktree. Violating this causes merge conflicts that erase other terminals' history
(D-397).

---

## Essential commands

```bash

# --- Java services (run from backend/) ---
./gradlew :<service>:build                # build one service
./gradlew :<service>:test                 # unit tests (fast, no Docker)
./gradlew :<service>:architectureCheck    # ArchUnit -- BLOCKING before commit
./gradlew :<service>:integrationTest      # Testcontainers, requires Docker
./gradlew buildAll                        # every service of the composite build (D-575)

# Blocking architectural gate, any stack (D-570)
python scripts/arch-conformance.py check --layer be --target backend/services/<service>

# Local infra
docker compose -f docker/docker-compose.dev.yml up -d

# Frontend -- Angular (in /frontend)
npx nx serve neuroassist-niv-web      # dev server
npx nx build neuroassist-niv-web      # prod build
npx nx affected:test
npx nx affected:lint

```

---

## AI Pipeline -- per module

The pipeline operates per **MODULE** (GWY/REG/MIG/GEST/EVNT/PAT/ACS/HIST/DASH/EDGE/CONV/TRN). There are **two complementary layers**:

```
LAYER 1 — ARCHITECT (once per module, FROM THE CONTROL PLANE — D-403)
  These commands are NOT in this repository. Run them from your clone of
  techlab-architecture, passing this project's client id:
      /be-architect-vision <client-id> <MODULE>
  The artifacts land here, under docs/architecture/.
      /be-architect-backlog            atomic issues <MODULE>-NNN + plan-<MODULE>.md
      /be-architect-discovery          reverse engineering of an existing service
      /be-architect-scaffold           service skeleton for the module's stack
      /be-architect-specs              contracts (api / data-model / events / integration)
      /be-architect-vision             docs 01-06 + ADR skeleton
      /fe-architect-backlog            frontend issues + plan
      /fe-architect-promote            prototype screen -> production lib (D-493)
      /fe-architect-scaffold           Angular/Nx module skeleton
      /fe-architect-specs              component specs, state contracts, routing
      /fe-architect-vision             frontend architectural vision (Angular)
      /fe-feature-architect-backlog    feature issues
      /fe-feature-architect-discover   discovery for a feature in an existing module
      /fe-feature-architect-scaffold   feature skeleton
      /fe-feature-architect-spec-delta spec delta for the feature

LAYER 2 — EXECUTION (the iterative cycle, RUNS HERE)
  validator → planner → validator → implement (1 priority) → validator → ...
      /be-autopilot                    chains validator + planner + implement with checkpoints
      /be-implement                    triggered by the validator; ONE priority at a time
      /be-planner                      triggered by the validator when strategy is needed
      /be-validator                    sole entry point; BASELINE or DECISION mode
      /fe-autopilot                    chains the frontend loop with checkpoints
      /fe-implement                    frontend implementation, one priority at a time
      /fe-planner                      frontend planning
      /fe-validator                    sole entry point of the frontend loop

LAYER 3 — Python SCRIPTS (scripts/, invoked by the LAYER 2 commands)

      arch-conformance.py             architectural rules (blocking gate)
      arch_decisions.py               architectural decisions pinned into the docs
      artifact_taxonomy.py            artifact categories for learning-context --target-files
      asset_resolution.py             asset/template resolution
      autopilot-state.py              autopilot checkpoints
      be-spec-drift.py                spec <-> code drift detection
      be_context_helper.py            project-context loader shared by the scripts
      cli_utils.py                    shared CLI helpers
      code_inventory.py               source inventory
      doc-scaffold.py                 doc rendering
      embeddings.py                   embedder for the semantic half of spec-context
      es_mappings.py                  canonical ES mappings
      gate-comment-budget.py          comment policy: density, restatement, traceable TODO (D-580)
      gates-run.py                    build/test/lint gates, dispatched by stack
      issue-tracker.py                issue lifecycle (set-status)
      issue_state.py                  issue state parsing
      issues-mirror.py                optional one-way mirror of issues to GitHub
      pipeline-context.py             RAG spec-context for the agents
      pipeline-guard.py               module -> service resolution; 1st call of every command
      pipeline_events.py              activity sink (ES / techlab-ai)
      plan-state-extractor.py         plan -> state for the planner
      pole-position-split.py          priority splitting
      render.py                       Jinja rendering shared by the generators
      stack_resolution.py             backend stack resolution for the gates
      validator-decide.py             validator mode decision (BASELINE / DECISION)
      validator-score.py              module scoring
```

Only the execution layer travels to this project (D-406); what you see under
LAYER 3 is the transitive import closure of those commands' scripts, computed at
generation time (D-577). The generators that create a service from its specs —
`be-module-generator.py` and friends — run in the control plane, driven by
`/be-architect-scaffold`. The three lists above are rendered from the same sets
that decide what is copied, so they cannot drift from reality (D-579).

### Frontend commands (mirror of backend)

Same split as the backend: the architect steps run in the control plane with the
client id, the execution cycle runs here.

```bash
# Architect — FROM techlab-architecture, not from here

/fe-architect-vision    <client-id> <MODULE>
/fe-architect-specs     <client-id> <MODULE>
/fe-architect-backlog   <client-id> <MODULE>
/fe-architect-scaffold  <client-id> <MODULE>
/fe-architect-promote   <client-id> <MODULE>    # prototype screen -> production lib (D-493)

# Per-FEATURE pipeline (new feature in an existing module)
/fe-feature-architect-discover    <client-id> <MODULE> <feature-slug>
/fe-feature-architect-spec-delta  <client-id> <MODULE> <feature-slug>
/fe-feature-architect-backlog     <client-id> <MODULE> <feature-slug>
/fe-feature-architect-scaffold    <client-id> <MODULE> <feature-slug>

# Execution — RUNS HERE, same cycle as the backend
/fe-validator <MODULE>
/fe-planner   <MODULE>
/fe-implement <MODULE> <P>
/fe-autopilot <MODULE>
```

### Recommended flow for a new module (from scratch)

Steps 1–4 run **in techlab-architecture** (D-403) and take the client id; steps
5–7 run **here**. Both write to this repository.

```
--- in the control plane -------------------------------------------------------
1. /be-architect-vision   <client-id> <MODULE>  → docs/architecture/backend/services/<svc>/01..06.md + adr/
2. /be-architect-specs    <client-id> <MODULE>  → contracts/ (api, data-model, events)
3. /be-architect-backlog  <client-id> <MODULE>  → issues/<MODULE>-NNN.md + plans/plan-<MODULE>.md
4. /be-architect-scaffold <client-id> <MODULE>  → backend/services/<svc>/ (Spring Boot skeleton)

--- here -----------------------------------------------------------------------
5. /be-validator <MODULE>             → enters BASELINE; generates the service README
6. /be-planner   <MODULE>             → creates the initial plan (if not yet existing)
7. /be-implement <MODULE> P1, P2, ... → each priority, with the validator between them
   OR
   /be-autopilot <MODULE>             → orchestrator with checkpoints
```

### Canonical outputs

- Plans: `docs/architecture/backend/plans/plan-<MODULE>.md` (BE) and `docs/architecture/frontend/plans/plan-<MODULE>.md` (FE)
- Operational README: `backend/services/<service>/README.md`
- Per-service spec: `docs/architecture/backend/services/<service>/{contracts,diagrams,execution,tests}/`
- Issues: `docs/architecture/{backend,frontend}/issues/<MODULE>-NNN.md`
- Project ADRs: `docs/architecture/backend/adr/ADR-NNN-*.md`
- Transversal standards: `docs/architecture/backend/standards/*.md`

---

## Available skills (D-560)

Skills loaded automatically by pipeline commands — do not invoke manually unless instructed.

**Claude-only (`user-invocable: false`) — invoked by commands internally:**
- `dev-context-load` — loads module-state + decision-context + spec-context + issue-context via `pipeline-context.py`; run at the start of every execution phase (validator, planner, implementer)
- `dev-phase-emit` — emits phase event via `pipeline_events.py emit` + records in journal; run at the end of every phase

**User-invocable (no LLM — fast, zero tokens):**
- `/pipeline-status <MODULE>` — current module state from ES (score, gates, last events)
- `/master-plan-status` — BE+FE progress table from master plan

---

## Activity observability — record everything (D-423)

Every substantive unit of work must leave a trace in Elasticsearch
(`techlab-pipeline-events-v1`), **even work done outside the official
`/be-*` / `/fe-*` pipeline** (ad-hoc fixes, refactors, investigations, manual
edits). The pipeline commands already journal themselves; for everything else,
follow the **same pattern** by hand:

```bash
# 1. open a trace once at the start of the work (mints a correlation id;
#    all events + any techlab-ai calls in this session inherit it)
python scripts/pipeline_events.py trace-start --command <label> [--module <MODULE>] [--model <model>]

# 2. emit one event per milestone (client is auto-derived from project-context.json)
python scripts/pipeline_events.py emit \
  --category <PHASE-START|PHASE-END|COMMAND-END|DECISION> \
  --actor <who> --module <MODULE> --status <started|completed|blocked> \
  --message "<one line>" [--details '{...}'] \
  [--duration-ms <N>] [--tokens-input <N> --tokens-output <N>]

# 3. close the trace at the end
python scripts/pipeline_events.py trace-end
```

Granularity = per milestone, not per keystroke. `available:false` (ES down) never
blocks — the call is best-effort. This is how the project stays fully observable:
one `trace_id` query reconstructs any work session, pipeline or not.

**Managed activity (D-428).** When `TECHLAB_AI_URL` is set, these events are routed
through techlab-ai's managed sink (`POST /v1/framework/record-activity`) instead of
being written to Elasticsearch directly — a single, governed writer, with the run
`trace_id` carried in the `X-Correlation-Id` header so your activity correlates with
the LLM/RAG calls techlab-ai records for the same run. Leave the var unset and the
event is written straight to ES (zero-infra). Either way the call is best-effort and
the command above is unchanged.

---

## Reference documents (read before implementing)

| Document | Contains |
|---|---|

| `docs/architecture/backend/standards/hexagonal-patterns.md` | Ports & Adapters, boundaries, ArchUnit rules |
| `docs/architecture/backend/standards/java-conventions.md` | Lombok, SLF4J, DI, JPA, naming, validation |
| `docs/architecture/backend/standards/snippets.md` | Snippets reference (ports, adapters, services, Feign, tests) |

| `docs/architecture/backend/standards/platform-patterns.md` | Feign+Resilience4j, centralized Flyway, MDC, Saga |
| `docs/architecture/backend/standards/testing-conventions.md` | Pyramid, Testcontainers, Cucumber, Pact |
| `docs/architecture/backend/standards/services-catalog.md` | Catalog of microservices + canonical packages + events + Feign clients |
| `docs/architecture/backend/standards/service-spec-authoring.md` | How to write per-service SPECs (Phase 1-3) |
| `docs/architecture/backend/standards/api-mock-convention.md` | Mock profile, /api/v0/, fixtures |

| `docs/architecture/frontend/standards/nx-boundaries.md` | Nx tags, allowed directions, ESLint config |
| `docs/architecture/frontend/standards/access-layer-contracts.md` | AuthSession, AccessDecision |

| `docs/architecture/shared/blueprint-core.md` | Mental model: app + modules + shared, golden rules |

---

## Never do this

- **Never** use base package different from `com.neuroassist.<module>`

- **Never** introduce "tool/PREFIX" concept -- here only MODULE exists
- **Never** put `@Transactional` in controller, repository or adapter
- **Never** return JPA `@Entity` directly from controller -- always DTO record
- **Never** use `@Autowired` in field -- always `@RequiredArgsConstructor`
- **Never** use `System.out` -- `@Slf4j` via Lombok
- **Never** hardcode secret -- use `${VAR_NAME}` in `application.yml`
- **Never** commit with `ddl-auto: create|update` -- always `validate`
- **Never** use `@Testcontainers` + `@Container` -- singleton container pattern (static initializer)
- **Never** forget `DomainServiceConfig.java` (domain services are POJOs and need `@Bean`)
- **Never** run a microservice before `neuroassist-niv-migrations`

- **Never** attack issues/tickets one-by-one directly via `Bash` in the main chat
  (build, test, manual fix loop) instead of going through `/be-autopilot` /
  `/fe-autopilot` (or `/be-validator` + `/be-planner` + `/be-implement` directly).
  Measured (D-622): a single session that did this accumulated 1.32B input tokens
  across 2,565 turns and 9 subagent delegations, vs. a comparable autopilot-driven
  session at 179M tokens across 471 turns and 62 subagent delegations -- because
  every subsequent turn re-sends the entire accumulated Bash output via cache. Even
  a "quick fix" goes through `implementer-agent`/`fe-implementer-agent`, never a raw
  edit in the orchestrator's own context.
- **Never** keep the same chat session open across multiple modules or after a long
  idle gap (hours) resuming an autopilot run (D-622, extends D-463) -- start a new
  session; the checkpoint on disk (`tmp/be-autopilot/<MODULE>/state.json`) carries
  the state, not the chat history.

---

## Git conventions

Valid commit scopes:
`gwy, reg, mig, gest, evnt, pat, acs, hist, dash, edge, conv, trn, web, libs, docs, infra, deps`.

Permanent branches: `dev`, `release`, `prod`. Never direct push -- always Pull Request.
