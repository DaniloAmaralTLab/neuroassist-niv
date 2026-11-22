# REG — Local Setup (neuroassist-niv-service-registry)

> Infrastructure registry service. No database, no broker, no JWKS, no PHI. It is
> the first service to start locally — every other service registers with it.

## HTTP port

| Service | Port |
|---|---|
| neuroassist-niv-service-registry | `8761` (standard Eureka port; matches `EUREKA_URI` default in every client) |

Eureka dashboard at `/`. Actuator (separate from the Eureka protocol surface):
`/actuator/health`, `/actuator/health/readiness`, `/actuator/prometheus`.

## Local dependencies

| Dependency | Needed for | Local |
|---|---|---|
| _(none)_ | REG is the dependency target; it calls no one | — |
| Elasticsearch (optional) | lifecycle/access logs | only if you want logs shipped; REG runs fine without |

No PostgreSQL, no broker, no Flyway, no JWKS for this service.

## Environment variables

| Var | Purpose | Example |
|---|---|---|
| `SERVER_PORT` | registry port | `8761` |
| `EUREKA_INSTANCE_HOSTNAME` | hostname advertised | `localhost` |
| `EUREKA_CLIENT_REGISTER_WITH_EUREKA` | single-node self-flag | `false` |
| `EUREKA_CLIENT_FETCH_REGISTRY` | single-node self-flag | `false` |
| `EUREKA_SERVER_ENABLE_SELF_PRESERVATION` | self-preservation toggle (dev=false) | `false` |
| `EUREKA_SERVER_EVICTION_INTERVAL_TIMER_IN_MS` | eviction loop period | `60000` |
| `EUREKA_SERVER_RENEWAL_PERCENT_THRESHOLD` | self-preservation threshold (used when enabled) | `0.85` |

> `EUREKA_URI` is a **client-side** variable owned by each business service
> (`${EUREKA_URI:http://localhost:8761/eureka}`), not by REG.

## Network topology

The Eureka dashboard (`/`) and protocol (`/eureka/**`) are internal-only: the API
Gateway (GWY) does **not** route to REG (it only uses REG as `defaultZone` for
discovery), so neither is exposed on the public edge. REG performs no authentication
(SPEC-06); isolation is by network topology. Keep port `8761` reachable only from
the internal network / compose network.

## Run and test

```bash
# registry is the first thing up — no dependencies
./gradlew :services:neuroassist-niv-service-registry:bootRun

# health
curl -s http://localhost:8761/actuator/health/readiness

# dashboard (browser): http://localhost:8761/

# registry snapshot (JSON)
curl -s http://localhost:8761/eureka/apps -H "Accept: application/json"

# once another service is up with eureka.client.serviceUrl.defaultZone=http://localhost:8761/eureka/
# it appears in the snapshot above and on the dashboard
```

## Tests

```bash
./gradlew :services:neuroassist-niv-service-registry:test       # bootstrap/config tests
./gradlew :services:neuroassist-niv-service-registry:cucumber   # BDD (tests/cucumber/*.feature)
```
