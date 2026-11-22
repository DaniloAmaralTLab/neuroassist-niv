# INT-CONV-001 -- INT-CONV-1: First sync at provisioning — cold station fetches bundle while online before patient handover (EDGE/provisioning obligation, ADR-003, SPEC-10 §4)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

Cross-module coordination issue (implementation tracked in EDGE/provisioning). A cold, empty
station that has never fetched a tree bundle is offline-**mute** — it has no cached tree and
the patient cannot speak. The provisioning flow (EDGE device enroll → pair → first CONV sync)
MUST include a successful `GET /conv/tree` while online before the device is handed to the
patient (ADR-003, SPEC-10 §4, integration-contracts.md §6). This is an EDGE/provisioning
obligation, not a CONV backend endpoint. CONV's responsibility: surface a clear `404
tree-not-published` for cold patients so the provisioner knows to publish first.

## Escopo
- [ ] documentar o contrato no EDGE backlog / pairing flow spec que o first-sync é obrigatório antes do handover ao paciente

## Spec de referencia
- integration-contracts.md §6
- SPEC-10 §4

## Criterios de aceite
- [ ] AC-1 EDGE provisioning spec includes a step "Perform first `GET /conv/tree` while online; abort if 404 tree-not-published" before marking the device ready for patient handover
- [ ] AC-2 CONV's `GET /conv/tree` returns `404 tree-not-published` for a patient with no active version (verified in CONV-007 AC-3)

## Dependencias
- CONV-007 (precede — GET /conv/tree returns 404 for cold patient)

## Estimativa
S

## Prioridade
P4
