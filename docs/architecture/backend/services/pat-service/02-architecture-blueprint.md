<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging disabled.

## System Boundary

PAT is a single Spring Boot resource server fronted by GWY (API Gateway). It owns three
things and nothing else:

- the **`Patient`** aggregate (per-tenant),
- the **`Command`** aggregate — gesture→need mapping + per-command calibration (per-tenant),
- the **`GestureType`** primitive catalog (PAT-owned, global vocabulary — ADR-002).

Everything else is referenced by id: `Caregiver` / `PatientSession` (ACS), `EdgeDevice`
(EDGE). PAT validates ACS-issued JWTs as a resource server (JWKS); it never issues
tokens. Base path `/pat`.

**What PAT exposes to the rest of the system:**

| Consumer | Reads from PAT | Purpose |
|---|---|---|
| GEST (detection) | active command catalog for a patient: primitives, min/max gesture time, sensitivity | what to detect and the thresholds to detect it at |
| EDGE (device agent) | command catalog bound to a device's patient | load the catalog onto the local agent |
| EVNT (events/alarms) | command by id: `urgency`, free-form `label` | craft the alarm/notification and its priority |
| DASH (dashboard) | patients + commands | review and calibration UI |
| CONV (speech tree) | patient by id (reference) | associate communication content with the patient |

## External Actors and Systems

| Actor / System | Type | Interaction |
|---|---|---|
| Family Caregiver / Clinic Coordinator | human (via DASH → GWY) | authors patients and commands; bearer caregiver JWT |
| ACS (`acs-service`) | internal service | JWT issuer + JWKS; introspection for revocation-aware validation |
| HIST (`hist-service`) | internal service | receives audited domain actions over sync REST |
| MIG (`neuroassist-niv-migrations`) | internal service | applies PAT-authored Flyway scripts centrally |
| GEST / EDGE / EVNT / DASH / CONV | internal services | catalog & patient reads (consumers) |
| GWY (`api-gateway`) | infrastructure | fronts `/pat`, generates `X-Correlation-Id` if absent |

No external third-party systems in the MVP (internal-network only; TLS outside localhost).

## End-to-End Flows

The golden path authors a calibrated command; alternatives cover re-calibration,
retirement and the rejected patient-session path.

### Golden path — author and calibrate a command

1. Caregiver (authenticated, caregiver JWT) registers a patient:
   `POST /pat/patients` → `201` with `patientId`; PAT derives `tenantId` from the JWT
   claim, audits `PatientRegistered` to HIST.
2. Caregiver reads the primitive vocabulary: `GET /pat/gesture-types` → the global
   `GestureType` catalog.
3. Caregiver creates a command:
   `POST /pat/patients/{patientId}/commands` with `label` ("suction"), `urgency`
   (`emergency`), `sensitivity` (`medium`), `primaryPrimitive`, optional
   `secondaryPrimitive`, `minGestureTimeMs`, `maxGestureTimeMs` → `201`; PAT audits
   `CommandCalibrated` (anchor) to HIST.
4. GEST/EDGE later read `GET /pat/patients/{patientId}/commands?status=active` and load
   the thresholds onto the local detection agent.

### Alternative — re-calibrate as the gesture weakens

1. Caregiver observes false positives; `PATCH /pat/commands/{commandId}` adjusts
   `sensitivity` / `maxGestureTimeMs` → `200`; PAT audits `CommandCalibrated`.
2. Next GEST read returns the new thresholds — no deployment, no change elsewhere.

### Alternative — retire a command

1. `DELETE /pat/commands/{commandId}` → soft-retire (`status = retired`, row retained)
   → `204`; PAT audits `CommandRetired`. The command stops appearing in the active
   catalog read; historical events in HIST keep referencing it by id.

### Rejected path — patient-session token

1. A request bearing a `patient-session` JWT (authorities `conv.*`/`gest.*` only) hits
   any `/pat` endpoint → `403 Forbidden` (no `pat.*` authority). The catalog is
   caregiver-authored; the patient never edits it.

## Internal Boundaries

Hexagonal layering (shared `ADR-001-hexagonal-architecture`, key `hexagonal_java`):

- **api/** — REST controllers, request/response DTOs, mappers; `@PreAuthorize` strings
  equal to `RoleAuthorityPolicy` constants.
- **application/** — use-case services (`RegisterPatient`, `CalibrateCommand`,
  `RetireCommand`, `ReadCatalog`), `@Transactional` boundary, HIST audit orchestration.
- **domain/** — `Patient`, `Command`, `GestureType`, value objects (`CalibrationWindow`,
  `UrgencyLevel`, `Sensitivity`, `GestureComposition`), ports (repository + HIST + ACS
  introspection interfaces). No framework imports.
- **infrastructure/** — JPA adapters (schema-per-tenant routing), HTTP/Feign clients
  (HIST, ACS JWKS/introspect), Spring Security resource-server config.

Dependency rule: `domain` imports nothing outward; `application` depends on `domain`;
`api` and `infrastructure` depend inward.

## Cross-cutting Concerns

- **Security.** Resource server validating ACS JWT via JWKS; revocation honored via ACS
  `/acs/auth/introspect` (blacklist-aware) for sensitive reads. Authorities
  `pat.<resource>.<action>` (doc 03 §authority matrix). `X-Tenant-Id` header ignored;
  tenant from JWT `tenantId` claim only.
- **Multi-tenancy.** `Patient` and `Command` live in `t_<tenantId>`; `GestureType` is
  global (`neuroassist_global`). Schema routing per request from the JWT claim
  (shared `ADR-003-multi-tenancy`). `tenant_id` retained NOT NULL on per-tenant tables
  for defence-in-depth.
- **Observability.** `X-Correlation-Id` propagated end-to-end and echoed on every HIST
  audit call; structured logs; no PHI beyond the family-chosen free-form label.
- **Error model.** RFC 7807 `application/problem+json` with stable `type` URIs and
  `correlationId` (mirrors ACS §6).
- **Audit / events.** Messaging disabled → domain actions are audited to HIST over sync
  REST; action names are future broker event names (doc 04 §6).
