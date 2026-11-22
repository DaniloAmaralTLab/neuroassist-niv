# SPEC-06 — Security

## Objetivo
Especificar a postura de segurança de MIG: confinamento da credencial admin, ausência
de superfície pública, e nenhum PHI.

## Escopo
**In:** confinamento e privilégio do datasource admin; ausência de porta/endpoint;
ausência de authn/authz (não há chamador autenticável); ausência de PHI.
**Out:** RBAC de negócio (ACS); edge token validation (GWY); mTLS entre serviços
(MIG não faz chamada entre serviços).

## Decisões técnicas
- **Datasource admin confinado.** A credencial com `CREATE SCHEMA`/`CREATE EXTENSION`
  é mais privilegiada que qualquer role de runtime; vive **apenas** no job MIG,
  injetada por secret, nunca embarcada num serviço de negócio (doc 06 R9, A1).
- **Sem superfície de ataque de rede.** Sem porta HTTP, sem servidor web, sem
  registro Eureka (ADR-002) → superfície mínima.
- **Sem PHI.** MIG não lê nem persiste dado de paciente/cuidador; possui só
  `migration_range_registry` e lê `flyway_schema_history` (doc 05 §Data Lifecycle).
- **Sem authn/authz.** A confiança de invocação é o shell de ops / sistema de deploy;
  não há chamador remoto a autenticar.

## Casos de borda
- Credencial admin vazada → blast radius mitigado por confinamento ao job efêmero
  (roda e sai), rotação por secret store (doc 06 R9).
- Tentativa de expor a porta → não há porta a expor (web-application-type=none).

## Critérios de aceite (EARS)
`THE SYSTEM SHALL confine the admin datasource credential to the MIG job and SHALL NOT embed it in any business service (doc 06 R9).`
`THE SYSTEM SHALL require an admin credential able to CREATE SCHEMA and CREATE EXTENSION, more privileged than any runtime role (A1).`
`THE SYSTEM SHALL expose no HTTP port, no web server, and no Eureka registration (minimal attack surface).`
`THE SYSTEM SHALL hold and process no PHI and no business/tenant data.`
`THE SYSTEM SHALL make no authentication or authorization decision (invocation trust is the ops/deploy shell).`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
