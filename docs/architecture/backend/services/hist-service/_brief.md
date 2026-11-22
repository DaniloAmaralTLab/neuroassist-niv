# HIST — Structured Brief

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV
> Source brief for `/be-architect-specs`, `/be-architect-backlog`, `/be-architect-scaffold`.
> Stack: Java 21 / Spring Boot, hexagonal. Multi-tenant, schema-per-tenant. English-only product.

HIST is **already a contracted downstream**: five built modules (ACS, PAT, EDGE, EVNT,
GEST) already specified `POST {hist.baseUrl}/audit` against it. This brief starts from
what upstream specified, it does not invent a new ingress.

## 1. Canonical name and prefix

- Prefix: `HIST` · canonical/path name: `hist` · service: `hist-service`.

## 2. Problem it solves

A neuro-assistive care platform must keep an **immutable, tamper-evident record** of
every safety-relevant action (alarms, confirmations, feedback, escalations, detection
lapses, device and access lifecycle, catalog calibration) so caregivers can review what
happened, clinicians can be held to an audit trail, and the operator can answer
"who did what, when, to whom" for a health-data system under LGPD/GDPR-style duties.
Without a single append-only sink, each producer would keep partial, mutable, unverifiable
logs and the platform would have no trustworthy history to show a caregiver or a regulator.

## 3. Personas

- **Primary — Family Caregiver / Clinic Coordinator** (`FAMILY_CAREGIVER`): reads the
  patient-scoped history of events, alarms, confirmations, edits and escalation attempts
  (including detection lapses) through the dashboard (DASH).
- **Secondary — Platform / Compliance operator**: queries the audit trail for incident
  reconstruction, access reviews and data-subject requests.
- **Non-human producers**: ACS, PAT, EDGE, EVNT, GEST services (audit writers) and the
  DASH read surface (history reader).

## 4. MVP scope (in)

- A single synchronous audit ingest endpoint `POST /audit` accepting the shared audit
  envelope from all five producers, **reconciled** to one canonical shape.
- Append-only persistence of audit records with an immutability guarantee (ADR-002).
- Idempotent ingest so a request retry does not double-write (ADR-003).
- Caregiver-facing, patient-scoped **history read API** (events, alarms, confirmations,
  edits, escalation attempts incl. detection lapses) consumed by DASH.
- Tenant-isolated storage of tenant-scoped facts; a defined home for global-schema facts
  (GEST) (ADR-004).
- A confirmed, project-wide **audit-write failure policy** that closes the five upstream
  `TODO[architect]` items (ADR-005).

## 5. Out of scope (MVP)

- Cross-patient / cross-tenant analytics and aggregation dashboards (owned by DASH).
- The live unconfirmed-alarm projection (owned by EVNT — HIST is the durable store, not
  the live channel).
- Any write path from the frontend to HIST (FE never calls HIST directly — confirmed by
  the EVNT FE decision; acknowledge is audited server-side by evnt-service).
- Export/reporting pipelines, long-term cold archival tooling, broker-based ingestion
  (messaging is disabled project-wide).
- Erasure/retention automation beyond the policy decision recorded in ADR-006.

## 6. Mandatory external integrations

- **Inbound (audit writers)**: ACS, PAT, EDGE, EVNT, GEST over sync REST → `POST /audit`.
- **Inbound (history readers)**: DASH (and the caregiver dashboard via DASH) over sync REST.
- **Auth**: ACS as identity provider (JWT validation via JWKS / introspection); service
  clients authenticate for server-to-server audit writes.
- **Migrations**: centralized Flyway applied by `neuroassist-niv-migrations` (MIG).
- No message broker (`stack.messaging.enabled = false`); no TechLab AI dependency
  (`ai.hasAi = false`).

## 7. TechLab AI / inter-module dependencies

- TechLab AI services: **none** (`ai.hasAi = false`).
- Messaging: **disabled** — all coupling is synchronous REST. HIST is a **synchronous
  dependency of every write path** in the platform (see §8 and ADR-005 blast radius).
- Upstream producers: ACS, PAT, EDGE, EVNT, GEST (write). Downstream reader: DASH (read).

## 8. Domain anchor event

- **Anchor: `AuditRecordAppended`** — the central noun+verb of the domain: an immutable
  audit record is appended to the trail. Every producer fact (36 catalogued across five
  producers) materializes as one appended, never-updated audit record.
