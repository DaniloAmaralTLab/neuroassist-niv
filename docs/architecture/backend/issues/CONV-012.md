# CONV-012 -- AudioAssetPort adapter — serve pre-synthesized clip bytes from blob storage + crypto-shred on erasure (ADR-005/ADR-006)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Implements `AudioAssetPortAdapter` — the infrastructure adapter for `AudioAssetPort`. This
adapter reads pre-synthesized audio **bytes** from blob/object storage using `storage_ref`
from `AudioAsset` (never from ElevenLabs — ADR-005, INV-CONV-5) and also performs the
crypto-shred on erasure: deletes the per-subject key so `storage_ref`/`voice_model_ref`
become unreadable, sets `audio_asset.erased = true` / `erased_at = now()` for all affected
rows, leaving the immutable record in place (ADR-006). Auth to blob storage uses a service
identity (config/secret), never patient-derived credentials. The specific blob storage
SDK/provider is configured via `neuroassist.conv.blob.storage-url` (or equivalent property).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/storage/AudioAssetPortAdapter.java`
- [ ] implementar `backend/services/conv-service/src/main/resources/application.yml`
- [ ] registrar storage credentials em `application.yml` stubs (blank by default, overridden in test via Testcontainers fake blob)

## Criterios de aceite
- [ ] AC-1 `AudioAssetPortAdapter.fetch(storageRef)` returns the clip bytes for a valid `storageRef`; a stubbed IT confirms no TTS vendor is called (ADR-005)
- [ ] AC-2 `AudioAssetPortAdapter.cryptoShred(patientId, affectedAssetIds)` sets `erased=true` and clears `storage_ref`/`voice_model_ref` for all affected rows; a subsequent `fetch` for those assets returns a marker indicating erased (410 path, CONV-013)
- [ ] AC-3 `./gradlew :conv-service:test` exits 0 (unit test with fake/stub blob storage)

## Dependencias
- CONV-005 (precede — AudioAssetPort interface)
- CONV-010 (precede — AudioAssetEntity)

## Estimativa
S

## Prioridade
P4
