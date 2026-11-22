# Wireframe — NeuroAssist AI

> **Last updated:** 2026-08-31
> **Status:** draft; Screens 06/07 (Amendment 3, 2026-08-30) and Screens 08/09 (Amendment 4, 2026-08-31) are BA drafts — pending architect validation and not implemented in the existing Angular prototype
> **Persistence:** PERSISTENT — lives with the project throughout the MVP
> NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

# Pipeline Stage: UI Concept → Final Wireframe → Single-File HTML Prototype

## 1. Purpose of the Artifact

This document is the structured visual specification of the NeuroAssist AI dashboard — the source of truth for the frontend throughout the MVP. It comes after the UI Concept (0.3a, approved) and before the HTML Prototype (0.3c). It covers the 6 screens needed for the 7 main flows identified in the UI Concept: quick status check, alarm response, calibration adjustment, history review, patient/device onboarding, device status check, and false-positive feedback logging.

## 2. UX Principles That Must Guide the Prototype

Reused from `ui-concept.md` §2, without adaptation (all remain valid screen by screen):

1. Patient status is always visible at a glance.
2. An alarm is never ambiguous.
3. Every critical action requires explicit human confirmation.
4. Calibration is accessible to a non-technical person.
5. History is readable without jargon.
6. Device connectivity status is never hidden.
7. The most critical action never takes more than 2 clicks.

## 3. Global Structure of the Single-File HTML

### 3.1 Master Layout

> Product adaptation: **no side AI panel**. This product's AI (deterministic computer vision at the edge) has no representation of its own in the UI — it does not chat, does not suggest, has no "insights" panel. What the UI shows is the **result** of the AI (patient status, events, alarm), not the AI itself.

```text
┌──────────┬──────────────────────────────────────────────────────┐
│ Sidebar  │ Topbar — active patient · device status              │
│ navigation├─────────────────────────────────────────────────────┤
│          │                                                      │
│          │ Main content (active screen)                         │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### 3.2 Fixed Regions

#### A. Left sidebar
Navigation between: Status (home) · History · Calibration · (Onboarding — visible only to the technical lead role, does not appear for the caregiver in day-to-day use).

#### B. Top bar
Shows the active patient's name (Márcio Amaral) and the connectivity status of the edge device (online/offline + last sync) — always visible, never hidden in a submenu (Principle 2.6).

> **(Amendment 3, 2026-08-30, BA draft)** When the active device is the patient's own mobile phone (not the caregiver's fixed machine), the Topbar shows a **"patient mode"** indicator — a simple text badge (e.g., "Patient session · active since Aug 12") next to the connectivity status, without hiding or replacing the existing elements. This indicator only appears when `PatientSession.status = active` for the device in use — TODO[architect]: confirm whether this distinction is resolved in the frontend (same shell, conditional indicator) or whether the patient app is a separate, more restricted shell (CONV/GEST only, no History/Calibration sidebar) — see ADR-012/013.

#### D. Main content
Always present — renders the active screen.

#### E. Routine notification *(Amendment 1 — global toast, not a screen)*
When a `routine` (routine) urgency command is recognized (e.g., "water", "Frog"), the system shows a **discreet toast** over the active screen — it does not interrupt navigation, does not block the screen, and disappears after a few seconds or on manual dismiss. Unlike Screen 02 (Alarm), which is reserved exclusively for `emergency` (emergency) commands. Toast content: command label + timestamp (e.g., "Frog — now"), without requiring blocking confirmation (it is recorded in History for later review).

> There is no region C (side AI panel) in this product.

## 4. Navigation and Prototype Behavior

### 4.1 Navigation model

Simple sidebar navigation, no deep hierarchy — reflects the low screen density of the MVP (6 screens). The Alarm screen (5.2) is not a navigation destination: it **replaces** the active screen automatically when an `emergency` urgency command is recognized, regardless of where the caregiver is. `routine` urgency commands do **not** replace the screen — they only generate the region E toast (§3.2).

### 4.2 Recommended ID structure

```
#section-entry        (Screen 00 — brand moment)
#section-status         (Screen 01 — home)
#section-alarm         (Screen 02 — full-bleed overlay)
#section-history      (Screen 03)
#section-calibration     (Screen 04)
#section-onboarding     (Screen 05 — admin)
#section-conversation       (Screen 06 — speech tree) — (Amendment 3)
#section-activation-patient (Screen 07 — patient phone activation) — (Amendment 3)
#section-training    (Screen 08 — TRAINING session, caregiver/DASH shell) — (Amendment 4)
#section-confirmation-patient (Screen 09 — patient confirmation, patient-shell) — (Amendment 4)
```

### 4.3 Data model

```data-model
entity Tenant "Care unit — family or clinic (multi-tenant, schema-per-tenant)"
  id          string pk
  name        string
  type        enum family|clinic

