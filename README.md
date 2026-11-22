# NeuroAssist AI

The product is inspired by a technical hypothesis validated in internal discovery (architecture documents of the original "NeuroAssist AI" concept — offline desktop vision): an ordinary computer with a webcam is able to reliably detect a voluntary gesture from the patient (e.g.: raising an eyebrow, blinking twice) and turn it into a `HELP_REQUESTED` event.

## Success bar

The single end-to-end scenario that defines "working" is in [docs/success-bar.md](docs/success-bar.md).
Outside services (language model, text-to-speech, search, camera) run as local fakes: see [docs/offline-providers.md](docs/offline-providers.md).
Gesture detection is rule-based on recorded landmarks, with no model work: see [docs/gesture-detection-scope.md](docs/gesture-detection-scope.md).

## Getting started

This project was bootstrapped by `techlab-architecture /new-project`.

- See `CLAUDE.md` for the full project guide (architecture, modules, conventions).
- See `project-checklist.md` for the development progress.
- Run `/next-phase` to navigate the current state.

## Running integration tests without Docker

Each service's `BaseIntegrationTest` uses Testcontainers by default. On a machine without Docker,
point the tests at a local PostgreSQL instead (use a dedicated, empty database: the test profile
runs with `ddl-auto: create-drop`):

```bash
export TEST_DB_URL=jdbc:postgresql://localhost:5432/neuroassist_test
export TEST_DB_USER=<user> TEST_DB_PASSWORD=<password>
cd backend/services/<service> && gradle integrationTest --offline
```
