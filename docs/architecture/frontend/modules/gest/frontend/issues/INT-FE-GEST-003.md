# INT-FE-GEST-003 -- G1: Patient-Mode host shell undecided — GEST shell integration blocked on host shell decision

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
The GEST station runtime module is designed to be loaded by a host shell application; the choice of which shell (kiosk app, patient-mode thin shell, or the existing neuroassist shell) is undecided as of SPEC-06 §4 (open point G1); this INT issue tracks the decision and ensures `GestShellIntegrationService` can bootstrap in any of the three candidate shells.

## Context / Problem statement
SPEC-06 §4 states: "Integration point G1 — Patient-Mode host shell: the host shell that will load `libs/gest` on a physical station device is not yet determined. Candidates: (a) neuroassist main shell (caregiver role, NOT appropriate for bedside station); (b) a dedicated kiosk shell (new repo); (c) EDGE patient-mode shell (future feature)."

Implications for FE architecture:
- `GestShellIntegrationService` must NOT assume the main neuroassist shell's `ShellBus` is available.
- `StationLivenessPort` must be provideable from any host shell (interface-only, not shell-specific implementation).
- `gest.bootstrap.ts` must be callable from outside the main Angular app.
- If decision is (b) or (c): a new Nx app will host GEST; `libs/gest` is a standalone library.

## Action required
1. Architecture owner decides G1 (candidate a, b, or c) before FE-GEST-021 can be fully implemented.
2. If (a): `GestShellIntegrationService` wires to neuroassist `ShellBus` → update FE-GEST-021 and FE-GEST-005.
3. If (b) or (c): raise a new FE issue for the kiosk/patient-mode shell Nx app scaffold.
4. Until G1 is closed: `GestShellIntegrationService` uses `NoOpStationLivenessPort` by default (keeps unit tests green).

## Implementation checklist
- [ ] Architecture owner decides G1 (a/b/c)
- [ ] FE-GEST-021 updated with the correct host shell provider
- [ ] FE-GEST-005 bootstrap updated if (b) or (c) requires a new Nx app
- [ ] New kiosk app scaffold issue raised if needed

## Dependencies
- FE-GEST-005 (gest.bootstrap.ts — init depends on host shell)
- FE-GEST-021 (GestShellIntegrationService — StationLivenessPort provider)
- INT-FE-GEST-004 (libs/edge StationLivenessPort implementation)

## Prioridade
P1 (blocker on FE-GEST-021 final implementation)
