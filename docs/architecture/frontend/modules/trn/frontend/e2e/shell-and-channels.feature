Feature: Shell registration and input channels
  As the caregiver web Shell and (optionally) a Patient-Mode host
  I want TRN mounted as one Training destination with a caregiver bearer and an optional gesture seam
  So that the module composes cleanly and every channel resolves to one node model
  Covers: SPEC-06 (descriptor, egress, intent seam), SPEC-04 (endpoints as published, bearer, adapter default)

  Background:
    Given the caregiver web Shell registering @neuroassist/trn

  Scenario: TRN registers a single Training destination in the caregiver web Shell under the caregiver identity
    When the Shell registers the TRN module descriptor
    Then the system registers a single Training destination under the caregiver identity

  Scenario: TRN egress attaches the caregiver bearer and never a patient-session token
    When TRN makes a call to a /trn endpoint
    Then the system attaches the caregiver bearer on egress
    And the system attaches a patient-session token in no case

  Scenario: The no-op navigation-intent port lets the assent surface touch and switch-scan work without a host
    Given no host override of the navigation-intent port
    When the assent surface is used by touch and switch-scan
    Then the system uses the no-op navigation-intent port
    And touch and switch-scan navigation work without a host

  Scenario: A host-wired GEST-fed port routes a gesture intent onto the same selected-node model
    Given a Patient-Mode host wiring the GEST-fed navigation-intent port
    When GEST pushes a gesture intent
    Then the system routes the gesture intent onto the same selected-node model as touch and switch-scan

  Scenario: A gesture intent targeting an absent or unauthorized node is ignored leaving touch and switch-scan unaffected
    Given the host-wired navigation-intent port
    When a gesture intent targets an absent or unauthorized node
    Then the system ignores the gesture intent
    And touch and switch-scan navigation stay unaffected

  Scenario: TRN consumes the trn-service endpoints as published under base access-http-base without an invented URL
    When TRN binds its data-access ports
    Then the system consumes the trn-service endpoints as published under the access-http-base
    And the system invents no URL and uses no /api/v1

  Scenario: Published trn-service binds the HTTP adapter as the default and maps responses through the wire mappers
    Given trn-service is specified
    When provideTrn resolves the default adapter
    Then the system binds the HTTP adapter as the default
    And the system maps responses through the wire mappers
