# NeuroAssist AI — Project Journal

> Append-only activity log (D-011). Append with `scripts/journal.py append`.
> Never edit past entries; corrections are new `[CORRECTION]` entries referencing the original timestamp.
## 2026-11-19

### 04:17:59 UTC — [DECISION] Intake from English-translated BA handoff (techlab-ba/projects/neuroassist-niv, derived from neuro-assist-ai); product English-only (ADR-018 rewritten); domain identifiers renamed PT->EN; tenancy multi-tenant; modules CONV+TRN registered; Elastic stack deferred

- **Ator:** C:/Program Files/Git/new-project
### 04:17:59 UTC — [CORRECTION] Post-P0 manual fixes to project-context.json: ingest_discovery.parse_adr only understands PT section names (Decisao/Escolhida; Sinais...errada) so English ADRs lost backend.version/frontend.framework/monorepoTool/GWY-REG-MIG and falsely enabled messaging=rabbitmq; restored via context.py. Also displayName, description, locale.primary

- **Ator:** C:/Program Files/Git/new-project
### 04:17:59 UTC — [PROJECT-INIT] Projeto pronto para desenvolvimento

- **Ator:** C:/Program Files/Git/new-project
### 04:18:22 UTC — [CORRECTION] referência a entrada de 04:17:59

- **Ator:** C:/Program Files/Git/new-project

> NOTA HUMANA: First entry used unknown category DECISION; it is a setup decision record (category SETUP). Business modules also enriched with hasUi/frontendLib/status=planned from the BA project-context (ingest parser does not carry them).
### 12:21:09 UTC — [SETUP] Translated framework-generated files to en-US (user request): 74 files (scripts comments/docstrings only, .claude commands/agents/skills, docs/architecture, templates, checklist). Kept PT: file paths, parsed literals (Evidencias consultadas, Alvos de alteracao, Execucao interrompida, mode tokens, Cenario Gherkin), ~100 script string literals. Lock untouched: 53 files now locally_modified; constitution.md DRIFTED (arch.json sources translated).

- **Ator:** C:/Program Files/Git/new-project
## 2026-11-20

### 02:06:45 UTC — [CORRECTION] PAT authorities canonicalized before scaffold: pat.patient.register->pat.patient.create, pat.gesture-type.register->pat.gesture-type.create (88 occurrences, 38 files: docs+hub+bdd stubs), matching the canonical action vocabulary used by ACS (D-639). Verb calibrate added to the EN table. Catalogue pat = 10 codes, 1:1 with spec authorities.

- **Ator:** C:/Program Files/Git/architecture-autopilot
### 03:45:50 UTC — [CORRECTION] EDGE generator-config fixed before scaffold: added issue_prefix EDGE; CatalogService op read->get (read is an action, not an op verb; derives edge.catalog.read). Catalogue edge = 11 codes (9 spec authorities + device-token.introspect + jwks.read for service/public endpoints). First module scaffolded with D-640 base paths (/edge/devices, /edge/heartbeat, /edge/catalog).

- **Ator:** C:/Program Files/Git/architecture-autopilot
### 04:09:59 UTC — [CORRECTION] EDGE FE issue ids normalized to the project convention: EDGE-FE-NNN -> FE-EDGE-NNN, EDGE-INT-NNN -> INT-FE-EDGE-NNN (60 file renames, 686 references, project + hub), matching FE-ACS/FE-PAT so Layer-2 tooling resolves them. BDD: 29 duplicate step patterns in edge-service (EdgeStepDefs.java vs steps/*Steps.java), 5 in acs-service — recorded in Ledger.

- **Ator:** C:/Program Files/Git/architecture-autopilot
### 11:36:40 UTC — [CORRECTION] EVNT generator-config: resource keys added (D-641) and EscalationAttemptService split out; derived permissions = the 7 contract authorities exactly (evnt.event.ingest/read/confirm/record, evnt.subscription.create/delete, evnt.escalation.read). Catalogue evnt populated. BDD features copied to src/test/resources/features (4 were missing).

- **Ator:** C:/Program Files/Git/architecture-autopilot
### 11:50:18 UTC — [CORRECTION] EVNT BE scaffold made green by orchestrator: Tier enum '0','1','2' -> TIER_0..2 (generator-config + Tier.java); CucumberSpringContext D-215 variant (profile bdd, no props -> http://${acs.base-url} malformed) replaced by the PAT D-532 pattern (extends BaseIntegrationTest); Scenario Outline placeholder quoted. compileJava OK, architecture 13/15 (RULE-09 template bug), bddGate 34/34 (dry-run). ACS+EDGE have the same D-215 context variant (recorded in Ledger).

- **Ator:** C:/Program Files/Git/architecture-autopilot
### 14:03:00 UTC — [CORRECTION] GEST generator-config verified before scaffold: backlog agent claimed all ops derived the 6 authorities but deprecate/declare/supportCheck resolved to None. Fix: EN verb table += declare->create, deprecate->retire (D-639 extension, tested); op supportCheck renamed checkSupport (37 refs, 25 files; contract route /gest/capabilities/support-check unchanged). Catalogue gest = 6 codes == contract.

- **Ator:** C:/Program Files/Git/architecture-autopilot











