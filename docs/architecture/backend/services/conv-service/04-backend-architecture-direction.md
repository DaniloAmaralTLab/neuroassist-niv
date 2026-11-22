<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

## Stack
**Java 21 / Spring Boot**, hexagonal (shared ADR-001 hexagonal-architecture, Java). Gradle
(Kotlin DSL); Flyway migrations centralized in MIG; Spring Data JPA over **PostgreSQL**
(schema-per-tenant, shared ADR-003). Spring Security as an **OAuth2 resource server** validating
the ACS-minted patient-session token via JWKS. Feign clients for PAT and HIST. Blob/object storage
adapter for audio assets. **Messaging disabled** → no Kafka/broker; all intra-project calls are
synchronous REST. Content is **English-only**. No TechLab AI dependency at runtime (the LLM and
ElevenLabs belong to TRN authoring).

## Service Boundary
**Single service, single bounded context** (local ADR-001). The published-tree runtime, audio
serving, the offline-bundle contract and the opt-in usage signal share one `PublishedTree`
lifecycle and the same tenant invariants, so they are enforced together rather than decomposed.
Authoring/synthesis (TRN), detection (GEST), events/alarms (EVNT), patient/command data (PAT),
identity/sessions (ACS) and device identity (EDGE) stay outside, referenced by id.

## Package Organization
Java root package `com.neuroassist.conv`:

```
src/main/java/com/neuroassist/conv/
├── api/              controllers REST, DTOs (records), exception advice (ProblemDetail)
├── application/      use-case services (@Transactional, TenantContextHolder.require())
│                     + port/in (use-case interfaces) + port/out (repository + external ports)
├── domain/           PublishedTree, TreeVersion, Category, Phrase, AudioAsset, UsageSignal,
│                     version/ETag invariants (pure POJO — zero Spring, zero JPA)
└── infrastructure/   persistence (JPA entity/repository/adapter), clients (@FeignClient PAT/HIST),
                      storage (audio blob adapter), search (SearchPort Postgres adapter),
                      config, security (TenantContextFilter, JWKS, CorrelationIdInterceptor)
```

Dependency rule (ArchUnit): `domain` imports nothing outward; `application` depends on `domain`;
`api` and `infrastructure` depend inward. Inbound port signatures must not carry `tenantId`
(RULE-04) — services call `TenantContextHolder.require()` first. The hexagonal source of truth is
the shared `ADR-*-hexagonal-architecture.md` (referenced by file, not by a fixed number).

Key ports: `PublishedTreeRepositoryPort`, `AudioAssetPort` (serve cached audio — no synthesis),
`SearchPort` (assisted lookup; v1 Postgres FTS/trigram — ADR-002), `PatientReferencePort` (→ PAT),
`AuditPort` (→ HIST), `UsagePort` (opt-in usage).

## Hub Service Dependencies
- **MIG** — centralized Flyway owns the `conv` schema migrations; CONV ships no runner.
- **ACS** — JWKS endpoint to validate the patient-session token (CONV is a resource server).
- **PAT** — `GET /pat/patients/{patientId}` (`pat.patient.read`, service-client) for patient
  reference, ETag/304.
- **HIST** — `POST /hist/audit` (`hist.audit.record`, service-client) for `TreePublished` and
  erasure facts.
- **TechLab AI** — none at runtime (`ai.hasAi = false`).

## External Integrations
No external vendor is called at runtime. ElevenLabs (voice synthesis) and the Claude/Anthropic
authoring dialog are **TRN** concerns; CONV only serves the cached output. Audio bytes are read
from blob/object storage via `AudioAssetPort`. All outbound calls are internal, over TLS outside
localhost (TECH-006), internal-network only.

## Async vs Sync Decisions
- **Messaging disabled** — there is no broker; CONV publishes no events to other modules and
  consumes none. Intra-project relationships are synchronous REST plus id references.
- **Live speaking is client-side and synchronous-free toward the server** — navigation and
  playback run from the station's local cache; CONV is not called per navigation step or per
  phrase (ADR-003/ADR-004, SAFETY).
- **Publish and audit are synchronous** — TRN→CONV publish is a sync REST call; the `TreePublished`
  audit to HIST is in-band and **hard-502** on failure (publishing is not time-critical, so
  integrity wins — HIST ADR-005 classification, see local ADR-006). Erasure facts follow the same
  classification (see ADR-006).
- **Opt-in usage is best-effort** — the station queues `UsageSignal`s and flushes opportunistically;
  a failed flush is retried client-side and never blocks the patient.
