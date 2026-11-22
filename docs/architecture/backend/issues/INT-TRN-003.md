# INT-TRN-003 -- [COORDINATION] Granted consent audited to HIST (ConsentGranted, hard-502) before any TtsPort synthesis call; synthesis without consent returns 409 (SPEC-11, INV-TRN-3, CONV ADR-005 G1/G2)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
TRN-internal / CONV boundary: a granted voice-cloning consent (both patient and legal representative) must be audited to HIST (`ConsentGranted`, hard-502) and persist as durable before any `TtsPort` synthesis call. This guarantees that every speech-tree version CONV receives is backed by a durable, traceable consent receipt (CONV ADR-005 G1/G2). Synthesis without a granted consent is refused `409 consent-required`. This is the internal enforcement point that the CONV side relies on without needing to verify consent itself.

## Spec de referencia
- integration-contracts.md §5 (INT-TRN-3)
- SPEC-11 §consent gate before synthesis (INV-TRN-3)

## Escopo
- [ ] `ElevenLabsTtsAdapter` (TRN-018): verificar `ConsentRecordRepository.findGrantedByPatient()` antes de cada chamada ElevenLabs
- [ ] `ConsentService` (TRN-023): garantir que `ConsentGranted` é auditado via `auditHard502()` e persiste antes de retornar 200 ao chamador

## Criterios de aceite
- [ ] AC-1 `ElevenLabsTtsAdapter.synthesize()` verifies a granted `consent_record` for the patient before making any ElevenLabs API call; throws `ConsentRequiredException` on missing/revoked consent (INV-TRN-3).
- [ ] AC-2 `ConsentGranted` appears in `FakeAuditAdapter` before any synthesis `outbound_job` is enqueued; verified in `ConsentServiceTest` (TRN-023).

## Dependencias
- TRN-023 (precede — ConsentService must be implemented)
- TRN-018 (precede — ElevenLabsTtsAdapter must implement the consent check)
- TRN-015 (precede — HistClient/AuditAdapter must be implemented)

## Estimativa
S

## Prioridade
P5
