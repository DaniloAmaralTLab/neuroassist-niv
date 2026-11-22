# CONV-020 -- UsageService.record() — POST /conv/usage-signals: opt-in, no free text, idempotent, 202 Accepted, discard when opted-out (SPEC-05, INV-CONV-6)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Implements `UsageService.record()` and `POST /conv/usage-signals` controller (authority
`conv.usage.record`, patient-session token, opt-in). Records that a phrase was spoken:
only `{phraseId, occurredAt, idempotencyKey}` — **no free text** allowed (request body with
any other field → `400 Bad Request` type `validation-error`, INV-CONV-6). Opt-in check:
if `published_tree.usage_opt_in = false` for the patient, the signal is **discarded silently**
(never an error) and `202 Accepted` is returned. Idempotent: a replay of the same `idempotencyKey`
returns `200 OK` without a duplicate row (SPEC-05). This endpoint must NEVER audit to HIST
(ADR-006, INV-CONV-6): a usage signal is opt-in product telemetry, not a compliance fact.
Response: `202 Accepted` `{status:"RECORDED", replay:false}` or `200 OK` on replay.

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/UsageService.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/usage/UsageController.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/usage/UsageSignalRequestDto.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/usage/UsageSignalResponseDto.java`
- [ ] adicionar `UsageSignalRequestDto` com `@JsonIgnoreProperties(ignoreUnknown = false)` para rejeitar campos extras (INV-CONV-6)
- [ ] garantir que `UsageService.record()` não chama nenhum port de auditoria (ADR-006)

## Criterios de aceite
- [ ] AC-1 `POST /conv/usage-signals` with `{phraseId, occurredAt, idempotencyKey}` returns `202 Accepted` when usage is opted in and persists one `usage_signal` row
- [ ] AC-2 `POST /conv/usage-signals` with an extra field (e.g. `freeText`) returns `400 Bad Request` type `validation-error` (INV-CONV-6)
- [ ] AC-3 When `published_tree.usage_opt_in = false`, the endpoint returns `202 Accepted` and writes NO row (silent discard)
- [ ] AC-4 A second request with the same `idempotencyKey` returns `200 OK` and writes NO duplicate row (SPEC-05)
- [ ] AC-5 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-011 (precede — UsageRepository)
- CONV-016 (precede — patient-session token)

## Estimativa
S

## Prioridade
P6
