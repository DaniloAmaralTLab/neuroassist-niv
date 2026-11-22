# SPEC-02 — Proposal Lifecycle and Assistant Dialog (core orchestration)

> Core orchestration of TRN. ADR-003 (lifecycle + human gate), ADR-004 (LLM boundary).
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Specify the proposal state machine and the LLM-mediated dialog that produces/refines proposals, with the
human-only `approved` gate, so the behaviour is implementable and testable without rereading the vision.

## Scope

**In:** state machine, legal transitions, `DialogService` (LlmDialogPort), draft refinement, the gate.
**Out:** the two approval halves (SPEC-03), synthesis/publish (SPEC-11), ES indexing (SPEC-10).

## Technical decisions

- Lifecycle (ADR-003): `draft → proposed → (caregiver_approved ⟂ patient_approved) → approved →
  synthesizing → indexed → published`; terminal `rejected`, `withdrawn`, `erased`.
- The LLM may only produce `draft`/`proposed` (INV-TRN-2). Model confidence never authorizes.
- Minimisation (INV-TRN-7): only draft text + caregiver prompt + `patientId` leave the system.

## Implementation

- `DialogService.turn(sessionId, prompt)` → calls `LlmDialogPort` with minimised context → creates/
  refines `proposal` rows in `draft`/`proposed`; stores `assistantMessage` as data, retains no raw
  transcript (data-model §2.2, ADR-004).
- State machine enforced in `application` (not in controllers): each transition method validates the
  source state and rejects illegal moves with `409 proposal-state-locked`.
- `approved` is reached **only** by the dual-auth service (SPEC-03), never by `DialogService`.
- `approved → synthesizing` is guarded by a `granted` consent (SPEC-11, INV-TRN-3).

## State transition table

| From | Event | To | Actor |
|---|---|---|---|
| (new) | dialog turn / create draft | `draft` | assistant/caregiver |
| `draft` | submit | `proposed` | assistant/caregiver |
| `proposed` | caregiver confirm | `caregiver_approved` | caregiver |
| `proposed` | patient/guardian assent | `patient_approved` | caregiver (records fact) |
| `caregiver_approved`+`patient_approved` | both present, distinct | `approved` | system (SPEC-03) |
| `approved` | synthesize (consent ok) | `synthesizing` | caregiver trigger |
| `synthesizing` | synthesized+indexed | `indexed` | system |
| `indexed` | CONV accepts publish | `published` | system |
| `proposed`/`caregiver_approved`/`patient_approved` | reject | `rejected` | caregiver |
| `draft`/`proposed`/`approved` | withdraw | `withdrawn` | caregiver |
| `published` | erase | `erased` | caregiver (SPEC-11) |

## Edge cases

- Dialog turn when Anthropic is down → `503 llm-unavailable`, no proposal, session resumable.
- Edit/transition on a locked state → `409 proposal-state-locked`.
- An attempt to set `state` from model output → rejected; LLM cannot cross `proposed` (INV-TRN-2).

## Acceptance criteria (EARS)

- WHEN a caregiver submits a dialog turn, THE SYSTEM SHALL create/refine proposals only in `draft`/`proposed` and SHALL send the LLM only minimised context (`patientId`, draft text, prompt — INV-TRN-7).
- THE SYSTEM SHALL treat the LLM response as data and SHALL NOT let it change a proposal `state` beyond `proposed`, set an authority, or trigger publish/erase (INV-TRN-2, ADR-004).
- IF a transition is requested from an illegal source state, THEN THE SYSTEM SHALL respond `409 proposal-state-locked` and change nothing (ADR-003).
- THE SYSTEM SHALL reach `approved` only via the dual-authorization service (SPEC-03), never via dialog.
- WHILE no `granted` consent exists, THE SYSTEM SHALL refuse `approved → synthesizing` (INV-TRN-3).
- IF Anthropic is unavailable, THEN THE SYSTEM SHALL respond `503` and leave the session resumable, affecting no approval/publish/CONV runtime (ADR-007).
