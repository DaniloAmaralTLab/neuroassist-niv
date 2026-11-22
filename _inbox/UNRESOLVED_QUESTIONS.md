# Unresolved questions — discovery ingestion (D-073)

> Source: `D:\01_Trabalho\Cybersoft\TechLab IA\techlab-ba\projects\neuroassist-niv`
> Generated at: 2026-11-19T04:15:40Z

The discovery ingestion populated `project-context.json` with the fields it could extract confidently. The items below need human input before running `/new-project P1`. Edit `project-context.json` directly, then proceed.

## Open items

1. **stack.elastic.indices** — Elasticsearch detected but no index registry declared. Add `stack.elastic.indices` to the handoff §7.1 YAML block with one entry per index. Example:
  stack.elastic.indices:
    - { slug: "entities", displayName: "Entities", class: "dimension", domainContext: "MODULE" }
    - { slug: "events", displayName: "Events", class: "fact", domainContext: "MODULE" }
Required fields: slug (kebab-case), displayName, class (dimension|fact). When present, P2 emits index-design-<slug>.md + query-capability-<slug>.md per index automatically (D-303).

## Field provenance

Which input file each extracted field came from:

- `_extensions.compliance` ← `business/constraints.md`
- `_extensions.data_model` ← `design/data-model.json`
- `_extensions.frontend_reference` ← `design/ (angular-prototype + design-system)`
- `_extensions.lbc_personas` ← `business/lean-business-case.md`
- `_extensions.wireframe` ← `design/wireframe.md`
- `growth` ← `handoff-package.md (§7.1 growth:)`
- `modules.registry` ← `handoff-package.md`
- `multiTenancy.globalSchema` ← `handoff-package.md`
- `multiTenancy.isolationStrategy` ← `handoff-package.md (D-293 derived)`
- `multiTenancy.mode` ← `handoff-package.md (D-293 normalized: isolation/term decoupled, mode from LBC classification)`
- `multiTenancy.term` ← `handoff-package.md (D-293 derived)`
- `project.codeName` ← `handoff-package.md`
- `project.description` ← `business/lean-business-case.md`
- `project.displayName` ← `business/lean-business-case.md`
- `project.issuePrefix` ← `handoff-package.md`
- `project.name` ← `handoff-package.md`
- `project.rigorLevel` ← `handoff-package.md`
- `project.segment` ← `handoff-package.md`
- `stack.backend.framework` ← `handoff-package.md`
- `stack.backend.language` ← `handoff-package.md`
- `stack.backend.packageBase` ← `handoff-package.md`
- `stack.database.engine` ← `handoff-package.md`
- `stack.frontend.enabled` ← `design/wireframe.md`
- `stack.frontend.npmScope` ← `handoff-package.md`
- `stack.messaging.enabled` ← `architecture/adr/ADR-006-hybrid-edge-cloud-architecture.md`
- `stack.messaging.engine` ← `architecture/adr/ADR-006-hybrid-edge-cloud-architecture.md`
- `stack.search.engine` ← `handoff-package.md`

## ADRs preserved

18 ADR file(s) copied verbatim to `_inbox/adr/` as discovery history. The framework's own ADR generation produces a parallel set under `docs/architecture/backend/adr/` in P2.

- `_inbox/adr/ADR-001-backend-jvm-java.md`
- `_inbox/adr/ADR-002-embedded-ai-edge.md`
- `_inbox/adr/ADR-003-multi-tenancy-schema-per-tenant.md`
- `_inbox/adr/ADR-004-hexagonal-architecture.md`
- `_inbox/adr/ADR-005-frontend-angular-nx.md`
- `_inbox/adr/ADR-006-hybrid-edge-cloud-architecture.md`
- `_inbox/adr/ADR-007-light-theme-default-design-system-exception.md`
- `_inbox/adr/ADR-008-typed-event-via-command.md`
- `_inbox/adr/ADR-009-extensible-gesture-type-catalog.md`
- `_inbox/adr/ADR-010-single-event-no-separate-active-table.md`
- `_inbox/adr/ADR-011-reopening-adr-009-tenant-onboarding.md`
- `_inbox/adr/ADR-012-patient-identity-model-persistent-session.md`
- `_inbox/adr/ADR-013-conv-module-new-vs-pat-extension.md`
- `_inbox/adr/ADR-014-gest-mobile-and-pairing-reuse.md`
- `_inbox/adr/ADR-015-elasticsearch-semantic-search-conv.md`
- `_inbox/adr/ADR-016-llm-training-phase-speech-tree.md`
- `_inbox/adr/ADR-017-tts-elevenlabs-audio-cache.md`
- `_inbox/adr/ADR-018-english-only-product.md`
