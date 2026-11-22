# Platform Patterns (NeuroAssist NIV Backend)

> JMS Artemis, OpenFeign + Resilience4j, centralized Flyway, MDC/CorrelationId,
> multi-schema (tenant), Saga choreography, Eureka.

## Purpose

Cross-cutting patterns that every `backend/services/` microservice must implement.
They guarantee operational consistency, observability and resilience.

---

## 1. ActiveMQ Artemis -- JMS patterns

### 1.1 Broker and protocol

- Broker: **ActiveMQ Artemis** (not ActiveMQ Classic).
- Protocol: **AMQP 1.0** -- configure it in `application.yml`:

```yaml
spring:
  artemis:
    mode: native            # native for a dedicated broker; embedded for dev/tests
    broker-url: ${ARTEMIS_URL}
    user: ${ARTEMIS_USER}
    password: ${ARTEMIS_PASSWORD}
  jms:
    pub-sub-domain: false   # queues, not topics
```

In integration tests: use `mode: embedded` (NEVER `org.testcontainers:activemq`).

### 1.2 Event Envelope (mandatory)

Every published event must conform to this JSON envelope:

```java
// infrastructure/messaging/producer/EventEnvelope.java
public record EventEnvelope(
    String eventId,        // UUID v4 -- unique per occurrence
    String eventType,      // canonical name (e.g. "neuroassist-niv.<module>.<entity>.<event>")
    String occurredAt,     // ISO 8601 UTC
    String correlationId,  // from the MDC -- cross-service trace
    String version,        // payload schema version (e.g. "1.0")
    String tenantId,      // always present on operational events
    String userId,         // when applicable
    Object payload         // event-specific data
) {}
```

**Usage:**
```java
public void publish(VendaConfirmadaPayload payload, String tenantId) {
    var envelope = new EventEnvelope(
        UUID.randomUUID().toString(),
        "neuroassist-niv.<module>.<entity>.<event>",
        Instant.now().toString(),
        MDC.get("correlationId"),
        "1.0",
        tenantId,
        SecurityContextHolder.getContext().getAuthentication().getName(),
        payload
    );
    jms.convertAndSend("neuroassist-niv.<module>.<entity>.<event>", envelope);
}
```

### 1.3 Producer Pattern

- Location: `infrastructure/messaging/producer/`
- Use a constructor-injected `JmsTemplate`.
- Never publish events directly from Application Services; delegate to a dedicated publisher.

```java
// infrastructure/messaging/producer/VendaConfirmadaPublisher.java
@Component
@RequiredArgsConstructor
@Slf4j
class VendaConfirmadaPublisher {
    private final JmsTemplate jms;
    public void publish(VendaConfirmadaEvent event) {
        log.info("publishing neuroassist-niv.<module>.<entity>.<event> vendaId={} tenantId={}",
            event.vendaId(), event.tenantId());
        jms.convertAndSend("neuroassist-niv.<module>.<entity>.<event>", event.toEnvelope());
    }
}
```

### 1.4 Consumer Pattern (idempotent)

- Location: `infrastructure/messaging/consumer/`
- Annotate with `@JmsListener(destination = "queue.name")`.
- The consumer must be idempotent -- check `processed` before acting.
- Set `TenantContextHolder` explicitly from the envelope (a ThreadLocal does not propagate cross-thread).
- Clear `TenantContextHolder` in `finally`.

```java
// infrastructure/messaging/consumer/VendaConfirmadaConsumer.java
@Component
@RequiredArgsConstructor
@Slf4j
class VendaConfirmadaConsumer {
    private final EmitirNFeUseCase emitirNFe;
    private final ProcessedEventPort processedEvents;
    @JmsListener(destination = "neuroassist-niv.<module>.<entity>.<event>")
    public void onVendaConfirmada(EventEnvelope envelope) {
        if (processedEvents.alreadyProcessed(envelope.eventId())) {
            log.warn("duplicate event ignored eventId={}", envelope.eventId());
            return;
        }
        MDC.put("correlationId", envelope.correlationId());
        TenantContextHolder.set(envelope.tenantId());
        try {
            emitirNFe.execute(EmitirNFeCommand.from(envelope));
            processedEvents.markProcessed(envelope.eventId());
        } finally {
            TenantContextHolder.clear();
            MDC.clear();
        }
    }
}
```

