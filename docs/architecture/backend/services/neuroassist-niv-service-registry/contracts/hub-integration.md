# REG — Hub / Platform Integration

> For an infrastructure registry service, the "hub" is inverted: REG is the
> **dependency target** of the platform, not a dependent. Every business service
> and the gateway are Eureka *clients* of REG; REG calls **no** hub service and
> consumes **no** TechLab AI capability (`ai.hasAi = false`). This document records
> the registration / discovery couplings and the membership contract REG offers its
> clients.

## 1. REG as the discovery backbone

| Aspect | Value |
|---|---|
| Role | Eureka server: every service registers here and resolves peers here |
| Mode | Synchronous HTTP (Eureka client/server protocol); membership is in-memory |
| Direction | Clients call REG (register/renew/query); REG calls no one back |
| Failure mode for a client | If REG is briefly unreachable, clients route on their **cached** registry and retry; name-based resolution degrades until REG returns |

`THE SYSTEM SHALL accept registration, renewal, de-registration, and discovery queries from in-fleet Eureka clients.`
`THE SYSTEM SHALL NOT call any other service.`
`THE SYSTEM SHALL advertise only instances currently renewing their lease and reporting UP.`

## 2. Eureka clients (all services + GWY)

Pure dependents — they register with and resolve through REG. REG never calls them.
Source of this table: `project-context.json` → `modules.registry` (logical id =
`backendService`).

| Service | Logical id | Module | Relationship to REG |
|---|---|---|---|
| acs-service | `acs-service` | ACS | registers + resolves peers |
| pat-service | `pat-service` | PAT | registers + resolves peers |
| edge-service | `edge-service` | EDGE | registers + resolves peers |
| evnt-service | `evnt-service` | EVNT | registers + resolves peers |
| conv-service | `conv-service` | CONV | registers + resolves peers |
| gest-service | `gest-service` | GEST | registers + resolves peers |
| hist-service | `hist-service` | HIST | registers + resolves peers |
| trn-service | `trn-service` | TRN | registers + resolves peers |
| neuroassist-niv-api-gateway | `neuroassist-niv-api-gateway` | GWY | registers + resolves `lb://` targets (most discovery-dependent) |

> **Not Eureka clients:**
> - **DASH** (`dash-service`) has **no backend service** (see the dash service ADR
>   `ADR-001-dash-has-no-backend-service.md`) — it does not register with REG.
> - **MIG** (`neuroassist-niv-migrations`) is a one-shot migration runner, **not** a
>   Eureka client: it must exclude `EurekaClientAutoConfiguration` /
>   `EurekaDiscoveryClientConfiguration` and never register.
>
> Whenever a `modules.registry` entry is added, has its `backendService` changed, or
> changes `status`, update this table in the same commit — even for a module still
> `declared`/`planned` without a directory in `backend/services/` (mark it
> `(planned — not yet scaffolded)`).

`THE SYSTEM SHALL be the single discovery source from which GWY resolves every lb:// route target.`
`WHEN a new or scaled instance registers, THE SYSTEM SHALL advertise it so consumers discover it without reconfiguration.`
`WHEN an instance stops heartbeating beyond the lease window, THE SYSTEM SHALL stop advertising it so consumers are not sent to a dead instance.`

## 3. TechLab AI

None. REG consumes no TechLab AI bounded context (orchestration,
document_composition, knowledge, analytics) — `ai.hasAi = false`. See
`contracts/techlab-ai-integration.md`.

`THE SYSTEM SHALL NOT call any TechLab AI bounded context.`

## 4. Header / context propagation

REG carries no business request context. It does not resolve tenants, does not read
any tenant id, and does not propagate a tenant header — the registration and
discovery protocol is tenant-agnostic (INV-REG-4) and **no PHI** transits REG
(INV-REG-1).

`THE SYSTEM SHALL NOT read, derive, or propagate any tenant context.`
`THE SYSTEM SHALL participate in correlation only for its own lifecycle/access logs (SPEC-07), not for forwarded business requests.`
