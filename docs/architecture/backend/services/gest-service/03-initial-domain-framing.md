<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Module: **GEST — Gesture Detection (Edge)** · Service: `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Ubiquitous Language
- **Detection engine** — the on-station pipeline (webcam → facial landmarks → classifier) that
  recognises gestures. Runs on the frontend; GEST only describes *what it supports*, never runs it.
- **Engine version** — an identifiable release of the detection engine / model bundle
  (`version`, e.g. `1.3.0`). The axis along which support is declared.
- **Gesture-type code** — a primitive `code` from PAT's **global** `GestureType` vocabulary
  (e.g. `BLINK`, `DOUBLE_BLINK`). GEST references the code; PAT owns the vocabulary (INV-PAT-6).
- **Engine capability** — the assertion that engine version *V* supports gesture-type code *C*
  (`supportStatus`). The one fact GEST owns.
- **Support status** — `supported` | `experimental` | `unsupported`. `unknown` is the *absence* of a
  row (not stored), surfaced by reads as "no declaration".
- **Support truth** — the authoritative answer to "can the engine detect this primitive?", delegated
  to GEST by INV-PAT-6.

Terms deliberately **not** in GEST's language (owned elsewhere): command, label, sensitivity, gesture
duration window (PAT); device, pairing, catalog (EDGE); event, alarm, confidence, feedback (EVNT);
patient-session, caregiver link (ACS).

## Aggregates and Entities
- **EngineVersion** (aggregate root) — `id`, `version` (unique, global), `displayLabel`, `status`
  (`active` | `deprecated`), `createdAt`. Supporting registry so capabilities key to a known version.
- **EngineCapability** (aggregate root) — `id`, `engineVersionId` (→ EngineVersion), `gestureTypeCode`
  (string, PAT vocabulary code), `supportStatus`, `notes`, `declaredBy`, `declaredAt`, `updatedAt`.
  Unique on `(engineVersionId, gestureTypeCode)`.

No `Patient`, `Command`, `EdgeDevice`, `Event` entity exists here — those are foreign aggregates
referenced only by opaque identifiers/codes, never duplicated.

## Domain Events
- **EngineVersionRegistered** — a new engine version is recorded. *(supporting)*
- **EngineCapabilityDeclared** — **anchor**: engine version *V* is declared to support gesture-type
  *C* (create or status change to a supporting value).
- **EngineCapabilityRetired** — support for `(V, C)` is withdrawn (`supportStatus = unsupported`,
  terminal). *(supporting)*
- **EngineVersionDeprecated** — an engine version is marked `deprecated` (no new capability
  declarations). *(supporting)*

All are audited to HIST with the shared envelope; no broker is involved (messaging disabled).

## State Transitions
High-level lifecycle of GEST's two aggregates.

**EngineVersion:** `active → deprecated` (one-way; a deprecated version keeps its existing capability
rows resolvable for stations still on it, but accepts no new declarations).

**EngineCapability.supportStatus:**
`(absent/unknown) → supported | experimental` (declare) · `supported ↔ experimental` (re-declare) ·
`supported | experimental → unsupported` (retire, terminal; row retained for audit/history).

## Invariants
- **INV-GEST-1** — a capability row references a `gestureTypeCode` that exists in PAT's global
  `GestureType` vocabulary at declare time (validated via `GET /pat/gesture-types`). GEST stores the
  code, never redefines the vocabulary (upholds INV-PAT-6 from GEST's side).
- **INV-GEST-2** — `(engineVersionId, gestureTypeCode)` is unique; one support assertion per pair.
- **INV-GEST-3** — the registry is **global**: it carries no `tenant_id` and discloses the same truth
  to every tenant (ADR-003 local). No endpoint derives a per-tenant answer.
- **INV-GEST-4** — GEST is **advisory**: a read answers "supported / experimental / unsupported /
  unknown" but GEST never blocks a PAT command operation. Enforcement (if ever wanted) stays a
  consumer choice; PAT keeps its own INV-PAT-4 vocabulary check.
- **INV-GEST-5** — writes are admin-only; a patient-session token (`gest.*` read scope) can read the
  registry and can never mutate it.
- **INV-GEST-6** — a retired `(V, C)` is never silently re-supported by mutation of the same row's
  terminal state without an explicit re-declare action (auditable).
