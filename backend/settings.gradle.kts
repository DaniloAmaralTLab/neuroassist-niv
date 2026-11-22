// Root settings.gradle.kts for neuroassist-niv
// Composite build (D-575): includeBuild, not include — see build.gradle.kts.

rootProject.name = "neuroassist-niv-backend"

// Services of this backend (from project-context.modules.registry).
// A service scaffolded later is appended here by scripts/be-module-generator.py.
includeBuild("services/neuroassist-niv-api-gateway")
includeBuild("services/neuroassist-niv-service-registry")
includeBuild("services/neuroassist-niv-migrations")
includeBuild("services/gest-service")
includeBuild("services/evnt-service")
includeBuild("services/pat-service")
includeBuild("services/acs-service")
includeBuild("services/hist-service")
includeBuild("services/dash-service")
includeBuild("services/edge-service")
includeBuild("services/conv-service")
includeBuild("services/trn-service")
