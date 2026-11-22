# HIST-003 -- EnvelopeReconciliationAdapter — GEST normalisation (divergences 1-7) + DetectionLapseResolved disambiguation by (source, subjectType)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

GEST is already scaffolded and must NOT be re-scaffolded. This adapter absorbs the seven divergences
documented in `event-contracts.md` §2:
1. `eventType` alias → canonical `action` (strip `.vN` suffix → `payloadVersion`)
2. `source` derived from service-client identity when omitted (INV-HIST-2)
3. null `tenantId` for GEST facts → global store routing (ADR-004)
4. `.vN` suffix on `eventType` → `payloadVersion`
5. `subjectType` casing stored verbatim (no rewriting)
6. `actorType` 4-value union accepted (caregiver|edge-device|system|service-client)
7. Idempotency key uses canonical `action` (= `eventType`) in the composite

`DetectionLapseResolved` is emitted by both EDGE (`subjectType=edge-device`) and EVNT
(`subjectType=detection-lapse`); disambiguation is by `(source, subject_type)` stored on every
record (event-contracts §5, doc 06 R4) — never by `action` alone.

## Spec de referencia

- SPEC-02 (audit append orchestration, reconciliation decisions)
- event-contracts.md §2 (GEST envelope reconciliation — divergences 1-7)
- event-contracts.md §5 (DetectionLapseResolved collision resolution)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/adapter/EnvelopeReconciliationAdapter.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/command/AppendAuditRecordCommand.java`
- [ ] unit tests: `backend/services/hist-service/src/test/java/com/neuroassist/hist/api/adapter/EnvelopeReconciliationAdapterTest.java`

## Criterios de aceite

- [ ] AC-1 `eventType` without `.vN` → `action = eventType`, `payloadVersion = 1`
- [ ] AC-2 `eventType = "EngineVersionRegistered.v2"` → `action = "EngineVersionRegistered"`, `payloadVersion = 2`; explicit `payloadVersion` on the envelope wins over the suffix
- [ ] AC-3 Envelope without `source` → `source` set from the authenticated service-client `sub` / `client_id` claim (INV-HIST-2); envelope with `source` → stored verbatim
- [ ] AC-4 `subjectType` stored verbatim (no case rewriting): `"engine_version"` stays `"engine_version"`, `"edge-device"` stays `"edge-device"`
- [ ] AC-5 Two `DetectionLapseResolved` from different sources (`gest-service` vs `evnt-service`) produce distinct `AppendAuditRecordCommand` objects with distinct `(source, subjectType)` tuples
- [ ] AC-6 `./gradlew :hist-service:test` exits 0

## Dependencias

- HIST-001 (precede)

## Estimativa

M

## Prioridade
P1
