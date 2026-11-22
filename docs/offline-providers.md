# Decision: external providers run as local fakes

Status: accepted, revisable. Date: 2026-11-22.

## Context

The project must run on one desktop with no internet, no GPU, no Docker and no sound
(see [success-bar.md](success-bar.md)). The architecture names three outside dependencies:
a language model (TRN proposes conversation content), a text-to-speech vendor (TRN
synthesizes audio) and a search index (event and history lookups). The camera is also an
outside input.

## Decision

Every outside dependency sits behind a port, and the default adapter is a local fake.
The real adapter is an optional extra that is never needed to pass the success bar.

| Dependency | Port owner | Default adapter | What the fake does |
|---|---|---|---|
| Language model | TRN | `FakeProposalAdapter` | Returns fixed, scripted proposals from a JSON file. Can also simulate a 5xx or a timeout, so the `503 llm-unavailable` path is tested. |
| Text-to-speech | TRN | `FileAudioAdapter` | Returns a short prerecorded audio file from disk. No sound device is needed because audio is only stored and served as a file. |
| Search index | EVNT, HIST | PostgreSQL queries | Uses plain SQL on the local database. No Elasticsearch is started. |
| Camera | EDGE, GEST | `RecordedFramesAdapter` | Reads a synthetic clip of face landmarks from a file. |

Selection is by a Spring profile or environment variable, for example `PROVIDER_MODE=fake`
(default) or `PROVIDER_MODE=real`.

## Rules

- No real patient data and no real keys are ever committed. Fake data is synthetic.
- The gesture rule (double blink) works on already extracted landmarks. No model is
  trained, evaluated or served, which keeps the project clear of the AI-development
  exclusion in the submission manual.
- A fake must fail the same ways the real service does (error, timeout), or tests would
  prove nothing about the failure paths.

## Status

Only the decision is recorded. The fake adapters are not implemented yet; each one is
built together with the controller that uses it in the implementation layer.

## Revisit when

The user wants real Claude or ElevenLabs output in the demo, or a search index is needed
for volume. Switching means adding a real adapter, not changing the services.
