# Testing Conventions (NeuroAssist NIV Backend)

> Test pyramid: Unit · Integration · BDD/Cucumber · CDC/Pact.

## Purpose

Defines the testing conventions for every `backend/services/` microservice. It prescribes the
pyramid, folder layout, dependencies, lifecycle (Testcontainers / WireMock), BDD with
Cucumber, CDC with Pact, the Gradle task structure and the PR checklist.

## Scope

- Applies to every `backend/services/` service.
- Unit tests: JUnit 5 + Mockito (no Spring context, no database).
- Integration tests: Testcontainers (real PostgreSQL) + Spring Boot context.
- BDD / Acceptance: Cucumber + JUnit 5 -- mandatory for API changes.
- CDC: Pact JVM -- consumer-provider contract verification.

---

## 1. Test pyramid

| Layer | Tools | Scope | Gradle task |
|---|---|---|---|
| Unit | JUnit 5 · Mockito · AssertJ | Domain logic -- no Spring, no DB | `test` |
| Integration | JUnit 5 · Testcontainers · SpringBootTest | Persistence, messaging, Feign | `integrationTest` |
| BDD | Cucumber · JUnit 5 · Testcontainers | Behavioral API contracts | `bddTest` |
| CDC | Pact JVM | Consumer-provider HTTP contracts | `contractTest` |

---

## 2. Test directory layout

```
src/test/
├── java/com/neuroassist/<module>/
│   ├── unit/                        # @Tag("unit") -- plain Java, no Spring
│   │   └── domain/                  # Domain model + domain service tests
│   ├── integration/                 # @Tag("integration") -- BaseIntegrationTest
│   │   └── infrastructure/          # Persistence, messaging adapters
│   ├── cucumber/
│   │   ├── steps/                   # Step definitions (thin -- delegate to support)
│   │   ├── context/                 # ScenarioContext (state across steps)
│   │   └── config/                  # @CucumberContextConfiguration
│   └── contract/                    # @Tag("contract") -- Pact consumer/provider
└── resources/
    ├── features/                    # .feature files per domain
    │   └── <domain>/
    │       └── <resource>-<capability>.feature
    ├── fixtures/                    # SQL fixtures and test data
    ├── mocks/                       # WireMock stub mappings
    └── application-test.yml         # Test-specific Spring config
```

---

## 3. Unit Tests

**Rules:**
- Annotate with `@Tag("unit")`.
- No `@SpringBootTest` -- plain JUnit 5 + Mockito.
- Test `domain.model` and `domain.service` exclusively.
- No database, no queue, no HTTP.
- Each test completes in milliseconds.

**Example:**
```java
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class <Resource>DomainServiceTest {
    @Test
    void shouldRejectInvalidInput() {
        var service = new <Resource>DomainService();
        assertThatThrownBy(() -> service.validar(invalidInput()))
            .isInstanceOf(ValidationException.class);
    }
}
```

---

## 4. Integration Tests with Testcontainers

**Rules:**
- Annotate with `@Tag("integration")`.
- Extend `BaseIntegrationTest` (shared Testcontainers).
- Use a real PostgreSQL through Testcontainers -- **never H2 in-memory**.
- Use `@DynamicPropertySource` to inject connection properties.

**BaseIntegrationTest (singleton container pattern -- mandatory):**

> **IMPORTANT:** use a singleton container (static initializer), NOT `@Testcontainers` + `@Container`.
> The JUnit 5 `@Testcontainers` extension races with `@DynamicPropertySource` --
> the port is read before the container is up.

```java
@SpringBootTest
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    static final PostgreSQLContainer<?> postgres;
    static {
        postgres = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("neuroassist-niv_test")
                .withUsername("test")
                .withPassword("test")
                .withInitScript("init-schema.sql");
        postgres.start();
    }
    @DynamicPropertySource
    static void overrideProps(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }
}
```

Additional per-service test infrastructure:

