# MIG — TechLab AI Integration

> **Not Applicable — `ai.hasAi = false` for MIG; it consumes no AI capability
> (recorded decision).**
>
> MIG is infrastructure: a centralized Flyway migrator (`_brief.md` §7). It depends
> on **no** TechLab AI bounded context (orchestration, document_composition,
> knowledge, analytics), makes no Feign call to techlab-ai, and consumes no AI event.
>
> This file is intentionally empty of integration definitions so backlog/scaffold
> wire no AI client into the migrator job.

## TechLab AI capabilities consumed

None.

## Feign operations

None.

## Events consumed from TechLab AI

None (messaging disabled platform-wide).

## Invariants

`THE SYSTEM SHALL depend on no TechLab AI capability and SHALL make no call to techlab-ai.`
