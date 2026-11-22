package com.neuroassist.evnt.bdd.steps;

import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

/**
 * Step definitions -- Detection-lapse alerting: EDGE service-client raise/resolve, caregiver
 * list/acknowledge, escalation reuse, emergency precedence (SAFETY-GEST-1). Feature:
 * detection-lapse-alerting.feature
 *
 * <p>Covers: SPEC-12 (LAPSE-1..LAPSE-7), ADR-006, api-contract §10–12, data-model §2.3.1/§2.4.
 *
 * <p>Steps already defined in other *Steps classes and NOT duplicated here:
 *
 * <ul>
 *   <li>SharedSteps: caregiver token linked to patient, response status, generic audit assertion,
 *       problem type
 *   <li>OutOfBandEscalationSteps: caregiver linked to patient in tenant, escalation timings,
 *       caregiver has push subscription, caregiver has phone from ACS, escalation sweep runs,
 *       escalation sweep runs at {string} s
 * </ul>
 *
 * <p>Duplicate step count across all *Steps classes: 0.
 */
public class DetectionLapseAlertingSteps {

    // ── Background ────────────────────────────────────────────────────────────

    @Given("a tenant {string} with patient {string} on device {string}")
    public void givenATenantWithPatientOnDevice(
            String tenantId, String patientId, String deviceId) {
        // TODO[SCAFFOLD]: create tenant + patient + edge-device fixture in DB / mock context
        throw new io.cucumber.java.PendingException();
    }

    @And("EDGE holds an {string} service-client token for the EVNT detection-lapse authorities")
    public void andEdgeHoldsServiceClientToken(String principal) {
        // TODO[SCAFFOLD]: mint ACS service-client JWT for principal "edge-service" with
        // evnt.detection-lapse.create + evnt.detection-lapse.resolve authorities
        throw new io.cucumber.java.PendingException();
    }

    // ── Raise ─────────────────────────────────────────────────────────────────

    @When(
            "EDGE raises a detection lapse for device {string} patient {string} cause {string} with idempotency key {string}")
    public void whenEdgeRaisesDetectionLapse(
            String deviceId, String patientId, String cause, String idempotencyKey) {
        // TODO[SCAFFOLD]: POST /evnt/detection-lapses with service-client JWT, Idempotency-Key
        // header,
        // and body {deviceId, patientId, tenantId, cause, lapseStartedAt=now}
        throw new io.cucumber.java.PendingException();
    }

    @Then("the detection lapse {string} is persisted with status {string}")
    public void thenDetectionLapsePersistedWithStatus(String idempotencyKey, String status) {
        // TODO[SCAFFOLD]: assert detection_lapse row exists for the episode key with given status
        throw new io.cucumber.java.PendingException();
    }

    // ── Lapse-specific audit assertion (distinct from SharedSteps#andAnAuditIsRecorded) ─────

    @And("a {string} audit is recorded for the lapse {string}")
    public void andAnAuditIsRecordedForTheLapse(String auditType, String idempotencyKey) {
        // TODO[SCAFFOLD]: assert HIST audit published with action=auditType and lapseId matching
        // episode
        // (LAPSE-7: DetectionLapseRaised / DetectionLapseResolved / DetectionLapseAcknowledged)
        throw new io.cucumber.java.PendingException();
    }

    // ── Open-lapse fixture ────────────────────────────────────────────────────

    @And("a detection lapse {string} for patient {string} is open")
    public void andDetectionLapseIsOpen(String idempotencyKey, String patientId) {
        // TODO[SCAFFOLD]: insert open detection_lapse row (resolved_at IS NULL, acknowledged_at IS
        // NULL)
        throw new io.cucumber.java.PendingException();
    }

    // ── Lapse-specific escalation attempt assertion ───────────────────────────

    @Then(
            "a Tier {int} {string} attempt to {string} is recorded for lapse {string} with status {string}")
    public void thenTierAttemptForLapseWithStatus(
            int tier, String channel, String target, String idempotencyKey, String status) {
        // TODO[SCAFFOLD]: assert escalation_attempt row for (lapse_id, tier, channel, target,
        // status)
        throw new io.cucumber.java.PendingException();
    }

