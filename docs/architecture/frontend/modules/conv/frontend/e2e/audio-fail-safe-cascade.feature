Feature: Fail-safe audio cascade
  As a patient
  I want playback to degrade honestly from cached clip to device TTS to large text
  So that I am never shown a silent spoken state and never hear erased audio
  Covers: SPEC-07 (410 audio-erased drop and fall back, 404/absent clip fall back never silent),
          SPEC-05 (lacking conv.audio.read skips the fetch and falls back)

  Background:
    Given a patient on /patient/converse with a cached speech-tree bundle

  Scenario: Erased audio drops the cached clip and falls back without replaying erased audio
    Given GET /conv/audio/{assetId} responds 410 audio-erased for a selected phrase
    When the patient plays the phrase
    Then the system drops the cached clip
    And the system falls back to device TTS then large text
    And the system does not replay the erased audio

  Scenario: A missing audio clip falls back to device TTS then large text, never silent
    Given GET /conv/audio/{assetId} responds 404 not-found or the cached clip is absent
    When the patient plays the phrase
    Then the system falls back to device TTS then large text
    And the system does not present a silent spoken state

  Scenario: Lacking conv.audio.read skips the cached-audio fetch and falls back
    Given the patient-session lacks conv.audio.read
    When the patient plays a phrase
    Then the system skips the cached-audio fetch
    And the system falls back to device TTS then large text
