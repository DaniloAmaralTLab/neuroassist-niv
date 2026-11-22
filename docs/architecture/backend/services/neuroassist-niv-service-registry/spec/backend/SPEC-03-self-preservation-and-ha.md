# SPEC-03 — Self-Preservation and HA Posture

## Objetivo
Especificar o ajuste de self-preservation/eviction por ambiente e registrar a
postura de alta disponibilidade (HA) — replicação peer-to-peer deferida
(sub-feature crítica extraída do brief / ADR-001).

## Escopo
**In:** flag de self-preservation (dev off / prod em aberto), sintonia de
renovação/expiração/eviction para uma frota pequena, e a decisão de single node
com HA deferida.
**Out:** replicação peer real (passo futuro), config client-side `eureka.client.*`
(de cada serviço, não de REG).

## Decisões técnicas
- **ADR-001 (local):** um único nó de registry, porta 8761; `self-preservation`
  **desligada em dev** para eviction honesta e convergência rápida numa LAN pequena
  e confiável; a postura de **prod** (self-preservation ligada) é decisão em aberto,
  fixada em config time. Sem peer replication (HA deferida).
- **ADR-002 (local):** boundary registry-only — nenhum código de negócio, nenhuma
  responsabilidade adicional neste serviço.
- Single node ⇒ `register-with-eureka=false`, `fetch-registry=false`.

## Implementação
- `application.yml`: `eureka.server.enable-self-preservation` (`false` em dev),
  intervalo do loop de eviction, janela de expiração de lease coerente com o
  heartbeat dos clientes (30s/90s default).
- Métricas expostas (SPEC-07): renewals/min, evictions, apps registrados,
  self-preservation ativo — base para decidir quando ligar HA.

## Casos de borda
- Dev, instância parada → evictada prontamente (self-preservation off).
- Prod com self-preservation ligada, queda transitória do renewal rate → membership
  preservada; não esvazia o registry.
- Recuperação do renewal rate (prod) → eviction normal retomada.
- Frota cresce a ponto de justificar HA → abrir nova rodada de vision para a decisão
  de peer replication (não decidida aqui — ADR-001 defere).

## Critérios de aceite (EARS)
`WHILE self-preservation is disabled (dev posture), THE SYSTEM SHALL evict an instance promptly once its lease expires.`
`WHERE self-preservation is enabled, WHILE the observed renewal rate is below the threshold, THE SYSTEM SHALL preserve membership and stop evicting.`
`WHERE self-preservation is enabled, WHEN the renewal rate recovers above the threshold, THE SYSTEM SHALL resume normal eviction.`
`THE SYSTEM SHALL run as a single node for the MVP and SHALL NOT attempt peer replication.`
`WHERE peer-replicated HA is later enabled, THE SYSTEM SHALL replicate registry state across peers (deferred — ADR-001).`
