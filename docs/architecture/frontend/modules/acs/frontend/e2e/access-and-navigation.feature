Feature: ACS access, routing and shell integration
  As the ACS module inside the caregiver shell
  I want routing, guards, data access and shell integration to behave correctly
  So that access decisions, lazy loading and error surfaces are reliable

  Scenario: When a caregiver navigates to the access root the system redirects to the caregivers route
    Given a signed-in caregiver
    When the caregiver navigates to the access root
    Then the system redirects to the caregivers route

  Scenario: When the session is absent on an access route the system redirects to login and does not render any access surface
    Given the session is absent
    When the caregiver navigates to an access route
    Then the system redirects to the login route
    And the system does not render any access surface

  Scenario: When canManageAccessGuard denies the access route the system redirects to forbidden and does not load the feature component
    Given a signed-in caregiver without access management authority
    When canManageAccessGuard denies the caregivers or patient-sessions route
    Then the system redirects to the forbidden route
    And the system does not load the feature component

  Scenario: The system loads every ACS feature route lazily via loadComponent and does not eager-bundle a feature library
    Given a signed-in caregiver on the shell
    When the shell renders before an ACS feature is visited
    Then the system loads each ACS feature route lazily via loadComponent
    And the system does not eager-bundle any feature library into the shell

  Scenario: The system routes every ACS request through the shared access-http-base and no component calls HttpClient
    Given a signed-in caregiver performing an ACS action
    When the ACS data access service issues a request
    Then the system routes the request through the shared access-http-base
    And no component calls HttpClient directly

  Scenario: The system defaults the ACS data adapter to http and uses the mock adapter only under an explicit mock provider
    Given the ACS providers are configured
    When the module boots
    Then the system defaults the ACS data adapter to http
    And the system uses the mock adapter only under an explicit mock provider

  Scenario: The system evaluates every ACS action through AccessDecision can and does not evaluate a role inline in a component
    Given a signed-in caregiver on an ACS surface
    When an ACS action visibility is computed
    Then the system evaluates the action through AccessDecision can authority
    And the system does not evaluate a role inline in a component

  Scenario: When the shell boots the system registers the ACS descriptor and exposes the access menu section without eager-loading feature libraries
    Given the shell is booting
    When the shell reads the module descriptors
    Then the system registers the ACS descriptor
    And the system exposes the access menu section from the fallback descriptor without eager-loading ACS feature libraries

  Scenario: When ACS init runs the system registers the ACS breadcrumbs with the shell navigation service
    Given the ACS module initializes
    When ACS init runs
    Then the system registers the ACS breadcrumbs with the shell navigation service

  Scenario: When ACS destroy runs the system unregisters its breadcrumbs and clears module-local facade signals
    Given the ACS module is active
    When ACS destroy runs
    Then the system unregisters the ACS breadcrumbs
    And the system clears the module-local facade signals

  Scenario: When a provision revoke or register action completes the system forwards the action to observability and does not call console log
    Given a signed-in caregiver completes an ACS action
    When a provision revoke or register action completes
    Then the system forwards the action to observability
    And the system does not call console log

  Scenario: When the backend responds forbidden the system shows a toast and does not reveal whether the target resource exists
    Given a signed-in caregiver performing an ACS action
    When the backend responds forbidden
    Then the system shows a toast
    And the system does not reveal whether the target resource exists

  Scenario: When the backend responds not-found the system shows a toast and does not remove the row optimistically
    Given a signed-in caregiver viewing an ACS row
    When the backend responds not-found
    Then the system shows a toast
    And the system does not remove the row optimistically

  Scenario: When the backend responds unauthenticated the system redirects to the login route
    Given a signed-in caregiver whose token is blacklisted
    When the backend responds unauthenticated
    Then the system redirects to the login route

  Scenario: The system preserves the backend detail and correlationId in every surfaced ACS error and does not display a raw HTTP response body
    Given a signed-in caregiver performing an ACS action
    When the backend returns a problem detail error
    Then the system preserves the backend detail and correlationId in the surfaced ACS error
    And the system does not display a raw HTTP response body

  Scenario: While not on the admin host the system contributes only the caregivers and patient-sessions destinations and does not emit the ops entry
    Given a signed-in caregiver not on the admin host
    When ACS contributes its navigation destinations
    Then the system contributes only the caregivers and patient-sessions destinations
    And the system does not emit the ops breadcrumb or menu entry

  Scenario: While a BE wire record omits an optional field the system models it as explicitly absent and does not fabricate a placeholder value
    Given a BE wire record omits an optional field
    When the facade maps the wire record to the view model
    Then the system models the field as explicitly absent
    And the system does not fabricate a placeholder value
