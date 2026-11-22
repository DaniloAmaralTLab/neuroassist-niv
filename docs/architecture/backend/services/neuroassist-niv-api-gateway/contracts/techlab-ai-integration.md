# GWY — TechLab AI Integration

> **Not Applicable — GWY consumes no TechLab AI capability (recorded decision).**
>
> The project has `ai.hasAi = false`, and per `_brief.md` §7 the gateway depends on
> **none** of the TechLab AI bounded contexts (orchestration, document_composition,
> knowledge, analytics). It makes no Feign call to techlab-ai and consumes no
> AI-originated signal.

## Dependencies

| Bounded context | Used? |
|---|---|
| orchestration | No |
| knowledge | No |
| document_composition | No |
| analytics | No |

## Rationale

GWY is a thin reverse-proxy edge with no business domain. NeuroAssist NIV uses no
TechLab AI capability at all (`ai.hasAi = false`); even if a downstream service later
did, that service would call techlab-ai from behind the gateway — GWY only forwards
opaque HTTP by path and knows nothing of the payload (INV-G1).

`THE SYSTEM SHALL NOT call any TechLab AI bounded context.`
`THE SYSTEM SHALL forward every request opaquely by path and SHALL NOT interpret or enrich any AI payload.`
