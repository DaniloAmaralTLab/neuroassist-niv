<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Service: `neuroassist-niv-service-registry` · Module **REG — Service Registry (Eureka)** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · **Infrastructure service** (Spring Cloud Netflix Eureka Server) · No UI · No database · No tenant schema · Messaging disabled.
> Reduced vision (docs 01–06 exist but are deliberately thin — REG owns no business domain).

## Intent

REG is the **service registry** of the NeuroAssist NIV backend: the single place where
every business service (ACS, PAT, EDGE, EVNT, DASH, CONV, GEST, HIST, …) and the gateway
publish their network location and learn where their peers are. It is pure infrastructure.
It holds no patient data, no gesture data, no PHI, no tenant schema and no domain model —
it is the address book that lets the services find each other by logical name instead of a
hard-coded host:port. The services **already register with it** (`EUREKA_URI` default
`http://localhost:8761/eureka` is present in every service's `application.yml`), so REG
documents and formalises an in-use dependency rather than introducing a new one.

## Problem Statement

A modular-monolith-of-services deployment (shared `../../adr/ADR-002-modular-monolith.md`)
runs several Spring Boot services on distinct ports (ACS 8081 … EVNT 8086, gateway, …).
For inter-service sync REST (Feign / `RestClient`) and for the gateway to route by logical
name, each caller must resolve a peer's current location. Hard-coding host:port couples the
topology into every service and breaks on any port or host change. The services were
scaffolded as Eureka clients and point at `http://localhost:8761/eureka`; without a running
registry at that address, client registration/lookup degrades (clients retry, Feign
name-based resolution fails). REG exists so that the address the clients already expect is
owned, configured and documented as a first-class service.

## Personas

| Persona | Relationship to REG |
|---|---|
| **Business services** (ACS, PAT, EDGE, EVNT, DASH, CONV, GEST, HIST, …) | Eureka **clients** — register themselves and query peers by logical name. |
| **API gateway** (GWY) | Eureka client — resolves downstream routes by service name. |
| **Platform / ops operator** | Reads the registry dashboard and `/actuator/health` to see which services are up; owns `EUREKA_URI` wiring. |

REG has **no human end-user persona** and **no ACS role** — it is never on a user request
path and exposes no business endpoint.

## MVP Scope

- A single **Eureka Server** (`@EnableEurekaServer`) bound to **port 8761**, matching the
  `EUREKA_URI` default already configured in every client.
- **Single-node, standalone** topology for dev/pilot: the server does not register with
  itself and does not try to replicate to a peer.
- **Self-preservation disabled** in dev and **client eviction / lease** tuned for fast
  convergence on a small, trusted LAN (see ADR-001).
- A minimal **security posture**: `/actuator/health` exposed for liveness; the Eureka
  dashboard and registry endpoints reachable only on the internal network; **no PHI ever
  flows through REG**.
- No database, no Flyway migration, no tenant schema (REG owns no schema).

## Out of Scope

- Any business domain, entity, tenant data or PHI — REG stores only transient service
  lease metadata (logical name, host, port, status).
- Multi-node Eureka peer replication / HA cluster (deferred — single-node is sufficient
  for the current internal-network deployment; revisit on a concrete availability driver).
- Client-side config of each service's `EUREKA_URI` (owned by each service, not by REG).
- API gateway routing rules (owned by GWY).
- Authentication of registering clients beyond network isolation (no mutual TLS / registry
  auth in the MVP — internal-network-only, inherited OPS constraint).
- Config server / centralised config distribution (not a registry concern).

## Architectural Principles

1. **Infrastructure, not domain.** REG holds no business data and defines no aggregate; it
   is an address book. Shared hexagonal / multi-tenancy ADRs do not meaningfully apply.
2. **Match the clients, do not move them.** The server binds the exact address the clients
   already expect (`:8761/eureka`); REG adapts to the fleet, not the reverse.
3. **No PHI, ever.** Only service-location lease metadata passes through REG; patient and
   gesture data never touch it.
4. **Minimal surface on a trusted network.** Expose only what ops needs (`health`,
   dashboard), only on the internal network.
5. **Fast, honest convergence in dev.** Self-preservation off so a stopped service
   disappears promptly rather than lingering as a stale "up" entry.

## Success Signals

- Every business service and the gateway appear as **UP** in the Eureka dashboard within a
  few seconds of start, with no client-side `EUREKA_URI` change.
- Stopping a service removes it from the registry within the configured eviction window
  (self-preservation does not pin a dead instance as "up").
- `/actuator/health` on REG returns `UP`; the registry is reachable only on the internal
  network.
- A Feign / `RestClient` call that resolves a peer **by logical name** succeeds against the
  live registry.
- No patient, gesture or tenant data is ever observable in REG (it stores only lease
  metadata).
