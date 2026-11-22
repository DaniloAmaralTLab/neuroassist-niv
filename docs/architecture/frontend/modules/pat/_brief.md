# PAT — Structured Brief (source for Specs / Backlog / Scaffold)

> Module: **PAT — Patients and Command Catalog** · Service: `pat-service` · Project: NeuroAssist NIV
> Stack: `java` (Java 21 / Spring Boot, hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled

1. **Canonical name / prefix:** `pat-service` (canonical `pat`) / prefix `PAT`.

2. **Problem it solves:** NeuroAssist NIV needs one authority that owns *who is being
   assisted* and *what each of their gestures means*. PAT owns the `Patient` record and
   the per-patient **command catalog** — each command maps a facial gesture (a single
   primitive or a compound of two) to a family-defined need, with its own urgency,
   sensitivity and minimum/maximum gesture-time calibration. PAT is the single source of
   truth every detection and notification module reads to know what to detect and how to
   act on it.

3. **Personas:** primary = **Family Caregiver** (`CAREGIVER`, registers the patient,
   authors and calibrates commands); secondary = **Clinic Coordinator**
   (`CLINIC_COORDINATOR`, top tenant role, same catalog authorities plus patient
   lifecycle). The **patient-with-session** actor is *not* a PAT actor — its JWT carries
   only `conv.*` / `gest.*` (ACS INV-3) and never touches the catalog.

4. **MVP scope (minimum viable):** patient registration within the caller's tenant;
   per-patient command catalog CRUD (gesture → need, free-form label, urgency level,
   sensitivity, min/max gesture time); independent per-command calibration; compound
   gestures (primary + optional secondary primitive); a PAT-owned global catalog of
   gesture-type primitives (read + seed); read contracts exposing the active catalog and
   command metadata to the downstream detection/notification modules (EDGE, GEST, EVNT,
   DASH, CONV); audited domain actions to HIST over sync REST.

5. **Out of MVP scope:** the detection engine itself and whether a registered gesture
   type is actually supported by it (owned by GEST — registering a `GestureType` name
   does **not** imply real support); event generation and alarm routing (EVNT); edge
   device identity, pairing and heartbeat (EDGE); caregiver identity, roles and
   caregiver↔patient links (ACS); speech-tree content (CONV/TRN); dedicated LGPD
   erasure mechanisms (deferred under internal-network-only, inherited OPS constraint);
   broker-based event publication (messaging disabled this phase).

6. **Mandatory external integrations:** none external in the MVP. Internal-network only;
   TLS outside localhost. Intra-project relationships are **sync REST**: PAT is an ACS
   resource server (validates ACS-issued JWT via JWKS); PAT → HIST (audit); PAT → MIG
   (migrations authored here, applied centrally); EDGE/GEST/EVNT/DASH/CONV → PAT (catalog
   and patient reads). PAT references `Caregiver` (ACS), `EdgeDevice` (EDGE) and
   `PatientSession` (ACS) **by id only** — no cross-service ownership duplication, no FK.

7. **TechLab AI services depended on:** none (`ai.hasAi = false`). Messaging disabled, so
   no event dependency on other modules; events are audited domain actions delivered to
   HIST over synchronous REST (mirrors ACS). When a broker is later introduced, these
   action names become the published event names without renaming.

8. **Anchor domain event:** **CommandCalibrated** (a caregiver defining or re-tuning a
   gesture→need command for a patient — the core value act of PAT), with **PatientRegistered**
   as the foundational supporting event.

## Source material this module reconciles

- **ACS (fully architected)** — `../acs-service/` contracts, events, ADRs. PAT trusts
  ACS JWT (`tenantId`, `actorType`, `authorities`), reuses its authority-string convention
  `<module>.<resource>.<action>`, and owns the `Patient` that ACS references by id in
  `caregiver_patient_link`.
- **Shared ADRs (project-level, not re-emitted):** `../../adr/ADR-001-hexagonal-architecture.md`,
  `../../adr/ADR-002-modular-monolith.md`, `../../adr/ADR-003-multi-tenancy.md`.
- **BA data model (draft 0.1.0):** entities `Patient`, `Command`, `GestureType` are
  PAT-owned; `Event`, `EdgeDevice`, `PatientSession`, `Caregiver`, `Tenant`,
  `SpeechTreeNode` are owned elsewhere and referenced by id.

## Local ADRs emitted by this phase

- ADR-001 — PAT service boundary: single service.
- ADR-002 — Gesture-type catalog placement: PAT-owned global primitive vocabulary.
- ADR-003 — Command calibration and gesture composition model.
- ADR-004 — Command catalog distribution to detection actors.

## Known generator pitfalls applied proactively (Learning Layer)

- **Authority-string drift (D-535):** controller `@PreAuthorize` strings must equal the
  single `RoleAuthorityPolicy` constants. Canonical `pat.<resource>.<action>` verbs fixed
  in doc 02/03 (`register`, `read`, `create`, `update`, `calibrate`, `delete`,
  `activate`, `deactivate`), every state-changing verb on POST/PATCH/DELETE — mirroring
  the ACS convention exactly.
