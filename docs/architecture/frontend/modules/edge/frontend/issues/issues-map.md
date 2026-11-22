# Issues Map -- issues

| Issue | Title | Kind | Priority | Status |
|---|---|---|---|---|
| FE-EDGE-001 | edge.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS | FE | P1 | INTACT |
| FE-EDGE-002 | EDGE_ROUTES — lazy route table with authGuard, canReadDeviceGuard, canPairDeviceGuard | FE | P1 | INTACT |
| FE-EDGE-003 | EdgeModule — entry lib public API and @neuroassist/edge importPath barrel | FE | P1 | INTACT |
| FE-EDGE-004 | EDGE_MODULE_DESCRIPTOR — shell registration in config/module-descriptors.ts | FE | P1 | INTACT |
| FE-EDGE-005 | edge.providers.ts — HTTP adapter default (not mock); EdgeDeviceHttpAdapter base ${ACCESS_HTTP_BASE}/edge | FE | P1 | INTACT |
| FE-EDGE-006 | edge.bootstrap.ts — ModuleBootstrap init/destroy lifecycle (topbar badge mount, breadcrumb register, tenant-context read) | FE | P1 | INTACT |
| FE-EDGE-007 | EdgeDeviceApiService — enroll, list, get, reactivate, deactivate, unpair, revoke (HTTP operations against /edge/devices) | FE | P2 | INTACT |
| FE-EDGE-008 | Wire record types (EdgeDeviceWire, EdgeDeviceRowWire, EnrollResultWire) + mappers (toEdgeDeviceVM, toEdgeDeviceRow, toPairingDraft) | FE | P2 | INTACT |
| FE-EDGE-009 | DeviceFacade — signal<DeviceStatusVM>, signal<DevicePairingVM>, signal<DeviceLifecycleVM> + pairing poll until lifecycleState=paired | FE | P2 | INTACT |
| FE-EDGE-010 | EDGE error mapping — ProblemDetail type slug → AppError → FE surface (toast/inline/banner/modal) | FE | P2 | INTACT |
| FE-EDGE-011 | DevicePairingPageComponent — smart OnPush, reads DeviceFacade.pairingVm() signal, enroll CTA, feature-device-pairing route | FE | P3 | INTACT |
| FE-EDGE-012 | DevicePairingPanelComponent + PairingCodeDisplayComponent + PairingProgressComponent + ExistingDeviceNoticeComponent (presentational sub-tree) | FE | P3 | INTACT |
| FE-EDGE-013 | PlatformUnsupportedNoticeComponent + phone-mode guard (PLAT-001 Android/Chromium check in DevicePairingPanel mode=phone) | FE | P3 | INTACT |
| FE-EDGE-014 | EdgeDeviceStatusPageComponent — smart OnPush, reads DeviceFacade.statusVm() + lifecycleVm() signals, feature-device-status route | FE | P3 | INTACT |
| FE-EDGE-015 | EdgeDeviceCardComponent + DeviceLifecycleActionsComponent + ConfirmDialogComponent wiring for destructive actions | FE | P3 | INTACT |
| FE-EDGE-016 | DeviceStatusBadge (libs/edge/ui) — eager presentational, topbar slot reservation, online/offline/unavailable states, no liveness inference | FE | P3 | INTACT |
| FE-EDGE-017 | canReadDeviceGuard — AccessDecisionService.can('edge.device.read'), redirects to forbidden, never hardcodes return true | FE | P5 | INTACT |
| FE-EDGE-018 | canPairDeviceGuard — AccessDecisionService.can('edge.device.pair'), redirects to forbidden, never hardcodes return true | FE | P5 | INTACT |
| FE-EDGE-019 | EdgeShellIntegrationService — breadcrumbs (Care→Edge device→{patient}→[Pair]), topbar badge contribution, audit hand-off to observability | FE | P6 | INTACT |
| FE-EDGE-020 | Loading + status-unavailable + error states — badge skeleton while loading, never default-online on unreachable edge-service | FE | P7 | INTACT |
| FE-EDGE-021 | Pairing code countdown — pairingCodeExpiresAt expiry display, single-use code shown once, timeout sets pairing=error with retry guidance | FE | P7 | INTACT |
| FE-EDGE-022 | lastSyncRelative pipe — relative-time display for 'synced N ago', never toFixed; a11y live-region on pairing-code state change; focus-return after destructive actions | FE | P7 | INTACT |
| FE-EDGE-023 | EDGE telemetry events — emit pair/unpair/deactivate/revoke transitions via @neuroassist/shared/observability (never console.log) | FE | P8 | INTACT |
| FE-EDGE-024 | Playwright e2e stubs — pair-edge-device, pair-patient-phone, device-status-badge, device-lifecycle, edge-navigation (test.fixme, never vacuous skip) | FE | P9 | INTACT |
| FE-EDGE-025 | A11y carry-forwards — accessible name on pairing-code region (aria-live), focus return after modal close, contrast AA tokens, keyboard navigation | FE | P9 | INTACT |
| INT-FE-EDGE-001 | INT: @neuroassist/shared/observability — audit hand-off for pair/unpair/deactivate/revoke so HIST module consumes downstream | INT | P4 | INTACT |
| INT-FE-EDGE-002 | INT: @neuroassist/shared/tenant-context — EDGE observes tenant-context.switchTo() and invalidates all DeviceFacade signals on tenant change | INT | P4 | INTACT |
| INT-FE-EDGE-003 | INT: @neuroassist/shared/auth-session — authGuard redirects session-absent to login; unauthenticated 401 from edge-service also redirects to login | INT | P4 | INTACT |
| INT-FE-EDGE-004 | INT: @neuroassist/shared/access-decision — AccessDecisionService.can() wired for all EDGE authorities; no inline role check in any component | INT | P4 | INTACT |
| INT-FE-EDGE-005 | INT: G-EDGE-2 follow-up — edge-service does not expose a 'version' field on EdgeDevice; FE models it absent; BE must add 'version' to GET /edge/devices/{id} response (references INT-EDGE-005) | INT | P4 | INTACT |
| FE-EDGE-026 | StationLivenessService — the single station heartbeat sender (StationLivenessPort: setDetectionState, beatNow; ≤30s cadence; token rotation) — SAFETY-GEST-1 | FE | P6 | INTACT |
| FE-EDGE-027 | Heartbeat egress — POST /edge/heartbeat body (detectionState/reason/engineVersion), keepalive fetch on hidden (no sendBeacon), refreshedToken rotation — SAFETY-GEST-1 | FE | P2 | INTACT |
| FE-EDGE-028 | Detection-state wire fields + VM mapping — absent ⇒ UNKNOWN (never RUNNING); derived detection axis per SPEC-03 §1.1 — SAFETY-GEST-1 | FE | P2 | INTACT |
| FE-EDGE-029 | Caregiver surfaces render detection distinct from connectivity — badge + Home card + status page (detecting / connected-not-detecting+reason / offline / unavailable) — SAFETY-GEST-1 | FE | P7 | INTACT |
| FE-EDGE-030 | e2e stubs — station-detection-liveness.feature + detection scenarios in device-status-badge.feature (test.fixme) — SAFETY-GEST-1 | FE | P9 | INTACT |
| INT-FE-EDGE-006 | INT: StationLivenessPort seam — libs/edge is the single heartbeat sender, GEST consumes in-process (no second sender, no fourth egress; INV-GEST-8) — SAFETY-GEST-1 | INT | P4 | INTACT |
