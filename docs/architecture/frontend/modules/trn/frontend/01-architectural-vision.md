# 01 — Architectural Vision — trn (TRN) Frontend

> Client: neuroassist-niv · Module: TRN — AI-Assisted Training (Speech Tree Authoring) ·
> Layer: Frontend (Angular 21 / Nx 22, signal-based, `libs/trn`) · Generated: 2026-11-22 ·
> Status: DRAFT — awaiting trn-service contract (BE M1.5, concurrent) and the G1 Patient-Mode host
> decision (shared with CONV/GEST) for the Screen 09 surface.

## 1. Intent (UX-driven)

At the end of a TRN interaction, a patient's speech tree has **grown by content both people trust**:
the caregiver has sat in a short, guided conversation with an assistant and proposed new
categories/phrases; the patient has **confirmed, adjusted, or rejected** each one through the channel
they still control; and only the phrases that **both** authorized are turned into audio in the
patient's own voice and published to CONV. The caregiver can **preview the synthesized voice** before
it reaches the patient, and always knows **what is still waiting** on the patient. Nothing authored
here ever interrupts the patient's live communication — TRN is the workshop, CONV is the voice.

## 2. Problem statement

**Current journey.** Growing a locked-in patient's vocabulary is ad-hoc: a caregiver guesses what to
add, there is no safe review that the patient themselves agrees, and turning text into the patient's
voice is a manual, error-prone, vendor-coupled step. A wrong or unwanted phrase could end up in the
one channel the patient has to ask for help.

**New journey.** TRN splits authoring from daily use (BA Amendment 4; ADR-016). In a **caregiver
training session** (Screen 08) an LLM (Anthropic Claude, **BE-mediated**) proposes
categories/phrases; the caregiver approves their side and previews the audio. In a **patient
confirmation surface** (Screen 09) the patient reviews only what the caregiver approved and confirms
at their own pace — no typing, no talking to the AI, just yes / short-adjust / no. **Dual
Authorization** is the gate: a node is synthesized (ElevenLabs) and published to CONV **only** when
`caregiverConfirmed && patientConfirmed` are both true. TRN never sits on the patient's live path.

## 3. Personas (job-to-be-done)

| Persona | Job-to-be-done | Surface |
|---|---|---|
| **Family Caregiver / Clinic Coordinator** (caregiver JWT, ACS) | "Propose + approve good phrases with LLM help, hear the voice preview, see what's pending." | **Screen 08** — caregiver web Shell. |
| **Patient-with-session** (patient-session token, ADR-012) | "Confirm / adjust / reject the prepared phrases through my channel, at my pace, no typing, no AI chat." | **Screen 09** — Patient-Mode host. |
| **LLM (Claude) + ElevenLabs** | BE-mediated proposal + synthesis vendors. | Behind `trn-service`; never called by the FE. |

## 4. MVP scope (in)

- **Screen 08 — Training session** (caregiver, `/training`): `ChatConversationPanel` (LLM dialog with
  streaming/async states), `ProposedNodeCard` list (per-profile dual-confirm indicator, caregiver
  **Approve** + **Edit**), **audio preview** of a proposal (ElevenLabs cached clip → device-TTS
  fallback), `EndSessionButton` (pending proposals persist as drafts). A persistent **"Training — not
  the patient app"** badge in the topbar (TECH-007) distinguishes it from the CONV runtime.
- **Screen 09 — Patient confirmation** (patient, Patient-Mode host): `PendingConfirmationList` (nodes
  `caregiverConfirmed=true && patientConfirmed=false`, en), **Confirm / Adjust / Reject**; Adjust
  offers **short LLM-suggested variations** (never free text); input-channel-agnostic (touch, gesture,
  switch scan) with large targets.
- **Dual-Authorization & lifecycle status** surfaced read-only: `draft → caregiver-approved →
  patient-pending → published (active in CONV) → retired`.
- **Consent gate** before synthesis/publish (voice-sample + ElevenLabs processing consent; ADR-017).

## 5. Out of scope (MVP)

The CONV daily **runtime** (navigation + playback — `libs/conv`); gesture recognition & webcam
(**GEST**); event/alarm generation (**EVNT**); caregiver dashboard (**DASH**); history/audit UI
(**HIST**); device pairing (**EDGE**); patient registration & command catalog (**PAT**); caregiver
identity & session minting (**ACS**). TRN does **not** implement CONV publish internals (ES indexing,
making a node active in the CONV snapshot — **BE-owned**, surfaced as status only); **no** FE-side
Claude/ElevenLabs calls; **no** free-text patient editing; **no** language beyond English (ADR-018).

## 6. Architectural principles

- **Module-as-library** (shared ADR-006): entry is the Nx library `@neuroassist/trn`; the caregiver
  Shell `neuroassist-niv-web` registers it via `TRN_MODULE_DESCRIPTOR`; the thin `apps/trn` host is
  the buildable/serveable target and e2e base.
- **Dual-shell, dual-identity, dual-authorization** (ADR-005 local): one lib, two surfaces, two
  tokens; publish only on both confirmations. The two surfaces never share a guard or a shell.
- **AI is BE-mediated, never FE-direct** (ADR-007 local): the FE talks only to `trn-service`; vendor
  keys never touch the browser.
- **Standalone-first** features/components; **Signals-first** state (private `signal<T>` +
  `.asReadonly()`, no NgRx); **OnPush mandatory**; lazy-by-default routes (`loadComponent`).
- **Fail safe, never fake** — LLM down surfaces an honest error and preserves drafts; missing audio
  degrades to device TTS then large text; publication waits on real synthesis. Guards never `return true`.
- **BE owns contracts** — TRN consumes `trn-service` endpoints as published at M1.5; no invented URLs;
  adapter default is `'mock'` until trn-service lands (Learning `scaffold:mock-adapter-default`).

## 7. Success signals

| Signal | Target (draft — confirm with SPEC) |
|---|---|
| Proposal round-trip (caregiver turn → LLM proposal rendered) | p95 < 4 s; visible streaming/typing state throughout |
| Audio preview start (cached clip) | < 300 ms; device-TTS fallback < 600 ms |
| Patient confirmation reachable in | ≤ 1 selection per proposal, any channel; 100% of pending reachable by switch scan |
| Dual-authorization correctness | 0 nodes published to CONV without both confirmations (hard invariant) |
| Fail-safe behaviour | LLM/ElevenLabs outage never loses a draft and never fabricates/fakes content |
| Core Web Vitals (both shells) | CLS < 0.1, INP within budget; OnPush + lazy + no Material |
