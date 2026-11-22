# CONV-007 -- TreeService.read() — GET /conv/tree: resolve active version, serialize tree + audioManifest, strong ETag, 304 conditional (SPEC-02, SPEC-03)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

Implements `TreeService.read()` and `GET /conv/tree` controller (authority `conv.tree.read`,
patient-session token). Resolves the `active` `TreeVersion` for the patient bound to the
session JWT (`patientId` from token, never from the URL — INV-CONV-7). Serializes the full
tree (categories → phrases) + `audioManifest` entries (one per `assetId` in the version) into
the bundle response. Computes a **strong ETag** = `'"' + version.contentHash + '"'` (INV-CONV-4).
Supports conditional `GET` via `If-None-Match`: if the client's ETag matches the current ETag,
returns `304 Not Modified` with no body (ADR-003 — station keeps its cached bundle). Cold
patient (no active version) returns `404 tree-not-published`. Patient and tenant are always
taken from the JWT claim; `X-Tenant-Id` is ignored (INV-CONV-7).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/TreeService.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/tree/TreeBundleResponseDto.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/tree/CategoryDto.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/tree/PhraseDto.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/tree/AudioManifestEntryDto.java`
- [ ] adicionar `TreeBundleResponseDto`, `CategoryDto`, `PhraseDto`, `AudioManifestEntryDto`

## Criterios de aceite
- [ ] AC-1 `GET /conv/tree` with a valid patient-session token returns `200 OK` + strong `ETag` header = `'"' + contentHash + '"'`; body includes `patientId`, `version`, `etag`, `contentHash`, `publishedAt`, `tree.categories` with nested `phrases`, and `audioManifest` (api-contract §2.1)
- [ ] AC-2 `GET /conv/tree` with `If-None-Match` equal to current ETag returns `304 Not Modified` with no body (ADR-003)
- [ ] AC-3 `GET /conv/tree` for a patient with no active version returns `404` type `tree-not-published`
- [ ] AC-4 Every phrase in the bundle has a matching `audioManifest` entry by `assetId`; no dangling manifests (INV-CONV-3)
- [ ] AC-5 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-006 (precede — TreeService, shares the service class)
- CONV-016 (precede — patient-session token accepted)

## Estimativa
S

## Prioridade
P2
