Feature: Play cached audio clips

# SPEC-02, SPEC-03 · api-contract §3 · ADR-005 (play only) · INV-CONV-5

Background:
  Given a patient-session token for patient "pat-1" in tenant "tenant-a"
  And patient "pat-1" has an active tree version 7 with ETag "sha256:aaa"
  And the manifest contains asset "aud-suction-01" with content hash "sha256:clip1"

Scenario: Station streams a cached clip with immutable caching
  When the station GETs the audio clip "aud-suction-01"
  Then the response status is 200
  And the response ETag is "sha256:clip1"
  And the response Cache-Control is "public, max-age=31536000, immutable"
  And no TTS vendor is called

Scenario: Range request returns partial content
  When the station GETs the audio clip "aud-suction-01" with a Range header
  Then the response status is 206

Scenario: Unknown asset is not found
  When the station GETs the audio clip "aud-unknown"
  Then the response status is 404

Scenario: A crypto-shredded clip is gone
  Given the audio for patient "pat-1" has been erased
  When the station GETs the audio clip "aud-suction-01"
  Then the response status is 410
  And the problem type is "audio-erased"

Scenario Outline: The service never synthesizes on the playback path
  When the station GETs the audio clip "<assetId>"
  Then no TTS vendor is called
  And the response is served from the AudioAssetPort cache

  Examples:
    | assetId        |
    | aud-suction-01 |
    | aud-water-02   |
