Feature: HIST access control, data-access contract and error mapping
  As the NeuroAssist platform
  I want HIST to be read-only, correctly scoped and honestly surfaced
  So that the immutable history can be read but never rewritten or leaked

  Scenario: Reaching the history route without a session redirects to login
    Given there is no authenticated session
    When the "/history" route is reached without an authenticated session
    Then the system redirects to the login route
    And the system does not reveal patient history

  Scenario: Without the history read authority the history route is denied by the guard
    Given a signed-in caregiver without authority "hist.history.read"
    When the caregiver navigates to the "/history" route
    Then the system denies the route through the canReadHistoryGuard
    And the system does not render the history timeline

  Scenario: Opening an unlinked patient's history returns forbidden and renders no entry
    Given a signed-in caregiver with authority "hist.history.read"
    And the caregiver is not linked to the requested patient
    When the caregiver opens that patient's history
    Then the system surfaces the backend forbidden outcome
    And the system does not render any history entry

  Scenario: The history module exposes no write route
    Given a signed-in caregiver with authority "hist.history.read"
    When the caregiver inspects the routes contributed by the history module
    Then the system exposes no create, edit or delete route under "/history"
    And the system contributes no write route for feedback

  Scenario: Every history read goes through the access-http-base at the hist gateway prefix
    Given a signed-in caregiver with authority "hist.history.read"
    When the system reads the patient history
    Then the system routes the read through the shared access-http-base based at "${ACCESS_HTTP_BASE}/hist"
    And the system does not call HttpClient from a component

  Scenario: The history data adapter defaults to http
    Given the history module is provided with its default adapter
    Then the system defaults the history data adapter to "http"
    And the system uses the mock adapter only under an explicit mock provider

  Scenario: The history port binds zero write methods
    When the system inspects the history port and adapter
    Then the system binds zero write methods in the history port and adapter
    And the system exposes no POST, PUT, PATCH or DELETE operation on hist-service

  Scenario: The tenant scope is derived from the JWT claim and never sent as a parameter
    Given a signed-in caregiver with authority "hist.history.read"
    When the system reads the patient history
    Then the system derives the tenant scope from the JWT claim
    And the system does not send the tenant as a path or query parameter

  Scenario: Without the history read authority the history surface and menu entry are hidden
    Given a signed-in caregiver without authority "hist.history.read"
    When the shell renders the navigation and care section
    Then the system hides the history surface, its menu entry and the escalation and detection-lapse trail section

  Scenario: Access decisions go through AccessDecisionService and never a hardcoded guard
    Given a signed-in caregiver with authority "hist.history.read"
    When the system evaluates a HIST access decision
    Then the system evaluates the decision through AccessDecisionService can
    And the system does not evaluate a role inline in a component or return a hardcoded true from a guard

  Scenario: The history module binds zero write endpoints and delegates feedback to EVNT
    When the system inspects the history module write surface
    Then the system binds zero write endpoints in the history module
    And the system delegates the feedback write to the EVNT "evnt.event.record" port

  Scenario: The history authority is used exactly and never renamed to view `hist-authority-exact`
    When the system registers the HIST permission map
    Then the system uses the authority "hist.history.read" exactly as the backend authority constant
    And the system does not rename it to "hist.history.view"

  Scenario: The operator audit-read authority stays out of the caregiver map `hist-audit-read-operator-only`
    When the system registers the HIST permission map
    Then the system keeps the operator authority "hist.audit.read" out of the caregiver permission map
    And the system does not gate the caregiver escalation trail behind it

  Scenario: While the audit-console flag is off no operator audit console ships
    Given the feature flag "hist.audit-console" is off
    When the caregiver uses the dashboard
    Then the system ships no operator audit-console route or surface
    And the system does not call "GET /hist/audit" from the caregiver UI

  Scenario: The caregiver map must treat hist producer and erasure authorities as operator only
    Given the HIST permission map is loaded
    Then the system shall treat hist audit record and hist erasure create as service-client or operator authorities only
    And the system excludes those hist authorities from the caregiver permission map and every caregiver guard

  Scenario: An unauthorized response redirects to the login route
    Given a signed-in caregiver with authority "hist.history.read"
    When the backend responds "unauthorized" on a history read
    Then the system redirects to the login route

  Scenario: A forbidden history read shows the no-access state without disclosing existence
    Given a signed-in caregiver with authority "hist.history.read"
    When the backend responds "forbidden" on a history read
    Then the system shows the no-access history state
    And the system does not disclose whether the patient exists for another tenant

  Scenario: Every history error is mapped by its type slug preserving detail and correlation id
    Given a signed-in caregiver with authority "hist.history.read"
    When the backend returns a problem detail on a history read
    Then the system maps the history error by its type slug
    And the system preserves the backend detail and correlationId
    And the system does not display a raw HTTP response body
