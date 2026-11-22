Feature: Out-of-band escalation client (Web Push enrollment, channel status and escalation trail)
  As a family caregiver
  I want to be reached even when the dashboard is not in front of me
  So that an emergency escalates to Web Push, then SMS, then voice, and I can see honestly which channels protect me

  Background:
    Given a signed-in caregiver with authority "evnt.event.read"
    And the caregiver is linked to a patient of the active tenant
    And the app config provides a VAPID public key

  Scenario: Enabling alarm notifications subscribes and registers the Web Push subscription
    Given the caregiver has authority "evnt.subscription.create"
    And notification permission has not been decided
    When the caregiver enables alarm notifications through an explicit gesture
    And the caregiver grants notification permission
    Then the system subscribes with the config VAPID public key
    And the system registers the subscription under the authority "evnt.subscription.create"
    And the system marks the push channel as on

  Scenario: Re-registering the same browser subscription is idempotent
    Given notification permission is already granted
    And a push subscription already exists for this browser
    When the shell starts
    Then the system re-registers the existing subscription idempotently
    And the system does not create a duplicate active channel

  Scenario: The system does not request notification permission on first paint
    When the dashboard loads for the first time
    Then the system does not request notification permission on first paint
    And the system does not retry the permission request in a loop

  Scenario: Denying notification permission degrades the push channel visibly
    Given the caregiver has authority "evnt.subscription.create"
    When the caregiver enables alarm notifications through an explicit gesture
    And the caregiver denies notification permission
    Then the system marks the push channel off visibly
    And the system explains that SMS and voice still cover the caregiver
    And the system does not fabricate a push subscription

  Scenario: A gone subscription is resubscribed and re-registered without an error toast
    Given notification permission is granted
    And a push subscription is registered
    When the browser reports the subscription is gone
    Then the system resubscribes the browser
    And the system registers the new subscription
    And the system does not show a backend error toast

  Scenario: Turning the push channel off unsubscribes and deletes the subscription
    Given the caregiver has authority "evnt.subscription.delete"
    And a push subscription is registered
    When the caregiver turns the push channel off
    Then the system unsubscribes the browser locally
    And the system deletes the subscription under the authority "evnt.subscription.delete"

  Scenario: Clicking a push notification focuses the dashboard on the alarm and polls immediately
    Given a push notification for an active emergency was delivered
    When the caregiver clicks the push notification
    Then the system focuses the dashboard on "/alarm"
    And the system issues an immediate active-alarm poll
    And the system does not render an emergency from the push payload alone

  Scenario: While the caregiver phone is missing the phone channels show as contact-missing
    Given the caregiver phone is not exposed by the access service
    When the caregiver views the escalation channel status
    Then the system shows the SMS and voice channels as contact-missing
    And the system does not present the SMS and voice channels as covered

  Scenario: The escalation-attempts trail is read under its authority with masked destinations
    Given the caregiver has authority "evnt.escalation.read"
    And an emergency event has recorded escalation attempts
    When the caregiver opens the escalation-attempts view for the emergency
    Then the system reads the escalation attempts under the authority "evnt.escalation.read"
    And the system renders each attempt with its destination masked
    And the system does not unmask or enrich the masked destination

  Scenario: Without the subscription authority the enable-push affordance is hidden
    Given the session lacks authority "evnt.subscription.create"
    When the caregiver views the escalation channel status
    Then the system hides the enable-push affordance

  Scenario: Without the escalation-read authority the escalation trail is hidden
    Given the session lacks authority "evnt.escalation.read"
    When the caregiver views the alarm detail
    Then the system hides the escalation-attempts trail

  Scenario: The system uses the subscription and escalation authorities authority-constants-exact and does not rename them
    Given the backend authority constants "evnt.subscription.create", "evnt.subscription.delete" and "evnt.escalation.read"
    When the system evaluates the escalation channel affordances
    Then the system uses the subscription and escalation authorities exactly as the backend authority constants
    And the system does not rename the authorities
