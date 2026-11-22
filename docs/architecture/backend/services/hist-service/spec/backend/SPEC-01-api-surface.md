# SPEC-01 — API Surface

> Service `hist-service` · Module HIST. Contract: `../../contracts/api-contract.md`.
> EARS guide: `../../../../standards/ears-notation.md`. Invariants in `../../03-initial-domain-framing.md`.

## Objective

Define the complete, versionable REST surface of HIST: the append-only audit ingest, the caregiver
timeline read, the operator audit-trail read, and the operator erasure command.

## Scope

- **In** — four endpoints under base path `/hist` (D-640), their authorities, status codes, headers,
  RFC 7807 errors.
- **Out** — payload schemas per fact (producer-owned, catalogued in `event-contracts.md`); FE wiring.

## Endpoints → authorities (D-639/D-641)

| Verb + path | Authority | Caller |
|---|---|---|
| `POST /hist/audit` | `hist.audit.record` | producers (service-client) |
| `GET /hist/patients/{patientId}/history` | `hist.history.read` | caregiver (DASH) |
| `GET /hist/audit` | `hist.audit.read` | compliance operator |
| `POST /hist/subjects/{subjectId}/erasure` | `hist.erasure.create` | ACS / compliance operator |

Derived authorities equal the api-contract exactly (verified against the generator's
`resolve_permission`, English vocabulary D-639).

## Decisions

- Controller base path `/hist` (D-640); producers' `hist.base-url` includes `/hist` (the single config
  change — `integration-contracts.md` §1).
- Read surfaces are GET-only; HIST has **no** caregiver write path (feedback/confirm stay in EVNT).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL serve all endpoints under `/hist`.
- WHEN a request lacks the endpoint's authority, THE SYSTEM SHALL respond `403`.
- WHEN a request lacks a valid bearer token, THE SYSTEM SHALL respond `401`.
- THE SYSTEM SHALL return all errors as `application/problem+json` (RFC 7807) carrying `correlationId`.
- THE SYSTEM SHALL expose neither UPDATE nor DELETE on any audit resource (INV-HIST-1).
