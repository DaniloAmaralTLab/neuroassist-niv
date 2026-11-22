Feature: Caregiver guard, RBAC and caregiver-path errors
  As the platform
  I want every TRN surface gated by the real caregiver session and the twelve authorities
  So that no patient-session route exists and no affordance leaks beyond its authority
  Covers: SPEC-01 (guard, routes), SPEC-05 (authorities, vendor, map, guard),
          SPEC-07 (401, 403, 404 patient-not-found)

  Background:
    Given the caregiver web Shell mounting @neuroassist/trn

  Scenario: The caregiver authoring guard redirects to sign-in when there is no caregiver session rendering no authoring surface
    Given no active caregiver session
    When a TRN route is activated
    Then the system redirects to the caregiver sign-in surface
    And the system renders no authoring surface

  Scenario: The caregiver authoring guard decides from the real caregiver session and never a hardcoded true
    Given a valid caregiver session
    When the caregiver authoring guard evaluates a TRN route
    Then the system decides from the real caregiver session
    And the guard returns a hardcoded true in no case

  Scenario: TRN registers exactly the two caregiver routes and no patient-session route or confirm-training route
    When the TRN routes are registered
    Then the system registers exactly the two caregiver routes /training and /training/assent
    And the system registers no patient-session route or confirm-training route

  Scenario: Lacking trn.proposal.approve disables the approve and capture-patient-assent affordances
    Given a caregiver session lacking trn.proposal.approve
    When the proposal actions are rendered
    Then the system disables the approve affordance
    And the system disables the capture-patient-assent affordance

  Scenario: Lacking trn.publication.create hides the publish affordance
    Given a caregiver session lacking trn.publication.create
    When the proposal actions are rendered
    Then the system hides the publish affordance

  Scenario: The permission map holds only the twelve caregiver authorities and no trn.proposal.confirm
    When the TRN permission map is built
    Then the permission map holds only the twelve caregiver authorities
    And the map introduces no trn.proposal.confirm or patient-session authority

  Scenario: The TRN UI exposes no vendor affordance for Claude or ElevenLabs
    When the training surface is rendered
    Then the system exposes no vendor affordance for Claude or ElevenLabs

  Scenario: A 401 unauthenticated call routes to the session-ended surface without retrying the revoked token
    Given an active TRN surface
    When a TRN call responds 401 unauthenticated
    Then the system routes to the caregiver session-ended surface
    And the system retries the revoked token in no case

  Scenario: A 403 forbidden call disables the affordance with a missing-permission message without fabricating a result
    Given an active TRN surface
    When a TRN call responds 403 forbidden
    Then the system disables the affordance with a missing-permission message
    And the system fabricates a result in no case

  Scenario: A 404 patient-not-found on session creation shows the banner and creates no session
    Given a caregiver opening a session for an unknown patient
    When POST /trn/sessions responds 404 patient-not-found
    Then the system shows the patient-not-found banner
    And the system creates no session
