Feature: Video and landmarks never leave the device
  As a privacy-by-design assistive product
  I want no frame or landmark data to egress
  So that the LGPD privacy promise is architectural, not procedural

  Background:
    Given a patient station with a valid "edge.device" identity
    And network inspection recording every outbound request

  Scenario: Zero video or landmark egress across a recognise-and-report cycle
    When the station recognises a command and reports it to EVNT
    Then the system emits zero bytes of video or landmark data by network inspection

  Scenario: Only the commandId and non-identifying metadata leave the device
    When the station reports a recognition
    Then the system emits over the network only the recognised commandId and non-identifying report metadata
    And the system emits only the support-check code set and the catalog read besides the report

  Scenario: Frames and landmarks are confined to the detection worker
    When the detection loop processes frames
    Then the system confines frames and landmark arrays to the detection worker
    And the system discards frames and landmarks each tick

  Scenario: Stop every camera track when the runtime is torn down and leave the camera inactive
    When the runtime is torn down
    Then the system stops every camera track
    And the system leaves the camera inactive

  Scenario: Observability never logs frames or landmarks
    When the station forwards an activity to observability
    Then the system includes only schema-whitelisted fields
    And the system never logs a frame, a landmark array, or video
