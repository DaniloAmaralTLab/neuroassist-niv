# CONV-014 -- PatClient Feign client — GET /pat/patients/{id} (pat.patient.read, service-client, ETag/304, PAT INV-PAT-7)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Creates `PatClient` (Feign client targeting `pat-service`) and `PatientReferencePortAdapter`
(implements `PatientReferencePort`). CONV calls `GET /pat/patients/{patientId}` as a
**service-client** (never with the patient-session token — PAT INV-PAT-7 rejects it with `403`).
Uses `If-None-Match`/`304` to minimize round-trips (PAT api-contract §1.3). Base URL:
`neuroassist.pat.base-url` (hub-integration.md §2). Used by `TreeService.publish()` to confirm
the patient exists before creating a version. A PAT outage degrades operator context but never
blocks the station read path (INV-CONV-5) — the publish can degrade gracefully with a timeout,
but a stale patient reference on the publish path is acceptable (operator action).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/clients/pat/PatClient.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/clients/pat/PatientReferencePortAdapter.java`
- [ ] adicionar `PatClient` com `@FeignClient(name = "pat-service", url = "${neuroassist.pat.base-url}")`
- [ ] registrar `neuroassist.pat.base-url` em `application.yml` como stub vazio para desenvolvimento local

## Criterios de aceite
- [ ] AC-1 `PatClient.getPatient(patientId)` sends `GET /pat/patients/{patientId}` with the service-client bearer token and `If-None-Match` header; verified by WireMock IT
- [ ] AC-2 A WireMock IT confirms that `PatClient` is never called with a patient-session token (PAT INV-PAT-7)
- [ ] AC-3 `./gradlew :conv-service:test` exits 0 (WireMock IT covers happy path and 304)

## Dependencias
- CONV-005 (precede — PatientReferencePort interface)
- CONV-016 (precede — service-client token for outbound Feign calls)

## Estimativa
S

## Prioridade
P4
