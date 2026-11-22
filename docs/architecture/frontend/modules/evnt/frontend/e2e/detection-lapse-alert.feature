Feature: Detection-lapse alert (station not detecting)
  As a family caregiver
  I want a distinct alert when the patient's station stops detecting
  So that a silent detection failure reaches me without ever masking a real emergency

  Background:
    Given a signed-in caregiver with authority "evnt.event.read"
    And the caregiver has authority "evnt.detection-lapse.read"
    And the caregiver is linked to a patient of the active tenant

  Scenario: An open detection lapse renders as a distinct station-not-detecting alert
    Given the projection reports an open detection lapse for the linked patient
    When the caregiver views the dashboard
    Then the system presents a distinct station-not-detecting alert
    And the system does not render the detection lapse as the emergency takeover

  Scenario: An unconfirmed emergency outranks a detection lapse
    Given the projection reports an unconfirmed emergency for the linked patient
    And the projection reports an open detection lapse for the same patient
    When the caregiver views the dashboard
    Then the emergency outranks the detection lapse
    And the system does not surface the detection lapse as an emergency

  Scenario: The detection-lapse list is polled at the server-advertised interval reusing the monitoring model
    Given the detection-lapse response advertises a poll interval
    When the detection-lapse poll runs
    Then the system polls the detection-lapse list at the server-advertised poll interval
    And the system does not hardcode the detection-lapse poll cadence

  Scenario: While the tab is hidden the system marks lapse monitoring degraded and claims no all-clear
    Given an open detection lapse was last seen for the linked patient
    When the tab becomes hidden
    Then the system marks detection-lapse monitoring degraded
    And the system does not claim there are no detection lapses

  Scenario: A failed detection-lapse read holds the last known state and never claims no lapses
    Given an open detection lapse was last seen for the linked patient
    When the detection-lapse read fails
    Then the system holds the last known detection-lapse state
    And the system does not claim there are no detection lapses

  Scenario: Acknowledging a detection lapse confirms it under its authority and waits for the write
    Given the caregiver has authority "evnt.detection-lapse.confirm"
    And the projection reports an open detection lapse for the linked patient
    When the caregiver acknowledges the detection lapse
    Then the system sends the confirmation under the authority "evnt.detection-lapse.confirm"
    And the system keeps the detection-lapse alert active until the write succeeds

  Scenario: Re-acknowledging an already-acknowledged detection lapse is idempotent
    Given the caregiver has authority "evnt.detection-lapse.confirm"
    And a detection lapse is already acknowledged
    When the caregiver acknowledges the detection lapse again
    Then the system treats the acknowledgement as idempotent
    And the system does not show a backend error

  Scenario: A failed acknowledge keeps the detection-lapse alert active
    Given the caregiver has authority "evnt.detection-lapse.confirm"
    And the projection reports an open detection lapse for the linked patient
    When the caregiver acknowledges the detection lapse
    And the acknowledge-lapse write fails
    Then the system keeps the detection-lapse alert active
    And the system offers a retry
    And the system does not render the detection lapse as acknowledged

  Scenario: A detection lapse resolved server-side auto-clears on the next read
    Given an open detection lapse is shown for the linked patient
    When the next read reports the detection lapse resolved
    Then the system auto-clears the detection-lapse alert
    And the system does not clear the detection lapse from a client-side timer

  Scenario: A not-found detection-lapse read shows a neutral state without disclosure
    When the backend responds not-found on the detection-lapse read
    Then the system shows a neutral no-lapse-available state
    And the system does not disclose whether the detection lapse exists for another tenant or patient

  Scenario: Without the confirm authority the acknowledge action is hidden
    Given the session lacks authority "evnt.detection-lapse.confirm"
    And the projection reports an open detection lapse for the linked patient
    When the caregiver views the detection-lapse alert
    Then the system hides the acknowledge action on the detection-lapse alert

  Scenario: Without the read authority the detection-lapse alert surface is hidden
    Given the session lacks authority "evnt.detection-lapse.read"
    When the caregiver views the dashboard
    Then the system hides the detection-lapse alert surface

  Scenario: The system treats the detection-lapse create and resolve authorities as service-client only
    Given the backend service-client authorities "evnt.detection-lapse.create" and "evnt.detection-lapse.resolve"
    When the system evaluates the detection-lapse dashboard route, guard, menu key and permission map
    Then the system treats "evnt.detection-lapse.create" and "evnt.detection-lapse.resolve" as service-client authorities only
    And the system does not expose either as an EVNT dashboard route, guard or menu key
    And the system does not include them in the EVNT permission map or any caregiver guard

  Scenario Outline: The detection-lapse authorities equal the backend constants exactly
    Given the backend authority constant "<authority>"
    When the system evaluates the detection-lapse affordances
    Then the system uses the authority "<authority>" exactly as the backend authority constant
    And the system does not rename the authority

    Examples:
      | authority |
      | evnt.detection-lapse.read |
      | evnt.detection-lapse.confirm |
