<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — REG service boundary: registry-only single service

## Status
aceita

> Note: orchestrator default (recommendation) - revisable by the owner.

## Contexto

REG could be (a) a dedicated process that does nothing but host the Eureka Server, or (b)
folded into another infrastructure process (e.g. the API gateway) to save a deployment
unit. A registry has a distinct lifecycle: it must be up before the services it serves, it
holds no business logic, and co-locating it with a service that itself registers couples
the "address book" to one of its own entries. The monorepo direction is a modular monolith
of services (shared `../../../adr/ADR-002-modular-monolith.md`), and the clients already
expect a standalone server at `:8761`.

## Decisão

We will implement REG as a **single, standalone Spring Boot service**
(`neuroassist-niv-service-registry`) whose **only** responsibility is the Eureka Server. It
exposes no business REST API, owns no domain aggregate, connects to no database, and is not
hexagonally layered (there is no domain/application/adapter split to make). Any business
responsibility is explicitly out of this boundary and belongs to the owning service.

## Consequências

- **Positive:** REG has an independent, boot-first lifecycle; it does not register with
  itself and is not coupled to any business service's lifecycle.
- **Positive:** minimal, auditable surface — one bootstrap class plus `application.yml`;
  trivial to reason about and operate.
- **Negative / trade-off:** one more deployment unit / process to run and monitor. Accepted:
  the decoupling and clean lifecycle outweigh the cost of a tiny extra process. Folding REG
  into another process is revisitable only on a concrete operational driver.
