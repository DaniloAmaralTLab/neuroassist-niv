# EDGE — Event Catalog

> Service: `edge-service` · Module **EDGE — Edge Device Integration** · Project: NeuroAssist NIV
> **Messaging disabled.** These are **audited domain actions** (sync REST → HIST), not broker
> messages. Full contract: `../contracts/event-contracts.md`.

| Name | Type | Payload (contract) | Known consumers |
|---|---|---|---|
| `DeviceEnrolled` | published (audited) | `event-contracts.md` §1.2 — `patientId`, `pairingCodeExpiresAt` | HIST (audit) |
| `DevicePaired` **(anchor)** | published (audited) | §1.2 — `patientId`, `credentialId`, `stationFingerprint` | HIST (audit); signals ACS it may provision a session (G4, pull) |
| `DeviceReactivated` | published (audited) | §1.2 — `previousState`, `credentialId` (new) | HIST (audit) |
| `DeviceDeactivated` | published (audited) | §1.2 — `previousState` | HIST (audit) |
| `DeviceUnpaired` | published (audited) | §1.2 — `patientId`, `credentialId` (revoked) | HIST (audit) |
| `DeviceRevoked` | published (audited) | §1.2 — `credentialId`, `previousState` | HIST (audit); cue for ACS session revoke (G4, manual) |
| `DeviceWentOffline` | published (audited) | §1.2 — `lastHeartbeatAt`, `thresholdMs` | HIST (audit); DASH status badge (pull) |
| `DeviceCameOnline` | published (audited) | §1.2 — `offlineSinceMs` | HIST (audit); DASH status badge (pull) |
| `CatalogRefreshed` | published (audited) | §1.2 — `patEtag`, `commandCount` (on `200` only) | HIST (audit) |
| `DetectionLapseStarted` | published (audited) | §1.2 — `cause`, `detectionState`, `reason`, `lastDetectingAt`, `thresholdSeconds` (ADR-005) | HIST (audit); **EVNT** (raised to escalate — `integration-contracts.md` §6.2) |
| `DetectionLapseResolved` | published (audited) | §1.2 — `lapseDurationSeconds`, `detectionState` (ADR-005) | HIST (audit); **EVNT** (resolve the episode) |
| — | consumed | **none** (messaging disabled; `ai.hasAi = false`) | — |

> No module consumes these asynchronously; downstream status (DASH badge, ACS provisioning) is
> read by **pull** from the EDGE REST surface (`integration-contracts.md` §5). If a broker is later
> adopted (ADR-006 future signal), these names become message names without renaming.
