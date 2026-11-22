# SPEC-07 — Observability and Health

## Objetivo
Especificar logs de ciclo de vida, métricas do registry e endpoints de
health/readiness de REG.

## Escopo
**In:** logs de registro/renovação/eviction → stack de observabilidade
(Elasticsearch); métricas (apps registrados, renewals/min, evictions,
self-preservation ativo); liveness/readiness.
**Out:** business analytics (DASH/HIST), eventos de broker (N/A, SPEC-09), trace de
requisição de negócio (REG não roteia tráfego de negócio).

## Decisões técnicas
- Observabilidade desde o dia 1: REG envia seus logs de ciclo de vida ao stack de
  plataforma (Elasticsearch, search engine do projeto).
- Readiness reflete o registry estar aceitando registros; liveness reflete o
  servidor no ar.
- Métricas do Eureka expostas via Actuator/Prometheus.

## Implementação
- Logs estruturados em registro/renovação/eviction/self-preservation, com o logical
  id e instanceId afetados, enviados best-effort ao Elasticsearch.
- Actuator: `/actuator/health` (liveness), `/actuator/health/readiness`
  (readiness), `/actuator/prometheus` (métricas) — fora da superfície do protocolo
  Eureka.
- Métricas-chave: número de apps/instâncias, renewals por minuto, evictions, flag de
  self-preservation.

## Casos de borda
- Elasticsearch brevemente indisponível → logging best-effort; nunca bloqueia
  registro/discovery.
- Self-preservation ativo (prod) → exposto como métrica/sinal para o operador.
- Readiness `false` enquanto o registry ainda não aceita registros → instância não
  considerada pronta.

## Critérios de aceite (EARS)
`THE SYSTEM SHALL emit a structured lifecycle log for each registration, renewal, and eviction to the platform logging stack (Elasticsearch).`
`THE SYSTEM SHALL expose metrics for registered apps/instances, renewal rate, evictions, and self-preservation state.`
`THE SYSTEM SHALL expose liveness, readiness, and metrics endpoints separate from the Eureka protocol surface.`
`WHILE the registry is not yet accepting registrations, THE SYSTEM SHALL report readiness as not-ready.`
`IF the logging stack is unavailable, THEN THE SYSTEM SHALL continue accepting registrations and answering discovery (logging is best-effort).`
