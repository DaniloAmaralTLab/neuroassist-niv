Feature: Fail-safe composite status and per-source freshness
  As a caregiver who must know "is my patient OK?" in under two seconds
  I want the headline green only when every source is verified and fresh
  So that a monitoring outage can never masquerade as "all clear"
  Covers: SPEC-03 (headline, em-dash KPI), SPEC-04 (freshness per source)

  Background:
    Given a caregiver on the home overview with a linked patient

  Scenario: A loading source holds the headline and never shows all clear
    Given at least one composed source is still loading
    Then the composite headline stays in loading
    And the headline does not show all clear

  Scenario: All clear only when every source is ok and fresh
    Given every composed source is ok and within its freshness window
    And none of the sources signals a problem
    Then the composite headline shows all clear
    And the headline reads that the patient is OK

  Scenario: A failed KPI renders an em dash, never zero
    Given the KPI source is not ok
    Then the day KPI renders an em dash
    And the KPI never renders as zero

  Scenario: EVNT alarm source fresh within twice the poll interval
    Given the EVNT monitoring poll is live
    And the last poll is within twice the server-advertised poll interval
    Then the alarm source is treated as fresh

  Scenario: Stale EVNT alarm poll degrades the headline
    Given the EVNT alarm poll is offline beyond twice the server-advertised poll interval
    Then the alarm source is marked stale
    And the composite headline degrades

  Scenario: HIST summary older than sixty seconds is stale
    Given the HIST summary read is older than the sixty-second summary freshness window
    Then the history source is marked stale
    And the composite headline degrades

  Scenario Outline: EDGE heartbeat older than sixty seconds marks the device stale
    Given the composed source "<source>" is in freshness state "<health>"
    When the composite status is derived
    Then the device source reflects "<health>"
    And the composite headline resolves to "<headline>"
    And the headline does not show all clear while the source is "<health>"

    Examples:
      | source | health | headline |
      | edge   | stale  | degraded |
      | edge   | error  | degraded |
      | hist   | stale  | degraded |
      | evnt   | stale  | degraded |
      | pat    | empty  | degraded |
