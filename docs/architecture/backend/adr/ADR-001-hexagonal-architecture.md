# ADR-001 — Hexagonal Architecture in Java: ports as interfaces, wiring at the composition root

- **Status:** accepted (YYYY-MM-DD)
- **Scope:** every backend service of NeuroAssist NIV whose stack is Java
  (21 / Spring Boot 3.5.0), under the base package `com.neuroassist`
- **Supersedes:** nothing — this is the Java baseline. The Python and Node counterparts are
  separate records; find them in [[./README]] rather than by guessing a number (D-563)

## Context

NeuroAssist NIV builds its backend services as hexagons: a framework-free domain at the
centre, use cases around it, adapters at the edge. Java gives two mechanisms the other stacks do
not have — a compiler that enforces `implements`, and a container that can inject any bean anywhere.
The second one is the problem. Nothing in Spring stops a `@RestController` from injecting a
`JpaRepository`, or a domain class from carrying `@Entity`; the framework is happy either way, and
the hexagon degrades one convenient shortcut at a time.

The forces at play:

1. **The container makes every violation cheap.** Component scanning means any class annotated with
   a stereotype is reachable from any other. A directory layout alone documents the intent without
   enforcing it.
2. **JPA pulls behaviour into the persistence model.** An `@Entity` with business methods is the
   most common way a Java hexagon dies: the domain becomes unusable without a `EntityManager`, and
   unit tests turn into Spring Boot tests.
3. **Transactions are a layering statement, not a detail.** `@Transactional` on a controller or on
   a repository adapter moves the unit of work away from the use case that defines it.
4. **The enforcement budget is bytecode analysis.** ArchUnit runs in the normal test task, sees the
   whole classpath, and fails the build — it is the strongest gate available, so the port mechanism
   should be one ArchUnit can express as a rule.

5. **Tenant isolation crosses every layer.** The tenant context is resolved at the edge,
   consumed in the application layer and required by persistence, so its propagation has to be part
   of the architectural contract rather than a convention.

## Decision

**Ports are Java interfaces owned by the application layer. Adapters live in `infrastructure` and
implement them. The Spring container wires the two, and nothing else crosses the boundary.**

Concretely, for every service under `com.neuroassist.<module>`:

- `application/port/in/` declares one interface per use case (command or query).
- `application/port/out/` declares one interface per collaborator (repository, publisher, external
  client), typed exclusively in domain terms and throwing domain exceptions.
- `application/service/` implements the inbound ports, orchestrates the outbound ones, and is the
  **only** place `@Transactional` appears.
- `domain/model/` and `domain/service/` are plain Java: no Spring annotation, no `jakarta.persistence`
  import, no framework type in a signature.
- `infrastructure/**` holds the adapters — `persistence/adapter/` mapping domain to JPA entities,
  `clients/` for outbound HTTP.
- `api/` exposes DTOs only; JPA entities never leave the infrastructure layer.

```java
// application/port/out/OrderRepository.java — the port, domain types only
public interface OrderRepository {
    Optional<Order> findByBusinessKey(OrderKey key);
    Order save(Order order);
}

// infrastructure/persistence/adapter/OrderRepositoryAdapter.java — the adapter
@Repository
@RequiredArgsConstructor
public class OrderRepositoryAdapter implements OrderRepository {
    private final OrderJpaRepository jpa;
    private final OrderMapper mapper;
    @Override
    public Optional<Order> findByBusinessKey(OrderKey key) {
        return jpa.findByBusinessKey(key.value()).map(mapper::toDomain);
    }
}
```

Two supporting rules make the decision enforceable:

- **Domain services are registered explicitly.** A class in `domain/service/` may not carry
  `@Service` or `@Component`; it is exposed as a bean by `infrastructure/config/DomainServiceConfig`,
  which is the composition root for the framework-free half of the hexagon.

```java
// infrastructure/config/DomainServiceConfig.java
@Configuration
public class DomainServiceConfig {
    @Bean
    public PricingDomainService pricingDomainService() {
        return new PricingDomainService();
    }
}
```

- **ArchUnit is a merge gate**, not a report. `ArchitectureTest` in each service carries RULE-01 to
  RULE-09 and runs under `./gradlew :<service>:architectureCheck`.

