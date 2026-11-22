# HIST-017 -- SubjectErasureService + POST /hist/subjects/{subjectId}/erasure + AuditSubjectKey JPA entity — crypto-shred (delete key, retain audit row ADR-002); 202 new / 200 idempotent / 404 unknown subject; authority hist.erasure.create

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Contexto

Honors data-subject erasure (LGPD/GDPR) without mutating the immutable audit trail (ADR-002, ADR-006).
The erasure path:
1. Looks up `audit_subject_key (subject_type, subject_id)` by `subjectId` from the path and
   `subjectType` from the request body.
2. Deletes the key row (crypto-shred) — personal payload fields in `audit_record.payload` become
   permanently unreadable. The immutable `AuditRecord` rows are retained (action, subjectId,
   actorId, occurredAt, correlationId stay intact).
3. Returns `202 Accepted` with `{ subjectId, status: "SHREDDED" }` for a new shred.
4. Returns `200 OK` (idempotent) if the subject was already shredded.
5. Returns `404` if no key / no records for the subject.

The `DELETE` on `audit_subject_key` is the ONLY delete the HIST role performs (HIST-008 grants).

## Spec de referencia

- SPEC-11 (retention + data-subject erasure)
- api-contract.md §4 (POST /hist/subjects/{subjectId}/erasure EARS + response codes)
- data-model.md §2.3 (audit_subject_key) + §6 (personal payload fields per fact)
- ADR-002 (immutability preserved — erasure path never touches audit rows)
- ADR-006 (crypto-shred mechanism)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/service/SubjectErasureService.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/usecase/RequestSubjectErasure.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/controller/SubjectErasureController.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/entity/AuditSubjectKeyJpaEntity.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/repository/AuditSubjectKeyJpaRepository.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/adapter/AuditSubjectKeyPortAdapter.java`

## Criterios de aceite

- [ ] AC-1 `POST /hist/subjects/{subjectId}/erasure` with live key → key row deleted; `202` with `{ subjectId, status: "SHREDDED" }`
- [ ] AC-2 Same request repeated → `200` (idempotent; key already gone or `status='shredded'`)
- [ ] AC-3 `subjectId` with no key/records → `404 application/problem+json` with type `subject-not-found`
- [ ] AC-4 After erasure, `audit_record.payload` for that subject cannot be decrypted (key gone); audit row count is unchanged (INV-HIST-1)
- [ ] AC-5 Token without `hist.erasure.create` → `403`
- [ ] AC-6 `AuditSubjectKeyJpaEntity` PK is `(subject_type, subject_id)` matching data-model.md §2.3
- [ ] AC-7 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-006 (audit_subject_key DDL)
- HIST-008 (DELETE grant on audit_subject_key)
- HIST-011 (SecurityConfig — hist.erasure.create authority)

## Estimativa

M

## Prioridade
P8
