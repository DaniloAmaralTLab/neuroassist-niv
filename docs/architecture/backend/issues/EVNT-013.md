# EVNT-013 -- Implement AcsClient — caregiver JWKS + introspect + GET caregivers/{id}/links, ACS-link scoping guard (INV-EVNT-7)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT uses ACS for three functions on the caregiver paths: (1) JWKS fetch to verify caregiver JWTs,
(2) introspection on revoke-sensitive confirm path, (3) `GET /acs/caregivers/{caregiverId}/links`
to enforce read scoping — only events for patients the caller is linked to are returned (INV-EVNT-7).
The `caregiverId` is the JWT `sub`. Links are short-TTL-cached; on ACS outage serve cached links;
on hard failure deny (fail-closed on authorization — never widen scope). Also used by EVNT-017
(EscalationSweep) to resolve all linked caregivers for a patient when firing escalation tiers
(ESC-3 — integration-contracts §3). `preferredLocale` and `notifyConsent` from ACS (see
INT-EVNT-ACS-001) will be needed by EVNT-017/EVNT-018/EVNT-019 once ACS exposes them.

## Spec de referencia
- SPEC-06 (ACS resource server)
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §3

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/acs/CaregiverLinksPort.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/feign/AcsCaregiverFeignClient.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/security/AcsJwksClient.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/feign/AcsClientTest.java` (WireMock: links ok, ACS outage → cached, hard failure → deny)

## Criterios de aceite
- [ ] AC-1 `GET /acs/caregivers/{caregiverId}/links` returns the caller's linked patient IDs; unlinked `patientId` → `404` (INV-EVNT-7)
- [ ] AC-2 ACS JWKS outage with valid cached keys → continues serving, no `401` from outage
- [ ] AC-3 ACS links outage with no cached data → returns `403` (deny, never widen scope)
- [ ] AC-4 ACS JWKS call uses public access; ACS links call uses the caller's caregiver token (not service-client)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.feign.AcsClientTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- INT-EVNT-002 (service-client minting for introspection path)

## Estimativa
M

## Prioridade
P4
