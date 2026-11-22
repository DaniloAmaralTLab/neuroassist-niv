Feature: Recognise a command and report it exactly once to EVNT
  As the patient station runtime
  I want a recognised command reported to EVNT exactly once
  So that a caregiver is alerted without duplicates and without false reports

  Background:
    Given a patient station with a valid "edge.device" identity
    And a loaded landmark model with a stub classifier for deterministic recognition
    And an active command catalog read from the EDGE offline cache

  Scenario: Recognise a command and expose a RecognitionVM with a reportId minted once and occurredAt stamped at recognition
    Given a simple command whose primitive is detectable for the running engine version
    When the primitive is held above the sensitivity threshold within the duration window
    Then the system exposes one RecognitionVM carrying a reportId minted once and occurredAt stamped at recognition
    And the system marks the queue item sent only after EVNT confirms 201

  Scenario: Post the gesture report with commandId reportId and occurredAt and include no deviceId patientId or tenantId in the body
    Given a recognised command
    When the system reports the recognition to EVNT
    Then the system POSTs the gesture report to "/evnt/gesture-reports" with commandId reportId and occurredAt
    And the system includes no deviceId patientId or tenantId in the gesture report body

  Scenario: Read the active command catalog from the EDGE cached catalog and never call PAT at runtime
    When the station resolves the active command catalog
    Then the system reads the active command catalog from the EDGE cached catalog
    And the system never calls PAT directly at runtime

  Scenario: Route every GEST call through the edge.device device-token interceptor and attach no caregiver session bearer
    When the station sends the report, support-check, and catalog calls
    Then the system routes every GEST call through the edge.device device-token interceptor variant
    And the system attaches no caregiver session bearer

  Scenario: Default the GEST report support and catalog adapters to http and use a mock adapter only under an explicit mock provider
    When the host provides the GEST data-access adapters
    Then the system defaults the GEST report support and catalog adapters to http
    And the system uses a mock adapter only under an explicit mock provider

  Scenario: Recognise a compound command when both primitives complete inside the window
    Given a compound command whose primary and secondary primitives are both detectable
    When the primary then the secondary primitive complete before the max duration
    Then the system reports exactly one gesture report for the compound command

  Scenario: A compound whose secondary never arrives reports nothing
    Given a compound command
    When the secondary primitive does not arrive before the max duration
    Then the system resets to idle and reports nothing

  Scenario: An idempotent replay is delivered exactly once
    Given a gesture report already consumed for its reportId
    When EVNT returns 200 for the replayed reportId
    Then the system treats the report as delivered exactly once
    And the system creates no duplicate report

  Scenario: A non-detectable command is marked and never armed
    Given a command whose primitive codes are not all detectable for the running engine version
    When the station loads its catalog
    Then the system marks the command "not yet detectable"
    And the system never arms the command for recognition

  Scenario: The detectable gate treats an absent support row as not detectable
    When the station calls support-check for the running engine version
    Then the system treats a code with no support row as not detectable
