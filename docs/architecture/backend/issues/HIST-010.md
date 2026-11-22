# HIST-010 -- Idempotency key derivation — explicit idempotencyKey wins; composite fallback source|subject_type|subject_id|action|occurred_at (ADR-003 Option C); INSERT ON CONFLICT DO NOTHING → 201 new / 200 replay; concurrent-insert serialized by UNIQUE constraint

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

Guarantees that a request retry never double-writes an audit record (ADR-003 hybrid Option C).
`IdempotencyKey.of(command)` returns:
- the explicit `idempotencyKey` from the envelope when present (best guarantee),
- else the composite `source|subject_type|subject_id|action|occurred_at` (sub-second `occurredAt`
  provides strong collision resistance for distinct events).

The adapter executes `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`; when
nothing is inserted (conflict), it `SELECT`s the existing row and returns it with `replay = true`
→ controller responds `200`. Concurrent duplicate posts are serialized by the DB UNIQUE constraint:
exactly one `201`, the other `200`.

## Spec de referencia

- SPEC-05 (idempotency + concurrency)
- data-model.md §2.1 (UNIQUE idempotency_key constraint)
- ADR-003 (hybrid idempotency — Option C accepted)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/model/IdempotencyKey.java`
- [ ] atualizar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/adapter/AuditTrailPortAdapter.java` (ON CONFLICT logic)
- [ ] unit tests: `backend/services/hist-service/src/test/java/com/neuroassist/hist/domain/model/IdempotencyKeyTest.java`

## Criterios de aceite

- [ ] AC-1 Envelope with explicit `idempotencyKey` → `IdempotencyKey.of()` returns that key verbatim
- [ ] AC-2 Envelope without `idempotencyKey` → composite key `source|subject_type|subject_id|action|occurred_at`
- [ ] AC-3 First insert with key K → returns `{replay: false}`; `201` from controller
- [ ] AC-4 Second insert with same key K → no second row; returns `{replay: true}` with the original record; `200` from controller (INV-HIST-3)
- [ ] AC-5 Concurrent inserts with same key → exactly one row (UNIQUE constraint serializes); integration test with two parallel threads confirms
- [ ] AC-6 `./gradlew :hist-service:test` exits 0

## Dependencias

- HIST-009 (JPA adapter, ON CONFLICT implementation)
- HIST-004 (AppendAuditRecord builds the command that feeds IdempotencyKey.of)

## Estimativa

M

## Prioridade
P4
