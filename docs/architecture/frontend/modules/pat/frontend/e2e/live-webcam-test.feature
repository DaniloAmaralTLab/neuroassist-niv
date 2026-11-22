Feature: Live webcam test
  As a family caregiver
  I want a tactile live webcam preview in the command editor
  So that I can position the patient before saving, knowing the test does not perform recognition

  Background:
    Given a signed-in caregiver with authority "pat.command.create"
    And the caregiver opens the command editor in new mode
    And the webcam is stubbed with a fake media stream

  Scenario: Start the live webcam test and show the active preview state
    When the caregiver starts the live webcam test
    Then the system shows the active camera preview state with honest copy that it performs no recognition
    And the system stops the webcam stream when the test stops

  Scenario: An unavailable webcam sets the live-test error state and keeps the save control enabled
    Given the webcam is unavailable or permission is denied
    When the caregiver starts the live webcam test
    Then the system sets the live-test error state and keeps the save control enabled because the test is advisory
