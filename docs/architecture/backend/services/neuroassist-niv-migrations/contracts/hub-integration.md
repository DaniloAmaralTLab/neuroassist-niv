# MIG — Hub Integration

> **Not Applicable — MIG has no TechLab AI "hub" dependency and makes no outbound
> call (recorded decision).**
>
> NeuroAssist NIV has no TechLab AI hub dependency for this module (`ai.hasAi` is not
> set for MIG — `_brief.md` §7). MIG is a closed job against one PostgreSQL database
> (doc 04 §Hub Service Dependencies): it issues **no** Feign call, consumes **no** hub
> event, and propagates **no** correlation/tenant/principal header, because it makes
> no inter-service call at all.
>
> Its only relationship with the business services is **offline**: it applies the
> `V00xx` scripts they author and coordinates versioning with them through the
> `migration_range_registry` table (see `contracts/integration-contracts.md`), never
> through a service call.

## Hub services depended on

None.

## Feign operations

None.

## Propagation headers

Not applicable — MIG makes no HTTP call, so there is no correlation/tenant/principal
header to propagate.

## Invariants

`THE SYSTEM SHALL make no outbound REST or Feign call to any hub or business service.`
`THE SYSTEM SHALL coordinate with other modules only through the shared database and the migration_range_registry.`
