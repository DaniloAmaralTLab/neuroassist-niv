# INT-FE-GEST-001 -- INT-GEST-ACS-1: device token carries gest.capability.read + gest.engine.read — authority reconciliation with ACS

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
The GEST station module registers its `STATION_TOKEN_AUTHORITIES` contract (5 entries) with the access control service (ACS); ACS confirms that the edge.device token minted by the station-pairing flow includes `gest.capability.read` and `gest.engine.read`; without this confirmation `CapabilityApiService` will receive 403 on support-check and all commands become `detectable=false`.

## Context / Problem statement
`MODULE_PERMISSION_MAP = {}` — no caregiver authority is checked. But the edge.device token (not the caregiver token) must carry 5 authorities for the 3 device-token calls:
- `evnt.event.ingest` (POST /evnt/gesture-reports)
- `gest.capability.read` (POST /gest/capabilities/support-check)
- `gest.engine.read` (GET /gest/engines — optional)
- `edge.catalog.read` (GET /edge/catalog)
- `edge.heartbeat.record` (POST /edge/heartbeat, consumed by libs/edge — GEST doesn't call this directly)

Confirm with ACS team that the station-pairing token issuance includes these authorities. `gest.capability.read` / `gest.engine.read` are the riskiest — they were added in SPEC-05 and may not be in the existing pairing grant.

## Action required
1. File integration request with ACS team: confirm `gest.capability.read` + `gest.engine.read` are in the device token pairing grant.
2. If not present: ACS team adds them to the station token issuance policy.
3. GEST team confirms `CapabilityApiService.checkSupport()` returns 200 (not 403) with a live station token.
4. FE-GEST-007 `checkSupport()` error path for 403 → `detectable=false` for all commands (defensive fallback, documented in FE-GEST-010).

## Implementation checklist
- [ ] File ACS integration request (gest.capability.read + gest.engine.read)
- [ ] ACS confirms inclusion in device token pairing grant
- [ ] GEST team confirms 200 on support-check with live token
- [ ] FE-GEST-007 `403 → all commands unverified` path confirmed in unit test
- [ ] Close INT-FE-GEST-001 when ACS confirms + e2e passes with live token

## Dependencies
- FE-GEST-007 (CapabilityApiService — 403 fallback path)
- FE-GEST-010 (CatalogFacade — detectable=false when unverified)

## Prioridade
P1
