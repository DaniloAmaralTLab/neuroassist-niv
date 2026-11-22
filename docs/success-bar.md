# Success bar

One end-to-end scenario decides whether the project works. It runs on a single desktop with no
internet, no GPU, no Docker and no sound, using only synthetic data.

## The scenario

1. A recorded, synthetic clip of landmark frames (a face doing a double blink) is fed to the
   edge service in place of a live webcam.
2. The gesture service recognises the double blink with simple rules on the landmarks. No model
   is trained or served.
3. The event service raises a `HELP_REQUESTED` alarm for the patient.
4. The caregiver dashboard, polling every 3 seconds, shows the alarm.
5. The caregiver confirms it, and the history service records `AlarmConfirmed`.

## Pass criteria

- The alarm is visible on the caregiver screen within **10 seconds** of the last frame of the gesture.
- A clip without the gesture (neutral face, single blink) raises **no** alarm.
- Confirming the alarm twice produces one audit record and two `200` responses.
- A token without the right permission is refused with 401 or 403 at every step.
- The whole scenario runs from one command, as a Playwright test against the local web app.

## Status

| Piece | State |
|---|---|
| Per-service architecture and integration tests (8 services) | passing, no Docker needed |
| Backend controllers behind the scenario | stubs, not yet implemented |
| Local web app and the Playwright scenario | not yet built |

The scenario is the target for the implementation layer. Until it passes, green unit and BDD
tests are not proof that the product works.

## Not covered

Real patients, real health data, live camera capture, training or evaluating any AI model.
