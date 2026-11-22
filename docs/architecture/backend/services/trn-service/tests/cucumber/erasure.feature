Feature: Right-to-be-forgotten erasure
# SPEC-11; ADR-005/ADR-006/ADR-007. Crypto-shred + CONV propagation, never blocked (INV-TRN-9).

Background:
  Given a caregiver authenticated for tenant t_alpha
  And patient p-100 has synthesized audio assets and a published version

Scenario: Erasure crypto-shreds and propagates to CONV
  When the caregiver erases content for patient p-100
  Then the response status is 202
  And the ElevenLabs voice model is deleted
  And the per-subject key is deleted so voice refs become unreadable
  And the voice_model voice_sample and audio_asset rows are marked erased
  And CONV tree-version retire is requested
  And CONV audio erase is requested
  And HIST received a ContentErased audit fact

Scenario: Erasure is never blocked by a HIST or CONV outage
  Given HIST is unavailable
  And CONV is unavailable
  When the caregiver erases content for patient p-100
  Then the response status is 202
  And the local crypto-shred completes
  And the retire erase and audit facts are enqueued for durable retry
  And they are retried idempotently until accepted

Scenario: Erasure retains immutable governance records
  When the caregiver erases content for patient p-100
  Then the governance records are retained with payload rendered unreadable
  And no governance record is hard-deleted

Scenario: Double erasure is idempotent
  Given content for patient p-100 has already been erased
  When the caregiver erases content for patient p-100
  Then the response status is 202
  And the erased counts are zero
