# NeuroAssist AI — Checklist

> Project progress. Setup (STAGE 1) is synced from `project-context.json` via `scripts/checklist.py sync`.

## STAGE 1 — Setup

### P0 — Repository bootstrap (minimal structure + git init)
- [ ] Repository bootstrap (minimal structure + git init) (`new-project.py bootstrap`)

### P1 — Copy .claude/ + generated CLAUDE.md
- [ ] Copy .claude/ + generated CLAUDE.md (`new-project.py claude-folder`)

### P2 — Create docs/architecture/ per rigor level
- [ ] Create docs/architecture/ per rigor level (`new-project.py docs-skeleton --rigor complete-bosq`)

### P3 — Sync TechLab AI docs snapshot (docs-only) and populate integration contract  _(conditional: ai.hasAi == true)_
- [ ] Sync TechLab AI docs snapshot (docs-only) and populate integration contract (`sync-techlab-ai.py --target-sha <pinned>`)

### P3b — Generate elastic-stack overlay (compose + integration contract + Java ports/adapters)  _(conditional: stack.elastic.enabled == true)_
- [ ] Generate elastic-stack overlay (compose + integration contract + Java ports/adapters) (`new-project.py backend-skeleton (elastic-stack overlay triggered automatically)`)

### P4 — backend/ Gradle root + empty settings.gradle.kts
- [ ] backend/ Gradle root + empty settings.gradle.kts (`new-project.py backend-skeleton`)

### P5 — frontend/ empty Nx workspace  _(conditional: stack.frontend.enabled == true)_
- [ ] frontend/ empty Nx workspace (`new-project.py frontend-skeleton`)

### Pg — Growth skeleton (docs/growth/ scaffold + admin-module service-spec)  _(conditional: growth.enabled == true)_
- [ ] Growth skeleton (docs/growth/ scaffold + admin-module service-spec) (`new-project.py growth-skeleton`)

### P6 — Handoff message: setup done, next step is /be-architect-vision <MODULE>
- [ ] Handoff message: setup done, next step is /be-architect-vision <MODULE>

## STAGE 2 — Development

### Backend modules

#### GEST — Gesture Detection (Edge) (`gest-service`)
- [ ] **Architecture** — `/be-architect-vision GEST` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator GEST` → planner → implement
- **Current status:** declared

#### EVNT — Events and Alarms (`evnt-service`)
- [ ] **Architecture** — `/be-architect-vision EVNT` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator EVNT` → planner → implement
- **Current status:** declared

#### PAT — Patients and Command Catalog (`pat-service`)
- [ ] **Architecture** — `/be-architect-vision PAT` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator PAT` → planner → implement
- **Current status:** declared

#### ACS — Caregivers and Access (`acs-service`)
- [ ] **Architecture** — `/be-architect-vision ACS` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator ACS` → planner → implement
- **Current status:** declared

#### HIST — History and Audit Trail (`hist-service`)
- [ ] **Architecture** — `/be-architect-vision HIST` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator HIST` → planner → implement
- **Current status:** declared

#### DASH — Dashboard and Notifications (`dash-service`)
- [ ] **Architecture** — `/be-architect-vision DASH` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator DASH` → planner → implement
- **Current status:** declared

#### EDGE — Edge Device Integration (`edge-service`)
- [ ] **Architecture** — `/be-architect-vision EDGE` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator EDGE` → planner → implement
- **Current status:** declared

#### CONV — Conversation via Speech Tree (`conv-service`)
- [ ] **Architecture** — `/be-architect-vision CONV` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator CONV` → planner → implement
- **Current status:** declared

#### TRN — AI-Assisted Training (Speech Tree Authoring) (`trn-service`)
- [ ] **Architecture** — `/be-architect-vision TRN` → specs → backlog → scaffold
- [ ] **Development cycle** — `/be-validator TRN` → planner → implement
- **Current status:** declared

### Frontend modules

#### GEST — Gesture Detection (Edge) (`gest`)
- [ ] **Architecture** — `/fe-architect-vision GEST` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator GEST` → planner → implement
- **Current status:** declared

#### EVNT — Events and Alarms (`evnt`)
- [ ] **Architecture** — `/fe-architect-vision EVNT` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator EVNT` → planner → implement
- **Current status:** declared

#### PAT — Patients and Command Catalog (`pat`)
- [ ] **Architecture** — `/fe-architect-vision PAT` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator PAT` → planner → implement
- **Current status:** declared

#### ACS — Caregivers and Access (`acs`)
- [ ] **Architecture** — `/fe-architect-vision ACS` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator ACS` → planner → implement
- **Current status:** declared

#### HIST — History and Audit Trail (`hist`)
- [ ] **Architecture** — `/fe-architect-vision HIST` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator HIST` → planner → implement
- **Current status:** declared

#### DASH — Dashboard and Notifications (`dash`)
- [ ] **Architecture** — `/fe-architect-vision DASH` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator DASH` → planner → implement
- **Current status:** declared

#### EDGE — Edge Device Integration (`edge`)
- [ ] **Architecture** — `/fe-architect-vision EDGE` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator EDGE` → planner → implement
- **Current status:** declared

#### CONV — Conversation via Speech Tree (`conv`)
- [ ] **Architecture** — `/fe-architect-vision CONV` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator CONV` → planner → implement
- **Current status:** declared

#### TRN — AI-Assisted Training (Speech Tree Authoring) (`trn`)
- [ ] **Architecture** — `/fe-architect-vision TRN` → specs → specs-validate → backlog → promote
- [ ] **Development cycle** — `/fe-validator TRN` → planner → implement
- **Current status:** declared
