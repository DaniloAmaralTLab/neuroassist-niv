Feature: Caregiver read-only patient history timeline
  As a family caregiver
  I want to review my patient's events by period in plain language
  So that I can trust what happened, when, and whether it was attended

  Background:
    Given a signed-in caregiver with authority "hist.history.read"
    And the caregiver is linked to a patient of the active tenant

  Scenario: When the caregiver opens history the system reads the timeline under hist.history.read without polling
    When the caregiver opens the "/history" route
    Then the system reads "GET /hist/patients/{patientId}/history" under authority "hist.history.read"
    And the system renders the newest-first timeline for the resolved period window
    And the system does not poll the history on a timer

  Scenario: While the history read is in flight the system shows the loading skeleton
    When the caregiver opens the "/history" route and the history read is in flight
    Then the system renders the loading skeleton with reserved rows
    And the system does not render an empty-history message

  Scenario: When the period has no entries the system shows the empty state
    Given the history read succeeds and returns no entries for the period
    When the caregiver opens the "/history" route
    Then the system renders the empty state
    And the system does not fabricate a history entry

  Scenario: If the history read fails the system renders the error state and holds the last window as stale
    Given a history window was already loaded
    When the history read fails
    Then the system renders the error state with a degraded banner
    And the system holds the last known window marked stale
    And the system does not render a false no-history state

  Scenario: If a history read fails with a transport or 5xx error the system never shows a no-history all-clear
    Given a history window was already loaded
    When the history read fails with a transport or 5xx error
    Then the system shows the degraded history banner
    And the system holds the last known window marked stale
    And the system does not render a no-history all-clear

  Scenario: The period summary is derived from the loaded window and labeled when paginated
    Given the history read returns a page with a next cursor
    When the system renders the period summary
    Then the system derives the period summary from the loaded history window
    And the system labels the summary scope as loaded-entries because the period is paginated beyond the loaded window

  Scenario: Switching to a narrower period re-derives the timeline from memory without changing the record
    Given the month window is loaded in memory
    When the caregiver switches the period to a narrower window within the loaded window
    Then the system re-derives the timeline and the summary from the in-memory window
    And the system does not change the immutable record

  Scenario: Narrowing the period re-filters in memory without refetching the history
    Given the month window is loaded in memory
    When the caregiver narrows the period within the loaded window
    Then the system re-filters the timeline in memory
    And the system does not refetch the history

  Scenario: Reaching the list end loads the next page using the backend cursor
    Given the history read returns a page with a next cursor and more entries exist for the period
    When the caregiver reaches the list end
    Then the system requests the next page using the backend next cursor keyset
    And the system does not drop or re-order earlier entries

  Scenario: Requesting an explicit range sends both from and to bounds
    When the caregiver requests an explicit date range
    Then the system sends both the from bound and the to bound together
    And the system does not send only one bound

  Scenario: A successful delegated feedback write triggers a history refresh
    Given the caregiver has EVNT authority "evnt.event.record"
    And an event row shows the "Was it real?" affordance
    When the caregiver records feedback and the delegated EVNT write succeeds
    Then the system calls the history facade refresh to re-read its own history
    And the system does not patch the entry locally

  Scenario: A failed delegated feedback write surfaces the EVNT error without re-reading history
    Given the caregiver has EVNT authority "evnt.event.record"
    And an event row shows the "Was it real?" affordance
    When the caregiver records feedback and the delegated EVNT write fails
    Then the system surfaces the EVNT error path
    And the system does not re-read the history or claim the feedback outcome changed

  Scenario: While the session lacks the EVNT feedback authority the Was it real affordance is hidden
    Given the caregiver does not have EVNT authority "evnt.event.record"
    When the caregiver views an event row
    Then the system hides the delegated "Was it real?" feedback affordance on the event row

  Scenario: An invalid date range shows an inline range error from the backend detail
    When the caregiver submits a range with a from bound but no to bound
    And the backend responds "validation-error"
    Then the system shows an inline range error mapped from the backend detail
    And the system does not render fabricated history entries

  Scenario: When the backend returns a first-page period summary the system labels the summary scope as period
    Given the history read returns a first page with a whole-period summary
    When the system renders the period summary
    Then the system binds the period summary from the whole-period backend summary
    And the system labels the summary scope as period

  Scenario: An event entry shows the structured command label and urgency and falls back when absent
    Given the history read returns an event entry with a structured command label and urgency
    When the system renders the event entry
    Then the system shows the structured command label and urgency on the event entry
    And the system falls back to the title and detail when the command label is absent

  Scenario: The confirmation folds onto its event and the escalation channel and masked target render without unmasking
    Given the history read returns an event with a folded confirmation and an escalation entry
    When the system renders the timeline
    Then the system folds the confirmation onto its originating event using the backend related event join key
    And the system renders the escalation channel and masked target verbatim without unmasking
