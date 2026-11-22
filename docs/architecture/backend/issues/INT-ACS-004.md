# INT-ACS-004 -- Cross-module identity references (PAT patient_id, EDGE device_id by-id-only validation)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ACS stores `patient_id` (from PAT) and `device_id` (from EDGE) on `patient_session` and
`caregiver_patient_link` as opaque UUIDs — no cross-service FK (data-model §2.4,
integration-contracts.md §2.4). The references are "by id only".

However, ACS needs to validate that these ids exist within the caller's tenant when:
- Provisioning a patient session (`patientId`, `deviceId` must belong to the tenant — INV-2).
- Linking a patient to a caregiver (the `patientId` must exist in the tenant — SPEC-03).

Validation approach: ACS calls PAT/EDGE via Feign (intra-project REST) to confirm
existence, without loading the full aggregate. If PAT is not running (MVP pilot: single
service deployment context), a mock/stub fallback is acceptable for the first scaffold.

This issue covers the port interfaces and adapter skeletons for PAT and EDGE validation;
the full WireMock integration test is deferred to the PAT/EDGE modules' scaffold phases.

## Spec de referencia

- integration-contracts.md (§2.4 referenced-by-id)
- SPEC-02 (INV-2 — patient and device must be in caller's tenant)

## Escopo

- [ ] implementar `backend/services/acs-service/src/main/java/com/neuroassist/acs/application/port/out/PatientExistsPort.java`
- [ ] implementar `backend/services/acs-service/src/main/java/com/neuroassist/acs/application/port/out/DeviceExistsPort.java`
- [ ] implementar `backend/services/acs-service/src/main/java/com/neuroassist/acs/infrastructure/clients/pat/PatientExistsAdapter.java`

## Criterios de aceite

- [ ] AC-1 `PatientExistsPort.existsInTenant(UUID patientId, UUID tenantId)` and `DeviceExistsPort.existsInTenant(UUID deviceId, UUID tenantId)` are in `application/port/out/`; no Spring annotations (RULE-01)
- [ ] AC-2 `PatientSessionService.provision(...)` calls both ports before creating the session; a `false` response raises a `NotFoundException` mapped to 404 (INV-2)
- [ ] AC-3 A `MockPatientExistsAdapter` (for MVP pilot without PAT running) is wired by `@ConditionalOnProperty(neuroassist.mock.pat-service)` and always returns `true`
- [ ] AC-4 `./gradlew :acs-service:test` exits 0

## Dependencias

- ACS-008 (precede — PatientSessionService)

## Estimativa

S

## Prioridade
P4
