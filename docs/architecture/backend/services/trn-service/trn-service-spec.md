---
service: trn-service
module: TRN
prefix: TRN
package: com.neuroassist.trn
stack: java
framework: spring-boot
port: 8089
multiTenancy: schema-per-tenant
messaging: disabled
ai: none
flywayBlock: V0080-V0089
---

# TRN — Specs Entry Point

> Module **TRN — AI-Assisted Training (Speech Tree Authoring)** · Service `trn-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot, hexagonal (shared `../../adr/ADR-001-hexagonal-architecture.md`,
> key `hexagonal_java`) · Multi-tenant (schema-per-tenant) · Messaging **disabled** · English-only.

TRN is the **authoring phase**, deliberately separate from the daily CONV runtime. An LLM (Anthropic
Claude, behind `LlmDialogPort`) converses with the **caregiver and patient** in a **dual-authorized**
flow to *propose* categories/phrases; nothing the LLM writes is ever auto-published (human-in-the-loop,
INV-TRN-2). Only content both parties approve is synthesized in the patient's cloned voice (ElevenLabs,
`TtsPort`), indexed in Elasticsearch (`SearchIndexPort`, approved-only, tenant-isolated, authoring-side)
and **pushed to CONV** as an immutable tree version. **TRN never sits on the patient's live path** — a
TRN or vendor outage never affects CONV runtime (INV-TRN-9).

## Document map

| Area | File |
|---|---|
| API surface | [`contracts/api-contract.md`](contracts/api-contract.md) |
| Data model (canonical DDL) | [`contracts/data-model.md`](contracts/data-model.md) |
| Domain events / audit facts | [`contracts/event-contracts.md`](contracts/event-contracts.md) |
| Hub (ACS/PAT/HIST/CONV/MIG) integration | [`contracts/hub-integration.md`](contracts/hub-integration.md) |
| External/internal integration contracts + INT-TRN items | [`contracts/integration-contracts.md`](contracts/integration-contracts.md) |
| Event catalog | [`events/event-catalog.md`](events/event-catalog.md) |
| SPEC-01..10 | [`spec/backend/`](spec/backend/) |
| BDD features (Gherkin) | [`tests/cucumber/`](tests/cucumber/) |
| C4 diagrams | [`diagrams/`](diagrams/) |
| Local setup | [`setup-local.md`](setup-local.md) |

## Invariants (declared once, cited everywhere — doc 03 §Invariants)

| Id | Rule |
|---|---|
| INV-TRN-1 | `approved` requires both caregiver confirmation and patient/guardian assent, by **distinct** actors (ADR-002). |
| INV-TRN-2 | No LLM-generated content is ever published; the `approved` gate is human-only; LLM output is data, never instruction (ADR-003/004). |
| INV-TRN-3 | Synthesis requires a `granted`, non-revoked voice-cloning consent (patient + legal rep) (ADR-005). |
| INV-TRN-4 | TRN never publishes a version whose phrase references an unsynthesized `assetId` (CONV rejects dangling `422`). |
| INV-TRN-5 | Only `approved`/`published` content is indexed in Elasticsearch — never drafts or raw LLM output (ADR-006). |
| INV-TRN-6 | One approval → at most one CONV publication; republish idempotent on `trn:publish:<approvalId>`. |
| INV-TRN-7 | Data sent to Anthropic carries no name, PHI or free-text identifier — `patientId` only (ADR-004, LGPD). |
| INV-TRN-8 | All authoring data + the ES index are tenant-scoped; access requires a resolved `TenantContext`. |
| INV-TRN-9 | Erasure/consent-revocation facts are never blocked by a HIST/CONV outage; a TRN/vendor outage never affects CONV runtime. |

## Decisions (revisable — recorded in the vision ADRs, status `aceita`)

ADR-001 single service · ADR-002 dual-authorization (Option C; patient assent is an in-session domain
fact, **not** a `trn.* ` authority — ACS INV-3 untouched; the scoped-`trn.*`-on-patient-token
alternative is recorded as **revisable future option R1**, not implemented) · ADR-003 proposal lifecycle
+ human gate · ADR-004 LLM boundary + PII minimisation · ADR-005 ElevenLabs TTS boundary + consent +
erasure · ADR-006 ES indexing (approved-only, authoring-side, tenant-isolated) · ADR-007 persistence +
audit classes + provider-failure policy.

## Key facts

- **Port 8089** (8086 is EVNT). Map: GWY 8080, ACS 8081, PAT 8082, HIST 8083, EDGE 8084, CONV 8085,
  EVNT 8086, GEST 8088, **TRN 8089**, REG 8761.
- **Flyway block `V0080–V0089`** (CONV `V0070–V0079`; MIG baseline `V0001–V0009` — reconciled, no
  collision). `V0089` seeds the 12 `trn.*` authorities in `neuroassist_global`.
- **Authorities (12):** `trn.session.create/read`, `trn.proposal.read/update/approve/reject`,
  `trn.publication.create/read`, `trn.consent.create/read/revoke`, `trn.content.delete` — all computed
  with the D-639 English verb table (SPEC-06).
- **Service-client (held by TRN):** `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`,
  `hist.audit.record`, `pat.patient.read`.
