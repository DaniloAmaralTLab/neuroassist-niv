<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

## System Boundary
CONV is a **single service, single bounded context** (local ADR-001). It owns the **published
speech-tree runtime** for a patient: the immutable, versioned per-patient tree bundle (structure
+ audio manifest), the cached audio assets it serves, the offline-bundle contract to the station,
and an optional minimal usage signal. It does **not** own content authoring/curation (TRN), audio
synthesis (TRN), gesture recognition (GEST), events/alarms (EVNT), patient or command data (PAT),
caregiver identity or sessions (ACS), or device identity (EDGE). Those stay outside and are
referenced by id. CONV is a resource server for the ACS patient-session token.

## External Actors and Systems
| Actor / System | Direction | Interaction |
|---|---|---|
| **Patient station** (patient-session token) | → CONV | `GET /conv/tree` (`conv.tree.read`), `GET /conv/audio/{assetId}` (`conv.audio.read`), opt-in `POST /conv/usage` (`conv.usage.record`). Holds the offline cache; maps input to navigation locally. |
| **TRN** (service-client) | → CONV | `POST /conv/trees:publish` (`conv.tree.publish`) — hands CONV an approved, immutable tree version + audio manifest. |
| **PAT** | CONV → | `GET /pat/patients/{patientId}` (`pat.patient.read`, service-client, ETag/304) — patient reference only. Patient-session token is `403` on `/pat` (PAT INV-PAT-7). |
| **HIST** | CONV → | `POST /hist/audit` (`hist.audit.record`, service-client) — `TreePublished` and erasure facts. |
| **ACS** | CONV → | JWKS to validate the patient-session token; CONV is an ACS resource server. |
| **MIG** | CONV → | Centralized Flyway schema migrations (CONV owns no runner). |
| **GEST station runtime** | in-process on station | Resolves gestures to commands; feeds the station-side navigation seam. No CONV network call per step. |

## End-to-End Flows
**Golden path — patient speaks (fully offline-capable):**
1. Station holds the last published bundle (tree + audio) in its local cache.
2. Patient navigates category → phrase; the input channel (gesture via the in-process GEST seam,
   or touch/mouse) drives navigation **locally over the cached tree** — no CONV call.
3. Patient selects a phrase; the station plays the cached audio asset for that phrase. **No
   server round-trip** (SAFETY, ADR-003/004).
4. *(Opt-in only)* the station queues a minimal usage signal (`phraseId` + timestamp) and flushes
   it to `POST /conv/usage` opportunistically; failure is silently retried and never blocks step 3.

**Refresh path — new vocabulary:**
1. TRN publishes an approved version: `POST /conv/trees:publish` → CONV stores the immutable
   `PublishedTree` version, computes a strong ETag, audits `TreePublished` to HIST (hard-502 if
   audit fails — publishing is not time-critical, ADR-006/HIST ADR-005).
2. Station refreshes opportunistically: `GET /conv/tree` with `If-None-Match`. `304` → cache valid;
   `200` → download the new bundle, then atomically swap the local cache. The old bundle serves
   continuously until the swap (no gap in the patient's voice).

**Degraded path — CONV or network down:**
- `GET /conv/tree` unreachable → station keeps the last good bundle (stale-but-usable); a "last
  synced" indicator is shown; the patient keeps speaking. A tree read never hard-fails the patient.

## Internal Boundaries
Hexagonal layers (shared ADR-001 hexagonal, Java):
- **api/** — `@RestController` for `/conv/tree`, `/conv/audio/{id}`, `/conv/usage`,
  `/conv/trees:publish`; request/response records; `@RestControllerAdvice` (ProblemDetail).
- **application/** — use-case services (`@Transactional`, `TenantContextHolder.require()` first):
  read-published-tree, read-audio-asset, publish-tree, record-usage. Inbound ports (`port/in`) and
  outbound ports (`port/out`): `PublishedTreeRepositoryPort`, `AudioAssetPort`, `SearchPort`,
  `PatientReferencePort` (→ PAT), `AuditPort` (→ HIST), `UsagePort`.
- **domain/** — pure model: `PublishedTree`, `TreeVersion`, `Category`, `Phrase`, `AudioAsset`
  (reference/manifest), `UsageSignal`; version/ETag invariants. Zero Spring, zero JPA.
- **infrastructure/** — JPA persistence + adapters, Feign clients (PAT, HIST), object/blob storage
  adapter for audio, `SearchPort` Postgres adapter, security filters (`TenantContextFilter`,
  JWKS validation, `CorrelationIdInterceptor`).
Dependency rule: `domain` imports nothing outward; `application` depends on `domain`; `api` and
`infrastructure` depend inward.

## Cross-cutting Concerns
- **Security.** Patient-session token (ACS JWKS) authorizes `conv.tree.read`/`conv.audio.read`/
  `conv.usage.record`; `conv.tree.publish` is a TRN service-client authority, never in the
  patient-session token. CONV calls PAT/HIST with its own service-client identity. Register
  `TenantContextFilter` inside the `SecurityFilterChain` after bearer authentication (Learning
  Layer `security:tenant-filter:order-before-spring-security`).
- **Multi-tenancy.** Schema-per-tenant (shared ADR-003); `TenantContextHolder.require()` is the
  first line of every application service; a tree and its audio are tenant-scoped.
- **Observability.** `X-Correlation-Id` propagated to PAT/HIST; health/readiness endpoints;
  publish and refresh are traced. Live playback is client-side and emits no server span.
- **Availability (SAFETY).** The patient's speaking path has **no synchronous server dependency**;
  HIST/PAT outages affect publish/refresh only, never live speech.
- **Privacy.** Audio in the patient's voice and any usage signal are sensitive; minimal retention,
  opt-in usage, crypto-shred erasure aligned to HIST ADR-006 (see ADR-005/ADR-006 local).
