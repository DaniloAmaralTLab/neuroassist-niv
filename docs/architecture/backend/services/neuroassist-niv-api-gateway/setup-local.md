# GWY — Local Setup (neuroassist-niv-api-gateway)

> Infrastructure gateway service (Spring Cloud Gateway, reactive). No database, no
> broker, no schema, no PHI. It is the single edge in front of the fleet. It needs
> REG up (for `lb://` resolution) and the ACS + EDGE JWKS reachable (for the edge
> check).

## HTTP port

| Service | Port |
|---|---|
| neuroassist-niv-api-gateway | `8080` (the public edge; matches `04-backend-architecture-direction.md` and generator-config.yml) |

Actuator: `/actuator/health` (anonymous liveness), `/actuator/prometheus`
(platform-internal metrics).

## Local dependencies

| Dependency | Needed for | Local |
|---|---|---|
| REG (Eureka) `:8761` | `lb://` resolution; start REG first | required |
| ACS `:8081` (JWKS) | edge check issuer 1 + `/acs/auth/login` | required for protected routes |
| EDGE `:8084` (JWKS) | edge check issuer 2 (`edge.device` tokens) | required for edge.device traffic |
| The other business services | to actually route there | optional per route under test |
| Elasticsearch (optional) | PHI-free logs/metrics | only if you want logs shipped; GWY runs fine without |

No PostgreSQL, no broker, no Flyway for this service.

## Environment variables

| Var | Purpose | Example |
|---|---|---|
| `SERVER_PORT` | gateway port | `8080` |
| `EUREKA_URI` | Eureka defaultZone for `lb://` resolution | `http://localhost:8761/eureka` |
| `GATEWAY_JWKS_ACS_URI` | ACS JWKS (issuer 1) | `http://localhost:8081/acs/.well-known/jwks.json` |
| `GATEWAY_JWKS_EDGE_URI` | EDGE JWKS (issuer 2) | `http://localhost:8084/edge/.well-known/jwks.json` |
| `GATEWAY_CORS_ALLOWED_ORIGINS` | caregiver-shell origin allow-list (never `*` with credentials) | `http://localhost:4200` |
| `GATEWAY_RATELIMIT_LOGIN_CAPACITY` | login bucket capacity | `5` |
| `GATEWAY_RATELIMIT_PAIRING_CAPACITY` | pairing bucket capacity | `10` |

> **Scaffold note (framework gap — integration-contracts §7):** the generated
> `application.yml` ships `routes: []` and a single Keycloak `issuer-uri`. Replace it
> with the eight routes and two `jwk-set-uri` (ACS + EDGE) before the edge check
> works. The two JWKS URIs above are what the hand-wiring must consume.

## Network topology

GWY is the **public edge**: the browser (caregiver shell) and patient/edge clients
reach only GWY; the eight business services sit behind it and are reached by `lb://`.
REG (`:8761`), MIG and DASH are **not** fronted by GWY. Keep the business services
reachable only from the internal/compose network.

## Run and test

```bash
# REG must be up first (lb:// resolution). Then:
./gradlew :services:neuroassist-niv-api-gateway:bootRun

# health
curl -s http://localhost:8080/actuator/health

# a protected route without a token -> 401 (deny by default)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/pat/commands

# a public path bypasses the edge check
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/acs/.well-known/jwks.json
```

## Tests

```bash
./gradlew :services:neuroassist-niv-api-gateway:test       # security/routing/config tests (incl. 401 authz proof — D-642)
./gradlew :services:neuroassist-niv-api-gateway:cucumber   # BDD (tests/cucumber/*.feature)
```
