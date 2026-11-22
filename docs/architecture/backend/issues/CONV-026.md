# CONV-026 -- Idempotency guard — publish/retire/erase/usage idempotency keys + one-active concurrency (row lock + partial unique index uq_tree_version_one_active, INV-CONV-2, SPEC-05)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Hardens the idempotency and concurrency guarantees across all four state-changing operations
(SPEC-05). Idempotency keys: publish keyed on `trn:publish:<approvalId>` (checked before
acquiring the row lock — a replay returns `200` immediately); retire keyed on `versionId`;
erase keyed on `conv-service:patient:<patientId>:AudioAssetsErased`; usage keyed on
`(patientId, phraseId, occurredAt)` unique per patient. Concurrency: two TRN publishes racing
for the same patient serialize on `SELECT FOR UPDATE` on `published_tree` (CONV-011) + the
partial unique index `uq_tree_version_one_active` (V0072, INV-CONV-2) as the last-resort guard.
Unit tests verify: (1) the idempotency check happens before any write; (2) a concurrent
second publish raises `DataIntegrityViolationException` (index violation) and is retried
against the new active version.

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/TreeService.java`
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/application/TreeServiceIdempotencyTest.java`
- [ ] adicionar `TreeServiceIdempotencyTest` que simula dois publishes concorrentes via `ExecutorService` (2 threads) e verifica que apenas um `active` version existe ao final

## Criterios de aceite
- [ ] AC-1 `TreeServiceIdempotencyTest`: a replay of the same `idempotencyKey` on publish returns `200` and creates no additional `tree_version` row
- [ ] AC-2 Two concurrent publishes for the same patient result in exactly one `active` version after both complete (partial unique index enforced, INV-CONV-2)
- [ ] AC-3 Retire and erase operations are idempotent: a second call with the same target returns `200`/`202` with no state change
- [ ] AC-4 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-006 (precede — TreeService.publish)
- CONV-011 (precede — row lock in repository adapter)

## Estimativa
S

## Prioridade
P9
