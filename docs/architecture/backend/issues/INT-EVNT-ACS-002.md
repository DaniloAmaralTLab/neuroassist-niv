# INT-EVNT-ACS-002 -- ACS must mint edge-service service-client JWT with evnt.detection-lapse.create and evnt.detection-lapse.resolve authorities

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

**Cross-module dependency — do NOT edit ACS code or ACS contracts.** ADR-006 / SAFETY-GEST-1
requires that EDGE calls `POST /evnt/detection-lapses` and
`POST /evnt/detection-lapses/{lapseId}/resolution` using an **ACS-issued service-client JWT** for
the `edge-service` principal — never the `edge.device` station token. EVNT's spring security
configuration (SPEC-06) validates these calls on the ACS resource-server path; the JWT must carry:
- `actorType = service-client`
- `sub = edge-service` (principal)
- authorities including `evnt.detection-lapse.create` (for the raise call)
- authorities including `evnt.detection-lapse.resolve` (for the resolve call)

ACS does not mint this service-client token today: `INT-EVNT-ACS-001` opened a contact-data gap
for EVNT Tier 1–2; this INT opens the **token issuance** gap for the SAFETY-GEST-1 path. Until
resolved, EDGE cannot raise or resolve detection lapses in EVNT (every call returns `401`). This
closes the INT TODO stated in ADR-006 Consequências and integration-contracts §9.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §9
- docs/architecture/backend/services/evnt-service/adr/ADR-006-detection-lapse-alerting.md §Consequências
- SPEC-12-detection-lapse-alerting.md §Ingest surface

## Escopo
- [ ] ACS team to implement the `edge-service` service-client credential and mint endpoint (or static JWT provisioning) carrying `evnt.detection-lapse.create` and `evnt.detection-lapse.resolve`
- [ ] EVNT `SecurityConfig` / `RoleAuthorityPolicy` (EVNT-015) to accept service-client tokens from the ACS JWKS path with the new authorities; already-wired for caregiver tokens, so only the `actorType=service-client` branch needs adding/confirming
- [ ] Integration test: EVNT raise endpoint with the service-client JWT returns `201`; with the `edge.device` station token returns `401`
- [ ] Integration test: EVNT resolve endpoint with service-client JWT carrying `evnt.detection-lapse.resolve` returns `200`; without the authority returns `403`
- [ ] Confirm with EDGE team that EDGE obtains the service-client token before attempting to open lapse episodes

## Criterios de aceite
- [ ] AC-1 ACS mints (or provisions statically for staging) a service-client JWT for `edge-service` principal carrying `evnt.detection-lapse.create` and `evnt.detection-lapse.resolve` authorities
- [ ] AC-2 `POST /evnt/detection-lapses` with the ACS service-client JWT: returns `201 Created` (new episode) or `200 OK` (replay) — not `401`/`403`
- [ ] AC-3 `POST /evnt/detection-lapses/{lapseId}/resolution` with the service-client JWT: returns `200 OK` or `404` — not `401`/`403`
- [ ] AC-4 Either call with an `edge.device` station token: returns `401 Unauthorized` (SPEC-12 — never the station token)
- [ ] AC-5 Either call with the service-client JWT missing the respective authority: returns `403 Forbidden`

## Dependencias
- EVNT-030 (precede — raise endpoint exists)
- EVNT-031 (precede — resolve endpoint exists)
- EVNT-015 (precede — SecurityConfig service-client path)

## Estimativa
M

## Prioridade
P4
