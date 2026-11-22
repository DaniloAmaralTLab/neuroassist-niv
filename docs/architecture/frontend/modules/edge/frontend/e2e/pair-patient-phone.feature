Feature: Pair the patient's phone as an edge device
  As a caregiver activating a patient mobile phone
  I want to pair the phone as an edge instance
  So that the patient's own Android/Chromium device runs detection (EDGE), separate from the session (ACS)

  Background:
    Given a signed-in caregiver with authority "edge.device.pair"
    And a patient of the active tenant on the phone-activation screen

  Scenario: If the patient phone is not Android or Chromium the system blocks pairing with the platform-unsupported notice
    Given the patient phone is not Android or Chromium
    When the caregiver attempts to pair the mobile phone
    Then the system blocks pairing with the platform-unsupported notice
    And the system does not send a pairing request

  Scenario: The EDGE and ACS seam keeps device pairing and patient session as separate steps
    When the caregiver pairs the mobile phone and provisions the patient session
    Then the system treats the edge device pairing as the EDGE step
    And the system treats the patient session provision as the separate ACS step

  Scenario: Reuse the device-pairing panel for the phone-activation device portion
    When the caregiver opens the phone-activation device portion
    Then the system reuses the device-pairing panel in phone mode
