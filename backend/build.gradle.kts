// Root build.gradle.kts for neuroassist-niv backend — composite aggregator.
// Java 21 · Spring Boot 3.5.0 (from project-context.json).
// Each service under services/ is an autonomous build; these tasks fan out to them.

tasks.register("buildAll") {
    group = "build"
    description = "Runs `build` on every service of the composite build."
    dependsOn(gradle.includedBuilds.map { it.task(":build") })
}

tasks.register("testAll") {
    group = "verification"
    description = "Runs `test` on every service of the composite build."
    dependsOn(gradle.includedBuilds.map { it.task(":test") })
}

tasks.register("checkAll") {
    group = "verification"
    description = "Runs `check` on every service of the composite build."
    dependsOn(gradle.includedBuilds.map { it.task(":check") })
}
