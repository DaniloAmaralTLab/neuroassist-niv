<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposições a Validar
- Dependências Críticas
-->

# 06 — Risks, Gaps and Assumptions

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV

## Riscos

- **R1 — Availability blast radius (SAFETY).** HIST is a **synchronous dependency of every
  write path** (ACS, PAT, EDGE, EVNT, GEST all block on `POST /audit`). A HIST outage can,
  under the prod hard-`502` policy, stall every write in the platform — including
  safety-critical ones (alarm confirmation, detection-lapse handling). This sets a high
  availability target (see ADR-005) and argues for an SLO at least as strong as the most
  critical producer path.
- **R2 — Failure-policy conflict across producers (SAFETY).** ACS specifies a **split**
  policy (access-ending actions commit + enqueue retry even if audit fails; grant actions
  roll back `502`), while PAT/EDGE/EVNT specify hard `502` on the write path. GEST defers
  to a referenced fail-closed-vs-best-effort note. Left unreconciled, the same failure
  produces inconsistent behavior. ADR-005 must reconcile into one project policy.
- **R3 — Envelope drift (GEST).** GEST uses a different discriminator (`eventType`), omits
  `tenantId` and `payloadVersion`, and uses a different `subjectType` casing. If HIST does
  not normalize, GEST facts silently diverge or fail ingest.
- **R4 — `DetectionLapseResolved` collision.** Two producers emit the same `action`
  (EDGE device-side, EVNT lapse-side). Querying by `action` alone mixes them; HIST must key
  on `source` + `subjectType`.
- **R5 — Idempotency gap (reliability).** Producers do not retry across requests, but a
  single request retry (e.g., proxy/client timeout) can double-write. Without a HIST-side
  idempotency key the trail gains duplicates. Mitigated by ADR-003.
- **R6 — Immutability only as strong as its weakest control (SAFETY/COMPLIANCE).** DB
  grants prevent app-level mutation but not a privileged operator. Whether to add
  tamper-evidence (hash chain) is DECISION (a) / ADR-002.
- **R7 — Retention vs erasure tension (COMPLIANCE).** LGPD/GDPR erasure duties pull toward
  deleting personal data; audit integrity pulls toward never deleting. DECISION (b) /
  ADR-006 — crypto-shred payload personal fields, keep the record.

## Gaps Conhecidos

- The five producer `TODO[architect]` items (failure policy) are **open** until ADR-005 is
  accepted by the user; this vision proposes the reconciliation but does not unilaterally
  decide it.
- The exact home of GEST global facts (global table vs tenant-less partition) is proposed
  in ADR-004 but not yet contract-level (settled in `/be-architect-specs`).
- The history read model is a direct query at MVP; whether a dedicated projection is needed
  for DASH performance is deferred to specs/backlog.
- `payload` schemas per action are documented per producer but not yet consolidated into a
  single HIST-side catalog (specs work).

## Suposições a Validar

- **A1** — Producers will send `correlationId` = inbound `X-Correlation-Id` on every
  envelope (asserted by all five contracts). HIST treats it as mandatory.
- **A2** — DASH is the only reader of the history surface and the FE never calls HIST
  directly (confirmed by the EVNT FE decision: acknowledge audited server-side by
  evnt-service, FE never calls HIST).
- **A3** — GEST facts are genuinely global-schema (no tenant) by design, not an omission.
- **A4** — Service-client authentication for producer → HIST writes reuses the platform's
  existing service-client mechanism (ACS-issued), not a new trust surface.
- **A5** — Centralized Flyway (MIG) will apply HIST migrations to every `t_<tenantId>`.

## Dependências Críticas

- **ACS** — identity/JWKS for reader auth and service-client identity for writers.
- **MIG** — centralized migration application.
- **PostgreSQL** — append-only store with enforceable grants.
- **All five producers** — depend on HIST (inverse direction): HIST's availability bounds
  theirs. This bidirectional criticality is the defining property of the module.
