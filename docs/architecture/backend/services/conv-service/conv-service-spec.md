---
service: conv-service
module: CONV
prefix: CONV
package: com.neuroassist.conv
stack: java
framework: spring-boot
port: 8085
multiTenancy: schema-per-tenant
messaging: disabled
ai: none
---

# CONV — Specs Entry Point

> Module **CONV — Conversation via Speech Tree** · Service `conv-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot, hexagonal (shared `../../adr/ADR-001-hexagonal-architecture.md`,
> key `hexagonal_java`) · Multi-tenant (schema-per-tenant) · Messaging **disabled** · English-only.

CONV **is the patient's voice at runtime**: it serves an approved, immutable, versioned per-patient
speech-tree **bundle** (categories → phrases + audio manifest) behind a strong ETag, streams the
pre-synthesized **cached audio** in the patient's cloned voice, and records an opt-in, minimal usage
signal. CONV never authors content and never synthesizes audio (that is **TRN**), and the patient's
live speaking path **never** makes a synchronous server call (ADR-003/ADR-004, INV-CONV-5).

## Document map

| Area | File |
|---|---|
| API surface | [`contracts/api-contract.md`](contracts/api-contract.md) |
| Data model (canonical DDL) | [`contracts/data-model.md`](contracts/data-model.md) |
| Domain events / audit facts | [`contracts/event-contracts.md`](contracts/event-contracts.md) |
| Hub (ACS/PAT/HIST/MIG) integration | [`contracts/hub-integration.md`](contracts/hub-integration.md) |
| External/internal integration contracts | [`contracts/integration-contracts.md`](contracts/integration-contracts.md) |
| Event catalog | [`events/event-catalog.md`](events/event-catalog.md) |
| SPEC-01..10 | [`spec/backend/`](spec/backend/) |
| BDD features (Gherkin) | [`tests/cucumber/`](tests/cucumber/) |
| C4 diagrams | [`diagrams/`](diagrams/) |
| Local setup | [`setup-local.md`](setup-local.md) |
| Generator config | [`generator-config.yml`](generator-config.yml) |

## Invariants (declared once in `03-initial-domain-framing.md`; cited by id here)

INV-CONV-1 (version immutability) · INV-CONV-2 (one active version per tenant+patient) ·
INV-CONV-3 (no dangling audio) · INV-CONV-4 (ETag = f(contentHash)) · INV-CONV-5 (no server call
on the live speaking path) · INV-CONV-6 (usage: no free text, opt-in, never a HIST fact) ·
INV-CONV-7 (tenant-scoped, resolved `TenantContext`).

## Authorities (ACS INV-3; English verb table — D-639)

| Authority | Token | Op (table verb) | Endpoint |
|---|---|---|---|
| `conv.tree.read` | patient-session | `get` → read | `GET /conv/tree` |
| `conv.audio.read` | patient-session | `get` → read | `GET /conv/audio/{assetId}` |
| `conv.usage.record` | patient-session | `record` | `POST /conv/usage-signals` |
| `conv.tree.publish` | TRN service-client | `publish` | `POST /conv/trees` |
| `conv.tree-version.retire` | TRN service-client | `retire` (= withdraw) | `POST /conv/tree-versions/{versionId}:retire` |
| `conv.audio.delete` | TRN service-client | `delete` (= erase/crypto-shred) | `DELETE /conv/patients/{patientId}/audio` |

> `withdraw`/`erase`/`supersede` are **not** generator verbs; they are expressed as `retire` /
> `delete` and (for supersede) a side-effect inside the `publish` transaction — no new authority.
