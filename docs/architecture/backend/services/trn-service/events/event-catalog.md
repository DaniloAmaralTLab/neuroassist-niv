# TRN — Event Catalog

> Service: `trn-service` · **Messaging disabled** — these are **in-process domain events** and HIST
> **audit facts** over sync REST, not broker messages. Full contracts: `../contracts/event-contracts.md`.

| Event | Type | Payload (link) | Known consumers |
|---|---|---|---|
| **TrainingSessionStarted** | domain / audit (hard-502) | `event-contracts.md` §2 | HIST (audit ledger) |
| **ConsentGranted** | domain / audit (hard-502) | `event-contracts.md` §2 | HIST |
| **ProposalApproved** *(anchor)* | domain / audit (hard-502) | `event-contracts.md` §2 | HIST; internal synthesize→index→publish pipeline |
| **ContentSynthesized** | internal milestone (not audited) | — | internal publish pipeline |
| **ContentPublished** *(terminal)* | domain / audit (hard-502) | `event-contracts.md` §2 | HIST; CONV owns the published tree thereafter |
| **ConsentRevoked** | domain / audit (commit + durable-retry) | `event-contracts.md` §2 | HIST |
| **ProposalRejected** | domain (not audited) | — | internal |
| **ProposalWithdrawn** | domain (not audited) | — | internal |
| **VoiceModelDeleted / ContentErased** *(terminal)* | domain / audit (commit + durable-retry) | `event-contracts.md` §2 | HIST; CONV (retire/erase) |

**Not events / not audited:** LLM dialog turns and draft edits — minimised, never retained (ADR-004).

**Published broker events:** none. **Consumed broker events:** none (messaging disabled, ADR-007).
