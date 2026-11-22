# INT-CONV-004 -- INT-CONV-4: PAT registers CONV as pat.patient.read service-client — PAT must reject patient-session token on /pat (PAT INV-PAT-7, SPEC-10)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

Cross-module coordination issue (implementation tracked in PAT). CONV calls
`GET /pat/patients/{patientId}` as a service-client using `pat.patient.read` authority
(hub-integration.md §2). PAT must list CONV as an authorized service-client consumer and must
reject the patient-session token on `/pat` paths (PAT INV-PAT-7 — the patient-session token
does not have `pat.patient.read`). This ensures CONV can confirm patient existence at publish
time without exposing the full PAT API to the patient (principle of least privilege).

## Escopo
- [ ] confirmar no PAT backlog que `pat.patient.read` está listado no PAT `RoleAuthorityPolicy` como atribuível a service-clients

## Spec de referencia
- hub-integration.md §2
- SPEC-10 §hub-integrations

## Criterios de aceite
- [ ] AC-1 PAT's `GET /pat/patients/{patientId}` accepts a service-client token with `pat.patient.read` from CONV and returns patient data
- [ ] AC-2 PAT's `GET /pat/patients/{patientId}` returns `403 Forbidden` when called with a CONV patient-session token (PAT INV-PAT-7)

## Dependencias
- CONV-014 (precede — PatClient Feign configured with service-client token)

## Estimativa
S

## Prioridade
P4