### 1.5 Event Catalog

The canonical event catalog lives in `docs/architecture/backend/standards/services-catalog.md` §6.

---

## 2. OpenFeign -- Inter-service HTTP

### 2.1 Setup

- Enable it on the main class:
  `@EnableFeignClients(basePackages = "com.neuroassist.<module>.infrastructure.clients")`
- Or per module through `@EnableFeignClients` on a `@Configuration` in `infrastructure/config/`.

### 2.2 Interface Pattern

- Location: `infrastructure/clients/` (RULE-06).
- Interface only -- Spring generates the implementation.
- Propagate `X-Correlation-Id`, `X-Tenant-Id`, `X-User-Id` through a `RequestInterceptor`.

```java
// infrastructure/clients/CadastrosClienteClient.java
@FeignClient(name = "<provider-service>")
public interface CadastrosClienteClient {
    @GetMapping("/api/v1/clientes/{id}")
    ClienteDto getById(
        @PathVariable UUID id,
        @RequestHeader("X-Tenant-Id") String tenantId);
}
```

### 2.3 RequestInterceptor -- context propagation

```java
// infrastructure/config/FeignContextInterceptor.java
@Component
class FeignContextInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate template) {
        template.header("X-Correlation-Id", MDC.get("correlationId"));
        template.header("X-Tenant-Id",     MDC.get("tenantId"));
        template.header("X-User-Id",        MDC.get("userId"));
    }
}
```

### 2.4 Resilience4j on Feign calls

- Apply it on the **Application Service** method that calls the Feign port -- not on the Feign interface.
- Configure it in `application.yml`:

```yaml
resilience4j:
  circuitbreaker:
    instances:
      <provider-service>:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 10s
  retry:
    instances:
      <provider-service>:
        maxAttempts: 2
        waitDuration: 200ms
  timelimiter:
    instances:
      <provider-service>:
        timeoutDuration: 2s
```

```java
@CircuitBreaker(name = "<provider-service>")
@Retry(name = "<provider-service>")
public Cliente buscarCliente(UUID id, String tenantId) {
    return cadastrosClienteClient.getById(id, tenantId);
}
```

---

## 3. Flyway -- Database Migrations (CENTRALIZED)

### 3.1 Strategy (decided in shared ADR-001)

- **`neuroassist-niv-migrations`** is the only project that runs Flyway.
- Individual microservices only use `spring.jpa.hibernate.ddl-auto=validate`.
- Migrations never live in service projects -- always in `neuroassist-niv-migrations/src/main/resources/db/migration/`.

### 3.2 Migration layout

```
backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/
├── global/                              # applied to neuroassist_global (once)
│   ├── V1__iam_schema.sql               # IAM (user, role, permission, ...)
│   ├── V2__catalogos_fiscais.sql        # NCM, CFOP, CST, ...
│   ├── V3__plano_contas_master.sql
│   └── V4__empresas_seed.sql            # registers the tenants
├── tenant/                             # applied to EVERY emp_*
│   ├── V1__cadastros.sql                # CAD: customer, supplier, product, ...
│   ├── V2__comercial.sql                # COM: quote, sale, ...
│   ├── V3__fiscal.sql                   # FIS: nfe, cte, ...
│   ├── V4__financeiro.sql               # FIN: cash, payable, ...
│   ├── V5__estoque.sql                  # EST: stock movement, ...
│   ├── V6__crm.sql                      # CRM: lead, opportunity, ...
│   ├── V7__logistica.sql                # LOG: delivery, freight, ...
│   └── V8__auditoria.sql                # AUD: event (optional, if each tenant keeps its own trail)
```

### 3.3 Configuration

`neuroassist-niv-migrations/src/main/resources/application.yml`:
```yaml
spring:
  flyway:
    enabled: false           # driven manually from Java (multi-schema)

neuroassist-niv:
  migrations:
    global-schema: neuroassist_global
    tenants:
      - <tenant-schema-1>
      - <tenant-schema-2>
      - <tenant-schema-3>
      - <tenant-schema-4>
      - <tenant-schema-5>
    global-location: classpath:db/migration/global
    tenant-location: classpath:db/migration/tenant
```

