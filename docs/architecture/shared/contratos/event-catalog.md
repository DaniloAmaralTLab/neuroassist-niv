# Event Catalog (ARTEMIS)

> Canonical catalogue of **all** events published in NeuroAssist NIV.
>
> **Source of truth:** `templates/architecture/decisions/events.arch.json` (D-065).
> This markdown is generated deterministically. Do not edit by hand — the next render overwrites it.

## Conventions

- **Topic name:** `neuroassist-niv.<module>.<entity>.<action>` (lowercase; tokens in snake/kebab when needed).
- **Versioning in the name:** `.v<N>` suffix on a breaking change (keeps v1 active in parallel during deprecation).
- **Queue vs Topic:** single consumer → `queue`; multiple consumers → `topic` (queue = one consumer (e.g. audit-service only). topic = N independent subscribers each receive their own copy.).
- **Action verb:** Use past participle (criado/confirmada/autorizada/recebido). Events describe a fait accompli, not a command.

## Envelope

### Headers JMS

- **`correlationId`** (uuid, required) — Request correlation id (from MDC); pairs the event with the producing request and downstream logs.
- **`tenantId`** (string, optional) — Tenant id (slug like 'emp_alpha'). May be null for global modules where is_global=true.
- **`producedAt`** (ISO-8601, required) — Time when the producer emitted the event (server clock, with timezone).

### Payload root fields

- **`eventId`** (uuid, required) — Idempotency key — consumers MUST be idempotent on this id.
- **`eventType`** (string, required) — Mirrors the destination name (e.g. 'bosq.cadastro.cliente.criado').
- **`eventVersion`** (string, required) — Semver-like, normally 'v1'.
- **`producedAt`** (ISO-8601, required) — Same as the header; duplicated in body for archival.
- **`producer`** ({service, instance, version}, required) — Identifies the emitting service instance and its version.
- **`tenantId`** (string, optional) — Same as header. Null for global events.
- **`correlationId`** (uuid, required) — Same as header.
- **`causationId`** (uuid, optional) — eventId that triggered this event (when applicable).
- **`actor`** ({usuarioId, papel}, optional) — Who caused the event. Optional for system-triggered events.
- **`data`** (object, required) — Event-specific payload — see per-event definition.

### Standard payload structure

```jsonc
{
  "eventId": <uuid>,
  "eventType": <string>,
  "eventVersion": <string>,
  "producedAt": <ISO-8601>,
  "producer": <{service, instance, version}>,
  "tenantId": <string> // opcional,
  "correlationId": <uuid>,
  "causationId": <uuid> // opcional,
  "actor": <{usuarioId, papel}> // opcional,
  "data": <object>
}
```

## Event catalogue per module

> 0 modules, **0 events** catalogued.

## Idempotency

Every consumer maintains the `processed_events` table:

```sql
CREATE TABLE processed_events (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

And checks before processing:

```java
if (processedEventRepo.existsById(event.eventId())) {
    log.info("Event {} already processed, skipping", event.eventId());
    return;
}
// ... processar ...
processedEventRepo.save(new ProcessedEvent(event.eventId(), event.eventType()));
```

Consumers persist eventId in processed_events before any side effect; retries with the same eventId are no-ops.

## Redeliveries and DLQ

- Artemis configured with **3 retries** with backoff: 1s, 5s, 30s.
- After 3 failures → goes to `neuroassist-niv.dlq.<evento-original>`.
- The DLQ is monitored by an alert (#neuroassist-niv-incident).
- Messages in the DLQ can be reprocessed via `POST /api/v1/admin/dlq/{queueName}/replay` (permission `adm.dlq.replay`).

## Outbox pattern

When the event publication MUST happen if and only if the database commit succeeds, write to outbox_event in the same transaction and have a separate publisher poll-and-send. Avoids ghost events on rollback.

Canonical table: `outbox_event`. Required for: **events_in_transactional_path**.

## How to add a new event

1. Edit `templates/architecture/decisions/events.arch.json` — add an entry in `modules[prefix=<modulo>].events`.
2. Validate: `python scripts/arch_decisions.py validate --aspect events`.
3. Bump `version` and `last_changed`.
4. Re-render this document.
5. Implement the producer in the emitting service (`gen_event_producer` in be-module-generator generates the stub from the FQN).
6. Implement the consumer(s) in the listed services — do not forget the idempotency check.

## Anti-patterns

- ❌ Editing this markdown directly — it is generated. The next render overwrites it.
- ❌ Publishing an event inside a transaction that may roll back — use the **outbox pattern** (write to `outbox_event` in the same TX, a separate publisher reads and sends).
- ❌ A consumer making a synchronous Feign call while processing an event — couples and defeats the benefit of async.
- ❌ Forgetting `eventId` in the payload — loses idempotency.
- ❌ Renaming an event without deprecating (keep the old name until consumers migrate) — breaks historical audit.
- ❌ Mixing Artemis with Kafka/RabbitMQ — NeuroAssist NIV is **Artemis only**.

## References

- JMS patterns (broker, queue config): [[../../backend/standards/platform-patterns]]
- Services + producers/consumers: [[../../backend/standards/services-catalog]]
- Outbox pattern: implement via `neuroassist-niv-migrations/V<N>__shared_outbox.sql`
- Multi-tenancy header contract: [[../multi-empresa]] §"Asynchronous propagation"
