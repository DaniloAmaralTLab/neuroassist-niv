# SPEC-06 — Security

## Objetivo
Especificar a postura de segurança de REG: superfície interna, sem decisões de
authn/authz, sem PHI, e proteção do plano de registro/discovery.

## Escopo
**In:** plano de registro/discovery como interno à frota (network trust); exposição
não-pública; ausência de decisão de auth; garantia de ausência de PHI; hardening do
dashboard.
**Out:** validação de token de borda (GWY); autorização de domínio (cada serviço);
JWKS (REG não consome).

## Decisões técnicas
- **REG não autentica nem autoriza** (doc 01, `_brief.md` §4). Edge auth é do GWY;
  authz fica nos serviços.
- O plano Eureka é **platform-internal**: no deploy, só serviços in-fleet e o
  gateway alcançam REG; REG **não** é exposto no edge público (ADR-001).
- O dashboard Eureka deve ficar restrito à rede interna / operadores, não público.
- **Nenhum PHI** transita por REG — só metadata de localização de serviço
  (INV-REG-1). Registro é gated apenas por isolamento de rede (sem registry
  auth/mTLS no MVP — ADR-001, revisável).

## Implementação
- Topologia de rede: REG atrás do perímetro interno; sem rota pública via GWY para
  o protocolo Eureka.
- Dashboard e Actuator restritos por rede/credencial de plataforma conforme padrão
  de infraestrutura do projeto.
- Sem manuseio de JWT, sem leitura de tenant/`tenantId`, sem PHI.

## Casos de borda
- Tentativa de acesso ao protocolo Eureka a partir do edge público → bloqueada por
  topologia de rede (REG não é roteado publicamente pelo GWY).
- Operador acessa o dashboard → via rede interna/credencial de plataforma.
- Host não autorizado na rede interna → risco aceito sob network-trust (registry
  auth deferida — ADR-001).

## Critérios de aceite (EARS)
`THE SYSTEM SHALL NOT validate any edge JWT or business access token.`
`THE SYSTEM SHALL NOT make any authorization decision.`
`THE SYSTEM SHALL treat the registration/discovery plane as platform-internal and SHALL NOT expose it at the public edge.`
`THE SYSTEM SHALL restrict the Eureka dashboard to internal operators, not the public internet.`
`THE SYSTEM SHALL NOT store or transport any PHI; only service-location lease metadata passes through it.`
`THE SYSTEM SHALL NOT read, derive, or propagate any tenant context.`
