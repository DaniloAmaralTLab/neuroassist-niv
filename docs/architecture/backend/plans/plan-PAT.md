# Plan -- PAT (Patients and Command Catalog)

> Service: `pat-service` · Module: **PAT** · Stack: Java 21 / Spring Boot · Multi-tenant (schema-per-tenant)
> Generated: 2026-11-19 by `/be-architect-backlog neuroassist-niv PAT`
> Hexagonal ADR: `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`)

## Status das prioridades

- P1 -- pendente
- P2 -- pendente
- P3 -- pendente
- P4 -- pendente
- P5 -- pendente
- P7 -- pendente
- P8 -- pendente
- P9 -- pendente

---

## 0. Leitura executiva

### Papel do serviço (extraído de 01-architectural-vision.md)

`pat-service` é o **serviço de Pacientes e Catálogo de Comandos** do NeuroAssist NIV. Ele é
a fonte de verdade para dois agregados:
- **Patient** — pessoa assistida pelo sistema, residente em cada tenant (família/clínica).
- **Command** — item do catálogo pessoal do paciente que mapeia um gesto facial (simples ou
  composto) a uma necessidade definida pela família, com calibração individual por comando.

Adicionalmente, PAT é o único proprietário do **vocabulário global** de primitivas de gesto
(`GestureType`) que o mecanismo de detecção (GEST) e o catálogo de comandos compartilham.

PAT é um **ACS resource server** puro: valida JWTs emitidos pelo ACS, nunca emite tokens
próprios. Downstream modules (GEST, EDGE, EVNT, DASH, CONV) **puxam** (pull) catálogo e dados
de paciente de PAT; PAT nunca faz push.

### MVP scope (extraído de 01)

- CRUD de pacientes (tenant-scoped): registro, listagem, deactivate/reactivate (soft).
- Catálogo de comandos por paciente: criar, calibrar, aposentar (retire, terminal).
- Vocabulário global de primitivas: listar, ler, registrar.
- Distribuição de catálogo (ADR-004): catalog-pull com ETag/304 para GEST/EDGE.
- Auditoria síncrona de todas as ações de estado ao HIST (event-contracts).
- Multi-tenancy schema-per-tenant; global schema para `gesture_type`.

### Diagnóstico inicial (gaps mapeados em 06)

- G1 (resolvido): PAT reserva faixa `V0020–V0022`; INT-PAT-003 promove ao MIG docs.
- G2 (resolvido): sem FK cross-schema de `command` → `gesture_type`; validação na camada de aplicação.
- G3 (resolvido): formato de catalog-pull, ETag/304 e autoridade de service-client pinados em SPEC-03.
- G4 (diferido): estratégia LGPD de erasure aguarda decisão cross-módulo (INT-PAT-005).
- TODO[architect] (abertos): (1) INT-PAT-001 — mecanismo de emissão de token service-client ACS;
  (2) INT-PAT-002 — política de falha HIST hard-502 vs enqueue-and-retry.

---

## 1. Estratégia geral

### Objetivo macro

Entregar um `pat-service` completo que: (a) suporta o ciclo de vida de pacientes e comandos
dentro de um tenant, (b) distribui o catálogo ativo com ETag para módulos de detecção, (c)
audita toda ação de estado ao HIST de forma síncrona e (d) rejeita qualquer token
`patient-session` em todos os endpoints (INV-PAT-7).

### Ordem das prioridades

| P | Título | Motivo |
|---|---|---|
| P1 | Scaffold + domínio + API mínima | Estrutura que tudo depende; erro aqui bloqueia todas as prioridades |
| P2 | Use cases de orquestração + API completa | Golden path end-to-end; ETag/304 (ADR-004) completa a API |
| P3 | Persistência + migrations | Adapters JPA e Flyway V0020–V0022; depende do domínio (P1) |
| P4 | Integrações externas | ACS (JWKS/introspect) + HIST (audit) + multi-tenancy routing |
| P5 | Segurança + multi-tenancy | RoleAuthorityPolicy wired + patient-session guard |
| P7 | Observabilidade | Actuator + métricas + X-Correlation-Id + PHI minimization |
| P8 | BDD end-to-end | Cucumber: 3 feature files × INV-PAT-1..7 cobertura |
| P9 | Hardening | Circuit breakers, JWKS refresh scheduler, erasure ADR |

---

## 2. Plano por prioridade

### Prioridade 1 — Scaffold + domínio + API mínima (Patient)

Status: pendente

#### Objetivo / Resultado esperado