`MigrationsRunner.java`:
```java
@SpringBootApplication
public class NeuroAssist NIVMigrationsApp implements CommandLineRunner {

    @Autowired private DataSource ds;
    @Autowired private NeuroAssist NIVMigrationsConfig config;
    public static void main(String[] args) {
        SpringApplication.run(NeuroAssist NIVMigrationsApp.class, args);
    }
    @Override
    public void run(String... args) {
        // 1. Global
        migrate(config.globalSchema(), config.globalLocation());
        // 2. Each tenant
        for (String tenant : config.tenants()) {
            migrate(tenant, config.tenantLocation());
        }
    }
    private void migrate(String schema, String location) {
        log.info("Flyway migrate schema={}", schema);
        Flyway.configure()
            .dataSource(ds)
            .schemas(schema)
            .locations(location)
            .baselineOnMigrate(true)
            .load()
            .migrate();
    }
}
```

### 3.4 Rules

- Never modify a migration already applied in production.
- Idempotent scripts whenever possible (`IF NOT EXISTS`, `IF EXISTS`).
- To add a new tenant: add it to `neuroassist-niv.migrations.tenants` and re-run
  `neuroassist-niv-migrations` -- Flyway will apply every V to the new schema.
- `ddl-auto: validate` on ALL other services.

---

## 4. MDC and CorrelationId -- Observability

### 4.1 Mandatory MDC fields

Every service propagates these MDC fields on every request:

| MDC key | Source | Description |
|---|---|---|
| `correlationId` | `X-Correlation-Id` request header | Cross-service trace |
| `tenantId` | `X-Tenant-Id` request header | Tenant of the context |
| `userId` | `X-User-Id` request header | Acting user |
| `service` | static -- service name | Who produced the log |

### 4.2 CorrelationIdInterceptor (mandatory)

```java
// infrastructure/security/CorrelationIdInterceptor.java
@Component
public class CorrelationIdInterceptor implements HandlerInterceptor {

    @Value("${spring.application.name}")
    private String serviceName;
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        String corrId = req.getHeader("X-Correlation-Id");
        if (corrId == null) corrId = UUID.randomUUID().toString();
        MDC.put("correlationId", corrId);
        MDC.put("tenantId",     req.getHeader("X-Tenant-Id"));
        MDC.put("userId",        req.getHeader("X-User-Id"));
        MDC.put("service",       serviceName);
        res.setHeader("X-Correlation-Id", corrId);    // echoed back to the caller
        return true;
    }
    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                Object handler, Exception ex) {
        MDC.clear();
    }
}
```

Register it in `WebMvcConfigurer`:
```java
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {
    private final CorrelationIdInterceptor correlationIdInterceptor;
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(correlationIdInterceptor);
    }
}
```

### 4.3 Logging pattern

```yaml
logging:
  pattern:
    console: "%d{ISO8601} [%X{correlationId}] [%X{tenantId}] [%X{service}] %-5level %logger{36} - %msg%n"
  level:
    com.neuroassist: INFO
    org.springframework.security: WARN
```

In production: `logstash-logback-encoder` for structured JSON.

---

## 5. Multi-Schema Tenancy (Tenant)

### 5.1 TenantContextHolder

See `hexagonal-patterns.md` §5 -- canonical code for `TenantContextHolder`.

### 5.2 Schema Routing (Hibernate)

Since the NeuroAssist NIV schemas are **fixed** (1 global + 5 emp_*, not dynamic per customer),
the simplest approach is to set `search_path` per connection through a JDBC interceptor:

```java
// infrastructure/persistence/TenantSearchPathInterceptor.java
@Component
@RequiredArgsConstructor
class TenantSearchPathInterceptor {
    @PostConstruct
    void registerHikariCallback() {
        // Configure HikariCP setConnectionInitSql dynamically,
        // OR use AbstractRoutingDataSource with 1 datasource per schema.
    }
}
```

**Preferred alternative:** use the Hibernate `MultiTenantConnectionProvider` pointing at
a single DataSource and running `SET search_path TO emp_<tenant>, neuroassist_global, public`
at the start of each session.