    // ── Lapse-specific escalation audit assertion ─────────────────────────────

    @And("an {string} audit is recorded for lapse {string} tier {string}")
    public void andEscalationAuditForLapseTier(
            String auditType, String idempotencyKey, String tier) {
        // TODO[SCAFFOLD]: assert HIST EscalationAttempted audit with lapseId + tier (ESC-7 /
        // LAPSE-7)
        throw new io.cucumber.java.PendingException();
    }

    // ── Open-for-elapsed fixture ──────────────────────────────────────────────

    @And("a detection lapse {string} for patient {string} has been open for {string} s")
    public void andDetectionLapseOpenForElapsed(
            String idempotencyKey, String patientId, String elapsedS) {
        // TODO[SCAFFOLD]: insert open detection_lapse with lapse_started_at = now - elapsedS
        throw new io.cucumber.java.PendingException();
    }

    // ── Resolve as fixture (pre-condition) ────────────────────────────────────

    @And("EDGE resolves the detection lapse {string} on the first {string} heartbeat")
    public void andEdgeResolvesDetectionLapse(String idempotencyKey, String heartbeatState) {
        // TODO[SCAFFOLD]: POST /evnt/detection-lapses/{lapseId}/resolution with service-client JWT
        // (or set resolved_at directly in DB for the fixture variant)
        throw new io.cucumber.java.PendingException();
    }

    // ── No-attempt assertion for lapse ────────────────────────────────────────

    @Then("no Tier {int} {string} attempt is recorded for lapse {string}")
    public void thenNoTierAttemptForLapse(int tier, String channel, String idempotencyKey) {
        // TODO[SCAFFOLD]: assert no escalation_attempt row exists for (lapse_id, tier, channel)
        throw new io.cucumber.java.PendingException();
    }

    // ── Acknowledge as fixture (pre-condition) ────────────────────────────────

    @And("caregiver {string} acknowledges the detection lapse {string}")
    public void andCaregiverAcknowledgesDetectionLapse(String caregiverId, String idempotencyKey) {
        // TODO[SCAFFOLD]: POST /evnt/detection-lapses/{lapseId}/confirmation with caregiver JWT
        // (or set acknowledged_at/acknowledged_by directly in DB for the fixture variant)
        throw new io.cucumber.java.PendingException();
    }

    // ── Resolved-lapse fixture ────────────────────────────────────────────────

    @Given("a detection lapse {string} for patient {string} is resolved")
    public void givenDetectionLapseIsResolved(String idempotencyKey, String patientId) {
        // TODO[SCAFFOLD]: insert resolved detection_lapse row (resolved_at = now)
        throw new io.cucumber.java.PendingException();
    }

    // ── Existing-lapse replay assertions ──────────────────────────────────────

    @Then("the existing detection lapse {string} is returned with status {string}")
    public void thenExistingDetectionLapseReturnedWithStatus(String idempotencyKey, String status) {
        // TODO[SCAFFOLD]: assert 200 response body matches existing lapse with given status
        // (LAPSE-2)
        throw new io.cucumber.java.PendingException();
    }

    @And("no new escalation tier is started for lapse {string}")
    public void andNoNewEscalationTierForLapse(String idempotencyKey) {
        // TODO[SCAFFOLD]: assert no new escalation_attempt rows were inserted for this lapse
        // episode
        throw new io.cucumber.java.PendingException();
    }

    // ── Resolve as HTTP action (unknown lapse) ────────────────────────────────

    @When("EDGE resolves the detection lapse {string}")
    public void whenEdgeResolvesDetectionLapse(String lapseId) {
        // TODO[SCAFFOLD]: POST /evnt/detection-lapses/{lapseId}/resolution with service-client JWT
        throw new io.cucumber.java.PendingException();
    }

    @Then("the resolve is rejected with status {string}")
    public void thenResolveRejectedWithStatus(String httpStatus) {
        // TODO[SCAFFOLD]: assert HTTP response status equals httpStatus (e.g. "404")
        throw new io.cucumber.java.PendingException();
    }

