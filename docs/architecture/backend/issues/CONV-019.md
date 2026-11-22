# CONV-019 -- AudioService.delete() — DELETE /conv/patients/{id}/audio: crypto-shred + versions withdrawn + durable-retry AudioAssetsErased + 202 (SPEC-05, ADR-005/ADR-006)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Implements `AudioService.delete()` and `DELETE /conv/patients/{patientId}/audio` controller
(authority `conv.audio.delete`, TRN service-client token only). Right-to-be-forgotten erasure:
CONV **crypto-shreds** the per-subject key so cached audio and `voiceModelRef` become unreadable,
marks affected `audio_asset` rows as `erased = true`, transitions all versions that referenced
those assets to `withdrawn`, and audits `AudioAssetsErased` to HIST with **commit + durable-retry**
(ADR-005/ADR-006). Idempotent: if already erased, returns `202 Accepted` with
`erasedAssetCount: 0` (SPEC-05). After erasure, `GET /conv/audio/{assetId}` for those clips
returns `410 Gone` (CONV-013). Returns `202 Accepted` with
`{patientId, status:"ERASED", erasedAssetCount, withdrawnVersionCount}` (api-contract §7).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/AudioService.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/audio/AudioController.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/audio/EraseAudioResponseDto.java`
- [ ] adicionar `EraseAudioResponseDto` com campos `patientId`, `status`, `erasedAssetCount`, `withdrawnVersionCount`

## Criterios de aceite
- [ ] AC-1 `DELETE /conv/patients/{patientId}/audio` returns `202 Accepted` with `{patientId, status:"ERASED", erasedAssetCount, withdrawnVersionCount}` (api-contract §7)
- [ ] AC-2 After erasure, `GET /conv/audio/{assetId}` for affected clips returns `410 Gone` type `audio-erased`
- [ ] AC-3 A second erasure for the same patient returns `202 Accepted` with `erasedAssetCount: 0` (idempotent, SPEC-05)
- [ ] AC-4 When HIST is unreachable, the crypto-shred + `erased=true` are committed and `AudioAssetsErased` is enqueued for durable retry (ADR-006); response is `202 Accepted`
- [ ] AC-5 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-012 (precede — AudioAssetPort crypto-shred)
- CONV-015 (precede — AuditPort durable-retry dispatcher)
- CONV-018 (precede — retire logic reused for affected versions)

## Estimativa
S

## Prioridade
P6
