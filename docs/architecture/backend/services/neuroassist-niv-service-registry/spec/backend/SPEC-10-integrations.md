# SPEC-10 — Integrations

## Objetivo
Especificar as integrações de REG: clientes Eureka in-fleet (inbound) e o stack de
observabilidade (outbound). REG não tem integração externa de negócio.

## Escopo
**In:** clientes Eureka (serviços de negócio + GWY) registrando/descobrindo;
observabilidade (logs → Elasticsearch).
**Out:** SaaS/AI/datastore/messaging — todos ausentes (doc 04); JWKS (REG não faz
auth).

## Decisões técnicas
- REG é o **alvo de dependência** da plataforma: clientes chamam REG; REG não chama
  ninguém de volta (`contracts/hub-integration.md`; `_brief.md` §6).
- Plano de registro/discovery é interno (network trust), sem credencial externa.
- Logs best-effort; logging degradado não bloqueia o serviço.

## Implementação
- Inbound: protocolo Eureka (registro/renovação/de-registro/consulta) de cada
  cliente in-fleet (ACS, PAT, EDGE, EVNT, CONV, GEST, HIST, TRN, GWY). MIG e DASH
  não são clientes Eureka (ver `contracts/hub-integration.md` §2).
- Outbound: logs estruturados de ciclo de vida ao Elasticsearch.
- Resiliência: clientes roteiam pelo registry cacheado em blip; serviço continua
  servindo discovery mesmo com logging degradado.

## Casos de borda
- Cliente brevemente sem alcançar REG → roteia pelo registry cacheado do próprio
  cliente e re-tenta.
- Stack de observabilidade indisponível → REG segue aceitando registros e
  respondendo discovery.

## Critérios de aceite (EARS)
`THE SYSTEM SHALL integrate only with in-fleet Eureka clients (inbound) and the platform observability stack (outbound).`
`THE SYSTEM SHALL accept registration and discovery without an external credential (network-trusted plane).`
`THE SYSTEM SHALL NOT integrate with any external SaaS, AI, datastore, or messaging system.`
`IF the observability stack is unavailable, THEN THE SYSTEM SHALL continue serving registration and discovery.`
