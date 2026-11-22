# GWY — Data Model

> **Not Applicable — the gateway owns no database (recorded decision).**
>
> Per `05-persistence-model.md` and ADR-001 (single gateway-only service), GWY is
> stateless of business data and participates in neither the `neuroassist_global`
> schema nor any `t_<tenant>` tenant schema. It contributes **no Flyway migration**
> to the centralized migrations service (`neuroassist-niv-migrations`, MIG).
>
> This file deliberately contains **no `sql` blocks**. `be-migration-generator.py`
> and `be-entity-generator.py` will therefore extract nothing for GWY — the intended
> outcome. Do not add a schema here; that would wrongly provision a database for an
> edge proxy whose only runtime state is the in-memory route table and the cached
> JWKS key sets.

## 1. Why there is no schema

- GWY holds no business or tenant state and has **no tenant concept** — it only
  strips the client tenant header; it never reads or stores the `tenantId` claim
  (ADR-003, INV-G3).
- Its only runtime state is operational and ephemeral: the in-memory **route
  table** and filter config loaded from `application.yml`, and the **cached JWKS**
  key material fetched from the ACS and EDGE issuers (rebuilt on restart / refresh).
- The only durable data GWY emits is **PHI-free access/lifecycle logs** (method,
  route template, status, latency, correlation id), whose retention is governed by
  the platform observability stack (Elasticsearch), not a relational schema
  (ADR-007, INV-G1).

## 2. Ephemeral runtime state (not persisted)

| Construct | Nature | Store |
|---|---|---|
| Route table (predicate → `lb://`) | operational config | in-memory (from `application.yml`) |
| Cached JWKS (ACS + EDGE) | operational key material | in-memory, TTL/refresh on key rotation |
| Rate-limit token buckets (login, pairing) | operational counters | in-memory, per instance (ADR-005) |
| Circuit-breaker state (per route) | operational | resilience4j in-memory |

`THE SYSTEM SHALL hold route, JWKS, rate-limit, and breaker state in memory only.`
`THE SYSTEM SHALL persist no business or tenant state.`
`WHEN the gateway restarts, THE SYSTEM SHALL rebuild its route table from configuration and re-fetch JWKS, not from a datastore.`

## 3. Migration plan

None. GWY reserves no Flyway version range and writes no migration. The MIG service
(`neuroassist-niv-migrations`) must **not** allocate a schema for the gateway.

## 4. Schema-level mapping

| Table | Schema |
|---|---|
| _(none)_ | _(none — gateway owns no schema)_ |
