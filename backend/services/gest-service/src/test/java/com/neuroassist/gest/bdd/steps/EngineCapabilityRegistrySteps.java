package com.neuroassist.gest.bdd.steps;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

/**
 * Step definitions — Engine and capability registry administration. Feature:
 * engine-capability-registry.feature
 *
 * <p>Covers SPEC-02 (capability registry orchestration) + SPEC-06 (authority, INV-GEST-5). Shared
 * steps (common to multiple features) live in SharedSteps.java.
 */
public class EngineCapabilityRegistrySteps {

    @Given("the caregiver token carries authority {string}")
    public void givenTheCaregiverTokenCarriesAuthority(String authority) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Given("code {string} on engine {string} is already {string}")
    public void givenCodeOnEngineIsAlready(String code, String engineVersion, String status) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @When("the admin retires that capability")
    public void whenTheAdminRetiresThatCapability() {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Then("the capability row is still present")
    public void thenTheCapabilityRowIsStillPresent() {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Given("a station presents an edge.device token without {string}")
    public void givenAStationPresentsAnEdgeDeviceTokenWithout(String authority) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @When("it attempts to declare support {string} for code {string} on engine {string}")
    public void whenItAttemptsToDeclareSupport(
            String supportStatus, String code, String engineVersion) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Then("the registry is unchanged")
    public void thenTheRegistryIsUnchanged() {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Given("engine version {string} is deprecated")
    public void givenEngineVersionIsDeprecated(String version) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }
}
