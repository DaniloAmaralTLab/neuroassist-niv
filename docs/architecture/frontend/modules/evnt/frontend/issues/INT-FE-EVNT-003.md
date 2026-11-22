# INT-FE-EVNT-003 -- ACS phone channel dependency tracking (INT-EVNT-ACS-001)

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

The EVNT FE tracks the `INT-EVNT-ACS-001` dependency. WHILE that issue is OPEN, `PushChannelVM.sms` and `.voice` are `contact-missing`. When ACS exposes the caregiver phone via a capability endpoint, the FE flips both to `available` WITHOUT a FE release (via feature flag or BE response field).

## Context / Problem statement

- `INT-EVNT-ACS-001` (OPEN): ACS does not yet expose caregiver phone/contact. Until it does, Tiers 1/2 record `no-contact` on the BE and the FE shows `contact-missing` (SPEC-03 §4a invariant, `contracts/backend-api-cross-link.md` §SAFETY-1, FE-EVNT-017).
- When ACS ships, the FE must respond WITHOUT a FE release — the ACS capability must arrive as a BE signal (capability endpoint, feature flag, or response field on the monitoring poll).
- The tracking mechanism: a `ContactCapabilityPort` in `evnt.contract.ts` (or a flag in `GET /evnt/capabilities`) drives `PushChannelFacade.acsContactAvailable()`.

## Approach (execution path)

1. Add `acsContactCapability: 'available' | 'unavailable'` to the monitoring poll response (or a separate `GET /evnt/capabilities` endpoint — confirm with BE).
2. `PushChannelFacade`: reads `acsContactCapability` from the wire record (or flag). WHILE absent/`unavailable`: `sms='contact-missing'`, `voice='contact-missing'`. WHEN `available`: flip to `available`.
3. `EscalationChannelStatusComponent` (FE-EVNT-017): renders accordingly.
4. This issue tracks the integration point — when INT-EVNT-ACS-001 closes, the FE flip is verified here.
5. A `evnt.acs-contact` feature flag can gate the flip for a progressive rollout.

## Non-goals

- No phone number display — masked by design.
- No FE release needed to flip from `contact-missing` to `available`.

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`) + integration

## Bounded context

evnt (integration with ACS)

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/contracts/backend-api-cross-link.md` §INT-EVNT-ACS-001
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4a

## Architecture alignment

- Contact-missing default while INT-EVNT-ACS-001 OPEN
- No FE release needed to flip on ACS capability
- Tag Nx: `scope:evnt`, `type:integration`

## Implementation checklist (by file)

**Data access**
- [ ] `libs/evnt/data-access/src/lib/push-channel.facade.ts` (acsContactAvailable() derived from capability field)
- [ ] `libs/evnt/data-access/src/lib/evnt-capabilities.types.ts` (ContactCapability type)

**Tests**
- [ ] `npx nx test evnt` PASS (contact-missing when capability absent; available when capability=available; feature flag gates)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P4 / Hub integrations

## Labels

type:integration
layer:frontend
scope:evnt
priority:P4

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `PushChannelVM.sms` = `contact-missing` when ACS capability absent
- `PushChannelVM.sms` = `available` when ACS capability = available (via flag or response field, not code change)

## Dependencies

- FE-EVNT-010 (PushChannelFacade)
- FE-EVNT-017 (EscalationChannelStatusComponent renders contact-missing)

## Tenant-context impact

ACS contact is per-caregiver-per-tenant.

## Risks / Notes

- INT-EVNT-ACS-001 is the BLOCKER for Tiers 1/2. This issue remains OPEN until ACS exposes the phone endpoint.

## Prioridade

P4