```java
// infrastructure/persistence/TenantConnectionProvider.java
@Component
@RequiredArgsConstructor
class TenantConnectionProvider implements MultiTenantConnectionProvider {

    private final DataSource ds;
    @Override
    public Connection getConnection(Object tenantId) throws SQLException {
        Connection c = ds.getConnection();
        try (Statement s = c.createStatement()) {
            s.execute("SET search_path TO " + tenantId + ", neuroassist_global, public");
        }
        return c;
    }
    @Override
    public void releaseConnection(Object tenantId, Connection c) throws SQLException {
        try (Statement s = c.createStatement()) {
            s.execute("SET search_path TO DEFAULT");
        }
        c.close();
    }
    // ... other mandatory methods
}
```

And `CurrentTenantIdentifierResolver`:
```java
@Component
class TenantIdentifierResolver implements CurrentTenantIdentifierResolver<String> {
    @Override
    public String resolveCurrentTenantIdentifier() {
        return TenantContextHolder.require();
    }
    @Override
    public boolean validateExistingCurrentSessions() { return false; }
}
```

`application.yml`:
```yaml
spring:
  jpa:
    properties:
      hibernate:
        multiTenancy: SCHEMA
        tenant_identifier_resolver: com.neuroassist.<module>.infrastructure.persistence.TenantIdentifierResolver
        multi_tenant_connection_provider: com.neuroassist.<module>.infrastructure.persistence.TenantConnectionProvider
```

---

## 6. Saga Choreography (Onboarding a new Tenant)

A rare but important scenario: the customer decides to add a new tenant to the group.

### 6.1 Steps

```
1. iam-service publishes: neuroassist-niv.tenant.created (with tenant_id, name, parameters)
2. neuroassist-niv-migrations consumes: creates schema <new-tenant-schema> and runs every V (manually or via job)
3. <provider-service> consumes: imports the shared catalogs
4. fiscal-service consumes: registers the tenant in the SEFAZ config
5. financeiro-service consumes: creates the chart-of-accounts template
6. auditoria-service records: neuroassist-niv.tenant.onboarding.completed
```

### 6.2 Compensation

- If any step fails after commit, publish a compensation event (`neuroassist-niv.tenant.onboarding.failed`).
- Each consumer handles the compensation and its own idempotent local rollback.
- Never distributed transactions -- eventual consistency + idempotent consumers.

---

## 7. Eureka -- Service Discovery

### 7.1 Client registration (mandatory)

```yaml
eureka:
  client:
    service-url:
      defaultZone: ${EUREKA_URL:http://neuroassist-niv-service-registry:8761/eureka/}
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true
    instance-id: ${spring.application.name}:${random.value}
```

### 7.2 Feign resolution

With `@FeignClient(name = "service-name")`, Spring Cloud + Eureka resolve the instance
automatically. No hardcoded URLs in production.

For local dev without Eureka:
```yaml
# application-local.yml
eureka.client.enabled: false
spring.cloud.openfeign.client.config.<provider-service>.url: http://localhost:8082
```

---

## 8. Checklist (Platform Patterns -- new service)

- [ ] `CorrelationIdInterceptor` registered in `WebMvcConfigurer`
- [ ] `TenantContextHolder` under `infrastructure/security/`
- [ ] `TenantFilter` (`OncePerRequestFilter`) populates and clears the context per request
- [ ] Every JMS producer uses `EventEnvelope`
- [ ] Every JMS consumer sets `TenantContextHolder` from the envelope and clears it in `finally`
- [ ] Every JMS consumer is idempotent (`processedEventPort.alreadyProcessed`)
- [ ] Feign clients propagate `X-Correlation-Id`, `X-Tenant-Id`, `X-User-Id` through a `RequestInterceptor`
- [ ] Resilience4j CircuitBreaker + Retry applied at the application-service edge
- [ ] `spring.jpa.hibernate.ddl-auto: validate` in `application.yml`
- [ ] `spring.jpa.open-in-view: false` in `application.yml` (RULE-08)
- [ ] Hibernate `multiTenancy: SCHEMA` + `TenantIdentifierResolver` configured
- [ ] Eureka registration configured
- [ ] No own migration (delegated to `neuroassist-niv-migrations`)

---

## References

- `hexagonal-patterns.md` -- `TenantContextHolder` and the cross-tenant guard
- `services-catalog.md` -- microservice and event catalog
- `rbac.md` -- RBAC model + JWT claims
- `docs/architecture/shared/multi-tenant.md` -- ADR-001
- `docs/architecture/shared/distributed-architecture.md` -- topology