entity Patient "Person monitored by the system"
  id          string pk
  tenantId    ref Tenant label=name
  name        string
  device ref EdgeDevice label=status

entity Caregiver "Person with access to the dashboard"
  id          string pk
  tenantId    ref Tenant label=name
  name        string
  email       string
  role       enum caregiver|clinic_coordinator

entity GestureType "Catalog of facial movement types (primitives) recognized by the detection engine — extensible (Amendment 2, 2026-07-27)"
  id     string pk
  name   string

entity Command "Item in the patient's command catalog — gesture (simple or compound) mapped to a need (LBC Amendment 1, 2026-07-27)"
  id                    string pk
  patientId            ref Patient label=label
  label                string
  urgency              enum emergency|routine
  primaryPrimitive    ref GestureType label=name
  secondaryPrimitive?  ref GestureType label=name
  sensitivity         enum low|media|alta
  minGestureDurationMs    int
  maxGestureDurationMs    int

entity Event "Structured occurrence generated by the edge"
  id             string pk
  patientId     ref Patient label=name
  command        ref Command label=label
  timestamp      datetime
  confirmedAt   datetime? source=mock
  confirmedBy  ref Caregiver label=name
  feedback       enum not_evaluated|real|false_positive

entity EdgeDevice "Local agent that runs gesture detection"
  id                   string pk
  patientId           ref Patient label=name
  status               enum online|offline
  lastSyncAt  datetime
  version               string

entity SpeechTreeNode "Speech tree node — category or phrase (Amendment 3, 2026-08-30, BA draft)"
  id          string pk
  patientId  ref Patient label=name
  paiId       ref SpeechTreeNode? label=text
  type        enum category|phrase
  text       string
  order       int

entity PatientSession "Persistent patient app session, provisioned by the caregiver (Amendment 3 — final identity model is TODO[architect], see ADR-012)"
  id              string pk
  patientId      ref Patient label=name
  provisionedBy ref Caregiver label=name
  deviceId   ref EdgeDevice label=status
  status          enum active|revoked
  revokedAt      datetime?
  revokedBy     ref Caregiver? label=name
