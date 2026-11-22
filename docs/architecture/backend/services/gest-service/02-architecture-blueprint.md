<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Module: **GEST — Gesture Detection (Edge)** · Service: `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## System Boundary
`gest-service` is a thin Spring Boot service whose boundary is the **detection-engine capability
registry**: engine-version records and the `(engineVersion, gestureTypeCode) → supportStatus` matrix
that INV-PAT-6 assigns to GEST. Inside the boundary: the capability and engine-version aggregates,
their read surface, and the admin write surface. **Outside the boundary** (and explicitly not GEST's):
detection runtime (station frontend), the command catalog (PAT), device identity and offline catalog
(EDGE), event ingestion (EVNT), identity/token minting (ACS).

Base path: `/gest`. GWY fronts it. GEST is an **ACS resource server** only — it validates
ACS-issued tokens (caregiver and patient-session) via ACS JWKS; it mints no token.

## External Actors and Systems
| Actor / system | Direction | Interaction |
|---|---|---|
| Patient station app (`gest-ui`, edge runtime) | → GEST | Reads capability registry to self-check its loaded engine against the patient's catalog primitives. Patient-session token (`gest.capability.read`). Writes nothing. |
| Caregiver / Clinic coordinator | → GEST (often via PAT/DASH) | Reads support status while mapping/calibrating a command. Caregiver token. |
| Platform / release admin | → GEST | Declares/retires engine support; registers engine versions. Coordinator/admin authority. |
| **ACS** | → GEST | Issues + signs the tokens GEST validates (JWKS, introspection). GEST never mints. |
| **PAT** | ← GEST (and GEST → PAT) | PAT owns the `GestureType` vocabulary; GEST keys capability rows by PAT `code`. PAT/DASH **consume** GEST to resolve INV-PAT-6 support truth. GEST may read `GET /pat/gesture-types` to validate a `code` on declare. |
| **EDGE** | — | No direct call. EDGE owns device/catalog; GEST does not manage devices. |
| **EVNT** | — | No direct call. The station reports resolved commands to EVNT, not GEST. |
| **HIST** | → GEST | GEST audits its own write actions (capability declared/retired, engine registered) to HIST with the shared envelope, like the other services. |

## End-to-End Flows
Three flows exercise GEST; none of them is the detection path (that bypasses the backend entirely).

### Golden path — caregiver maps a command and is warned about engine support (INV-PAT-6)
1. Caregiver in `pat-ui`/DASH chooses `primaryPrimitive` (a `GestureType` code) for a command.
2. PAT/DASH calls GEST `GET /gest/capabilities?engineVersion=<station-engine>&gestureType=<code>`
   (or the bulk support-check).
3. GEST returns the support status for that `(engineVersion, code)`.
4. If `unsupported` / `unknown`, the UI **warns** the caregiver that the shipped engine will not
   detect this primitive yet. PAT still persists the command (INV-PAT-4 is about vocabulary existence,
   not engine support) — GEST is advisory, never a gate.

### Station self-check at startup
1. Station holds its catalog (from `GET /edge/catalog`, EDGE) and its loaded engine version.
2. Station calls GEST bulk support-check with the catalog's distinct primitive codes + its engine
   version.
3. GEST returns supported/unsupported per code; the station can show the patient/caregiver which
   commands are actually detectable before relying on them.

### Admin declares engine support (the only write flow)
1. A new detection model version ships; admin registers it (`POST /gest/engines`).
2. Admin declares each supported primitive (`POST /gest/engines/{version}/capabilities` or
   `POST /gest/capabilities`), emitting **EngineCapabilityDeclared**; audited to HIST.
3. Retiring support (`DELETE …`) marks a `(engineVersion, code)` unsupported (terminal, row retained).

> **No detection flow passes through GEST.** Capture → landmarks → classification → resolved
> `commandId` → `POST /evnt/gesture-reports` is station → EVNT, offline-capable, and never touches
> this service.

## Internal Boundaries
- **api/** — REST controllers + DTOs for `/gest/engines` and `/gest/capabilities`; `@PreAuthorize`
  strings equal `RoleAuthorityPolicy` constants.
- **application/** — use-case services: `EngineVersionService`, `CapabilityService` (one per path
  root, D-640). `@Transactional` lives here.
- **domain/** — `EngineVersion`, `EngineCapability` aggregates, `SupportStatus` value object, ports
  (interfaces). No framework imports (shared `ADR-001-hexagonal-architecture.md`, key
  `hexagonal_java`).
- **infrastructure/** — JPA adapters (global schema), ACS JWKS security config, optional Feign client
  to PAT for `code` validation, HIST audit adapter.

## Cross-cutting Concerns
- **Security** — ACS resource server: validate caregiver + patient-session JWTs via ACS JWKS; tenant
  derived from the `tenantId` claim (never `X-Tenant-Id`); `gest.*` authorities from
  `RoleAuthorityPolicy` (SPEC-06). A patient-session token holds **only** `gest.*`/`conv.*` reads —
  it can read capabilities, never write.
- **Multi-tenancy** — the registry is **global** (ADR-003 local): one shared truth in
  `neuroassist_global`, read by every tenant, written by admin. Reads are tenant-agnostic; no
  per-tenant row.
- **Observability** — `X-Correlation-Id` propagated and echoed, including on HIST audit calls;
  `GET /gest/health` (SPEC-07) reflects DB only.
- **Caching** — capability reads are cacheable (`ETag`, like PAT's catalog reads, ADR-004 pattern),
  since the registry changes only on engine releases.
