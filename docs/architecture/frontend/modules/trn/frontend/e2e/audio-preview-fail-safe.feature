Feature: Fail-safe audio preview cascade
  As a caregiver previewing a proposal
  I want playback to degrade honestly from cloned-voice clip to device TTS to large text
  So that I am never shown a silent preview and no preview URL is invented
  Covers: SPEC-03 (honest preview source), SPEC-04 (no preview endpoint), SPEC-07 (preview fallback)

  Background:
    Given a caregiver on /training with a proposal selected

  Scenario: A caregiver preview with no available clip falls back to device TTS then large text never silent
    Given no available cloned-voice clip for the proposal
    When the caregiver previews the proposal
    Then the system falls back to device TTS then large text
    And the system presents a silent preview state in no case

  Scenario: With no pre-publication preview endpoint the preview resolves to device TTS then large text without an invented URL
    Given trn-service exposes no pre-publication preview endpoint
    When the caregiver previews the proposal
    Then the system resolves the preview to device TTS then large text
    And the system invents no preview URL

  Scenario: The preview source is reported honestly and never be-clip when no clip is available
    Given no clip is available for the proposal
    When the preview source is resolved
    Then the system reports the preview source honestly
    And the system reports be-clip in no case when no clip is available
