<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — PAT service boundary: single service

## Status
aceita

## Contexto

PAT owns three closely related concerns: the `Patient` record, the per-patient `Command`
catalog (gesture→need + calibration), and the global `GestureType` primitive vocabulary.
They share one tenancy boundary (tenant from the ACS JWT claim) and, for patient and
command, one transactional boundary within a tenant schema. There is no independent
scaling, availability or team-ownership driver that would justify splitting them, and the
monorepo direction is a modular monolith of services (shared `../../../adr/ADR-002-modular-monolith.md`).
Splitting would introduce a cross-service call (and an eventual-consistency seam) between
a command and its patient for no benefit at this stage.

## Decisão

We will implement PAT as a **single Spring Boot service** (`pat-service`) owning
`Patient`, `Command` and the `GestureType` catalog, laid out hexagonally
(`../../../adr/ADR-001-hexagonal-architecture.md`). It is an ACS resource server; it
issues no tokens. All other entities (`Caregiver`, `PatientSession`, `EdgeDevice`,
`Event`) are referenced by id with no cross-service FK.

## Consequências

- **Positive:** patient + command stay in one transaction and one tenant schema; simplest
  deployment and discovery footprint; a single `RoleAuthorityPolicy` for all `pat.*`.
- **Positive:** the boundary is the unit within which ADR-002/003/004 apply.
- **Negative / trade-off:** if clinics later need `Patient` and catalog to scale or be
  released independently, the service must be decomposed — accepted, revisit only on a
  concrete driver. The global `GestureType` table living inside this service is a mild
  coupling of a cross-tenant catalog into a per-tenant-focused service (see ADR-002).
