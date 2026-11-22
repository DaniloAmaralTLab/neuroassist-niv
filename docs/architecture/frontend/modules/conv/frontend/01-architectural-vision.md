# 01 — Architectural Vision — conv (CONV) Frontend

> Client: neuroassist-niv · Module: CONV — Conversation via Speech Tree (station runtime) ·
> Layer: Frontend (Angular 21 / Nx 22, signal-based, `libs/conv`) · Generated: 2026-11-20 ·
> Status: DRAFT — awaiting G1 Patient-Mode host decision (shared with GEST, INT-FE-GEST-003) and
> conv-service contract (BE M1.5).

## 1. Intent (UX-driven)

At the end of a CONV interaction the patient has **said something out loud in their own voice** by
making at most two selections in a small, calm speech tree — and they did it through **whatever
channel they still control** (a facial gesture, a tap, or a switch scan), **with or without a
network**. The station never freezes waiting for the server: the tree and the audio are already
there.

## 2. Problem statement

**Current journey.** A locked-in patient depends on a caregiver interpreting ambiguous movements, or
on tools that assume reliable connectivity and typing ability. Latency, dropouts, and small touch
targets are disabling.

**New journey.** CONV runs on the patient's station in Patient Mode. The published speech tree and
its pre-synthesized audio are cached locally. The patient browses `category → phrase`; selecting a
phrase plays the cached clip of their own voice. Gesture input (recognized by GEST) and touch/switch
input converge on the **same selected-node model** — no channel is privileged. Nothing in the daily
loop requires a round-trip.

## 3. Personas (job-to-be-done)

| Persona | Job-to-be-done | In CONV runtime? |
|---|---|---|
| **Patient (station user)** | "Emit a phrase in ≤ 2 selections through any channel I control, offline, in my own voice." | **Yes — the only runtime operator.** |
| **Caregiver** | "Provision/revoke the patient session + device so the station can run." | No — provisioning is Screen 07 (ACS/EDGE); authoring is TRN. |

## 4. MVP scope (in)

- **Screen 06 — Speech Tree** (`/patient/converse`): grid of nodes at the active level, back
  navigation, active-channel indicator, TTS player (cached-audio or fallback).
- **Input-channel-agnostic selection**: touch/mouse, gesture (GEST in-process seam), switch scanning
  (dwell + timed scan). Same node model for all.
- **Offline-first runtime**: cached published tree + cached audio; version-aware refresh; cache-first
  reads; no per-step/per-phrase server call.
- **Dual-Authorization display gate**: categories always visible; phrases only when dual-authorized
  in `en`; "N phrases to confirm" banner links out to the patient-confirmation surface (TRN/Screen 09).

## 5. Out of scope (MVP)

Tree authoring / LLM proposals / audio synthesis / ES indexing (**TRN**); gesture recognition & webcam
(**GEST**/libs/edge); event & alarm generation (**EVNT**); patient-session minting & authorities
(**ACS**, ADR-012); device pairing/heartbeat (**EDGE**); caregiver dashboard & history (**DASH/HIST**);
**server-side retrieval (Elasticsearch/kNN)** — Elastic Stack disabled at bootstrap, v1 is client-side
over the cached tree only; i18n beyond English (**ADR-018**).

## 6. Architectural principles

- **Module-as-library** (shared ADR-006): entry is the Nx library `@neuroassist/conv`; the thin
  `apps/conv` host is mounted by the Patient-Mode shell via `loadChildren`.
- **Standalone-first** features/components; **Signals-first** state (private `signal<T>` +
  `.asReadonly()`, no NgRx); **OnPush mandatory**; lazy-by-default routes (`loadComponent`).
- **Offline-first is non-negotiable** — the cache is the source of truth at runtime (ADR-005 local).
- **Input is a port, not a branch** — channels converge through a `NavigationIntentPort` seam; GEST
  pushes intents in-process and **never calls CONV over HTTP** (ADR-007 local).
- **Fail safe, never fake** — a missing audio clip degrades to device TTS then large text; it never
  pretends to have spoken. Guards never hardcode `return true`.
- **BE owns contracts** — FE consumes conv-service endpoints as published at M1.5; no invented URLs.

## 7. Success signals

| Signal | Target (draft — confirm with SPEC) |
|---|---|
| Time-to-interactive on station cold start (cached) | < 2 s |
| Navigation step latency (cache-served) | < 100 ms, **0 network calls** |
| Phrase → audio playback start (cached clip) | < 250 ms |
| Switch-scan selection reliability | 100% of levels reachable; configurable dwell/scan timing |
| Offline flow completion | 100% of cached-tree navigation + playback works with network off |
| Core Web Vitals (thin shell) | CLS < 0.1, FID/INP within budget |
