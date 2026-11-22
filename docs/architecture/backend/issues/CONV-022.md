# CONV-022 -- CorrelationIdInterceptor + privacy log filter — echo X-Correlation-Id on responses + HIST calls, never log phrase text or voice_model_ref (SPEC-07, ADR-005/ADR-006)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Implements `CorrelationIdFilter` (a `OncePerRequestFilter` that reads/generates `X-Correlation-Id`
and stores it in MDC) and `CorrelationIdFeignInterceptor` (a Feign `RequestInterceptor` that
propagates the MDC correlation id as `X-Correlation-Id` on every outbound call — including HIST
audit calls, SPEC-07). Key privacy rule: the filter and service layer must NEVER log the
`phrase.text` (free text of the patient's voice) or any `voice_model_ref` value
(ADR-005/ADR-006). Log structured fields: tenant_id, correlation_id, event type, version_id — no
patient speech content.

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/web/CorrelationIdFilter.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/clients/hist/CorrelationIdFeignInterceptor.java`
- [ ] adicionar `CorrelationIdFeignInterceptor` como `@Bean` em `FeignConfig.java`

## Criterios de aceite
- [ ] AC-1 Every response includes the `X-Correlation-Id` header echoed from the request (or a generated UUID if absent); verified by IT
- [ ] AC-2 `CorrelationIdFeignInterceptor` propagates the MDC correlation id to HIST Feign calls; WireMock IT asserts the header is present on `POST /hist/audit`
- [ ] AC-3 Code review (or ArchUnit test) confirms no `log.*` statement includes `phrase.text` or any field named `voice_model_ref` (ADR-005/ADR-006)
- [ ] AC-4 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-015 (precede — HistClient Feign, Feign interceptor must be registered)
- CONV-016 (precede — SecurityConfig, filter ordering)

## Estimativa
S

## Prioridade
P7
