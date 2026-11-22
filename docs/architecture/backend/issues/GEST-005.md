# GEST-005 -- DTOs and mappers for engine-version and capability surfaces

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto
Define all request/response DTOs and bidirectional mappers for the GEST API surface. DTOs are Java
records. Mappers convert between domain aggregates and DTOs. Enum values (`SupportStatus`,
`EngineStatus`) map to their string representations per api-contract §5.

## Spec de referencia
- SPEC-01 (API surface — JSON shapes §2–3)
- contracts/api-contract.md §2–3, §5
- contracts/data-model.md §2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/api/dto/EngineVersionDto.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/api/dto/EngineCapabilityDto.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/api/dto/SupportCheckRequestDto.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/api/dto/SupportCheckResponseDto.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/api/mapper/EngineVersionMapper.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/api/mapper/EngineCapabilityMapper.java`

## Resultado esperado
All DTO records and mappers compile cleanly. `EngineVersionDto` matches the JSON shape in
api-contract §2.1. `SupportCheckResponseDto` includes `engineVersion`, `results[]{code, supportStatus, detectable}`.

## Criterios de aceite
- [ ] AC-1: `EngineVersionDto` is a Java record with fields `version`, `displayLabel`, `status`, `createdAt`.
- [ ] AC-2: `SupportCheckRequestDto` is a Java record with `engineVersion` (String) and `codes` (List<String>); Bean Validation annotation `@NotEmpty` on `codes`.
- [ ] AC-3: `SupportCheckResponseDto` includes `engineVersion` and `results` as `List<SupportCheckResultItem>` where each item has `code`, `supportStatus`, `detectable`.
- [ ] AC-4: Mappers handle `null` gracefully and preserve enum string values as defined in api-contract §5.
- [ ] AC-5: `./gradlew :gest-service:compileJava` exits 0.

## Dependencias
- GEST-001 (precede — module scaffold)
- GEST-006 (precede — EngineVersion domain + EngineStatus enum)
- GEST-007 (precede — EngineCapability domain + SupportStatus enum)

## Estimativa
M

## Prioridade
P1
