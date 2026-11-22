# Session plan

How the implementation layer is split into coding sessions. Each session is one module (or
one slice), ends with passing tests and a commit, and can be explained on its own.
Status: proposed, revisable. Date: 2026-11-22.

Rule for every session: the controllers are stubs today, so a session is done only when its
real behaviour is covered by a test, not when the generated BDD is green.

## Order

The safety path comes first, because the success bar (see [success-bar.md](success-bar.md))
needs it, and it is the part that matters most to the patient.

| # | Session | Delivers | Needs |
|---|---|---|---|
| 1 | ACS | Login, tokens, JWKS, permissions | Fixes INT-GWY-001/002 (issuer and JWKS) |
| 2 | PAT | Patients, commands, caregiver links | ACS |
| 3 | EDGE | Station pairing, frame input from a recorded file | ACS |
| 4 | GEST | Gesture registry and the double-blink rule | EDGE |
| 5 | EVNT | `HELP_REQUESTED` alarm, confirm, lapse notice | GEST, PAT |
| 6 | HIST | Audit trail (`AlarmConfirmed` and others) | EVNT |
| 7 | GWY | One entry point, JWT check, tenant strip | ACS, EDGE JWKS |
| 8 | DASH | Caregiver screen, polling every 3 s | EVNT, HIST |
| 9 | E2E | The single Playwright scenario | Sessions 1 to 8 |
| 10 | CONV | Conversation tree for the patient | PAT |
| 11 | TRN | Training and proposals, with fake providers | CONV, ACS |

Sessions 1 to 9 are the minimum for the success bar. Sessions 10 and 11 are extra and can be
cut without breaking it.

## Before session 1

- Regenerate the V1 migrations into their Flyway blocks (INT-MIG-001..004).
- Decide the Patient-Mode host (G1).
- Build the first fake adapters from [offline-providers.md](offline-providers.md).
- Install the frontend dependencies so the Angular and Playwright gates can run.

## Each session

1. Read the module's issues in `docs/architecture/backend/issues/`.
2. Replace the controller stubs with real logic, one issue at a time.
3. Run the service's architecture and integration tests (see the README for running them without Docker).
4. Commit and push when green.
