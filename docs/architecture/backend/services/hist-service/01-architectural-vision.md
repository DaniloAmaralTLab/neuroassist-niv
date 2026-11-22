<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV

## Intent

HIST is the platform's single **append-only system of record**. It serves two
responsibilities that share one immutable store:

1. **Audit sink** — the synchronous target of `POST {hist.baseUrl}/audit` for all five
   producing modules (ACS, PAT, EDGE, EVNT, GEST), recording every state-changing domain
   action as an immutable, attributable audit record.
2. **Caregiver-facing history** — the read side of the patient-scoped timeline (events,
   alarms, confirmations, edits, escalation attempts including detection lapses) consumed
   by the dashboard (DASH).

HIST is a **contracted downstream**: the ingress already exists in the five producers'
`event-contracts.md`. This vision reconciles those contracts, closes the five open
`TODO[architect]` failure-policy items, and surfaces the safety/compliance decisions the
producers deferred — it does not invent a new API.

## Problem Statement

A neuro-assistive platform for people with ALS/MND handles safety-critical events (an
emergency alarm is a request for help) and sensitive health data. It needs a trustworthy,
non-repudiable history: a caregiver must be able to review "what happened and who
confirmed it", and the operator must answer "who did what, when, to whom" for incident
reconstruction and data-subject duties. Each producer currently promises to record its
actions to HIST but HIST does not yet exist — so the failure semantics, immutability
guarantee, idempotency, tenant placement and retention of that record are **undecided**.
Until HIST pins them, every producer's write path has an unresolved dependency.

## Personas

| Persona | Type | Relationship to HIST |
|---|---|---|
| Family Caregiver / Clinic Coordinator (`FAMILY_CAREGIVER`) | Primary (human) | Reads patient-scoped history via DASH |
| Platform / Compliance operator | Secondary (human) | Queries audit trail for incident/access review and DSR handling |
| ACS, PAT, EDGE, EVNT, GEST | Non-human producers | Write audit records synchronously |
| DASH | Non-human reader | Reads history for the caregiver dashboard |

## MVP Scope

- **In** — one synchronous `POST /audit` ingest accepting the reconciled shared envelope
  from all five producers; append-only persistence with an immutability guarantee;
  idempotent ingest keyed on a producer-supplied composite key; a patient-scoped history
  read API for DASH; tenant-isolated storage for tenant-scoped facts plus a defined home
  for global-schema (GEST) facts; a confirmed project-wide audit-write failure policy.

## Out of Scope

- Cross-patient / cross-tenant analytics and aggregation (DASH owns this).
- The live unconfirmed-alarm projection and live delivery (EVNT owns this; HIST is the
  durable store, not the live channel).
- Any frontend → HIST write path (FE never calls HIST; acknowledge is audited server-side
  by evnt-service — confirmed by the EVNT FE decision).
- Broker-based ingestion (messaging disabled project-wide), export/reporting pipelines,
  and cold-archival tooling.
- TechLab AI features (`ai.hasAi = false`).

## Architectural Principles

1. **Append-only, never mutate.** An audit record is written once; there is no update or
   delete on the ingest path. Corrections are new records, not edits (ADR-002).
2. **Reconcile, do not re-contract.** The ingress shape is derived from the five producer
   contracts; HIST normalizes their divergences rather than forcing a new envelope.
3. **Idempotent by construction.** A producer request retry must not create a second
   record (ADR-003) — producers do not retry across requests, but a single request retry
   can double-write.
4. **Fail safe for safety, fail closed for integrity.** The failure policy is explicit and
   project-wide (ADR-005); the availability blast radius of a synchronous audit dependency
   is stated, not hidden.
5. **Isolation preserved, globals located.** Tenant-scoped facts stay tenant-isolated;
   global-schema facts (GEST) have one defined home (ADR-004).
6. **Immutable under compliance.** Retention and data-subject erasure are reconciled so
   the audit trail stays immutable while health data obligations are met (ADR-006).

## Success Signals

- All five producers' `POST /audit` calls succeed against one reconciled envelope, with no
  per-producer special-casing on the write path other than the documented divergences.
- Zero duplicate audit records under request retry (idempotency verified).
- The five upstream `TODO[architect]` failure-policy items are closed by a single ADR.
- A caregiver can read a correct, ordered, patient-scoped history through DASH.
- An operator can reconstruct an incident end-to-end by `correlationId`.
- No audit record is ever updated or deleted on the ingest path (immutability holds).
