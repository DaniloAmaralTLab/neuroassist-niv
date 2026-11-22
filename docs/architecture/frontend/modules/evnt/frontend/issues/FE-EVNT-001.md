# FE-EVNT-001 -- evnt.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/src/lib/evnt.contract.ts` exists with the full module contract: MODULE_KEY `evnt`, MODULE_MENU_METADATA with the contextual `/alarm` entry, MODULE_PERMISSION_MAP with exactly the 6 BE-canonical authority keys (evnt.event.read/confirm/record, evnt.subscription.create/delete, evnt.escalation.read), and MODULE_FEATURE_FLAGS for the 4 declared flags.

## Context / Problem statement

- EVNT needs a stable, single-source contract consumed by guards, shell integration, and the descriptor (SPEC-05).
- Permission keys MUST equal the BE authority constants exactly (INV-EVNT-7, D-639) — evnt.event.ingest is a device-token authority and must NOT appear here (G-EVNT-5).
- The vision used `evnt.event.feedback`; the reconciled BE key is `evnt.event.record` (G-EVNT-1) — this file locks it in.
- Bloqueia: FE-EVNT-002, FE-EVNT-004, FE-EVNT-006

## Approach (execution path)

1. Create `libs/evnt/src/lib/evnt.contract.ts` with the four exports shown in SPEC-05 §1–§3.
2. MODULE_PERMISSION_MAP: include exactly `evnt.event.read`, `evnt.event.confirm`, `evnt.event.record`, `evnt.subscription.create`, `evnt.subscription.delete`, `evnt.escalation.read`. Add justification strings per SPEC-05 §2.
3. MODULE_FEATURE_FLAGS: `evnt.routine-notice` (on), `evnt.alarm-autoroute` (on), `evnt.alarm-notification` (on), `evnt.push-escalation` (on), per SPEC-05 §3.
4. MODULE_MENU_METADATA: single contextual entry for `/alarm` requiring `evnt.event.read`; EVNT has no standalone sidebar destination.
5. Export all four constants from `libs/evnt/src/index.ts`.

## Non-goals

- No Angular components, no services, no HTTP calls.
- No RBAC enforcement logic — that is in guards (FE-EVNT-006).

## Layer(s)

frontend / tool entry (`libs/evnt/src/lib/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-05-tool-contract.md` §1–§4

## Architecture alignment

- Standalone + OnPush + Signals (not applicable to this file)
- Authority keys = BE constants exactly (INV-EVNT-7)
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Lib path**
- [ ] `libs/evnt/src/lib/evnt.contract.ts`
- [ ] `libs/evnt/src/index.ts` (export MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS)

**Tests**
- [ ] `npx nx test evnt` PASS
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P1 / Foundation

## Labels

type:domain
layer:frontend
scope:evnt
priority:P1

## Acceptance criteria

- `npx nx test evnt` PASS (Jest unit)
- `npx nx lint evnt` PASS (Nx boundaries + ESLint)
- `npx nx build evnt` PASS
- `MODULE_PERMISSION_MAP` keys equal `['evnt.event.read','evnt.event.confirm','evnt.event.record','evnt.subscription.create','evnt.subscription.delete','evnt.escalation.read']` exactly
- `evnt.event.ingest` is absent from `MODULE_PERMISSION_MAP`
- `evnt.event.feedback` (old vision key) is absent from `MODULE_PERMISSION_MAP`
- `MODULE_FEATURE_FLAGS` has exactly 4 flags matching SPEC-05 §3

## Dependencies

Nenhuma.

## Tenant-context impact

Nenhum (contract is static metadata, not tenant-scoped data).

## API / Contract impact

Locks in the 6 permission keys the shell uses to register EVNT's entitlements.

## Testing / Evidence required

- Snapshot test of `MODULE_PERMISSION_MAP` key set
- Snapshot test of `MODULE_FEATURE_FLAGS` key set

## Risks / Notes

- If the BE adds a new authority after this issue ships, update this map and all guards before shipping to avoid 403s.
- evnt.event.ingest exclusion is intentional (device-token only, INV-EVNT-6).

## Prioridade

P1