Montar o esqueleto do `pat-service` (4 camadas hexagonais, Gradle, `application.yml`) e os
agregados/entidades do domínio (`Patient`, `Command`, `GestureType`, value objects
`CalibrationWindow`, `GestureComposition`) com todos os invariantes de domínio testados
unitariamente. Entregar o `PatientController` + `RoleAuthorityPolicy` como primeira superfície
de API compilável.

#### Issues vinculadas

- PAT-001 (scaffold)
- PAT-002 (Patient aggregate)
- PAT-003 (Command entity + value objects)
- PAT-004 (GestureType aggregate + ports)
- PAT-005 (PatientController + RoleAuthorityPolicy)

#### Specs cobertas

- SPEC-01 (api surface, base path, RoleAuthorityPolicy)
- SPEC-02 (domain framing, invariants INV-PAT-1..5)
- SPEC-03 (gesture-type, INV-PAT-6)
- SPEC-06 (domain ports)

#### Sequência de execução

- Fase 1: PAT-001 (scaffold) → PAT-002 (Patient) + PAT-003 (Command) + PAT-004 (GestureType/ports)
- Fase 2: PAT-005 (PatientController + RoleAuthorityPolicy)

#### Critérios de aceite

- `./gradlew :pat-service:compileJava` exits 0
- `./gradlew :pat-service:test` exits 0 cobrindo invariantes de domínio (PAT-002/003)
- `RoleAuthorityPolicy` define as 10 constantes `pat.*.*` sem strings literais nos controllers

#### Riscos

- CalibrationWindow e GestureComposition com lógica de validação incorreta → cobrir com testes unitários exaustivos antes de P2.

#### Instrução para implementador

Criar PAT-001 primeiro. Não adicionar anotações JPA ao package `domain` — as entidades JPA ficam em `infrastructure/persistence` (P3). Cada port (`HistAuditPort`, `TokenValidationPort`, `AcsIntrospectionPort`) deve ser uma interface pura no package `domain`.

---

### Prioridade 2 — Use cases de orquestração + API completa

Status: pendente

#### Objetivo / Resultado esperado

Implementar todos os use cases de aplicação (`PatientService`, `CommandService`,
`CalibrateCommandUseCase`, `GestureTypeService`) com stubs dos ports (Mockito em testes
unitários) e completar a API com `CommandController`, `GestureTypeController` incluindo o
protocolo ETag/304 (ADR-004, SPEC-03). Ao final desta prioridade, toda a superfície REST
está compilável e os testes unitários dos use cases passam.

#### Issues vinculadas

- PAT-006 (RegisterPatient + DeactivatePatient + ReactivatePatient)
- PAT-007 (CreateCommand + catalog reads)
- PAT-008 (CalibrateCommand — optimistic lock, no-op audit)
- PAT-009 (RetireCommand + GestureTypeService)
- PAT-010 (CommandController + GestureTypeController + DTOs + ETag/304)

#### Specs cobertas

- SPEC-02 (use cases, invariants INV-PAT-2..5)
- SPEC-03 (catalog distribution, ADR-004 ETag/304)
- SPEC-05 (idempotency, optimistic lock)
- event-contracts.md §1.2 (all 6 audited actions)

#### Sequência de execução

- Fase 1: PAT-006 + PAT-007 + PAT-009 (use cases em paralelo, compartilham interfaces de P1)
- Fase 2: PAT-008 (CalibrateCommand — depende de CommandService base de PAT-007)
- Fase 3: PAT-010 (controllers — depende de todos os use cases)

#### Critérios de aceite

- `./gradlew :pat-service:test` exits 0 cobrindo todos os use cases
- `CommandResponse` resolve primitivas inline `{ id, code, displayName }` (ADR-004)
- ETag/304 implementado em `GET .../commands` e `GET /pat/gesture-types`
- CalibrateCommand no-op não chama `HistAuditPort` (SPEC-05)

#### Riscos

- CalibrateCommand com `@Version` requer JPA wired (P3); em P2 usar stub em teste de unidade.
- INT-PAT-002 (HIST failure policy) ainda aberta → implementar hard-502 por padrão e ajustar após confirmação.

#### Instrução para implementador

`@Transactional` SOMENTE na camada `application.service` (ArchUnit RULE-04). CalibrateCommand
deve seguir o pseudocode de SPEC-02 passo a passo sem atalhos.

---

### Prioridade 3 — Persistência + migrations

Status: pendente

#### Objetivo / Resultado esperado

Implementar os adaptadores JPA (`PatientRepositoryAdapter`, `CommandRepositoryAdapter`,
`GestureTypeRepositoryAdapter`) e os scripts Flyway `V0020`–`V0021`. O serviço deve ser
capaz de fazer operações de leitura/escrita contra um PostgreSQL real com schemas
`neuroassist_global` e `t_<tenantId>`.

