Feature: Training session and LLM states
  As a caregiver
  I want to open a training session and converse with the assistant
  So that proposals are created honestly and drafts are never lost
  Covers: SPEC-01 (render the training surface), SPEC-03 (responding/no fabricated proposal,
          ended-pending drafts, server-authoritative state), SPEC-07 (503 llm-unavailable)

  Background:
    Given a caregiver with a valid caregiver session carrying the trn authorities

  Scenario: Navigating to training renders the training-session authoring surface
    When the caregiver navigates to /training
    Then the system renders the training-session authoring surface
    And the system shows the "Training — not the patient app" badge

  Scenario: A dialog turn in flight shows the responding state and renders no fabricated proposal
    Given an open training session
    When the caregiver submits a dialog turn and the response is still in flight
    Then the system shows the responding state
    And the system renders no fabricated proposal

  Scenario: An llm-unavailable dialog turn shows assistant-unavailable with retry and preserves drafts
    Given an open training session with existing draft proposals
    When POST /trn/sessions/{sessionId}/dialog responds 503 llm-unavailable
    Then the system shows the assistant-unavailable error with a retry
    And the system preserves the existing drafts
    And the system renders no fabricated proposal

  Scenario: Ending a session with pending proposals persists them as ended-pending without discard
    Given an open training session with pending draft proposals
    When the caregiver ends the session
    Then the system persists the pending proposals as ended-pending
    And the system discards no pending proposal

  Scenario: Proposal state and dual-authorization are derived only from trn-service never a single side
    Given a proposal with only the caregiver half recorded
    When the training surface renders the proposal
    Then the system derives the proposal state and dual-authorization only from trn-service
    And the system marks no node published from a single confirmation side
