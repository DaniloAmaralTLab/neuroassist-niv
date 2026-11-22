Feature: Retire a version and erase patient audio

# SPEC-05, SPEC-06 · api-contract §6/§7 · ADR-005/006 (commit + durable-retry)

Background:
  Given a TRN service-client token for tenant "tenant-a"
  And patient "pat-1" has an active tree version 7 with ETag "sha256:aaa"

Scenario: Retiring a version withdraws it
  When TRN retires tree version "ver-7"
  Then the response status is 200
  And version "ver-7" status is "withdrawn"
  And a "TreeVersionWithdrawn" fact is audited to HIST

Scenario: Retire is idempotent
  Given version "ver-7" is already withdrawn
  When TRN retires tree version "ver-7"
  Then the response status is 200
  And version "ver-7" status is "withdrawn"

Scenario: Retire commits even when HIST is down (durable retry)
  Given HIST is unavailable
  When TRN retires tree version "ver-7"
  Then the response status is 200
  And version "ver-7" status is "withdrawn"
  And the "TreeVersionWithdrawn" fact is queued for idempotent retry

Scenario: Erasing patient audio crypto-shreds the clips
  When TRN erases the audio for patient "pat-1"
  Then the response status is 202
  And the affected versions are withdrawn
  And an "AudioAssetsErased" fact is audited to HIST
  And the station GET for an erased clip returns 410

Scenario: Erase is idempotent
  Given the audio for patient "pat-1" has been erased
  When TRN erases the audio for patient "pat-1"
  Then the response status is 202
  And the erased asset count is 0

Scenario Outline: Only a TRN service-client may retire or erase
  Given a patient-session token for patient "pat-1" in tenant "tenant-a"
  When the station calls "<operation>"
  Then the response status is 403

  Examples:
    | operation                     |
    | retire tree version ver-7     |
    | erase audio for patient pat-1 |
