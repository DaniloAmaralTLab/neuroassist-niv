# Operational Runbook — neuroassist-niv-service-registry

**Service:** `neuroassist-niv-service-registry` (Eureka Server)
**Default port:** 8761
**Production profile:** `prod` (requires `EUREKA_INSTANCE_HOSTNAME`)
**Architectural references:** ADR-001 (topology / single-node / security /
self-preservation), ADR-002 (registry-only boundary)

---

## Required environment variable in production

| Variable | Required | Description |
|---|---|---|
| `EUREKA_INSTANCE_HOSTNAME` | **YES** | Internal DNS name of the registry host (e.g. `service-registry.internal`). Absence fails startup — intentional, to avoid registering with an incorrect hostname. |

Starting the service without this variable under the `prod` profile yields:
```
Caused by: java.lang.IllegalArgumentException: Could not resolve placeholder 'EUREKA_INSTANCE_HOSTNAME'
```

---

## Scenario 1 — Verify membership (which services are registered)

```bash
curl -s -H "Accept: application/json" http://localhost:8761/eureka/apps | python -m json.tool
```

Expected (full fleet — 8 business services + gateway):

```json
{
  "applications": {
    "apps__hashcode": "UP_9_",
    "application": [
      { "name": "ACS-SERVICE",                 "instance": [{ "status": "UP" }] },
      { "name": "PAT-SERVICE",                 "instance": [{ "status": "UP" }] },
      { "name": "EDGE-SERVICE",                "instance": [{ "status": "UP" }] },
      { "name": "EVNT-SERVICE",                "instance": [{ "status": "UP" }] },
      { "name": "CONV-SERVICE",                "instance": [{ "status": "UP" }] },
      { "name": "GEST-SERVICE",                "instance": [{ "status": "UP" }] },
      { "name": "HIST-SERVICE",                "instance": [{ "status": "UP" }] },
      { "name": "TRN-SERVICE",                 "instance": [{ "status": "UP" }] },
      { "name": "NEUROASSIST-NIV-API-GATEWAY", "instance": [{ "status": "UP" }] }
    ]
  }
}
```

> `neuroassist-niv-migrations` (MIG) and `dash-service` (DASH, no backend) are
> **not** Eureka clients and never appear here.

Query one service:

```bash
curl -s -H "Accept: application/json" http://localhost:8761/eureka/apps/PAT-SERVICE | python -m json.tool
```

---

## Scenario 2 — Force OUT_OF_SERVICE on an instance

Drain an instance from the discovery pool without stopping the process (e.g. for
maintenance drain or canary rollout).

```bash
curl -X PUT \
  "http://localhost:8761/eureka/apps/PAT-SERVICE/<INSTANCE_ID>/status?value=OUT_OF_SERVICE" \
  -H "Accept: application/json"
```

Revert to UP:

```bash
curl -X DELETE \
  "http://localhost:8761/eureka/apps/PAT-SERVICE/<INSTANCE_ID>/status" \
  -H "Accept: application/json"
```

**Warning:** status overrides are held in the registry memory only. A registry
restart clears all overrides — instances revert to the status their own heartbeats
report.

---

## Scenario 3 — Diagnose self-preservation (prod posture)

> In **dev** self-preservation is **off** (ADR-001) — a stopped service is evicted
> promptly and this scenario does not apply. It applies when the prod posture turns
> self-preservation on.

Signals when active:

- **Log:** `EMERGENCY! EUREKA MAY BE INCORRECTLY CLAIMING INSTANCES ARE UP ...`
- **Dashboard:** red banner at the top of http://localhost:8761
- **Metric:**

```bash
curl -s http://localhost:8761/actuator/prometheus | grep eureka_self_preservation
# active:   eureka_self_preservation_active 1.0
# inactive: eureka_self_preservation_active 0.0
```

| Situation | self_preservation_active | Action |
|---|---|---|
| Normal operation | 0.0 | None — fleet healthy |
| Transient network blip | 1.0 (temporary) | Wait for auto-recovery (60-120 s) |
| Genuinely dead instances | 1.0 (persistent) | Restart the problem instances |
| Drastically shrunk fleet | 1.0 (persistent) | Recalibrate `renewal-percent-threshold` |

Threshold recalibration:
```
expected_renewals_per_min = N_services * 2
min_renewals = renewal_percent_threshold * expected_renewals_per_min
```
Example (9 clients, threshold=0.85): expected = 18, min = 15.3 heartbeats/min.

---

## HA criteria — when to enable peer replication

**Reference decision:** ADR-001 (HA deferred, single-node MVP).

Current posture: single node (ADR-001 / ADR-002). Discovery resilience comes from
the **client-side cache**: every Eureka client keeps a local snapshot and keeps
routing during a brief registry outage.

Enable peer replication (multi-node HA) when any criterion is met:

| Criterion | Threshold | Rationale |
|---|---|---|
| Fleet size | > 20 services | A REG restart then causes relevant discovery disruption even with client-side cache |
| Discovery SLA | Zero-downtime contractually required | Client cache cannot guarantee zero impact after cache-expiry during a long restart |
| REG restart frequency | > 2x / month planned maintenance | Frequent restarts exhaust the client-cache safety window |

Until a criterion is met, keep single-node (ADR-002 in force).

---

## Quick reference — operational endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/eureka/apps` | GET | List all registered apps and instances |
| `/eureka/apps/{app}` | GET | Instances of one app |
| `/eureka/apps/{app}/{instanceId}` | GET | One instance |
| `/eureka/apps/{app}/{instanceId}/status` | PUT `?value=OUT_OF_SERVICE` | Force an instance status |
| `/eureka/apps/{app}/{instanceId}/status` | DELETE | Remove a status override |
| `/actuator/health` | GET | Overall registry health |
| `/actuator/health/readiness` | GET | Readiness probe (K8s / LB) |
| `/actuator/health/liveness` | GET | Liveness probe (K8s) |
| `/actuator/prometheus` | GET | Prometheus metrics (incl. eureka_self_preservation_active) |
| `/` | GET | Eureka dashboard (UI) |
