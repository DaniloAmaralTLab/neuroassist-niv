# SPEC-02 — Event Generation (core orchestration)

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> ADRs: `../../adr/ADR-002-gesture-report-ingestion-contract.md`,
> `../../adr/ADR-004-command-snapshot-on-event.md`.

## Objective

Turn one recognized-command report into exactly one durable, self-describing `Event`, idempotently
and forgery-resistantly.

## Scope

- **In:** `ingestGestureReport` — validation, device-token trust, PAT snapshot, dedup, persist,
  audit `EventGenerated`, degrade policy.
- **Out:** delivery/polling (SPEC-03), read scoping (SPEC-06), DB schema (SPEC-04).

## Technical decisions

- **Identity from claims** (`deviceId`, `patientId`, `tenantId` from the `edge.device` token), never
  the body (INV-EVNT-6, ADR-002).
- **Snapshot** `urgency` + `label` from PAT once at generation (INV-EVNT-2, ADR-004); reads never
  call PAT.
- **Degrade = fail-closed:** PAT unreachable → `503 catalog-unavailable` (no event, no guess — R4).
- **Optional report envelope:** `confidence` + `recognitionWindowMs` persisted in `report_meta`,
  never used for v1 branching (resolved gap — api-contract §9).

## Implementation (pseudocode)

```
ingestGestureReport(deviceToken, body):
  assert deviceToken valid (EDGE JWKS) and introspection != revoked      # else 401
  assert authority evnt.event.ingest                                     # else 403
  (deviceId, patientId, tenantId) = deviceToken.claims                   # never body
  validate body.{commandId, reportId, occurredAt}                        # else 400
  if existing = repo.findByDeviceReport(tenantId, deviceId, reportId):
     return 200, existing                                                # INV-EVNT-4, no audit
  cmd = pat.getCommand(commandId)        # service-client pat.command.read
     on 404 -> 404 command-not-found (no event)
     on outage/5xx -> 503 catalog-unavailable + Retry-After (no event)   # R4
  event = Event.generate(tenantId, patientId, commandId,
                         cmd.label, cmd.urgency, deviceId, reportId,
                         occurredAt, reportMeta)
  repo.insert(event)   # UNIQUE(device_id,report_id) arbitrates a race -> loser re-reads -> 200
  hist.audit(EventGenerated, ...)        # prod 502 on failure / dev log-only
  return 201, event (+ Location)
```

## Edge cases

- Race on an unconsumed `(deviceId, reportId)`: DB UNIQUE lets one win; the loser maps to the `200`
  replay of the winner's event (SPEC-05) — the caller never sees a raw `409`.
- `occurredAt` future-skew > 5 min or older than 24h → `400 occurred-at-out-of-bounds`.
- Command found but in a **different** tenant at PAT → `404 command-not-found` (tenant from claim).

## Acceptance criteria (EARS)

- WHEN a first-seen `(deviceId, reportId)` reports a PAT-resolvable `commandId`, THE SYSTEM SHALL persist one Event with snapshotted `urgency`+`commandLabel`, respond `201`, and audit `EventGenerated` in the same request (INV-EVNT-2); the audit payload SHALL carry the `commandLabel` snapshot for HIST's caregiver timeline (event-contracts §1.2, G-HIST-1).
- WHEN a consumed `(deviceId, reportId)` replays, THE SYSTEM SHALL return the existing event `200` with no second event and no second audit (INV-EVNT-4).
- IF PAT is unreachable at generation, THEN THE SYSTEM SHALL respond `503` + `Retry-After` and create no event (ADR-004, R4).
- IF the `edge.device` token is revoked/invalid, THEN THE SYSTEM SHALL respond `401` and create no event (INV-EVNT-6).
- THE SYSTEM SHALL persist `confidence`/`recognitionWindowMs` in `report_meta` when present and SHALL NOT branch any v1 decision on them.
