# Covers SPEC-06 (failure policy, ADR-005), event-contracts §3, integration-contracts §2
# HIST-side view: HIST either durably appends or fails cleanly; the hard-502 vs
# durable-retry choice is enacted producer-side. These scenarios assert HIST's clean-failure
# contract and the classification HIST publishes as authoritative.
Feature: Audit-write failure policy (HIST side of ADR-005)

Background:
  Given hist-service is running
  And the producer is authenticated with a valid service-client token

Scenario: HIST never acknowledges a write it did not durably append
  Given the PostgreSQL store is unavailable
  When the producer posts a valid envelope to "/hist/audit"
  Then the response status is 5xx
  And no audit record is acknowledged as appended

Scenario: A durably appended record is immutable thereafter
  Given a canonical audit envelope with action "PatientSessionRevoked" from source "acs-service"
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 201
  And there is no endpoint that updates or deletes the appended record

Scenario Outline: HIST publishes the authoritative failure-policy class for each fact
  When the policy for action "<action>" from source "<source>" is resolved
  Then the failure policy class is "<policy>"

  Examples:
    | source       | action                     | policy               |
    | acs-service  | TenantOnboarded            | hard-502             |
    | acs-service  | CaregiverDeactivated       | commit+durable-retry |
    | acs-service  | CaregiverAuthenticated     | commit+durable-retry |
    | acs-service  | PatientSessionRevoked      | commit+durable-retry |
    | pat-service  | PatientDeactivated         | commit+durable-retry |
    | pat-service  | CommandCalibrated          | hard-502             |
    | edge-service | DeviceRevoked              | commit+durable-retry |
    | edge-service | DeviceWentOffline          | hard-502             |
    | evnt-service | EventGenerated             | commit+durable-retry |
    | evnt-service | AlarmConfirmed             | commit+durable-retry |
    | evnt-service | FeedbackRecorded           | hard-502             |
    | gest-service | EngineCapabilityDeclared   | hard-502             |
