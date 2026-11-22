# GEST — Event Catalog

> Service: `gest-service` · Module **GEST** · Messaging **disabled** (no broker).
> These are **HIST audit facts** written synchronously, not broker messages. See
> `../contracts/event-contracts.md`.

| Name | Type | Payload (link) | Known consumers |
|---|---|---|---|
| `EngineVersionRegistered` | audit → HIST (sync) | `event-contracts.md` §1.1 | HIST (audit trail) |
| `EngineVersionDeprecated` | audit → HIST (sync) | `event-contracts.md` §1.1 | HIST |
| `EngineCapabilityDeclared` *(anchor)* | audit → HIST (sync) | `event-contracts.md` §1.1 | HIST |
| `EngineCapabilityRetired` | audit → HIST (sync) | `event-contracts.md` §1.1 | HIST |

**Published to a broker:** none. **Consumed from a broker:** none. GEST emits no messages and
subscribes to none; the detection → event flow (`POST /evnt/gesture-reports`) does not involve GEST.
