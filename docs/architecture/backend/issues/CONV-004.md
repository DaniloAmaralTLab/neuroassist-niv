# CONV-004 -- Domain aggregates — PublishedTree root + TreeVersion + Category + Phrase + AudioAsset + UsageSignal (pure POJOs, INV-CONV-1/2)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Contexto

Creates the pure-domain model (no JPA/Spring annotations): `PublishedTree` (aggregate root —
one per patient, holds the pointer to the single `active` version and usage opt-in flag),
`TreeVersion` (immutable snapshot; only `status`/`withdrawnAt` are mutable, INV-CONV-1),
`Category` (immutable grouping node, self-referencing parent), `Phrase` (leaf the patient
plays — `assetId` must resolve in-version, INV-CONV-3), `AudioAsset` (manifest entry with
erasable `voiceModelRef`, ADR-005), `UsageSignal` (opt-in minimal telemetry — `phraseId`+
timestamp only, INV-CONV-6), and `TreeVersionStatus` enum (`active/superseded/withdrawn`).
Invariants INV-CONV-1 (append-only) and INV-CONV-2 (at most one `active` per patient) are
enforced in service logic; INV-CONV-4 (`etag` = pure function of `contentHash`) is enforced at
construction.

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/PublishedTree.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/TreeVersion.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/Category.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/Phrase.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/AudioAsset.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/UsageSignal.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/TreeVersionStatus.java`
- [ ] criar `TreeVersionStatus` enum com `active`, `superseded`, `withdrawn`

## Criterios de aceite
- [ ] AC-1 `PublishedTree` has fields `id`, `patientId`, `activeVersionId`, `usageOptIn`, `createdAt`, `updatedAt`; no JPA/Spring imports
- [ ] AC-2 `TreeVersion` has fields `id`, `publishedTreeId`, `patientId`, `version`, `etag`, `contentHash`, `status`, `sourceVersionRef`, `publishedBy`, `publishedAt`, `withdrawnAt`; `etag` is computed as `'"' + contentHash + '"'` at construction (INV-CONV-4)
- [ ] AC-3 `AudioAsset` has an `erased` boolean field and an `erasedAt` nullable field for crypto-shred marker (ADR-006)
- [ ] AC-4 `UsageSignal` has no free-text field — only `patientId`, `phraseId`, `occurredAt`, `recordedAt`, `idempotencyKey` (INV-CONV-6)
- [ ] AC-5 `./gradlew :conv-service:test` exits 0 (unit tests verify invariant constructors)

## Dependencias
- CONV-001 (precede)

## Estimativa
S

## Prioridade
P2
