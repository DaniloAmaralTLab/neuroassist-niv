Feature: Offline durability of gesture reports with exactly-once retry
  As the patient station runtime
  I want recognitions to survive a network gap and a reload
  So that a help request is never silently lost

  Background:
    Given a patient station with a valid "edge.device" identity
    And a durable report queue

  Scenario: Enqueue recognitions while offline and survive a reload
    Given the station is offline
    When a command is recognised
    Then the system enqueues the recognition in a durable store
    And the queued report survives a page reload

  Scenario: Drain the queue with backoff and reuse the reportId on retry
    Given a queued report
    When connectivity returns
    Then the system drains the queue with backoff
    And the system reuses the original reportId on every attempt

  Scenario: Hold a report in sending until EVNT confirms
    When the station sends a gesture report
    Then the system holds the queue item in sending until EVNT confirms 201 or 200
    And the system never marks the report sent optimistically

  Scenario: Reschedule on 503 catalog-unavailable with Retry-After
    When EVNT responds 503 catalog-unavailable with a Retry-After header
    Then the system reschedules the queued report after the header delay
    And the system does not drop the queued report

  Scenario: Expire a report older than 24 hours
    Given a queued report older than 24 hours
    When the scheduler evaluates the report
    Then the system marks the report expired
    And the system surfaces "report expired, not delivered"

  Scenario: Mark the queued report expired on occurred-at-out-of-bounds and surface report expired not delivered
    When EVNT responds occurred-at-out-of-bounds for a queued report
    Then the system marks the queued report expired
    And the system surfaces "report expired, not delivered"

  Scenario: Stop reporting on an unauthorized station token
    When EVNT responds 401 on the report path
    Then the system stops reporting and renders the station-unpaired state
    And the system does not retry the dead token

  Scenario: Stop reporting when the token lacks the ingest authority
    When EVNT responds 403 because the token lacks evnt.event.ingest
    Then the system stops reporting and renders the station-not-provisioned state
