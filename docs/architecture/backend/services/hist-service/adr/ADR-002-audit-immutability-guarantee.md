<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Audit immutability guarantee (DECISION a — SAFETY/COMPLIANCE)

## Status
aceita

> User decision 2026-11-20: **Option A now, Option B additive later** — append-only via DB grants (INSERT/SELECT only) in the MVP; hash columns reserved in the schema so tamper-evidence is an additive change.

## Contexto
HIST is the platform's system of record for safety-relevant actions (alarms,
confirmations, escalations, detection lapses) and access/device/catalog lifecycle. All
five producers' contracts state audit "is append-only and must not lose records". The open
question — **surfaced here for the user, not silently decided** — is *how strong* the
immutability guarantee must be:

- **Option A — append-only via DB grants only.** The HIST application role is granted
  `INSERT`/`SELECT` but denied `UPDATE`/`DELETE` on audit tables; no application code path
  mutates a record. Cheap, simple, no write-path overhead.
- **Option B — Option A plus tamper-evidence (hash chain).** Each record stores a hash of
  `(prev_hash + canonical record)`, forming a verifiable chain; periodic anchoring of the
  head hash. Detects after-the-fact tampering even by a privileged DB operator.

## Decisão
**Recommendation: start with Option A for MVP, design the schema so Option B is additive**
(reserve a nullable `record_hash` / `prev_hash` pair now; turn on chaining without a
migration break). Rationale: grants give real append-only semantics at zero write-path
cost; a hash chain defends against a privileged insider, a threat that matters for health
audit but is not the MVP's first risk. Keeping the columns reserved avoids a breaking
migration when compliance requires tamper-evidence. **User decision required** on whether
MVP must ship Option B immediately given LGPD/clinical-audit expectations.

## Consequências
- Positive (A): immutability with no write-path overhead; simple to reason about and test.
- Positive (reserved B): upgrade path to tamper-evidence without reshaping the table.
- Negative (A alone): does not detect tampering by a privileged DB operator; trust rests on
  database access control and backups.
- Negative (B): per-write hashing + ordering cost, key/anchor management, and chain
  verification tooling; more to operate.
- Open: the user must confirm whether tamper-evidence is an MVP requirement (COMPLIANCE) or
  a fast-follow.
