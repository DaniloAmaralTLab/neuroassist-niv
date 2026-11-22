Feature: Register gesture type
  As a family caregiver
  I want to register a new gesture type inline from the command editor
  So that I can map a movement the standard vocabulary does not yet name

  Background:
    Given a signed-in caregiver with authority "pat.gesture-type.create"
    And the caregiver opens the command editor in new mode

  Scenario: Register a new gesture type inline and select it in the open gesture slot
    Given the caregiver opens the register new type field for the primary gesture slot
    When the caregiver enters a code and a display name and saves the gesture type
    Then the system sends the register request with the code, displayName and description and selects the returned gesture type in the open gesture slot

  Scenario: Reject a duplicate gesture-type code with a field error not a global toast
    Given the caregiver opens the register new type field
    When the backend responds gesture-type-code-taken
    Then the system shows a field error on the new gesture-type code
    And the system does not show a global toast and does not create a duplicate

  Scenario: Surface the caveat that naming a gesture type does not imply engine support
    Given the caregiver opens the register new type field
    When the caregiver registers a new gesture type
    Then the system surfaces the caveat that naming a gesture type does not imply the detection engine recognises it
