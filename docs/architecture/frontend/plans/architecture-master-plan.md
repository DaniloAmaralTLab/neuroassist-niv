# Architecture Master Plan

> Rastreia a camada de arquitetura (Layer 1 -- Architect) de cada modulo.
> Atualizado automaticamente (master-plan.py, D-371). NAO editar a mao.

Legenda de status: `pendente` | `em andamento` | `OK` | `bloqueado` | `N/A`

## Status por modulo

| Modulo | Servico | Vision | Specs | Specs-Validate | Backlog | Scaffold | Atualizado |
|---|---|---|---|---|---|---|---|
| ACS | acs | OK | OK | OK | OK | OK | 2026-11-19 |
| PAT | pat | OK | OK | OK | OK | OK | 2026-11-19 |
| EDGE | edge | OK | OK | OK | OK | OK | 2026-11-20 |
| EVNT | evnt | OK | OK | OK | OK | OK | 2026-11-20 |
| GEST | gest | OK | OK | OK | OK | OK | 2026-11-20 |
| HIST | hist | OK | OK | OK | OK | OK | 2026-11-20 |
| DASH | dash | OK | OK | OK | OK | OK | 2026-11-20 |
| CONV | conv | OK | pendente | pendente | pendente | pendente | 2026-11-20 |

## Ledger de gates diferidos

| Data | Escopo | Gate | Comando de recuperacao | Status |
|---|---|---|---|---|
| 2026-11-19 | ACS/acs | feChecks | `npx nx run-many -t lint test build -p acs` | DIFERIDO (nx ausente) |
| 2026-11-19 | ACS/acs | e2eValidate | `npx nx e2e acs-e2e --list` | DIFERIDO (nx ausente) |
| 2026-11-19 | ACS/acs | buildShell | `npx nx build neuroassist-niv-web --configuration=development` | diferido |
| 2026-11-19 | ACS/acs | e2eGate | `npx nx e2e acs-e2e --list --skipInstall` | diferido |
| 2026-11-19 | PAT/pat | feChecks | `npx nx run-many -t lint test build -p pat` | DIFERIDO (nx ausente; frontend node_modules absent) |
| 2026-11-19 | PAT/pat | e2eValidate | `npx nx e2e pat-e2e --list` | DIFERIDO (nx ausente; frontend node_modules absent) |
| 2026-11-19 | PAT/pat | buildShell | `npx nx build neuroassist-niv-web --configuration=development` | diferido (node_modules absent) |
| 2026-11-19 | PAT/pat | e2eGate | `npx nx e2e pat-e2e --list --skipInstall` | diferido (node_modules absent) |
| 2026-11-19 | PAT/pat | themeBundle | `npx nx build neuroassist-niv-web; python scripts/fe-promote-theme.py check --client neuroassist-niv` | diferido (node_modules absent) |
| 2026-11-20 | EDGE/edge | feChecks | `npx nx run-many -t lint test build -p edge` | DIFERIDO (node_modules absent) |
| 2026-11-20 | EDGE/edge | buildShell | `npx nx build neuroassist-niv-web --configuration=development` | diferido (node_modules absent) |
| 2026-11-20 | EDGE/edge | e2eGate | `npx nx e2e edge-e2e --list --skipInstall` | diferido (node_modules absent) |
| 2026-11-20 | EDGE/edge | themeBundle | `npx nx build neuroassist-niv-web; python scripts/fe-promote-theme.py check --client neuroassist-niv` | diferido (node_modules absent) |
| 2026-11-20 | EVNT | build | `npx nx build neuroassist-niv-web --configuration=development` | diferido |
| 2026-11-20 | EVNT | e2e | `npx nx e2e evnt-e2e --list --skipInstall` | diferido |
| 2026-11-20 | EVNT | bundle | `npx nx build neuroassist-niv-web --configuration=production` | diferido |
| 2026-11-20 | EVNT | push-sw | `npm install @angular/service-worker; npx nx build neuroassist-niv-web --configuration=production` | diferido |
| 2026-11-20 | EVNT/evnt | feChecks | `npx nx run-many -t lint test build -p evnt` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | EVNT/evnt | buildShell | `npx nx build neuroassist-niv-web --configuration=development` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | EVNT/evnt | e2eGate | `npx nx e2e evnt-e2e --list --skipInstall` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | EVNT/evnt | themeBundle | `npx nx build neuroassist-niv-web; python scripts/fe-promote-theme.py check` | DIFERIDO (no dist/) |
| 2026-11-20 | EVNT/evnt | pushServiceWorker | `add @angular/service-worker to the shell app + HTTPS + production build; verify subscribe/410/notificationclick` | DIFERIDO (SW not wired; requires @angular/service-worker + https + prod build) |
| 2026-11-20 | GEST/gest | feChecks | `npx nx run-many -t lint test build -p gest` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | GEST/gest | buildShell | `npx nx build neuroassist-niv-web --configuration=development` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | GEST/gest | e2eGate | `npx nx e2e gest-e2e --list --skipInstall` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | GEST/gest | themeBundle | `npx nx build neuroassist-niv-web; python scripts/fe-promote-theme.py check --client neuroassist-niv` | DIFERIDO (no dist/) |
| 2026-11-20 | PLATFORM/frontend | routeGuards | `libs/*/src/lib/access/*.guard.ts (11 guards)` | DIFERIDO - all guards stub-permissive until @neuroassist/shared/access-decision (Wave-0 interface only) is implemented in Layer 2; server-side authorization enforced since D-642 |
| 2026-11-20 | HIST/hist | feChecks | `npx nx run-many -t lint test build -p hist` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | HIST/hist | e2eGate | `npx nx e2e hist-e2e --list --skipInstall` | DIFERIDO (frontend node_modules absent; hist-e2e registered, 3 features / 39 scenarios) |
| 2026-11-20 | DASH/dash | feChecks | `npx nx run-many -t lint test build -p dash` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | DASH/dash | buildShell | `npx nx build neuroassist-niv-web --configuration=development` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | DASH/dash | e2eGate | `npx nx e2e dash-e2e --list --skipInstall` | DIFERIDO (frontend node_modules absent) |
| 2026-11-20 | DASH/dash | themeBundle | `npx nx build neuroassist-niv-web; python scripts/fe-promote-theme.py check --client neuroassist-niv` | DIFERIDO (no dist/) |