- `src/test/resources/init-schema.sql` -- creates the required schemas
- `src/test/resources/application-test.yml` -- see `snippets.md`
- `src/test/java/.../config/TestSecurityConfig.java` -- see `snippets.md`

---

## 5. BDD / Acceptance Tests (Cucumber + JUnit 5)

**Rules:**
- Mandatory for any PR that changes the API surface (controllers, DTOs, OpenAPI specs).
- Feature files are the canonical behavior spec; aligned with the SPECs in `docs/architecture/backend/services/<service>/`.
- Step definitions must be thin -- delegate heavy logic to `cucumber/context/` helpers.

**Feature file location:**
```
src/test/resources/features/<domain>/<resource>-<capability>.feature
```

Example: `features/<module>/<resource>-criacao.feature`

**Step definitions:**
```
src/test/java/com/neuroassist/<module>/cucumber/steps/<Resource>Steps.java
```

**Gherkin conventions:**
- Business language aligned with the SPECs (avoid implementation details).
- Tags: `@smoke`, `@integration`, `@slow`, `@wip`, `@idempotency`, `@pending`, `@multi-tenant`.
- Scenario names: a short sentence describing the business behavior.
- **`@pending`:** mandatory for scenarios whose steps depend on an external service that is
  not implemented. Excluded from the default run via `not @pending`, but kept as documentation.
  Once the service is ready, drop `@pending` and implement the steps.

- **`@multi-tenant`:** for scenarios validating isolation between tenants.

```gherkin
@pending
Scenario: Scenario that depends on an unimplemented service
  Given a precondition
  When an action calls an external service
  Then the expected result occurs
```

**The CucumberIT runner must exclude `@pending`:**
```java
@ConfigurationParameter(
    key = Constants.FILTER_TAGS_PROPERTY_NAME,
    value = "not @pending"
)
```

**Gherkin example.** Keywords MUST be English: `be-bdd-generator.py` and
`py-bdd-generator.py` match only `Given|When|Then|And|But`. A `.feature` written
with localized keywords parses to zero steps and the generator emits an empty
step file without warning.
```gherkin
Feature: <resource> registration

  Background:
    Given the tenant "<tenant-id>" is active
    And the user "admin@example.com" is authenticated
  @smoke
  Scenario: <resource> is created successfully
    Given a valid <resource> creation request
    When the client sends the request to POST /api/v1/<resource>
    Then the response status is 201
    And the field "id" is returned

```

**Runner class:**
```java
@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME,
    value = "com.neuroassist.<module>.cucumber")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME,
    value = "json:build/cucumber-report.json")
class CucumberRunner {}
```

---

## 6. CDC Tests (Pact JVM)

**Rules:**
- Use Pact JVM for consumer-provider verification.
- Consumer side: define the Pact in the consumer test and publish it to the Pact Broker.
- Provider side: verify the Pact in CI against the running provider.
- Annotate with `@Tag("contract")`.

**Consumer test (provider stubbed with Pact):**
```java
@Tag("contract")
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "gest-service")
class <Resource>ClientPactTest {
    @Pact(consumer = "evnt-service")
    RequestResponsePact get<Resource>ByIdPact(PactDslWithProvider builder) {
        return builder.given("<resource> exists")
            .uponReceiving("get <resource> by id")
                .path("/api/v1/<resource>/uuid-001")
                .method("GET")
                .headers(Map.of("X-Tenant-Id", "<tenant-id>"))
            .willRespondWith()
                .status(200)
                .body(LambdaDsl.newJsonBody(b ->
                    b.stringType("id", "uuid-001")
                     .stringType("nome", "Exemplo")).build())
            .toPact();
    }
}
```

---

## 7. Gradle Kotlin DSL -- tasks and dependencies

