Feature: Navigate the speech tree and speak offline
  As a patient on the station in Patient Mode
  I want to navigate the cached speech tree and play a phrase with no network
  So that I can speak in my own voice even when conv-service is unreachable
  Covers: SPEC-01 (navigate to /patient/converse renders the navigator), SPEC-03 (dual-authorization
          phrase/category render), SPEC-04 (navigation and playback served from cache, zero network)

  Background:
    Given a station with a valid patient-session carrying conv.tree.read
    And a published speech-tree bundle and its audio already cached on the station

  Scenario: Navigating to the converse route renders the speech-tree navigator
    When a station with conv.tree.read navigates to /patient/converse
    Then the system renders the speech-tree navigator

  Scenario: Navigation and playback are served entirely from the local cache with zero network
    Given the station network is off
    When the patient navigates a category and plays a phrase
    Then navigation and playback are served entirely from the local cache
    And the patient's navigation and playback path issues zero network calls

  Scenario: Only dual-authorized phrases render while categories always render
    When the active level renders its nodes
    Then a phrase node renders only when it is dual-authorized in English
    And a category node always renders
