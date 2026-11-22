<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposições a Validar
- Dependências Críticas
-->

# 06 — Risks, Gaps and Assumptions

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV

## Riscos

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Authority-string drift** between `@PreAuthorize` and `RoleAuthorityPolicy` (D-535). | 403s or silent over-permission. | Single policy class; controller strings == constants; covered in Specs + tests (INV-PAT-8). |
| R2 | **Registering a `GestureType` ≠ engine support** — a caregiver maps a command to a primitive GEST cannot detect. | Command never fires; false sense of coverage. | ADR-002 makes the catalog a *vocabulary*; GEST owns support truth; UI/Specs must surface the distinction (not a PAT runtime guarantee). |
| R3 | **Catalog read reaching the edge** under ACS INV-3 (patient-session tokens carry only `conv.*`/`gest.*`, no `pat.*`). | Detection agent cannot read the catalog, or a broad authority is granted that weakens isolation. | ADR-004: detection modules read via a service-client identity, not the patient-session token. |
| R4 | **Mis-calibration causing false positives/negatives** (sensitivity / time window). | Missed emergency or alarm fatigue. | Per-command calibration (ADR-003) + re-calibrate flow + HIST audit of every change; thresholds validated (INV-PAT-3). |
| R5 | **Cross-tenant leakage** of patients/commands. | Privacy breach (healthtech). | Tenant from JWT claim only; `404` on cross-tenant; `tenant_id` NOT NULL defence-in-depth. |
| R6 | **Flyway range collision** with another service in the central MIG. | Migration apply failure. | Reserved `V0020+` proposed; confirm against MIG range registry before scaffold (G1). |

## Gaps Conhecidos

- **G1 — Central migration range registry.** PAT proposes `V0020+`; the authoritative
  reserved-range list across all services (ACS used `V0010–V0012`) must be confirmed with
  MIG before Specs/scaffold. `TODO[architect]`.
- **G2 — Cross-schema FK** from per-tenant `command.primary/secondary_primitive_id` to
  global `gesture_type`. Legal within PAT's own schemas but must be validated against how
  the central migrator provisions `t_<tenantId>` vs `neuroassist_global` (ordering,
  search_path). Alternative: no FK, validate the primitive at the application layer.
  Decide in Specs. `TODO[architect]`.
- **G3 — Catalog read protocol for detection actors** (ADR-004) is directional, not yet a
  contract — endpoint shape, caching/ETag, and the service-client authority are finalized
  in Specs.
- **G4 — LGPD erasure/retention** for `patient` data is deferred; the erasure story must
  later reconcile with HIST immutability and id references held by ACS/EDGE/EVNT/CONV.

## Suposições a Validar

- **A1** — ACS is the sole JWT issuer and exposes JWKS + revocation-aware introspection;
  PAT is a pure resource server (confirmed against `../acs-service/contracts/api-contract.md`).
- **A2** — `GestureType` is best modeled as a **global** PAT-owned catalog (ADR-002),
  not per-tenant. If clinics need private primitives, revisit (would move the table to
  per-tenant or add a tenant-scoped overlay).
- **A3** — Calibration (sensitivity + min/max time) belongs on the **command**, not the
  patient (ADR-003) — matches BA `Command` fields.
- **A4** — Downstream modules (GEST/EDGE/EVNT/DASH/CONV) consume PAT **by pull/sync REST**;
  no broker this phase (`stack.messaging.enabled = false`).
- **A5** — `Patient.deviceId` is a nullable opaque reference to EDGE (a patient may exist
  before a device is paired).

## Dependências Críticas

| Dependency | Why critical | Status |
|---|---|---|
| **ACS** (`acs-service`) | JWT issuance, JWKS, tenant claim, authority convention, owns `Caregiver`/`PatientSession`/links; references PAT `Patient` by id | fully architected (consumed) |
| **MIG** (`neuroassist-niv-migrations`) | applies PAT Flyway centrally; owns reserved-range registry | infra, declared |
| **HIST** (`hist-service`) | receives audited domain actions over sync REST | planned (PAT degrades to log-only if unavailable in dev) |
| **GWY / REG** | gateway + discovery fronting `/pat` | infra, declared |
| **EDGE / GEST / EVNT / DASH / CONV** | consumers of PAT contracts (downstream) | planned — PAT must publish stable read contracts (Specs) |
