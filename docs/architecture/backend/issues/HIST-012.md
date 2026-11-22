# HIST-012 -- Service-client identity derivation (source from JWT principal when envelope omits it) + ACS link scoping for caregiver reads (caregiver linked to patientId within tenant, 403 on scope violation)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Two related security-layer concerns:

1. **Service-client source derivation**: when an envelope omits `source`, HIST derives it from the
   authenticated service-client's JWT `sub` / `client_id` claim. This ensures INV-HIST-2 (`source`
   is never null in the store) without requiring every producer to explicitly include it.
   `ServiceClientIdentityResolver` extracts this from `JwtAuthenticationToken.getToken()`.

2. **ACS link scoping**: `GET /hist/patients/{patientId}/history` requires the authenticated
   caregiver to be linked to `patientId` within their tenant (same rule as EVNT
   `PatientEventService`). `CaregiverLinkScopeChecker` calls ACS (via `AcsLinkScopePort`) to
   verify the link. If the caregiver is not linked, or `patientId` is in a different tenant, HIST
   responds `403` and leaks no record (INV-HIST-6). The same `403` applies whether the patient
   does not exist or is in another tenant (do not reveal existence).

## Spec de referencia

- SPEC-06 (security — link scoping + service-client auth)
- api-contract.md §0 (authentication model) + §2 (caregiver timeline EARS)
- event-contracts.md §1 (source derivation)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/security/ServiceClientIdentityResolver.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/port/out/AcsLinkScopePort.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/clients/acs/AcsLinkScopeAdapter.java`

## Criterios de aceite

- [ ] AC-1 Envelope without `source` + authenticated service-client JWT → `source` set from `sub`/`client_id` claim; envelope with explicit `source` → stored verbatim (envelope value wins)
- [ ] AC-2 Caregiver token + patientId linked in same tenant → `GET /hist/patients/{patientId}/history` returns `200`
- [ ] AC-3 Caregiver token + patientId NOT linked or in different tenant → `403 application/problem+json` with no record details
- [ ] AC-4 `AcsLinkScopeAdapter` calls ACS link-check endpoint (Feign/HTTP); WireMock IT covers happy path and 403 path
- [ ] AC-5 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-011 (SecurityConfig — JWT processing precedes this filter)

## Estimativa

M

## Prioridade
P5
