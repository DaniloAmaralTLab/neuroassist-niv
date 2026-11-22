# Services Catalog (NeuroAssist NIV Backend)

> Quick-reference catalog of every backend microservice:
> canonical Java package, Gradle project key, one-line responsibility, key ports and events.

Use this file when you:
- Start a new service -- to find the canonical package and the project key.
- Write an `applyTo` in CI, or a cross-reference.
- Need to know which service owns which domain boundary.

> **Updates:** this catalog is updated by `/be-architect-vision <MODULE>` whenever
> a new module is registered. Edit it by hand only when you add capabilities
> to an existing service (events, Feign clients).

---

## 1. Service Map

| Component | Gradle project key | Canonical package | Module |
|---|---|---|---|
| `neuroassist-niv-api-gateway` | `:services:neuroassist-niv-api-gateway` | `com.neuroassist.gwy` | GWY |
| `neuroassist-niv-service-registry` | `:services:neuroassist-niv-service-registry` | `com.neuroassist.reg` | REG |
| `neuroassist-niv-migrations` | `:services:neuroassist-niv-migrations` | `com.neuroassist.mig` | MIG |
| `gest-service` | `:services:gest-service` | `com.neuroassist.gest` | GEST |
| `evnt-service` | `:services:evnt-service` | `com.neuroassist.evnt` | EVNT |
| `pat-service` | `:services:pat-service` | `com.neuroassist.pat` | PAT |
| `acs-service` | `:services:acs-service` | `com.neuroassist.acs` | ACS |
| `hist-service` | `:services:hist-service` | `com.neuroassist.hist` | HIST |
| `dash-service` | `:services:dash-service` | `com.neuroassist.dash` | DASH |
| `edge-service` | `:services:edge-service` | `com.neuroassist.edge` | EDGE |
| `conv-service` | `:services:conv-service` | `com.neuroassist.conv` | CONV |
| `trn-service` | `:services:trn-service` | `com.neuroassist.trn` | TRN |

---

## 2. Responsibility summary

### `neuroassist-niv-api-gateway` -- `com.neuroassist.gwy` (GWY)
- Spring Cloud Gateway
- **Infrastructure:** platform service (it owns no business domain of its own).

### `neuroassist-niv-service-registry` -- `com.neuroassist.reg` (REG)
- Eureka
- **Infrastructure:** platform service (it owns no business domain of its own).

### `neuroassist-niv-migrations` -- `com.neuroassist.mig` (MIG)
- Centralized Flyway (all schemas)
- **Infrastructure:** platform service (it owns no business domain of its own).

### `gest-service` -- `com.neuroassist.gest` (GEST)
- Webcam capture, facial landmark extraction and multi-class classification of the active command (simple gesture or compound of multiple primitives), executed locally on the patient's device.

### `evnt-service` -- `com.neuroassist.evnt` (EVNT)
- Generation of the structured event matching the recognized command, orchestration of notification by urgency level (full-screen alarm for emergency; discreet for routine) and routing to the guardian.

### `pat-service` -- `com.neuroassist.pat` (PAT)
- Patient registration and command catalog (gesture -> action, free-form label defined by the family, sensitivity, minimum/maximum gesture time and urgency level), independently calibratable per command.

### `acs-service` -- `com.neuroassist.acs` (ACS)
- Management of caregivers/users, roles and links to patient(s); basis of the multi-tenant model (tenant = family or clinic).

### `hist-service` -- `com.neuroassist.hist` (HIST)
- Immutable record of events, alarms and confirmation/edit actions, with an audit trail.

### `dash-service` -- `com.neuroassist.dash` (DASH)
- Web dashboard (Angular) for the caregiver to review history, calibrate sensitivity and receive notifications.

### `edge-service` -- `com.neuroassist.edge` (EDGE)
- Registration, pairing and heartbeat monitoring of the local (edge) agent that runs gesture detection.

### `conv-service` -- `com.neuroassist.conv` (CONV)
- Speech tree navigable by category → phrase, with an input-channel-agnostic design (gesture via GEST or direct touch/mouse). The runtime uses pure retrieval (Elasticsearch/kNN) for assisted semantic search; voice output via pre-synthesized, cached TTS audio (ElevenLabs, the patient's voice); English-only content.

### `trn-service` -- `com.neuroassist.trn` (TRN)
- Phase separate from the daily use of CONV: an LLM (Claude/Anthropic) converses with the caregiver and the patient (collaborative flow, dual authorization) to propose new categories/phrases; approved content is indexed in Elasticsearch and has audio synthesized via ElevenLabs. It does not take part in the patient's communication runtime.

---

## 3. Canonical internal structure

Every service (except `neuroassist-niv-migrations`) uses the hexagonal layout:

```
com.neuroassist.<module>/
├── api/
│   ├── controller/          # @RestController
│   ├── dto/                 # Java records (Request/Response)
│   └── exception/           # @RestControllerAdvice (ProblemDetail)
├── application/
│   ├── service/             # @Service, @Transactional, TenantContextHolder.require()
│   └── port/
│       ├── in/              # Use-case interfaces
│       └── out/             # Repository + external service interfaces
├── domain/
│   ├── model/               # Pure POJO -- zero Spring, zero JPA
│   └── service/             # Domain business rules
└── infrastructure/
    ├── clients/             # @FeignClient
    ├── config/              # @Configuration, DomainServiceConfig
    ├── persistence/
    │   ├── entity/          # @Entity JPA
    │   ├── repository/      # Spring Data JPA @Repository
    │   └── adapter/         # Port.out implementations
    └── security/            # Filters, TenantContextHolder, CorrelationIdInterceptor
```

Details in `hexagonal-patterns.md`.

---

## 4. ArchUnit base reference

Each `ArchitectureTest.java` uses its own canonical package:

```java

// neuroassist-niv-api-gateway:
@AnalyzeClasses(packages = "com.neuroassist.gwy")

// neuroassist-niv-service-registry:
@AnalyzeClasses(packages = "com.neuroassist.reg")

// neuroassist-niv-migrations:
@AnalyzeClasses(packages = "com.neuroassist.mig")

// ... and so on for the other services
```

---

## 5. Gradle commands per service

```bash
# Replace <project-key> with the Gradle key (Section 1)
./gradlew :services:<project-key>:architectureCheck    # ArchUnit -- BLOCKING
./gradlew :services:<project-key>:test                 # unit tests (@Tag("unit"))
./gradlew :services:<project-key>:integrationTest      # integration + BDD (Testcontainers)
./gradlew :services:<project-key>:build                # full build + all checks

# All services
./gradlew build                               # full monorepo build
./gradlew check                               # lint + test + archUnit
```

---

## 7. Feign Client Registry

> List populated by `/be-architect-vision <MODULE>` as inter-service integrations are identified.

| Feign interface | Consumer service | Provider service | `@FeignClient(name = ...)` |
|---|---|---|---|
| _(populated as services declare Feign integrations)_ | -- | -- | -- |

The list grows as integrations are identified in the per-service SPECs.

---

## References

- `docs/architecture/backend/standards/hexagonal-patterns.md`
- `docs/architecture/backend/standards/java-conventions.md`
- `docs/architecture/backend/standards/platform-patterns.md` (Feign, Flyway, MDC, Saga)
- `docs/architecture/shared/multi-tenant.md` (ADR-001 schema-per-tenant)
- `docs/architecture/shared/distributed-architecture.md`