#### Issues vinculadas

- PAT-011 (JPA entities Patient + Command + repositories)
- PAT-012 (GestureType JPA + global schema routing)
- PAT-013 (Flyway V0020–V0022)

#### Specs cobertas

- SPEC-04 (data model, migrations, G1, G2)
- contracts/data-model.md §2 (canonical DDL)

#### Sequência de execução

- Fase 1: PAT-013 (Flyway scripts — DDL base, antes de qualquer entity mapping)
- Fase 2: PAT-016 (TenantContextHolder — routing prerequisite, ver P4) → PAT-011 + PAT-012 em paralelo

#### Critérios de aceite

- V0020 cria `gesture_type` global com seed de 8 primitivas; re-runnable
- V0021 cria `patient` + `command` per-tenant com todos os CHECK constraints de data-model §2.2–2.3
- `spring.flyway.enabled=false` em `application.yml`
- Adapters implementam interfaces de domínio sem vazar JPA ao package `domain`

#### Riscos

- Cross-schema routing (global vs per-tenant) pode exigir ajuste de `search_path` no DataSource.

#### Instrução para implementador

PAT-016 (TenantContextHolder) é prerequisito técnico de PAT-011/012 — pode ser desenvolvido em paralelo com PAT-013 mas deve preceder os adapters de repositório.

---

### Prioridade 4 — Integrações externas

Status: pendente

#### Objetivo / Resultado esperado

Implementar os adaptadores HTTP para ACS (JWKS cache + introspection) e HIST (audit REST),
o TenantContextHolder com schema routing, e verificar os contratos de integração em aberto
(INT-PAT-001 e INT-PAT-002).

#### Issues vinculadas

- PAT-014 (ACS JWKS + introspection adapters)
- PAT-015 (HistAuditAdapter)
- PAT-016 (TenantContextHolder + TenantRoutingDataSource)
- INT-PAT-001 (ACS service-client token minting)
- INT-PAT-002 (HIST failure policy)
- INT-PAT-004 (GEST/EDGE ETag/304 contract)

#### Specs cobertas

- SPEC-10 (integrations resilience)
- integration-contracts.md §1–3
- event-contracts.md §1 (failure policy)

#### Sequência de execução

- Fase 1: PAT-016 (TenantContextHolder — blocking P3)
- Fase 2: PAT-014 + PAT-015 em paralelo (após INT-PAT-001 e INT-PAT-002 confirmados ou com assumption provisória)
- Fase 3: INT-PAT-004 (verificação com GEST/EDGE mock)

#### Critérios de aceite

- `JwksTokenValidationAdapter` usa cache em caso de outage ACS; nunca aceita token sem assinatura
- `HistAuditAdapter` propaga `X-Correlation-Id` do MDC; retorna `502` em prod quando HIST falha
- INT-PAT-001 e INT-PAT-002 resolvidos (ou assumptions documentadas se adiadas)

#### Riscos

- INT-PAT-001 (service-client token minting) pode exigir mudança no ACS — alinhar com o time ACS antes de PAT-014.

---

### Prioridade 5 — Segurança + multi-tenancy

Status: pendente

#### Objetivo / Resultado esperado

Finalizar o `SecurityConfig` com Spring Security resource server wired, o guard de
`patient-session` token (INV-PAT-7) e o aspecto de isolamento cross-tenant (INV-PAT-2).
Todo o `@PreAuthorize` deve referenciar `RoleAuthorityPolicy` exclusivamente (INV-PAT-8, D-535).

#### Issues vinculadas

- PAT-017 (RoleAuthorityPolicy + SecurityConfig)
- PAT-018 (patient-session guard + cross-tenant 404)

#### Specs cobertas

- SPEC-06 (authority model, tenant isolation, INV-PAT-7/8)

#### Sequência de execução

- Fase 1: PAT-017 → PAT-018

#### Critérios de aceite

- Nenhuma string literal `"pat.*"` fora de `RoleAuthorityPolicy` (ArchUnit)
- Patient-session token → `403` em todos os endpoints (INV-PAT-7)
- Cross-tenant → `404` sem disclosure (INV-PAT-2)

---

### Prioridade 7 — Observabilidade + health

Status: pendente

#### Objetivo / Resultado esperado

Actuator com readiness check DB, métricas Micrometer e propagação de `X-Correlation-Id`
com structured JSON logging sem PHI.

#### Issues vinculadas

- PAT-019 (Actuator + Micrometer)
- PAT-020 (X-Correlation-Id + structured logging)

#### Specs cobertas

- SPEC-07 (observability, PHI minimization)

