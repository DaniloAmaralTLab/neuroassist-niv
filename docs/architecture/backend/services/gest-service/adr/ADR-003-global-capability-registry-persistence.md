<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Global persistence for the capability registry

## Status
accepted

## Contexto
The project default is multi-tenant, **schema-per-tenant** (`neuroassist_global` + `t_<tenantId>`).
But engine support is a **product-wide** fact: a detection model version either recognises `BLINK` or
it does not, independent of which family or clinic runs it. PAT already treats its `GestureType`
vocabulary as a **global** catalog for the same reason. Putting capability rows in each tenant schema
would duplicate identical data N times and risk divergence.

## Decisão
GEST's tables (`engine_version`, `engine_capability`) live in the **global schema
`neuroassist_global`**, carry **no `tenant_id`**, and expose the same truth to every tenant. Access is
governed by **authority**, not tenant: any authenticated `gest.*` reader (caregiver or patient-session)
reads it; only admin writes (INV-GEST-5). Migrations are applied to the global schema via the
centralized `MIG` module, consistent with PAT's `gesture_type` and EDGE's `device_pairing_code`.

## Consequências
- Positive: one source of truth; no per-tenant duplication or drift; matches PAT's global-vocabulary
  precedent.
- Positive: simpler reads (tenant-agnostic) and natural `ETag` caching.
- Negative: no per-tenant customisation of engine support (assumption A1) — acceptable for v1; a
  bespoke-per-tenant engine would force revisiting this ADR.
- Trade-off accepted: global data in a multi-tenant system, justified because the data is genuinely
  product-level reference, not tenant-owned.
