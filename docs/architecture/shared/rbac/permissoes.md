# Permission Catalog — NeuroAssist NIV

> Canonical list of permissions in the `<module>.<resource>.<action>` namespace.
> Applied in V1 of `neuroassist-niv-migrations` (table `neuroassist_global.permissao`).
> Bundle per role: [`papeis.md`](papeis.md).
>
> **Source of truth:** `templates/architecture/decisions/permission-catalogue.arch.json` (D-060).
> This markdown is generated deterministically. Do not edit by hand — the next render overwrites it.

## Conventions

- **3-part namespace (general rule):** `<module>.<resource>.<action>` (snake/kebab-case, always lowercase).
- **4 parts** when the resource has a natural sub-resource (e.g., `cad.vendedor.comissao.config`).
- **Modules** (canonical prefixes): `gwy, reg, mig, gest, evnt, pat, acs, hist, dash, edge, conv, trn`.
- **Canonical actions**: `read`, `criar`, `editar`, `excluir`, `cancelar`, `aprovar`, `emitir`, etc. (domain verbs in pt-BR — see `arch_decisions._OP_VERB_TO_ACTION` for the `op-name → action` mapping).
- **Wildcards forbidden in production** — one line per permission (audit needs to trace).

## GWY — API Gateway

Spring Cloud Gateway

```
```

## REG — Service Registry

Eureka

```
```

## MIG — Migrations

Centralized Flyway (all schemas)

```
```

## GEST — Gesture Detection (Edge)

Webcam capture, facial landmark extraction and multi-class classification of the active command (simple gesture or compound of multiple primitives), executed locally on the patient's device.

```
```

## EVNT — Events and Alarms

Generation of the structured event matching the recognized command, orchestration of notification by urgency level (full-screen alarm for emergency; discreet for routine) and routing to the guardian.

```
```

## PAT — Patients and Command Catalog

Patient registration and command catalog (gesture -> action, free-form label defined by the family, sensitivity, minimum/maximum gesture time and urgency level), independently calibratable per command.

```
```

## ACS — Caregivers and Access

Management of caregivers/users, roles and links to patient(s); basis of the multi-tenant model (tenant = family or clinic).

```
```

## HIST — History and Audit Trail

Immutable record of events, alarms and confirmation/edit actions, with an audit trail.

```
```

## DASH — Dashboard and Notifications

Web dashboard (Angular) for the caregiver to review history, calibrate sensitivity and receive notifications.

```
```

## EDGE — Edge Device Integration

Registration, pairing and heartbeat monitoring of the local (edge) agent that runs gesture detection.

```
```

## CONV — Conversation via Speech Tree

Speech tree navigable by category → phrase, with an input-channel-agnostic design (gesture via GEST or direct touch/mouse). The runtime uses pure retrieval (Elasticsearch/kNN) for assisted semantic search; voice output via pre-synthesized, cached TTS audio (ElevenLabs, the patient's voice); English-only content.

```
```

## TRN — AI-Assisted Training (Speech Tree Authoring)

Phase separate from the daily use of CONV: an LLM (Claude/Anthropic) converses with the caregiver and the patient (collaborative flow, dual authorization) to propose new categories/phrases; approved content is indexed in Elasticsearch and has audio synthesized via ElevenLabs. It does not take part in the patient's communication runtime.

```
```

## Total

**0 canonical permissions** distributed across 12 modules. The number grows with each new resource — update the JSON (not this markdown).

## Automatic validation

- The generator (`scripts/be-module-generator.py`) validates at scaffold time that every permission referenced in `@PreAuthorize` is in this catalog (D-060). Ops whose verb does not map to any canonical action in `arch_decisions._OP_VERB_TO_ACTION` fail with an explicit error.
- `scripts/arch_decisions.py validate --aspect permission-catalogue` checks duplicates, consistent prefixes and `_schema_version`.
- `cross_validate_rbac_against_catalogue(rbac, catalogue)` checks that every permission listed in `roles[*].permission_bundle` (kind=`list`) is in the catalog.

## How to add a new permission

1. Edit `templates/architecture/decisions/permission-catalogue.arch.json` — add an entry in `modules[prefix=<modulo>].permissions`.
2. Bump `version` (semver) and `last_changed`.
3. Validate: `python scripts/arch_decisions.py validate`.
4. Re-render this document (`new-project` P2 or equivalent command).
5. If the BE needs to allow the permission to be used by some role, edit `rbac.arch.json` `roles[*].permission_bundle`.
6. Migration: add `INSERT INTO neuroassist_global.permissao` in `V<N>__iam_permissao_<codigo>.sql`.
7. Bump `neuroassist_global.modelo_acesso_versao` to invalidate the cache.

## Anti-patterns

- ❌ Editing this markdown directly — it is generated. The next render overwrites it.
- ❌ Inventing an ad-hoc permission in code without registering it in the JSON — breaks audit + cache + generator validation.
- ❌ Generic permission `*` or `<modulo>.*` in `papel_permissao` — always individual at runtime; wildcards are only accepted in the expansion of `permission_bundle` at generation time.
- ❌ Forgetting to bump `neuroassist_global.modelo_acesso_versao` after adding a permission — an old JWT stays valid with an outdated model.
- ❌ Renaming a permission after it has been applied in production — always create a new one + deprecate the old one (deprecate over N versions).
