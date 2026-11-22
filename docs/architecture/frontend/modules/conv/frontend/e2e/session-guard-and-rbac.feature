Feature: Patient-session guard, RBAC and station-path errors
  As the CONV runtime
  I want the session guard, authority self-gating and token handling to be honest
  So that a revoked or under-authorized session never fakes the patient's voice
  Covers: SPEC-01 (guard redirect, guard decides from the real session), SPEC-05 (hide navigator without
          conv.tree.read, opt-in usage without conv.usage.record, every gate through the guard), SPEC-06
          (patient-session bearer on egress), SPEC-07 (401 session-ended, 403 setup-issue, correlation id
          telemetry), SPEC-04 (opt-in usage enqueue, flush retry)

  Background:
    Given a station in Patient Mode

  Scenario: The guard redirects to the session-ended surface when there is no active session
    Given there is no active patient-session
    When the station navigates to /patient/converse
    Then the system redirects to the session-ended surface
    And the system does not render the speech-tree navigator

  Scenario: The guard decides from the real patient-session, never a hardcoded true
    Given a patient-session guard protects /patient/converse
    When the guard evaluates access
    Then the system evaluates the guard from the real patient-session
    And the system does not return a hardcoded true from the guard

  Scenario: Every CONV surface gate goes through the patient-session guard
    When a CONV surface gate is evaluated
    Then the system evaluates the gate through the patient-session guard
    And the system does not return a hardcoded true from a guard

  Scenario: Lacking conv.tree.read hides the speech-tree navigator surface
    Given the patient-session lacks conv.tree.read
    When the converse surface is requested
    Then the system hides the speech-tree navigator surface

  Scenario: Lacking conv.usage.record enqueues no usage signal and keeps playback unaffected
    Given the patient-session lacks conv.usage.record
    When the patient plays a phrase
    Then the system enqueues no usage signal
    And the system keeps playback unaffected

  Scenario: CONV egress attaches the patient-session bearer, not the edge.device token
    When CONV egresses to conv-service
    Then the system attaches the patient-session bearer on CONV egress
    And the system does not attach the edge.device station token

  Scenario: A 401 unauthenticated sync stops syncing and keeps the cache, never retrying the revoked token
    Given a cached bundle is present
    When conv-service responds 401 unauthenticated on a tree sync
    Then the system stops syncing and keeps serving the cached bundle
    And the system shows a session-ended message
    And the system does not retry the revoked token

  Scenario: A 403 forbidden sync stops and surfaces a setup issue, never fabricating content
    When conv-service responds 403 forbidden on a tree sync
    Then the system stops syncing and shows a setup-issue message
    And the system does not fabricate tree content

  Scenario: An opted-in spoken phrase enqueues a minimal usage signal without blocking playback
    Given usage logging is opted in for the patient
    When an opted-in phrase is spoken
    Then the system enqueues a minimal usage signal of phrase id and timestamp with no free text
    And the system does not block playback on its delivery

  Scenario: A failed usage-signal flush retains the queued signal without an error to the patient
    Given a queued usage signal
    When the usage-signal flush fails
    Then the system retains the queued signal for a later opportunistic flush
    And the system does not surface an error to the patient

  Scenario: A 400 validation-error usage post is discarded without retry and without affecting playback
    When the usage-signal post responds 400 validation-error
    Then the system discards the signal locally
    And the system does not retry it
    And the system does not affect playback

  Scenario: Station-path failures report through the shared correlation id with no phrase PII
    Given a station-path failure occurs
    When the failure is reported
    Then the system reports the failure through the shared observability correlation id
    And the system does not log phrase content as PII beyond policy
