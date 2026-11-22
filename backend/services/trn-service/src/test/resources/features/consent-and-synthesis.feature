Feature: Voice-cloning consent and consent-gated synthesis
# SPEC-11; ADR-005. Consent of patient + legal representative before any synthesis (INV-TRN-3).

Background:
  Given a caregiver authenticated for tenant t_alpha
  And an approved phrase proposal pr-1 for patient p-100

Scenario: Capture consent with both halves
  When the caregiver captures voice-cloning consent for patient p-100 granted by patient and representative
  Then the response status is 201
  And the consent status is granted
  And HIST received a ConsentGranted audit fact

Scenario: Incomplete consent is rejected
  When the caregiver captures voice-cloning consent for patient p-100 granted by patient only
  Then the response status is 422
  And the problem type is incomplete-consent
  And no granted consent is created

Scenario: Synthesis is refused without consent
  Given patient p-100 has no granted voice-cloning consent
  When the caregiver requests publication of proposal pr-1
  Then the response status is 409
  And the problem type is consent-required
  And no TtsPort call is made

Scenario: Revocation blocks future synthesis and is never blocked by HIST
  Given a granted voice-cloning consent for patient p-100
  And HIST is unavailable
  When the caregiver revokes the consent
  Then the response status is 200
  And the consent status is revoked
  And the ConsentRevoked audit fact is enqueued for durable retry
  And future synthesis for patient p-100 is refused

Scenario: ElevenLabs down halts only synthesis, no partial publish
  Given a granted voice-cloning consent for patient p-100
  And ElevenLabs is unavailable
  When the caregiver requests publication of proposal pr-1
  Then the synthesize job is retried
  And proposal pr-1 remains in state approved or synthesizing
  And no version is published to CONV with an unsynthesized asset