    // ── Emergency precedence ──────────────────────────────────────────────────

    @And("patient {string} has an unconfirmed emergency event {string}")
    public void andPatientHasUnconfirmedEmergencyEvent(String patientId, String eventId) {
        // TODO[SCAFFOLD]: insert unconfirmed emergency Event row for patient (confirmed_at IS NULL)
        throw new io.cucumber.java.PendingException();
    }

    @Then("no new detection-lapse tier is started for patient {string}")
    public void thenNoNewDetectionLapseTierForPatient(String patientId) {
        // TODO[SCAFFOLD]: assert no new escalation_attempt rows were inserted for any lapse of
        // patientId
        // during this sweep (LAPSE-6: emergency outranks)
        throw new io.cucumber.java.PendingException();
    }

    @And("the lapse {string} is not surfaced as an emergency")
    public void andLapseNotSurfacedAsEmergency(String idempotencyKey) {
        // TODO[SCAFFOLD]: assert active-alarm endpoint does NOT include any lapse data
        // (LAPSE-3/LAPSE-6)
        throw new io.cucumber.java.PendingException();
    }

    // ── Station-token rejection ───────────────────────────────────────────────

    @When("a station presents an {string} token to raise a detection lapse")
    public void whenStationPresentsTokenToRaiseLapse(String tokenType) {
        // TODO[SCAFFOLD]: POST /evnt/detection-lapses with an edge.device station token (not
        // service-client)
        throw new io.cucumber.java.PendingException();
    }

    @Then("the raise is rejected with status {string}")
    public void thenRaiseRejectedWithStatus(String httpStatus) {
        // TODO[SCAFFOLD]: assert HTTP response status equals httpStatus (e.g. "401")
        throw new io.cucumber.java.PendingException();
    }

    // ── Caregiver list ────────────────────────────────────────────────────────

    @When("caregiver {string} lists detection lapses for patient {string}")
    public void whenCaregiverListsDetectionLapses(String caregiverId, String patientId) {
        // TODO[SCAFFOLD]: GET /evnt/patients/{patientId}/detection-lapses with caregiver JWT for
        // caregiverId
        throw new io.cucumber.java.PendingException();
    }

    @Then("the detection lapse {string} is returned on the list")
    public void thenDetectionLapseReturnedOnList(String idempotencyKey) {
        // TODO[SCAFFOLD]: assert the response lapses[] contains the episode with matching
        // idempotency key
        throw new io.cucumber.java.PendingException();
    }

    @And("the active-alarm for patient {string} does not contain the lapse {string}")
    public void andActiveAlarmDoesNotContainLapse(String patientId, String idempotencyKey) {
        // TODO[SCAFFOLD]: GET /evnt/patients/{patientId}/active-alarm; assert it does NOT reference
        // any
        // detection_lapse (LAPSE-3: a lapse is never rendered as an emergency)
        throw new io.cucumber.java.PendingException();
    }

    // ── Unlinked caregiver ────────────────────────────────────────────────────

    @Given("caregiver {string} is not linked to patient {string}")
    public void givenCaregiverNotLinkedToPatient(String caregiverId, String patientId) {
        // TODO[SCAFFOLD]: ensure no ACS link exists for caregiverId <-> patientId (or use a fresh
        // caregiver)
        throw new io.cucumber.java.PendingException();
    }

    @Then("the list is rejected with status {string}")
    public void thenListRejectedWithStatus(String httpStatus) {
        // TODO[SCAFFOLD]: assert HTTP response status equals httpStatus (e.g. "404")
        throw new io.cucumber.java.PendingException();
    }

    // ── Scenario Outline: per-tier attempt for lapse + caregiver ─────────────

    @Then("a Tier {int} {string} attempt is recorded for lapse {string} and caregiver {string}")
    public void thenTierAttemptForLapseAndCaregiver(
            int tier, String channel, String idempotencyKey, String caregiverId) {
        // TODO[SCAFFOLD]: assert escalation_attempt row for (lapse_id, tier, channel, caregiver_id)
        // exists
        throw new io.cucumber.java.PendingException();
    }
}
