package com.neuroassist.gest.bdd.steps;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

/**
 * Step definitions — Capability declaration validation against PAT vocabulary. Feature:
 * capability-declare-validation.feature
 *
 * <p>Covers SPEC-03 (declare validation) + INV-GEST-1, INV-GEST-2, INV-GEST-6 + SPEC-10 (PAT dep).
 * Shared steps (common to multiple features) live in SharedSteps.java.
 */
public class CapabilityDeclareValidationSteps {

    @Given("the admin token carries authority {string}")
    public void givenTheAdminTokenCarriesAuthority(String authority) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Given("PAT vocabulary contains code {string}")
    public void givenPatVocabularyContainsCode(String code) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Given("PAT vocabulary does not contain code {string}")
    public void givenPatVocabularyDoesNotContainCode(String code) {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Then("no capability row is created")
    public void thenNoCapabilityRowIsCreated() {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @Given("PAT gesture-types endpoint is unavailable")
    public void givenPatGestureTypesEndpointIsUnavailable() {
        // TODO[SCAFFOLD]: implement step
        throw new io.cucumber.java.PendingException();
    }

    @When("a caller from tenant {string} lists capabilities for engine {string}")
    public void whenACallerFromTenantListsCapabilitiesForEngine(
            String tenant, String engineVersion) {
        // TODO[SCAFFOLD]: implement step — also matches the "And a caller from tenant..." line
        throw new io.cucumber.java.PendingException();
    }

    @Then("both callers receive the same capability rows")
    public void thenBothCallersReceiveTheSameCapabilityRows() {
        // TODO[SCAFFOLD]: implement step — asserts INV-GEST-3: global registry is tenant-agnostic
        throw new io.cucumber.java.PendingException();
    }
}