```kotlin
val integrationTestSourceSet = sourceSets.create("integrationTest") {
    compileClasspath += sourceSets.main.get().output + sourceSets.test.get().output
    runtimeClasspath += sourceSets.main.get().output + sourceSets.test.get().output
}

dependencies {
    // Unit
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    // Integration + BDD (shared infrastructure)
    val itImpl by configurations.getting
    itImpl("org.testcontainers:postgresql:1.20.0")
    itImpl("io.cucumber:cucumber-junit-platform-engine:7.18.0")
    itImpl("io.cucumber:cucumber-java:7.18.0")
    itImpl("io.cucumber:cucumber-spring:7.18.0")
    itImpl("org.wiremock:wiremock-standalone:3.9.1")
    // CDC
    itImpl("au.com.dius.pact.consumer:junit5:4.6.5")
}

tasks.register<Test>("integrationTest") {
    testClassesDirs = integrationTestSourceSet.output.classesDirs
    classpath = integrationTestSourceSet.runtimeClasspath
    useJUnitPlatform { includeTags("integration") }
}

tasks.register<Test>("bddTest") {
    testClassesDirs = integrationTestSourceSet.output.classesDirs
    classpath = integrationTestSourceSet.runtimeClasspath
    useJUnitPlatform { includeTags("bdd") }
}

tasks.register<Test>("contractTest") {
    testClassesDirs = integrationTestSourceSet.output.classesDirs
    classpath = integrationTestSourceSet.runtimeClasspath
    useJUnitPlatform { includeTags("contract") }
}

// unit-only (fast) -- default task
tasks.test {
    useJUnitPlatform { includeTags("unit") }
}
```

---

## 8. CI Enforcement: hard-fail for API changes

- Any PR modifying the API surface (controllers, OpenAPI, DTOs) must add/update
  the matching feature file under `src/test/resources/features/`.
- The CI job `feature-coverage-check` maps modified controllers to the expected feature paths
  and fails when there is no matching feature.
- Opt-out label: `no-bdd-required` -- applied explicitly and reviewed.

**SPEC → Feature mapping** (keep it in `docs/architecture/backend/standards/bdd-mapping.md`):
```
SPEC-02-<resource>-criacao.md  → features/<module>/<resource>-criacao.feature
SPEC-11-idempotencia.md        → features/<module>/idempotencia.feature
```

---

## 9. Multi-tenant in tests

Every BDD suite touching tenant data MUST have at least 1 `@multi-tenant` scenario validating
isolation:
- tenant-A creates data → tenant-B does not see it.
- tenant-A cannot modify tenant-B data (`<Parent>NotFoundException`).
- Switching the active tenant through `TenantContextHolder` at test runtime.

---

## 10. Reporting and evidence

- Cucumber plugin: `json:build/cucumber-report.json`.
- Attach reports as CI artifacts on failure.
- Include the Pact Broker URL in the CI environment for contract publish/verify.

---

## 11. PR Checklist

- [ ] API changes add/update feature files under `src/test/resources/features/`.
- [ ] Step definitions live in `cucumber/steps/` and are thin -- heavy logic in `cucumber/context/`.
- [ ] BDD tagged `@smoke` or `@integration` run in CI.
- [ ] At least 1 `@multi-tenant` scenario if the service touches tenant data.
- [ ] Integration tests use Testcontainers (real PostgreSQL), not H2.
- [ ] ArchUnit green (`./gradlew :<service>:architectureCheck`).
- [ ] Unit tests (`./gradlew :<service>:test`) green with only `@Tag("unit")`.
- [ ] If coverage is intentionally omitted, the PR carries a rationale and the `no-bdd-required` label.

---

## References

- [Cucumber-JVM](https://cucumber.io/)
- [Testcontainers](https://testcontainers.com/)
- [Pact JVM](https://docs.pact.io/implementation_guides/jvm)
- [WireMock](https://wiremock.org/)
- `hexagonal-patterns.md` -- boundary rules that affect tests
- `docs/architecture/shared/multi-tenant.md` -- isolation between tenants
