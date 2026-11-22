<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Service: `neuroassist-niv-service-registry` · Module **REG (Eureka)** · Infrastructure — **no business domain**.

## Ubiquitous Language

REG has **no business domain**; its vocabulary is the Eureka infrastructure protocol, not
NeuroAssist domain language. The only terms it owns:

| Term | Meaning |
|---|---|
| **Instance** | A running service process registered with REG, keyed by `instance-id` (`<app-name>:<port>`). |
| **Lease** | A time-bounded registration that the client renews via heartbeat; expires if not renewed. |
| **Logical name** | `spring.application.name` under which one or more instances register. |
| **Status** | Eureka instance status: `UP`, `DOWN`, `STARTING`, `OUT_OF_SERVICE`. |
| **Eviction** | REG removing an instance whose lease expired. |
| **Self-preservation** | Eureka safety mode that stops eviction when it suspects a network partition (disabled in dev — ADR-001). |

No `Patient`, `Command`, `GestureType`, `Event`, `Tenant` or any NeuroAssist aggregate
exists in REG — those are owned by PAT, EVNT, ACS, etc.

## Aggregates and Entities

**None.** REG persists no domain aggregate. Its only runtime state is the **in-memory lease
registry** — a transient table of `(logical name → instances → lease)` managed entirely by
the Eureka server library. It is not modelled as a domain aggregate, is never written to a
database, and is rebuilt from client re-registration after a restart.

## Domain Events

**None (no business events).** REG emits no NeuroAssist domain event and publishes nothing
to a broker (messaging disabled). The only lifecycle signals it produces are Eureka-internal
registry changes (instance registered / renewed / cancelled / evicted), consumed by Eureka
clients through the standard fetch protocol — these are infrastructure signals, not domain
events, and are not part of any contract this phase defines.

## State Transitions

The only state machine is the **per-instance lease**, owned by the Eureka library:

```
(register) -> UP --renew--> UP
   UP --lease expires / client shutdown--> (evicted / CANCELLED)
   UP --client sets OUT_OF_SERVICE--> OUT_OF_SERVICE --> UP
```

With self-preservation **off** (dev), a lease that stops renewing is evicted promptly; with
it **on** (a possible prod posture), eviction pauses when too many leases expire at once
(suspected partition). This is standard Eureka behaviour, not REG-authored logic.

## Invariants

- **INV-REG-1 — No PHI.** No patient, gesture, caregiver or tenant data is ever stored or
  transported by REG; only service-location lease metadata.
- **INV-REG-2 — No authority on business state.** REG never owns or mutates any business
  entity; it is read-and-forget infrastructure.
- **INV-REG-3 — Address match.** REG binds the exact address the clients already expect
  (`:8761/eureka`); a change here is a breaking change to every client's `EUREKA_URI`.
- **INV-REG-4 — Tenant-agnostic.** REG never derives or enforces `tenantId`; it is below
  the multi-tenant boundary.
