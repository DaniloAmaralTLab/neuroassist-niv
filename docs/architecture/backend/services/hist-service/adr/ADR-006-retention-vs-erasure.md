<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-006 — Retention vs data-subject erasure (DECISION b — COMPLIANCE)

## Status
aceita

> User decision 2026-11-20: **Option B within an Option C frame** — crypto-shredding (per-subject key deletion) of personal payload fields on erasure, immutable record retained; retention per fact class with legal hold. Retention periods / lawful basis still to be set with counsel (open item, not blocking).

## Contexto
NeuroAssist NIV processes health-adjacent data of a vulnerable population and is under
LGPD/GDPR-style duties (`_extensions.compliance.lgpd = true`). Two obligations pull in
opposite directions on the audit trail:

- **Erasure / data minimization** — a data subject (or their guardian) may request erasure
  of personal data; retention should be bounded.
- **Audit integrity** — the audit trail must remain **immutable** (ADR-002); deleting audit
  rows would break non-repudiation and the ability to reconstruct a safety incident.

The question — **surfaced for the user, not silently decided** — is how to honor erasure
without mutating the trail:

- **Option A — row deletion on erasure.** Simplest to honor a DSR, but violates immutability
  and loses incident history. Rejected for an audit store.
- **Option B — crypto-shredding / pseudonymization of personal fields.** Keep the immutable
  action record (who-did-what-when by stable ids), but render the *personal* payload fields
  unreadable on erasure — either by deleting a per-subject encryption key (crypto-shred) or
  by replacing direct identifiers with pseudonyms, leaving a referential tombstone.
- **Option C — tiered retention + legal-hold.** Define a retention period per fact class;
  after it, apply Option B automatically; a legal/clinical hold suspends it.

## Decisão
**Recommendation: Option B as the mechanism, within an Option C policy frame.** On an
erasure request, personal data in `payload` is crypto-shredded / pseudonymized while the
immutable `AuditRecord` (action, subject id, actor, timestamp, correlation) is retained —
so the trail stays complete and verifiable but no longer exposes erased personal data.
Retention windows per fact class and legal-hold handling are defined with the operator.
This keeps immutability (ADR-002) intact while meeting erasure duties. **User decision
required**: confirm the lawful-basis / retention periods and whether crypto-shred (key
deletion) or pseudonymization is preferred, with counsel.

## Consequências
- Positive: erasure honored without deleting audit rows; immutability and incident
  reconstruction preserved.
- Positive: retention is explicit and policy-driven, not ad hoc.
- Negative: requires per-subject key management (crypto-shred) or a pseudonymization map;
  more infrastructure and careful design so the "shred" is irreversible yet auditable.
- Negative: a pseudonymization tombstone still retains linkage structure; counsel must
  confirm it satisfies the applicable erasure standard.
- Open: lawful basis, exact retention periods, and shred-vs-pseudonymize choice — owner +
  legal, settled before `/be-architect-specs` finalizes the data model.
