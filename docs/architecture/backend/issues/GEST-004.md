# GEST-004 -- SupportCheckController — POST /gest/capabilities/support-check

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the primary station read: the "detectable" gate (INV-GEST-7). The station sends
`{ engineVersion, codes[] }` and receives per-code `supportStatus` + derived `detectable` flag.
Requires `gest.capability.read` authority. The `edge.device` token is accepted (INT-GEST-ACS-1).
Empty `codes` returns `400`. Response includes `ETag` for station-side caching.

## Spec de referencia
- SPEC-01 (API surface §3.3)
- SPEC-03 (support-check gate)
- contracts/api-contract.md §3.3

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/api/SupportCheckController.java`

## Resultado esperado
`POST /gest/capabilities/support-check` with valid request returns `200` with per-code results and
`ETag`. Empty `codes` returns `400`. Missing/invalid token returns `401`.
`./gradlew :gest-service:test` passes for `SupportCheckControllerTest`.

## Criterios de aceite
- [ ] AC-1: Valid request returns `200 { "engineVersion": "1.3.0", "results": [ { "code": "BLINK", "supportStatus": "supported", "detectable": true }, ... ] }` with `ETag`.
- [ ] AC-2: `codes` empty or absent returns `400 application/problem+json` with `type: validation-error`.
- [ ] AC-3: Unknown `engineVersion` returns `200` with every requested code resolved to `unknown` / `detectable: false` (not an error — advisory, INV-GEST-7).
- [ ] AC-4: `detectable` = `true` iff `supportStatus ∈ {supported, experimental}`; `unsupported` and `unknown` both yield `detectable: false`.
- [ ] AC-5: `@PreAuthorize` references `RoleAuthorityPolicy.GEST_CAPABILITY_READ` (D-535). `edge.device` token bearing `gest.capability.read` is accepted.
- [ ] AC-6: `./gradlew :gest-service:test` exits 0 for `SupportCheckControllerTest`.

## Dependencias
- GEST-001 (precede — module scaffold)
- GEST-005 (precede — SupportCheckRequestDto, SupportCheckResponseDto)
- GEST-011 (precede — CapabilityService.checkSupport)

## Estimativa
M

## Prioridade
P1
