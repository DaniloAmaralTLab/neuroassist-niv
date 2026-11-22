Feature: Assistant dialog produces draft proposals
# SPEC-02; integration-contracts §1 (Anthropic LLM). LLM output is untrusted data (INV-TRN-2, INV-TRN-7).

Background:
  Given a caregiver authenticated for tenant t_alpha
  And an open training session s-1 for patient p-100

Scenario: A dialog turn creates a proposed phrase
  When the caregiver submits a dialog turn asking for a suction request phrase
  Then a proposal is created in state proposed
  And the LLM received only patientId draft text and the caregiver prompt
  And no patient name or PHI was sent to the LLM

Scenario: Model output cannot cross the approved gate
  Given the LLM response attempts to set state approved and trigger a publish
  When the caregiver submits that dialog turn
  Then the proposal state is at most proposed
  And no publication is started
  And no authority is granted from the model output

Scenario: Raw transcript is not retained
  When the caregiver submits a dialog turn
  Then only the minimal draft content is persisted
  And no raw LLM transcript is stored

Scenario: LLM provider down keeps the session resumable
  Given the Anthropic provider is unavailable
  When the caregiver submits a dialog turn
  Then the response status is 503
  And the problem type is llm-unavailable
  And no proposal is created
  And the session remains usable

Scenario Outline: Only draft and proposed are reachable by the assistant
  When the assistant attempts to move a proposal to <target_state>
  Then the attempt is rejected unless <target_state> is draft or proposed

  Examples:
    | target_state      |
    | draft             |
    | proposed          |
    | approved          |
    | synthesizing      |
    | published         |
