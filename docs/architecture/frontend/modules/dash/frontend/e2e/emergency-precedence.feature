Feature: Emergency precedence belongs to EVNT
  As a caregiver
  I want a real emergency to take over the whole screen through EVNT
  So that DASH can never fake, delay, suppress or outrank it
  Covers: SPEC-07 (INV-3 emergency never faked, never hidden)

  Background:
    Given a caregiver on the home overview with a linked patient

  Scenario: DASH defers to the EVNT emergency takeover without styling or suppressing it
    Given EVNT signals an unconfirmed emergency
    When the home overview is active
    Then the EVNT full-screen emergency takeover renders above DASH
    And DASH applies no emergency styling of its own
    And DASH does not suppress or outrank the takeover
