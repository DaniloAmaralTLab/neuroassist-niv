Feature: Input-channel-agnostic navigation
  As a patient who controls different input channels at different times
  I want touch, gesture and switch-scan to reach the same selected node
  So that no channel is privileged and gesture never needs a network call
  Covers: SPEC-03 (every channel resolves to the same selected node, no bypass of the dual-authorization
          filter), SPEC-06 (no-op default so touch and scan work, host wires the GEST-fed port, an
          absent/unauthorized gesture intent is ignored)

  Background:
    Given a patient on /patient/converse with a cached speech-tree bundle

  Scenario: Every channel resolves to the same selected node without bypassing the dual-authorization filter
    When the patient selects a phrase by touch, by a gesture intent, and by a switch-scan confirm
    Then the system resolves every channel to the same selected node
    And the system does not let any channel bypass the dual-authorization filter

  Scenario: The no-op navigation-intent port default lets touch and switch-scan work without a host
    Given no Patient-Mode host has overridden the navigation-intent port
    When the patient navigates by touch and by switch-scan
    Then the system defaults the navigation-intent port to a no-op
    And touch and switch-scan navigation still work

  Scenario: The host-wired GEST-fed port routes a gesture intent onto the same selected-node model
    Given the Patient-Mode host wires the navigation-intent port with the GEST-fed implementation
    When GEST pushes a gesture intent in-process
    Then the system routes the gesture intent onto the same selected-node model as touch and switch-scan

  Scenario: A gesture intent targeting an absent or unauthorized node is ignored
    Given the Patient-Mode host wires the navigation-intent port with the GEST-fed implementation
    When a gesture intent targets a node absent or not authorized at the current level
    Then the system ignores the gesture intent
    And the system leaves touch and switch-scan navigation unaffected
