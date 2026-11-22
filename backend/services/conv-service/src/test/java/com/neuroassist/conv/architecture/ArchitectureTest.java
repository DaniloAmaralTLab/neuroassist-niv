package com.neuroassist.conv.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition;

@AnalyzeClasses(
        packages = "com.neuroassist",
        importOptions = {ImportOption.DoNotIncludeTests.class, ImportOption.DoNotIncludeJars.class})
public class ArchitectureTest {
    private static final String MODULE = "conv"; // RULE-09: expected base package fragment

    // RULE-01: domain.* must not import org.springframework
    @ArchTest
    static final ArchRule rule01_domain_no_spring =
            ArchRuleDefinition.noClasses()
                    .that()
                    .resideInAPackage("..domain..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("org.springframework..");

    // RULE-02: domain.* must not import jakarta.persistence
    @ArchTest
    static final ArchRule rule02_domain_no_jpa =
            ArchRuleDefinition.noClasses()
                    .that()
                    .resideInAPackage("..domain..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("jakarta.persistence..");

    // RULE-04: api.* must not depend on infrastructure.*
    @ArchTest
    static final ArchRule rule04_api_not_depends_infra =
            ArchRuleDefinition.noClasses()
                    .that()
                    .resideInAPackage("..api..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("..infrastructure..");

    // RULE-05: infrastructure.* must not depend on api.*
    @ArchTest
    static final ArchRule rule05_infra_not_depends_api =
            ArchRuleDefinition.noClasses()
                    .that()
                    .resideInAPackage("..infrastructure..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("..api..");

    // RULE-06: @FeignClient only in infrastructure.clients
    @ArchTest
    static final ArchRule rule06_feign_only_in_clients =
            ArchRuleDefinition.classes()
                    .that()
                    .areAnnotatedWith("org.springframework.cloud.openfeign.FeignClient")
                    .should()
                    .resideInAnyPackage("..infrastructure.clients..");

    // RULE-03: @Transactional only in application.service (CLAUDE.md)
    @ArchTest
    static final ArchRule rule03_transactional_only_in_application_service =
            ArchRuleDefinition.noClasses()
                    .that()
                    .resideOutsideOfPackage("..application.service..")
                    .should()
                    .beAnnotatedWith("org.springframework.transaction.annotation.Transactional");

    // RULE-07: TenantContextHolder.require() mandatory in tenant-scoped application.service
    // (CLAUDE.md)
    //   Not enforceable purely via ArchUnit — verified by:
    //     (a) code review of every @Service in application.service,
    //     (b) integration tests asserting MDC/TenantContextHolder set during processing.
    //   See SPEC-06 §"Tenant isolation" and CLIO-014.

    // RULE-08: spring.jpa.open-in-view=false mandatory in application.yml (CLAUDE.md)
    //   Not enforceable via ArchUnit - verified by:
    //     PropertyValidationTest in src/test/java, reading application*.yml files from
    //     disk and asserting spring.jpa.open-in-view: false.
    //     Skips on services without JPA (no org.hibernate.SessionFactory on classpath).

    // EXTRA: WebClient only in infrastructure.* (defensive — not part of CLAUDE.md RULE-08)
    @ArchTest
    static final ArchRule rule_extra_webclient_only_in_infrastructure =
            ArchRuleDefinition.noClasses()
                    .that()
                    .resideOutsideOfPackage("..infrastructure..")
                    .should()
                    .dependOnClassesThat()
                    .haveFullyQualifiedName(
                            "org.springframework.web.reactive.function.client.WebClient");

    // RULE-09: all production classes must reside under com.neuroassist.<module>
    // (CLAUDE.md) - verified by scanning the parent package com.neuroassist so
    // that classes in a wrong sub-package are caught instead of silently excluded.
    @ArchTest
    static final ArchRule rule09_base_package =
            ArchRuleDefinition.classes()
                    .should()
                    .resideInAPackage("com.neuroassist." + MODULE + "..")
                    .because(
                            "RULE-09 (CLAUDE.md): base package must be"
                                    + " com.neuroassist."
                                    + MODULE
                                    + "; a class was found outside this package");

    // RULE-09 (TEST TREE): all test classes must reside under com.neuroassist.<module>
    // The @AnalyzeClasses above uses DoNotIncludeTests, so test classes are excluded from
    // rule09_base_package. This @Test uses a separate ClassFileImporter with
    // ONLY_INCLUDE_TESTS to close that gap. Fails explicitly if the imported set is empty
    // (vacuous-check protection). See ARCH-001 'Segunda correcao (2026-09-16)'.
    @org.junit.jupiter.api.Test
    void rule09_test_tree_base_package_test_tree() {
        com.tngtech.archunit.core.domain.JavaClasses testClasses =
                new com.tngtech.archunit.core.importer.ClassFileImporter()
                        .withImportOption(ImportOption.Predefined.ONLY_INCLUDE_TESTS)
                        .importPackages("com.neuroassist");
        org.junit.jupiter.api.Assertions.assertFalse(
                testClasses.isEmpty(),
                "RULE-09 (CLAUDE.md) -- test-tree check: ONLY_INCLUDE_TESTS returned an"
                        + " empty set for 'com.neuroassist'. The check would be"
                        + " vacuous; verify that Gradle places compiled test classes on"
                        + " the classpath before this test runs"
                        + " (build/classes/java/test/).");
        ArchRuleDefinition.classes()
                .should()
                .resideInAPackage("com.neuroassist." + MODULE + "..")
                .because(
                        "RULE-09 (CLAUDE.md): test-tree base package must be"
                                + " com.neuroassist."
                                + MODULE
                                + "; a test class was found outside this package"
                                + " (ARCH-001 -- test-tree coverage)")
                .check(testClasses);
    }
}