#### Critérios de aceite

- `GET /actuator/health/readiness` = DOWN quando DB inacessível
- `pat_hist_audit_failure_total` exposto
- Logs JSON não emitem `patient.label` nem `command.label`

---

### Prioridade 8 — BDD end-to-end

Status: pendente

#### Objetivo / Resultado esperado

Suite Cucumber completa: EmbeddedPostgres + WireMock + 3 feature files com step definitions.
Deve cobrir INV-PAT-1..7 com pelo menos um cenário cada.

#### Issues vinculadas

- PAT-021 (Cucumber wiring + CommonSteps)
- PAT-022 (patient-registration.feature steps)
- PAT-023 (command-calibration.feature steps)
- PAT-024 (catalog-distribution-and-authority.feature steps)

#### Specs cobertas

- SPEC-08 (BDD scenarios)

#### Critérios de aceite

- `./gradlew :pat-service:integrationTest` exits 0 cobrindo todos os cenários das 3 features
- INV-PAT-1..7 cobertos com pelo menos um cenário cada

---

### Prioridade 9 — Hardening

Status: pendente

#### Objetivo / Resultado esperado

Resilience4j circuit breakers em ACS introspect e HIST; JWKS refresh scheduler; ADR de
erasure LGPD como bloqueador de qualquer endpoint de erasure.

#### Issues vinculadas

- PAT-025 (Resilience4j + JwksRefreshScheduler)
- INT-PAT-005 (LGPD erasure ADR — planejamento)

#### Specs cobertas

- SPEC-10 (resilience summary)

---

## 3. Dependências externas

| Dependência | Tipo | Risco | Mitigation |
|---|---|---|---|
| ACS (`acs-service`) | JWKS + introspect | Contrato service-client token (INT-PAT-001) | Assumir assumption provisória; ajustar em PAT-014 |
| HIST (`hist-service`) | Audit sink | Failure policy (INT-PAT-002) | Implementar hard-502 por padrão |
| MIG (`neuroassist-niv-migrations`) | Flyway central | Faixa V0020–V0022 sem registro formal (INT-PAT-003) | Promover ao MIG docs em INT-PAT-003 |
| GEST/EDGE | Consumer do catálogo | ETag/304 contract (INT-PAT-004) | Verificar em P4 com WireMock |
| REG (Eureka) | Service discovery | Instabilidade em dev | Fallback via `*.base-url` directo |

---

## 4. Restrições arquiteturais

Aplica ao stack Java (`hexagonal_java`):

- ArchUnit RULE-01..08 (`docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`): camadas `api/application/domain/infrastructure`; dependências somente de exterior para interior.
- `@Transactional` SOMENTE em `application.service`; proibido em `domain` e `infrastructure`.
- Nenhuma anotação JPA em classes do package `domain`.
- `@PreAuthorize` strings somente via `RoleAuthorityPolicy` (RULE adicional, INV-PAT-8, D-535).
- Sem FK cross-service e cross-schema (G2 decision): `primary_primitive_id` validado na camada de aplicação.
- `spring.flyway.enabled=false` — MIG aplica centralmente; PAT nunca migra no startup.
- `patient.label` e `command.label` NUNCA em logs ou tags de métrica (PHI minimization).

---

## 5. Referências

- `docs/architecture/backend/services/pat-service/01-architectural-vision.md`
- `docs/architecture/backend/services/pat-service/02-architecture-blueprint.md`
- `docs/architecture/backend/services/pat-service/03-initial-domain-framing.md`
- `docs/architecture/backend/services/pat-service/04-backend-architecture-direction.md`
- `docs/architecture/backend/services/pat-service/05-persistence-model.md`
- `docs/architecture/backend/services/pat-service/06-risks-gaps-assumptions.md`
- `docs/architecture/backend/services/pat-service/adr/ADR-001-service-boundary-single-service.md`
- `docs/architecture/backend/services/pat-service/adr/ADR-002-gesture-type-catalog-placement.md`
- `docs/architecture/backend/services/pat-service/adr/ADR-003-command-calibration-model.md`
- `docs/architecture/backend/services/pat-service/adr/ADR-004-catalog-distribution.md`
- `docs/architecture/backend/services/pat-service/contracts/api-contract.md`
- `docs/architecture/backend/services/pat-service/contracts/data-model.md`
- `docs/architecture/backend/services/pat-service/contracts/event-contracts.md`
- `docs/architecture/backend/services/pat-service/contracts/integration-contracts.md`
- `docs/architecture/backend/services/pat-service/generator-config.yml`
- `docs/architecture/backend/issues/issues_map-PAT.md`
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`)