| Rule | What it forbids or requires |
|---|---|
| RULE-01 | `domain` must not depend on `org.springframework..` |
| RULE-02 | `domain` must not depend on `jakarta.persistence..` |
| RULE-03 | `@Transactional` only on methods declared in `..application.service..` |
| RULE-04 | `api` must not depend on `infrastructure` |
| RULE-05 | `infrastructure` must not depend on `api` |
| RULE-06 | `@FeignClient` types reside in `..infrastructure.clients..` |
| RULE-07 | public application services call `TenantContextHolder.require()` before touching tenant data |
| RULE-08 | `spring.jpa.open-in-view=false` — no lazy loading outside the transaction |
| RULE-09 | every class resides under `com.neuroassist..` |

## Alternatives considered

1. **Package-by-layer with no ports (services calling `JpaRepository` directly)** — rejected: the
   application layer then depends on Spring Data types, so the use case cannot be unit-tested
   without a persistence context, and swapping the store means editing business code.
2. **Abstract base classes instead of interfaces for ports** — rejected: Java allows a single
   superclass, and adapters frequently need theirs for the framework. A base class also invites
   shared implementation into the port, which is exactly the leak the boundary exists to prevent.
3. **`@Service` on domain services, discovered by component scan** — rejected: it makes the domain
   depend on Spring for its own lifecycle, breaking RULE-01 and making the object graph implicit.
   `DomainServiceConfig` costs three lines per service and keeps wiring readable.
4. **JPA entities as the domain model (no mapping layer)** — rejected: it saves a mapper and costs
   the architecture. Lazy loading, identity semantics and the persistence lifecycle then leak into
   business rules, and every domain test needs a database.
5. **A DDD framework (Axon, jMolecules) to express the boundary** — rejected for this project: it
   replaces a rule ArchUnit already enforces with a dependency the whole team must learn, and it
   binds the domain to a third-party vocabulary.
6. **Modules as separate deployable services from day one, instead of a layered boundary** —
   rejected as premature; the module boundary is enforced in-process first, and extraction stays
   possible precisely because the ports already exist.

## Consequences

**Positive**

- The domain and application layers compile without Spring or JPA on the classpath path they use;
  unit tests construct fakes and run in milliseconds.
- Ports read as documentation: the `port/out` package is the complete list of what a use case needs
  from the outside world.
- Swapping an adapter (a different store, a stubbed client in tests) is a wiring change, not a code
  change in business logic.
- ArchUnit turns the intent into a build failure, so the boundary does not depend on review
  vigilance.

**Negative**

- Mapping between domain, JPA entity and DTO is real work, and MapStruct is one more moving part.
  Mitigation: mappers are generated and live next to the adapter that uses them.
- More types per use case (port in, port out, service, adapter) than a repository-in-controller
  design. Mitigation: the shapes are uniform, and the code generators emit them.
- ArchUnit can be silenced by deleting a rule. Mitigation: `architectureCheck` is required in CI and
  a removed rule needs an ADR of its own.
- `DomainServiceConfig` is easy to forget; a missing `@Bean` fails at startup rather than at compile
  time. Mitigation: a context-load test in every service.

## Implementation

- Package layout and layer rules: [[../standards/hexagonal-patterns]].
- `ArchitectureTest` per service with RULE-01..RULE-09; `architectureCheck` wired into the build.
- `DomainServiceConfig` in `infrastructure/config/` whenever the service has domain services.
- `@RestControllerAdvice` in `api/exception/` maps domain exceptions to `ProblemDetail` (RFC 7807).
- `TenantContextHolder` populated at the edge and cleared in a `finally` block; child entities are
  loaded through their parent scoped by tenant before being created.

## References

- [[../standards/hexagonal-patterns]] — layer rules, port and adapter patterns, ArchUnit rules
- [[../standards/java-conventions]] — naming, Lombok, JPA and exception conventions
- [[../standards/testing-conventions]] — test pyramid, fixtures, coverage gates
- [[./README]] — index of the records on file, including the other stacks' hexagonal ADRs
- Cockburn, A. — *Hexagonal Architecture (Ports and Adapters)*
