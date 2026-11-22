---
service: pat-service
module: PAT
moduleName: Patients and Command Catalog
project: neuroassist-niv
stack: java
framework: spring-boot
packageRoot: com.neuroassist.pat
httpPort: 8082
multiTenancy: schema-per-tenant
messaging: disabled
hub: none
anchorEvent: CommandCalibrated
status: specs
generatedBy: /be-architect-specs
---

# PAT — Service Spec (entry point)

**Module:** PAT — Patients and Command Catalog · **Service:** `pat-service` · **Stack:**
Java 21 / Spring Boot (hexagonal). PAT is the single authority over *who is being assisted*
and *what each of their gestures means*: it owns the `Patient` aggregate, the per-patient
`Command` catalog (gesture → need + per-command calibration), and the global `GestureType`
primitive vocabulary. It is an **ACS resource server** (validates JWT via JWKS; issues no
token) and the source of truth the detection and notification modules read. Base path `/pat`.

## Document map

| Area | File |
|---|---|
| Brief | `_brief.md` |
| Vision | `01-architectural-vision.md` … `06-risks-gaps-assumptions.md` |
| ADRs (local) | `adr/ADR-001-service-boundary-single-service.md`, `adr/ADR-002-gesture-type-catalog-placement.md`, `adr/ADR-003-command-calibration-model.md`, `adr/ADR-004-catalog-distribution.md` |
| Shared hexagonal ADR | `../../adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`) |
| Contracts | `contracts/api-contract.md`, `contracts/data-model.md`, `contracts/event-contracts.md`, `contracts/hub-integration.md`, `contracts/integration-contracts.md` |
| Events | `events/event-catalog.md` |
| Specs | `spec/backend/SPEC-01..10.md` |
| BDD | `tests/cucumber/*.feature`, `spec/backend/SPEC-08-bdd-test-scenarios.md` |
| Diagrams | `diagrams/c4-context.puml`, `diagrams/c4-container.puml`, `diagrams/c4-component.puml` |
| Local setup | `setup-local.md` |

## Invariants (declared once — cited as INV-PAT-n across specs)

Declared in `03-initial-domain-framing.md` §Invariants (authoritative source):

- **INV-PAT-1** — every `Patient`/`Command` row carries NOT NULL `tenantId` from the JWT claim (never body / `X-Tenant-Id`).
- **INV-PAT-2** — a `Command` belongs to exactly one `Patient` of the same tenant; cross-tenant → `404`.
- **INV-PAT-3** — `minGestureTimeMs ≤ maxGestureTimeMs`, both `> 0`.
- **INV-PAT-4** — `primaryPrimitive` required + existing `GestureType`; `secondaryPrimitive` (if any) distinct + existing (application-layer check, G2).
- **INV-PAT-5** — `retired` is terminal; excluded from the active catalog; never silently reactivated.
- **INV-PAT-6** — a `GestureType` is a vocabulary name only; it asserts no detection-engine support (GEST owns that).
- **INV-PAT-7** — every `/pat` endpoint requires a `pat.*` authority; a patient-session token (`conv.*`/`gest.*` only) is `403`.
- **INV-PAT-8** — controller `@PreAuthorize` strings equal `RoleAuthorityPolicy` constants exactly (D-535).

## Authorities (canonical — SPEC-06)

`pat.patient.create`, `pat.patient.read`, `pat.patient.deactivate`, `pat.patient.activate`,
`pat.command.create`, `pat.command.read`, `pat.command.calibrate`, `pat.command.retire`,
`pat.gesture-type.read`, `pat.gesture-type.create`.

## Resolved gaps (from doc 06)

- **G1** — Flyway reserved range: PAT reserves **`V0020`–`V0022`** (collision-free vs ACS `V0010`–`V0012`). `data-model.md` §5.
- **G2** — cross-schema FK `command → gesture_type`: **dropped**; primitive existence validated at the application layer (INV-PAT-4). `data-model.md` §2.3.
- **G3** — ADR-004 catalog read contract: endpoint `GET /pat/patients/{id}/commands?status=active` + `ETag`/`If-None-Match`/`304`; detection reads via **service-client** `pat.command.read` (never the patient-session token). `SPEC-03`, `ADR-004`.

## Anchor

Anchor action **`CommandCalibrated`** (create or re-tune of a command); foundational supporting
action **`PatientRegistered`**. Messaging disabled → audited to HIST over sync REST.
