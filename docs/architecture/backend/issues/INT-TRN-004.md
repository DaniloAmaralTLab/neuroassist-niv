# INT-TRN-004 -- [COORDINATION] Erasure propagates to CONV (retire tree-versions + erase audio) and HIST (commit+durable-retry); HIST/CONV outage must not block local crypto-shred (INV-TRN-9, ADR-005/006/007)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
Cross-module coordination: erasure must propagate to CONV (retire affected tree-versions + erase audio assets) and to HIST (`VoiceModelDeleted` + `ContentErased`, commit+durable-retry). A HIST outage or CONV outage must NOT block the local crypto-shred of the patient's voice data (INV-TRN-9). All propagation steps are enqueued as `outbound_job` entries and retried idempotently. This coordination issue tracks that CONV acknowledges and handles the `tree-version.retire` and `conv.audio.delete` signals from TRN, and that HIST accepts the two erasure audit facts.

## Spec de referencia
- integration-contracts.md §5 (INT-TRN-4)
- SPEC-11 §erasure propagation (INV-TRN-9)
- ADR-005/006/007

## Escopo
- [ ] `EraseContentService` (TRN-025): enqueue durable-retry outbound_jobs for `conv.tree-version.retire`, `erase_conv_audio`, `VoiceModelDeleted` audit, `ContentErased` audit even on HIST/CONV 5xx
- [ ] coordenar com CONV e HIST: CONV must handle `DELETE /conv/patients/{id}/audio`; HIST must accept `VoiceModelDeleted` and `ContentErased` facts

## Criterios de aceite
- [ ] AC-1 `EraseContentService` completes the local crypto-shred and enqueues `outbound_jobs` (retire, erase_conv_audio, two audit facts) even when `FakeHistAdapter` and `FakeConvAdapter` throw 5xx; endpoint returns `202` (INV-TRN-9).
- [ ] AC-2 Outbound_jobs (retire + erase_conv_audio + `VoiceModelDeleted` audit + `ContentErased` audit) are retried idempotently until accepted; a `200` replay from CONV/HIST marks them `done`.

## Dependencias
- TRN-025 (precede — EraseContentService must be implemented)
- TRN-015 (precede — HistClient must accept VoiceModelDeleted/ContentErased facts)
- TRN-016 (precede — ConvClient must implement retire + eraseAudio operations)

## Estimativa
S

## Prioridade
P5
