# Cross BE-FE contracts

Canonical documentation of the **contracts** that span BE and FE: JMS events, HTTP error model, OpenAPI generated for each service.

## Documents in this folder

| Doc | When to read |
|---|---|
| [`event-catalog.md`](event-catalog.md) | Before creating a new JMS event, or consuming an existing one. Full list of `neuroassist-niv.*` topics, producers, consumers and payload schema |
| [`error-model.md`](error-model.md) | Before creating a `@RestControllerAdvice` (BE) or an error interceptor (FE). Defines the canonical `ProblemDetail` RFC 7807 + the project's `error.code` codes |
| [`openapi/README.md`](openapi/README.md) | When running `springdoc-openapi` to generate/update `<service>-openapi.yaml` specs. TS SDKs are generated from them into `@neuroassist/shared/contracts/` |

## Principle

- **Contracts-first.** Before creating a new handler/listener/component, the contract is registered here (or in `<service>-spec/contracts/`).
- **A JMS event is a contract like any other** — version it, deprecate it, evolve it carefully.
- **OpenAPI is generated** (not handwritten) from each service's controllers + DTO records.
- **There is a single error model.** There is no "CAD error" different from a "FIS error" — both follow the same `ProblemDetail`.

## Catalogues consolidated in other docs

| What | Where |
|---|---|
| List of microservices + Feign Clients | [[../../backend/standards/services-catalog]] §1 and §7 |
| Initial event catalog (partial) | [[../../backend/standards/services-catalog]] §6 — **expanded** in [`event-catalog.md`](event-catalog.md) |
| JMS patterns (queues, headers, idempotency) | [[../../backend/standards/platform-patterns]] |
| REST conventions (versioning, pagination) | [[../../backend/standards/java-conventions]] |
| Frontend HTTP interceptors | [[../../frontend/standards/access-layer-contracts]] |

## How a contract evolves

1. **Backward-compatible change** (new optional field): update OpenAPI/event-catalog, regenerate the SDK, FE can adopt whenever it wants.
2. **Breaking change** (field removed/renamed/type changed): create a **v2 of the contract** side by side, deprecate v1 for N versions, communicate to consumers via Slack #neuroassist-niv-arquitetura.
3. **Breaking JMS event**: create a new topic (`neuroassist-niv.modulo.evento.v2`), keep v1 alive until <service> and all consumers have migrated.

## Anti-patterns

- ❌ Breaking a contract without a published deprecation event.
- ❌ Changing the shape of a JMS payload without a version bump.
- ❌ Writing OpenAPI by hand (always generate it from the code).
- ❌ Creating a new error type without registering it in `error-model.md`.
