# REG — TechLab AI Integration

> **Not Applicable — REG consumes no TechLab AI capability (recorded decision).**
>
> The project has `ai.hasAi = false`, and per `_brief.md` §7 the registry depends
> on **none** of the TechLab AI bounded contexts (orchestration,
> document_composition, knowledge, analytics). It makes no Feign call to techlab-ai
> and consumes no AI-originated signal.

## Dependencies

| Bounded context | Used? |
|---|---|
| orchestration | No |
| knowledge | No |
| document_composition | No |
| analytics | No |

## Rationale

REG is a service-discovery backbone with no business domain. NeuroAssist NIV uses
no TechLab AI capability at all (`ai.hasAi = false`); even if a service later did,
that service would register with REG like any other client, adding **no AI
coupling** to the registry — REG only knows a client's logical id and instance
health.

`THE SYSTEM SHALL NOT call any TechLab AI bounded context.`
`THE SYSTEM SHALL treat every registering service as an ordinary Eureka client (logical id + lease only).`
