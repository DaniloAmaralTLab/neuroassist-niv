Feature: Alarm delivery safety (polling, visibility and connectivity)
  As a family caregiver
  I want the dashboard to be honest about when it can and cannot receive an emergency
  So that I am never given a false "all clear" and I know to keep the window in front

  Background:
    Given a signed-in caregiver with authority "evnt.event.read"
    And the caregiver is linked to a patient of the active tenant

  Scenario: The system polls the active-alarm endpoint at the server-advertised poll interval
    Given the active-alarm response advertises a poll interval
    When the dashboard polls the active-alarm endpoint
    Then the system polls at the server-advertised poll interval
    And the system does not hardcode the poll cadence

  Scenario: The system renders the active alarm from the server projection and does not infer it from a timer
    When the dashboard reads the active-alarm projection
    Then the system renders the active alarm from the server projection
    And the system does not infer an emergency from a client-side timer

  Scenario: While foregrounded and online the system treats the five-second budget as applicable
    Given the tab is foregrounded and online
    When the dashboard polls the active-alarm endpoint
    Then the system treats the five-second commit-to-visibility budget as applicable

  Scenario: While the tab is hidden the system marks monitoring as degraded and does not claim the five-second budget
    Given the tab becomes hidden
    When the caregiver views the dashboard
    Then the system marks monitoring as degraded
    And the system shows the visible monitoring-limitation banner
    And the system does not claim the five-second budget while hidden

  Scenario: When the tab becomes visible the system issues an immediate active-alarm poll
    Given the tab was hidden
    When the tab becomes visible
    Then the system issues an immediate active-alarm poll
    And the system does not wait a full interval to re-learn the alarm state

  Scenario: When connectivity returns the system issues an immediate active-alarm poll and resumes the cadence
    Given the client was offline
    When connectivity returns
    Then the system issues an immediate active-alarm poll
    And the system resumes the normal cadence

  Scenario: If an active-alarm read fails the system holds the last known alarm state and does not display no active emergency
    Given an active emergency was last known to be active
    When the active-alarm read fails
    Then the system holds the last known alarm state
    And the system does not display "no active emergency"

  Scenario: While offline the system shows the offline limitation banner and does not render a no-active-emergency all-clear
    Given the client is offline
    When the caregiver views the dashboard
    Then the system shows the visible offline limitation banner
    And the system does not render a no-active-emergency all-clear

  Scenario: While successful polls stop advancing the system marks monitoring as stale
    Given successful polls stop advancing or the server time skews beyond the interval
    When the caregiver views the dashboard
    Then the system marks monitoring as stale
    And the system shows the stale banner

  Scenario: Where the alarm-notification flag is on and permission is granted the system raises a best-effort background notification
    Given the "evnt.alarm-notification" flag is on
    And the user has granted notification permission
    And the tab is backgrounded
    When the dashboard first observes an emergency
    Then the system raises a best-effort background notification
    And the system does not claim it as a guaranteed delivery channel
