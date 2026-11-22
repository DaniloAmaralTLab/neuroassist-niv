# CONV-013 -- GET /conv/audio/{assetId} + AudioService — stream clip with immutable cache headers, range support, 410 on erased (SPEC-02, ADR-003/ADR-005)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Implements `AudioService.read(assetId)` and `GET /conv/audio/{assetId}` controller (authority
`conv.audio.read`, patient-session token). Streams the pre-synthesized clip via
`AudioAssetPort.fetch(storageRef)`. The `assetId` must be referenced by the caller's patient
in any readable version (cross-tenant/cross-patient → `404`, INV-CONV-7). If the clip was
crypto-shredded (`erased = true`), returns `410 Gone` type `audio-erased` (ADR-005/006).
Response includes the clip media type, a strong `ETag` = `'"' + asset.contentHash + '"'`, and
`Cache-Control: public, max-age=31536000, immutable` (audio URLs are immutable — api-contract
§3). Supports HTTP Range requests → `206 Partial Content`. CONV never synthesizes on this path
(ADR-005, INV-CONV-5).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/AudioService.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/audio/AudioController.java`
- [ ] adicionar `AudioController.java` com `@GetMapping("/audio/{assetId}")` e `@PreAuthorize(RoleAuthorityPolicy.CONV_AUDIO_READ)`

## Criterios de aceite
- [ ] AC-1 `GET /conv/audio/{assetId}` with valid patient-session token returns `200 OK` with correct `Content-Type`, `ETag`, and `Cache-Control: public, max-age=31536000, immutable`
- [ ] AC-2 A `Range: bytes=0-499` request returns `206 Partial Content` with the requested byte range
- [ ] AC-3 If `audio_asset.erased = true`, the endpoint returns `410 Gone` type `audio-erased`
- [ ] AC-4 `assetId` from another patient's version returns `404 not-found` (INV-CONV-7, no cross-patient disclosure)
- [ ] AC-5 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-012 (precede — AudioAssetPort adapter)
- CONV-016 (precede — patient-session token accepted)

## Estimativa
S

## Prioridade
P4