```

> **Note (Amendment 1):** `ProfileCalibration` (1 per patient) no longer exists as an entity — it was replaced by `Command` (N per patient). `label` is free text defined by the family (e.g., "Frog", "Armpit", "water" — the system does not interpret the meaning, see LBC §7.2). `secondaryPrimitive` null = simple gesture (1 primitive); filled = compound gesture (2 combined primitives, e.g., blink 2x + eyebrow). `Event.command` replaces the former fixed `Event.type` of `HELP_REQUESTED` — the event type is the triggered command itself, and its urgency (emergency/routine) comes from `Command.urgency`.
>
> **Note (Amendment 3, 2026-08-30, BA draft):** `SpeechTreeNode` and `PatientSession` are new entities, **not yet implemented** in the existing Angular prototype (`design/angular-prototype/`) — they cover Screens 06/07 below. `PatientSession` models only the audit trail (who provisioned, status, revocation); the **actual authentication mechanism** behind it (device token vs. delegated session vs. its own actor) is an open decision — see ADR-012 (BA draft). Do not confuse `PatientSession` with `Caregiver` — the patient still has no login of their own (username/password); the session is provisioned, not created by them.
>
> **Note (Amendment 2, 2026-07-27):** `primaryPrimitive`/`secondaryPrimitive` are no longer a closed enum of 6 values — they now reference `GestureType`, an **extensible catalog**. The caregiver/technical lead can register a new movement type (e.g., "Lip reading") directly on Screen 04, without waiting for a release. The initial catalog (eyebrow, double blink, quick blink, slow blink, close eyes, move nose) is a seed, not a ceiling. **Note:** registering the *name* of a gesture type in the UI does not imply that the (edge) detection engine already knows how to recognize it — see `TODO[architect]` in Framing §6.1/§9.3.

## 5. Final Visual Wireframe per Screen

---

# SCREEN 00 — Entry

> momento-marca: true

## 5.1 Purpose

Entry/login screen — a brand moment, outside the navigation shell. Establishes the product's calm and trustworthy identity before any operational data appears.

## 5.2 Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│                    [brand icon — network of people]            │
│                                                                │
│              "A gesture you will not miss."                    │
│         Ordinary webcam, reliable alarm, no expensive hardware.│
│                                                                │
│                     [ Enter the dashboard ]                    │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## 5.3 Components
- Logo (dark background version — `logo-white.png`)
- Title + subtitle (brand visual tone)
- Single CTA button "Enter the dashboard"

## 5.4 Data — bindings
- reads: (none — static screen, no operational data)
- writes: (none)
- mock: (not applicable)

## 5.5 State of the differentiating elements

No AI panel on this screen. The only differentiating element is the full-bleed visual treatment (dark background, large typography, no sidebar/topbar) — it reinforces the "silent guardian" intent before entering the operational area.

---

# SCREEN 01 — Status (home)

## 5.1 Purpose

Answer, within 2 seconds of reading, "Is Márcio okay?" — the product's central question (Principle 2.1). Also shows the edge device status without requiring extra navigation (Principle 2.6), covering flow 4.6.

## 5.2 Visual structure

```text
┌──────────┬──────────────────────────────────────────────────────┐
│ Status ● │  Márcio Amaral            🟢 Device online            │
│ History  │──────────────────────────────────────────────────────│
│Calibration│                                                      │
│          │            ✓ (large, green)                          │
│          │         Márcio is okay                               │
│          │   Last check: 8:12 AM · synced just now              │
│          │                                                       │
│          │   [ View today's history ]                           │
└──────────┴──────────────────────────────────────────────────────┘
```

## 5.3 Components
- StatusCard (large icon + status text + timestamp)
- DeviceStatusBadge (online/offline + last sync) — also present in the Topbar (3.2.B)
- Quick link to today's History

## 5.4 Data — bindings
- reads: Patient[], EdgeDevice[], Event[] (for the day, with `Event.command` resolved to label + urgency)
- writes: (none at this time — read-only)
- mock: patients = Patient × 1
- mock: devices = EdgeDevice × 1
- mock: commands = Command × 3 (patient's catalog)
- mock: events = Event × 8 (filtered in the component to the current day, referencing catalog commands)

## 5.5 State of the differentiating elements

No AI panel. This screen's "differentiating element" is the **calm-by-default state** (green, check icon, sober tone) — a color scheme reserved and never alarming here, even in the case of past events already confirmed during the day. *(Amendment 1)* The last event of the day shows which command was triggered (catalog label, e.g., "water"), not just a binary okay/not-okay state — but the visual treatment (green/calm) only changes to alarm if the command has `urgency=emergency` and is unconfirmed (in that case, Screen 02 takes over the entire screen before the caregiver even navigates here).

**Required states:** empty (no events today — shows only "Márcio is okay" without an events section), loading (StatusCard skeleton), error (failure to fetch status — clear, non-technical message), offline (device offline — amber badge, but the screen does NOT become an alarm; the alarm is reserved exclusively for `HELP_REQUESTED`).

---

# SCREEN 02 — Alarm

## 5.1 Purpose

Be absolutely unmistakable at the moment Márcio needs help (Principle 2.2) and require explicit human confirmation before returning to the normal state (Principle 2.3). Covers flow 4.2 (the product's core flow). *(Amendment 1)* This screen is **exclusive to `emergency` urgency commands** in the catalog (e.g., "request help") — `routine` commands (e.g., "water") never reach here, they only generate the region E toast (§3.2).

## 5.2 Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│                    ⚠ (large icon, white on red)                │
│                                                                │
│                Márcio needs help                               │
│                Gesture detected at 2:32 PM                     │
│                                                                │
│           [ Confirm that I attended to Márcio ]                │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

The command label (e.g., "Help") replaces the generic text if that makes sense for the family — but the visual treatment (full-bleed, `--color-alarm`) is always the same for any `emergency` command and does not vary by label.

## 5.3 Components
- AlarmOverlay (full-bleed, `--color-alarm` color, replaces any active screen)
- Event timestamp
- Single confirmation button (no other action available — total focus)

## 5.4 Data — bindings
- reads: Event[] (same collection used by Home/History — the active event is filtered in the component: most recent with `Command.urgency = emergency` and still without `confirmedAt`; it is not a separate collection — avoid duplicating "active_event" as its own table, it is just a query)
- writes: Event.confirmedAt, Event.confirmedBy
- mock: events = Event × 9 (includes 1 without confirmedAt with urgency=emergency, to exercise the alarm)

## 5.5 State of the differentiating elements

This screen **is** the product's differentiating element — the only surface that uses `--color-alarm`, a color deliberately outside the brand palette (see Design System §2). There is no AI panel, no navigation, no other possible action besides confirming. No other error/empty state applies — this screen only exists when there is an active event.

---

# SCREEN 03 — History

## 5.1 Purpose

Let the caregiver review events of the day/week/month in human language (Principle 2.5) and record false-positive/false-negative feedback (flow 4.7). Covers flow 4.4.

## 5.2 Visual structure

```text
┌──────────┬──────────────────────────────────────────────────────┐
│ Status   │  History                                             │
│ History ●│──────────────────────────────────────────────────────│
│Calibration│  [ Today ] [ Week ] [ Month ]                        │
│          │                                                       │
│          │  2:32 PM — "water"                                   │
│          │          You confirmed at 2:33 PM      [Was it real?]│
│          │                                                       │
│          │  8:05 AM — "Frog"                                    │
│          │          You confirmed at 8:06 AM   [✓ Marked real] │
│          │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

## 5.3 Components
- FilterTabs (today/week/month)
- EventListItem *(Amendment 1)* — shows the **command label** (`Event.command.label`), no longer a fixed gesture text (e.g., "water" or "Frog", in quotes — it is the family's word, not a system description); urgency badge (emergency/routine) next to the label
- Feedback action ("Was it real?" → sets `Event.feedback`)

## 5.4 Data — bindings
- reads: Event[] (filtered by period, with `Event.command` resolved to label + urgency)
- writes: Event.feedback
- mock: events = Event × 8 (covering today/week/month, varying among the catalog commands)

## 5.5 State of the differentiating elements

No AI panel. Differentiator: each history item shows the command label as the family wrote it (never a technical log such as `event_type=HELP_REQUESTED`) — for a new caregiver without context on the family's code, the label alone may not be self-explanatory (see risk in LBC §12, Amendment 1).

**Required states:** empty ("No events in this period — good sign"), loading (list skeleton), error (failure to fetch history).

---

# SCREEN 04 — Calibration

> **Amendment 1 (2026-07-27):** screen rewritten from "1 single form" to **command catalog** management (list + per-command editor).

## 5.1 Purpose

Let a non-technical person manage Márcio's **command catalog** (add, edit, remove) and calibrate each one independently — gesture, sensitivity and urgency level (Principle 2.4). Covers flow 4.3, now extended from "1 gesture" to "N commands, each with its own calibration".

## 5.2 Visual structure

```text
┌──────────┬──────────────────────────────────────────────────────┐
│ Status   │  Calibration — Márcio Amaral           [+ New command]│
│ History  │──────────────────────────────────────────────────────│
│Calibration●│  🔴 Help           eyebrow 2x                    [›] │
│          │     emergency · medium sensitivity                   │
│          │                                                       │
│          │  🔵 water          eyebrow + blink 2x            [›] │
│          │     routine · high sensitivity                       │
│          │                                                       │
│          │  🔵 Frog           quick + slow blink            [›] │
│          │     routine · medium sensitivity                     │
│          │                                                       │
└──────────┴──────────────────────────────────────────────────────┘

── when opening a command (editor) ───────────────────────────────
┌──────────────────────────────────────────────────────────────┐
│  Command: [ water                                   ]         │
│  Urgency: ( ) Emergency  (●) Routine                           │
│                                                                │
│  Main gesture:      [ Raise eyebrow ▾ ]                        │
│  + Add second gesture (combination):                           │
│                     [ Blink 2x ▾ ]               [remove]      │
│                                                                │
│  Sensitivity:    Low ───────●─────── High                      │
│                                                                │
│  [ Test now with the webcam ]                                  │
│                                                                │
│  [ Cancel ]                            [ Save command ]        │
└──────────────────────────────────────────────────────────────┘
```

## 5.3 Components
- CommandList *(new)* — lists the catalog, each item shows label, urgency badge (`--color-alarm` color for emergency, neutral color for routine), gesture (1 or 2 primitives) and sensitivity; action to open the editor or remove
- CommandEditor *(new)* — form for the individual command, reuses the fields below; opens for "New command" or editing an existing one
- LabelInput — free-text field for the label (the family writes their own code word, e.g., "water", "Frog" — no suggestion or meaning validation)
- UrgencySelector *(new)* — binary emergency/routine choice, with an inline explanation that emergency triggers Screen 02 (full-bleed) and routine triggers only the toast (§3.2.E)
- GestureSelector *(Amendment 2)* — dropdown over the `GestureType` catalog (visual examples, not technical names), used 1x for the main primitive and optionally 1x more for the secondary one (compound gesture); includes a "+ Register new gesture type" action (e.g., "Lip reading") that adds it to the catalog and selects it immediately — the catalog is no longer closed at 6 values
- SensitivitySlider (visual, 3-5 named levels, not raw numeric values)
- TestLiveButton (tests the gesture combination live before saving — critical when there are 2 primitives, since the false-negative risk is higher, see LBC §12 Amendment 1)
- SaveButton / RemoveButton (per command)

## 5.4 Data — bindings
- reads: Command[] (all for the active patient)
- writes: Command (create/edit/remove), fields: label, urgency, primaryPrimitive, secondaryPrimitive, sensitivity
- mock: commands = Command × 3 — inspired by Márcio's real catalog: "Help" (emergency, eyebrow), "water" (routine, eyebrow + blink 2x), "Frog" (routine, quick + slow blink)

## 5.5 State of the differentiating elements

No AI panel. The "live test" remains the differentiating element — even more important now, because testing a 2-primitive combination leaves less margin for error than testing a single primitive. The list (CommandList) is this screen's new structural element: it replaces the single form of v1.

**Required states:** empty (catalog with no commands — CTA "Add first command"), loading (list skeleton), error (failure to save — clear message), syncing (waiting for the full catalog to propagate to the edge device on the next heartbeat).

---

# SCREEN 05 — Onboarding (admin/setup)

## 5.1 Purpose

Initial registration of the tenant, patient and edge device pairing — carried out once by Danilo Amaral (technical lead), not by the caregiver in day-to-day use. Covers flow 4.5.

## 5.2 Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│  Initial setup                                               │
│──────────────────────────────────────────────────────────────│
│  1. Care unit:            [ Amaral Family             ]       │
│  2. Patient:              [ Márcio Amaral             ]       │
│  3. Edge device:          [ Pairing... ● ]                    │
│  4. First command:        → goes to Screen 04 (catalog)       │
│  5. Invite caregiver:     [ Jamilly Amaral · email    ]       │
│                                                                │
│                    [ Finish setup ]                            │
└──────────────────────────────────────────────────────────────┘
```

## 5.3 Components
- Step wizard (tenant → patient → device → first command → invite)
- DevicePairingStatus (indicator of pairing in progress)
- InviteCaregiverForm

## 5.4 Data — bindings
- reads: Tenant[], Patient[], EdgeDevice[]
- writes: Tenant, Patient, EdgeDevice, Caregiver (creates the records); Command (optionally already creates the first catalog command, if the lead fills it in on Screen 04 before coming back)
- mock: (setup screen — no mock, real data entered during the flow)

## 5.5 State of the differentiating elements

No AI panel. Single-use/rare screen — not part of the caregiver's daily routine, so it does not appear in their sidebar (visible only to the technical lead role).

**Required states:** loading (device pairing in progress), error (failure to pair device — retry guidance), success (confirmation before redirecting to Screen 01).

---

# SCREEN 06 — Speech Tree *(Amendment 3, 2026-08-30 — BA draft, not implemented in the prototype)*

## 5.1 Purpose

Let the patient navigate a tree of categories → phrases and communicate a specific need, using whichever input channel they can operate — gesture (reusing GEST) or direct touch/mouse. Covers requirements §3.1 of the post-handoff briefing. This screen is the main destination of "patient mode" (see §3.2.B).

## 5.2 Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│  🔵 Patient session                  🟢 Device online         │
│──────────────────────────────────────────────────────────────│
│                                                                │
│   [ 🥤 I need something ]  [ 🛏 Reposition ]  [ 💬 Speak ]     │
│                                                                │
│         (selected node highlighted — same destination         │
│          reachable by recognized gesture OR by touch)        │
│                                                                │
│                    [ ‹ Back to categories ]                    │
└──────────────────────────────────────────────────────────────┘
```

When a leaf node (phrase) is selected, the system plays the phrase aloud (TTS — exact scope to be confirmed with the architect) and optionally generates an `Event` in the existing command catalog, if the node is mapped to a `Command` (see TODO[architect] in Framing §4.8/§12 question 6 — mapping not yet decided).

## 5.3 Components

- SpeechTreeNavigator *(new)* — renders the active level of the tree (categories or leaf phrases), visually highlights the currently "selected" node regardless of the input channel
- InputChannelIndicator *(new)* — discreetly shows which channel is active (gesture or touch), without requiring a prior manual choice — both channels can coexist and feed the same selected-node model
- TTSPlayer *(new, scope to be confirmed)* — plays the selected phrase aloud
- BackButton — goes back to the previous level of the tree

## 5.4 Data — bindings

- reads: `SpeechTreeNode[]` (filtered by `patientId` and `paiId` of the active level)
- writes: (no direct writes on this screen — node selection may generate an `Event`, see TODO[architect] above)
- mock: TODO — no mock defined yet; this screen does not exist in the current Angular prototype, see the document's status note

## 5.5 State of the differentiating elements

No AI panel. The differentiating element is the `InputChannelIndicator` — it reinforces to the patient and the caregiver that the same destination is reachable by any available channel, with no hierarchy between them.

**Required states:** empty (tree not yet configured for this patient — CTA for the caregiver to set it up), loading (node skeleton), error (failure to load tree), TTS unavailable (visual fallback — phrase text highlighted, without audio).

---

# SCREEN 07 — Patient Phone Activation *(Amendment 3, 2026-08-30 — BA draft, not implemented in the prototype)*

## 5.1 Purpose

Let the caregiver activate the patient's mobile phone as a full edge device (own webcam + speech tree), provisioning a persistent session without requiring a credential of the patient's own. An extension of the existing pairing flow (Screen 05) for the case "the device is the patient's own mobile phone", not a replacement for it — TODO[architect]: confirm whether it reuses the same pairing-code flow (`awaiting-claim` → heartbeat, already implemented) or requires its own provisioning flow (see Framing §12, question 7).

## 5.2 Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│  Activate patient's phone                                    │
│──────────────────────────────────────────────────────────────│
│  1. Patient:               [ Márcio Amaral            ]       │
│  2. Patient's phone:       [ Pairing... ● ]                   │
│  3. Persistent session:    ⚠ does not expire — revocable at   │
│                               any time on this screen          │
│                                                                │
│                    [ Activate patient's phone ]                │
│──────────────────────────────────────────────────────────────│
│  Active sessions for this patient:                            │
│  📱 Márcio's iPhone — active since Aug 30        [ Revoke ]   │
└──────────────────────────────────────────────────────────────┘
```

## 5.3 Components

- DevicePairingStatus (reused from Screen 05)
- PersistentSessionWarning *(new)* — explicit warning that the session does not expire, before confirming activation
- ActiveSessionsList *(new)* — lists the patient's `PatientSession[]`, with an individual revoke action (constraint SEC-001 — mandatory mechanism, not optional)
- RevokeButton *(new)* — revokes a `PatientSession` (`status → revoked`, `revokedAt`, `revokedBy`)

## 5.4 Data — bindings

- reads: `Patient[]`, `EdgeDevice[]`, `PatientSession[]` (for the active patient)
- writes: `PatientSession` (create on activation; update `status`/`revokedAt`/`revokedBy` on revocation)
- mock: TODO — no mock defined yet; this screen does not exist in the current Angular prototype

## 5.5 State of the differentiating elements

No AI panel. The differentiating element is the `ActiveSessionsList` with revocation always visible and easy to reach — never hidden behind advanced settings, given that SEC-001 marks revocation as a mandatory mechanism.

**Required states:** loading (pairing in progress), error (failure to activate — retry guidance), success (confirmation + session appears in the list), empty (no active patient session yet).

---

---

# SCREEN 08 — Training (LLM session) *(Amendment 4, 2026-08-31 — BA draft, not implemented in the prototype)*

## 5.1 Purpose

Let the caregiver start/follow a conversation with the LLM to propose new categories/phrases for the speech tree (CONV) — a phase separate from the patient's daily use (ADR-016). Lives in the caregiver shell (§3.1/§3.2.A, DASH), not in the patient's restricted shell. What is proposed here stays pending until the patient confirms on Screen 09 — see ADR-018 (English-only product) and ADR-016 (dual-authorization RBAC).

## 5.2 Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│  Speech tree training                                         │
│──────────────────────────────────────────────────────────────│
│  💬 LLM: "Want to add a phrase to ask for water with ice?"    │
│  💬 Caregiver: "Yes, and one to call Danilo as well"          │
│──────────────────────────────────────────────────────────────│
│  Pending proposals                                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 💧 "I want water with ice"      [✅ caregiver]           │  │
│  │    category: I need something   [⏳ patient]    [Edit]   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 📞 "Call Danilo"                [⏳ caregiver]           │  │
│  │    category: Speak              [⏳ patient]   [Approve] │  │
│  └────────────────────────────────────────────────────────┘  │
│                    [ End training session ]                    │
└──────────────────────────────────────────────────────────────┘
```

Each proposal shows the approval status **per profile** (`caregiverConfirmed`/`patientConfirmed`, see ADR-016/ADR-018) — only when both become `true` is the node indexed in Elasticsearch and synthesized in ElevenLabs (ADR-015/017). The caregiver can approve their own side here; the patient's confirmation happens asynchronously on Screen 09.

## 5.3 Components

- ChatConversationPanel *(new)* — history of the conversation with the LLM (Claude/Anthropic API, see ADR-016), caregiver's text/voice input
- ProposedNodeCard *(new)* — shows the proposal (category/phrase), with a dual confirmation indicator (`caregiver`/`patient`), an "Approve" button (caregiver side) and "Edit"
- EndSessionButton — ends the training session (does not discard pending proposals — they stay as drafts, see ADR-016)

## 5.4 Data — bindings

- reads: `SpeechTreeNode[]` (filtered by `status = draft`, with `content.en`), conversation history of the active TRAINING session
- writes: `SpeechTreeNode` (create proposal coming from the LLM; update `content.<locale>.caregiverConfirmed` when approving the caregiver side)
- mock: TODO — no mock defined yet; this screen does not exist in the current Angular prototype

## 5.5 State of the differentiating elements

Explicit AI panel (`ChatConversationPanel`) — it is the only screen in the product where an LLM generates content; visually reinforce that this is different from the CONV runtime (Screen 06), which never generates new text (TECH-007). Suggested label: "Training — not the patient app" badge in this screen's topbar.

**Required states:** empty (no session started — CTA "Start training"), loading (LLM responding), error (failure to call the Claude/Anthropic API), session ended with pending proposals (warning that they remain drafts until the patient confirms).

---

# SCREEN 09 — Patient Confirmation (Training) *(Amendment 4, 2026-08-31 — BA draft, not implemented in the prototype)*

## 5.1 Purpose

Let the patient see the proposals already approved by the caregiver (Screen 08) and confirm or adjust them, at their own pace — without requiring a synchronous screen handoff with the caregiver (ADR-016 §"UI handoff"). Lives in the patient's restricted shell (`patient-shell.component.ts`, the same shell as Screen 06 — see §6 below).

## 5.2 Visual structure

```text
┌──────────────────────────────────────────────────────────────┐
│  🔵 Patient session                  🟢 Device online         │
│──────────────────────────────────────────────────────────────│
│  New phrases to confirm                                       │
│                                                                │
│   💧 "I want water with ice"                                  │
│      [ ✅ Confirm ]   [ ✏️ Adjust ]   [ ✕ Reject ]             │
│                                                                │
│                    [ ‹ Back to conversation ]                  │
└──────────────────────────────────────────────────────────────┘
```

Only proposals with `content.<locale>.caregiverConfirmed = true` appear here. Adjust/Reject does not edit the text freely (the patient may have limited motor ability) — it uses the same input-channel-agnostic mechanism as Screen 06 (gesture or touch) to choose among short options presented by the LLM.

## 5.3 Components

- PendingConfirmationList *(new)* — lists nodes with `caregiverConfirmed=true` and `patientConfirmed=false`
- ConfirmButton *(new)* — writes `content.<locale>.patientConfirmed = true`; if the other side (caregiver) was already `true`, triggers indexing (ES) + synthesis (ElevenLabs) for that node
- AdjustButton *(new)* — opens short variations suggested by the LLM for the patient to choose from (not free text editing)
- RejectButton *(new)* — discards the proposal (the node stays as a draft elsewhere, if applicable)

## 5.4 Data — bindings

- reads: `SpeechTreeNode[]` (filtered by `patientId`, `content.<locale>.caregiverConfirmed = true`, `content.<locale>.patientConfirmed = false`)
- writes: `SpeechTreeNode.content.<locale>.patientConfirmed`
- mock: TODO — no mock defined yet; this screen does not exist in the current Angular prototype

## 5.5 State of the differentiating elements

No active LLM panel here — the conversation already happened on Screen 08; this screen is confirmation only, reinforcing that the patient never needs to "talk to the AI" directly, only decide yes/no/adjust on what has already been proposed.

**Required states:** empty (no pending proposals — screen does not appear/discreet CTA), loading, error, confirmation recorded (visual success feedback before returning to Screen 06).

---

## 6. Addendum (2026-08-30) — Shell decision for the patient session

> This block is an **addition**, not a rewrite of the sections above — Screens 06/07 and the Topbar
> note in §3.2.B remain exactly as recorded. This addendum closes the question that
> §3.2.B left as a `TODO[architect]` ("same shell with a conditional indicator, or a separate
> shell?"), now that ADR-011/012/013/014 are all `accepted`.

**Decision (BA/UX, Danilo Amaral):** the patient's mobile phone uses a **separate, more restricted shell**
(`patient-shell.component.ts` in the prototype) when the active device carries an active
`PatientSession` — not the same shell as the caregiver (§3.1/§3.2.A) with a conditional item.

**Why:** the patient's phone carries two independent identities with much smaller authority than
the caregiver — a device token (`edge.device`, for GEST) and the patient session from ADR-012
(`conv.tree.navigate`/`conv.node.select`, no management). A single shell with the full
sidebar (Status · History · Calibration · Onboarding) and a conditional indicator would
hide those routes via CSS/client-side state, not through the real absence of a route — unnecessary
attack surface and UX confusion for someone without the fine motor control to "not click there".
The separate shell never renders those routes for the patient session.

**What changes in practice (Screen 06):** Screen 06 (Speech Tree) now lives inside this restricted
shell, not the caregiver's shell (§3.1). The "patient mode" indicator described in §3.2.B
continues to exist as a concept, but stops being a variation of the caregiver's Topbar — it lives in the
minimal topbar of the restricted shell (active patient + device connectivity status, no
sidebar).

**Out of scope of this addendum:** the real RBAC that enforces this separation in the backend (that is
implementation, not a UX decision — see ADR-012 TODO[architect]). This addendum decides only the shape of the
shell in the frontend.

---

## 7. Addendum (2026-08-31) — TRAINING and assisted semantic search

> This block is an **addition** — Screens 01-07 and the previous addenda remain exactly as
> recorded. It settles the shell placement of Screens 08/09 (new) and documents the visual impact
> of Amendment 4 (Elasticsearch/pure retrieval, TRAINING, ElevenLabs) on the already existing
> Screen 06, now that ADR-015/016/017/018 are all `accepted`.

**Screen 08 (Training) shell:** lives in the caregiver shell (§3.1/§3.2.A, DASH) — same logic
as addendum §6: whoever leads authoring has the full sidebar (Status · History · Calibration ·
Onboarding · **Training**, a new menu item). It is not a patient screen.

**Screen 09 (Patient confirmation) shell:** lives in the patient's restricted shell
(`patient-shell.component.ts`, the same as Screen 06, see §6) — the patient session from ADR-012 gains
a new route (`conv.training.confirm`, provisional name) in addition to `conv.tree.navigate`/
`conv.node.select`. Still no sidebar, still no management authority.

**What changes on Screen 06 (Speech Tree) — without rewriting the original section:** the `SpeechTreeNavigator`
can now be fed by semantic search (Elasticsearch/kNN, pure retrieval, see ADR-015)
in addition to the manual category→phrase navigation already described in §5.2 of Screen 06 — manual navigation
continues to exist as behavior and as a fallback (constraint OPS-003) if Elasticsearch goes down.
The `TTSPlayer` of Screen 06 no longer has "scope to be confirmed": it plays the **cached** audio (ElevenLabs,
synthesis only in TRAINING — ADR-017), falling back to the browser's native TTS (Web Speech API)
if the audio is not available (constraint OPS-004).

**English-only (ADR-018-english-only-product) on Screens 06/08/09:** no language selector is shown on these
screens; all content is English. A node is "ready" for the patient once
`caregiverConfirmed=true AND patientConfirmed=true`, and only such nodes are shown/searched on Screen 06.

**Out of scope of this addendum:** the real schema of `SpeechTreeNode.content`, the asynchronous
indexing/synthesis pipeline, integration with the Claude/Anthropic API — all of this is implementation
(see ADR-015/016/017, TODO[architect] section of each). This addendum decides only the shape of the shell
and the visual impact on existing and new screens.

---