## Log cronologico
- 2026-11-19T17:46:00 -- ACS -- M1 Vision -- OK -- FE 9 artifacts
- 2026-11-19T21:54:07 -- ACS -- M6 Promote — OK — Track D — 1 screen promoted (phone-activation->PatientSessionsPageComponent) + 2 stubs (CaregiverList,RegisterCaregiver) + 1 ops stub (TenantAdmin) — Port/Adapter/Facade HTTP default — shell app.config+module-descriptors+sidebar updated — acs-e2e 6 features 38 scenarios (fixme)
- 2026-11-19T22:12:47 -- PAT -- M1 Vision -- OK -- FE 9 artifacts (01..06, _brief, ADR-005 local)
- 2026-11-19T23:32:15 -- PAT -- 2026-11-19T23:32:15 -- PAT -- M6 Promote -- OK -- Track D -- 2 screens promoted + PatRootComponent -- 3 Ports+3 MockAdapters+3 HttpAdapters+3 Facades HTTP default -- shell updated -- pat-e2e 7 features 25 scenarios
- 2026-11-20T01:20:28 -- EDGE -- M6 Promote — OK — Track D — 2 screens promoted (EdgeDeviceStatusPage, DevicePairingPage) + DeviceStatusBadge (topbar/Home) + DevicePairingPanel (onboarding/phone-activation) — 1 Port + 1 MockAdapter + 1 HttpAdapter (default HTTP, edge-service published) + DeviceFacade signals-based — shell app.routes combined patients route (PAT+EDGE) + app.config + module-descriptors updated — edge-e2e 4 specs
- 2026-11-20T12:30:40 -- GEST -- M6 Promote -- OK -- Track D -- layer-only (no prototype screen; net_new station runtime) -- 3 Ports+3 MockAdapters+3 HttpAdapters+3 Facades (Runtime/Catalog/Report) HTTP default -- StationLivenessPort+NoOpImpl -- stationIdentityGuard -- GEST_MODULE_DESCRIPTOR (MODULE_PERMISSION_MAP empty) -- /station route added to shell -- gest-e2e 5 features
- 2026-11-20T15:54:30 -- HIST -- 2026-11-20 FE Promote OK — Track D (full layer from scratch). Port+Mock+Http adapters, HistoryFacade (signals/no-poll), contract, providers (default http), canReadHistoryGuard. HistoryPageComponent (promoted from prototype), HistoryWidgetComponent (DASH-ready), HistShellIntegrationService. Shell: /history route + provideHist() + HIST_DESCRIPTOR. hist-e2e: 3 features 39 scenarios. Base: dollar-sign{ACCESS_HTTP_BASE}/hist. Feedback delegated to EVNT via (markFeedback) output. Safety surfaces: informational-only.
- 2026-11-20T16:57:21 -- DASH -- DASH -- M6 Promote -- OK -- Track D (composition layer, NO backend/Port/HttpClient). DashboardFacade composes HistShellIntegrationService, AlarmFacade, DeviceFacade, PatientFacade, CommandFacade. DetectionLapseAdapter seam (unknown, INT-FE-DASH-001 pending). Fail-safe composite: all_clear only when every source ok+fresh (fixes events.every() true-on-empty bug). screens/home promoted to libs/dash/feature-home/. screens/entry promoted to shell app/screens/. Shell: /home DASH_ROUTES + /entry static + redirectTo home + provideDash(). module-descriptors DASH_DESCRIPTOR added. dash-e2e 6 features 32 scenarios. All gates DIFERIDO (node_modules absent).
