# CONV — Event Catalog

> Messaging **disabled**: no broker topics/queues. These are in-process domain events / HIST audit
> facts over sync REST (see `../contracts/event-contracts.md`).

| Name | Type | Realization | Payload (link) | Known consumers |
|---|---|---|---|---|
| `PhraseSpoken` | domain (anchor) | client-side on station; opt-in `usage_signal` only; **no HIST fact** | `event-contracts.md` §2 | DASH (opt-in usage review), TRN (vocabulary improvement) — via `usage_signal`, not an event |
| `TreePublished` | audit fact (hard-502) | `POST /conv/trees` tx → `POST /hist/audit` | `event-contracts.md` §3 | HIST |
| `TreeVersionSuperseded` | audit fact (hard-502) | same publish tx → HIST | `event-contracts.md` §3 | HIST |
| `TreeVersionWithdrawn` | audit fact (commit + durable-retry) | `:retire` → HIST | `event-contracts.md` §3 | HIST |
| `AudioAssetsErased` | audit fact (commit + durable-retry) | `DELETE .../audio` → HIST | `event-contracts.md` §3 | HIST |

**Published broker events:** none. **Consumed broker events:** none.
