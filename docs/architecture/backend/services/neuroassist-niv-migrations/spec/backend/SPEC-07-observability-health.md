# SPEC-07 — Observability and Health

## Objetivo
Especificar como um job batch sem porta HTTP reporta estado: **exit code**, relatório
por schema, e logs estruturados — não há actuator web.

## Escopo
**In:** contrato de exit code; relatório por schema (versão atingida, falha nomeada);
logs de ciclo de vida; sinal operacional "migrations applied".
**Out:** endpoints HTTP de health/readiness (MIG não é um serviço web); métricas
Prometheus via scrape de porta (não há porta — ver nota).

## Decisões técnicas
- **Health = exit code.** `0` sucesso (inclui no-op); `1` erro de uso; `2` falha de
  migração nomeando o schema (SPEC-01, ADR-005). É o contrato que ops/CI gateiam.
- **Relatório por schema.** Ao fim, MIG loga uma linha por schema: nome, versão
  inicial → versão atingida, OK/FAILED. O sinal "migrations applied" (global + N
  tenants @ V) é um log line + estado em `flyway_schema_history`, não um evento.
- **Logs estruturados.** Linha de início (modo + argumentos), por-schema progress, e
  resumo final; nível `ERROR` nomeia o schema em falha.
- **Sem auto-restart.** Deploy como unidade init/batch com `restart: "no"` (doc 06 R7)
  — um restart automático mascararia uma falha real.
- **Nota (métricas):** como job sem porta, MIG não expõe `/actuator/prometheus` por
  scrape; se telemetria for necessária, é via push na saída (ex.: log shipper para o
  ELK). Observabilidade de runtime do fleet é dos serviços de negócio, não de MIG.

## Casos de borda
- Falha global → resumo marca `neuroassist_global FAILED`, tenants `SKIPPED`, exit 2.
- Falha em tenant k → schemas anteriores `OK`, o k `FAILED`, resto `SKIPPED`, exit 2.
- No-op → todos `OK (no change)`, exit 0.

## Critérios de aceite (EARS)
`THE SYSTEM SHALL signal success/failure via exit code: 0 success (incl. no-op), 1 usage error, 2 migration failure.`
`WHEN a run completes, THE SYSTEM SHALL emit a per-schema report line (schema, from→to version, OK/FAILED).`
`IF a schema fails, THEN THE SYSTEM SHALL log it at ERROR naming the schema and mark remaining schemas SKIPPED.`
`THE SYSTEM SHALL emit the "migrations applied" signal as a log line and flyway_schema_history rows, not as a broker event.`
`THE SYSTEM SHALL be deployed as an init/batch unit with restart:"no" so a failure is visible, not retried (doc 06 R7).`
`THE SYSTEM SHALL expose no web health/readiness endpoint (non-web job).`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
