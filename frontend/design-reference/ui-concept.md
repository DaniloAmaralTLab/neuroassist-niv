# UI Concept — NeuroAssist AI

> **Last updated:** 2026-07-27
> **Status:** draft

This document captures the **UX intent** that precedes the structured wireframe.
It defines principles, a persona journey and main flows that guide all
design decisions for the caregiver dashboard.

---

## 1. Intent

NeuroAssist AI should convey the feeling of a **silent, trustworthy guardian** — something that exists in the background of the caregiver's routine, without demanding constant attention, but that becomes **absolutely unmistakable** the moment the patient needs help.

The experience is designed for a person who:
- is not a technology user by profession — a family caregiver, with neither the time nor the patience for complex interfaces;
- looks at the dashboard **peripherally and sporadically** throughout the day, not as a continuous work tool;
- needs, at the moment of a real alarm, to recognize the emergency **instantly**, without ambiguity and without having to interpret data.

This differs from a dense operational dashboard (like a management cockpit): here, most of the time the screen should be **calm and discreet** — the opposite of constant anxiety — reserving visual intensity (color, sound, contrast) exclusively for the moment when the alarm truly fires.

---

## 2. UX Principles

Each principle is **actionable**: someone must be able to look at a screen and say
"this violates principle N".

### 2.1 Patient status always visible at a glance

On opening the dashboard, the caregiver immediately sees whether everything is normal, without navigating. There is no "neutral" home screen that requires interpretation.

**How to verify:** if the home screen does not answer "Is Márcio okay?" within 2 seconds of reading, it violates the principle.

### 2.2 The alarm is never ambiguous

When a `HELP_REQUESTED` event fires, the interface changes in an unmistakable way: alert color, large text, filling the entire screen — not a discreet badge in the corner.

**How to verify:** show the alarm screen to someone who has never used the product. Within 1 second, does the person recognize it as an emergency? If not, refine it.

### 2.3 Every critical action requires explicit human confirmation

No alarm "disappears" on its own. The caregiver must explicitly confirm that they responded, before the system returns to the normal state.

**How to verify:** every alarm has an explicit confirmation button (e.g. "Confirm I attended to Márcio") — without it, the alarm screen cannot go away.

### 2.4 Calibration is accessible to a non-technical person

Adjusting gesture sensitivity uses simple visual controls (sliders, examples, live tests) — never raw technical fields (e.g. "threshold: 0.73").

**How to verify:** ask someone without technical training to adjust the sensitivity without help. If they get stuck, it violates the principle.

### 2.5 History is readable without technical jargon

Events appear in human language ("Márcio raised his eyebrow at 14:32 — you confirmed at 14:33"), never as a technical log (`event_type=HELP_REQUESTED`).

**How to verify:** any history entry must make sense to someone reading it for the first time, without explanation.

### 2.6 Device connectivity status is never hidden

Even though the local alarm works offline (constraint OPS-001 of the Framing), the caregiver must always see whether the dashboard is in sync with the device — this cannot be buried in a settings screen.

**How to verify:** the device status (online/offline, last sync) appears on the main screen, not only in "Settings".

### 2.7 The most critical action never takes more than 2 clicks

Viewing the patient's current status and confirming an alarm must be the fastest actions in the system — never hidden behind menus.

**How to verify:** time the path from the home screen to confirming an alarm. More than 2 taps/clicks violates the principle.

---

## 3. Persona in a journey

> **Scope note:** the MVP has a single real user persona — Jamilly Amaral (caregiver). Márcio Amaral is the monitored patient, non-verbal, with no direct interaction with the interface. There is no second validated persona in this phase (see LBC §4).

### 3.1 Journey — Jamilly Amaral (Family Caregiver)

```
Morning (arrives for the care shift)
  → Opens the dashboard on the laptop/tablet
  → Home screen: "Márcio — monitoring normally. Last check: 08:12."
  → Checks it and carries on with the day's routine, dashboard in the background

During the day (peripheral use, not continuous)
  → Dashboard open in the background, demanding no attention
  → HELP_REQUESTED event is detected at 14:32
  → Local audible alarm fires immediately (works even if the internet goes down)
  → Screen changes to the full-screen alarm screen — unmistakable
  → Jamilly goes to Márcio and attends to the need
  → Returns to the dashboard and confirms "Confirm I attended to Márcio"
  → Screen returns to the normal state

End of the day
  → Reviews the day's history: how many events, how many were confirmed
  → Notices a false positive (e.g. involuntary gesture) and slightly adjusts the sensitivity
```

**Frequency of use:** continuous in the background, with few active interactions per day (morning check + occasional alarm + evening review).
**Main device:** laptop or fixed tablet near the care environment.
**Dominant goal:** trust that, if Márcio needs help, she will know — without having to watch constantly.

---

## 4. Main flows

### 4.1 Flow — Quick status check (parent flow)

```
1. Jamilly opens the dashboard
2. System immediately shows: patient + current state (normal/alarm/offline)
3. Jamilly visually confirms that everything is fine
4. End — no further action needed
```

### 4.2 Flow — Alarm response

```
1. GestureDetectionEngine (edge) recognizes the configured gesture
2. LocalAlarmPlayer immediately fires the local audible alarm (works offline)
3. Event syncs with the backend when connectivity is available
4. Dashboard changes to the full-screen alarm screen, showing the event time
5. Jamilly attends to Márcio
6. Jamilly confirms "Confirm I attended" on the dashboard
7. System records the confirmation time and returns to the normal state
```

### 4.3 Flow — Sensitivity calibration adjustment

```
1. Jamilly notices a false positive or false negative in the history
2. Opens the patient's calibration screen
3. Adjusts gesture sensitivity/timing via simple controls (slider, live test)
4. System saves and syncs the new calibration back to the edge device
```

### 4.4 Flow — History lookup

```
1. Jamilly opens the history screen
2. Sees a list of events in human language (date, time, gesture type, whether it was confirmed)
3. Can filter by period (today, week, month)
```

### 4.5 Flow — Initial onboarding (patient + device registration)

```
1. Danilo (technical operator) registers the tenant (Amaral family)
2. Registers the patient (Márcio Amaral)
3. Pairs the edge device with the patient
4. Performs the initial gesture calibration (e.g. raise eyebrow)
5. Jamilly is invited as a caregiver with dashboard access
```

### 4.6 Flow — Device status check (edge online/offline)

```
1. Jamilly sees the edge device status on the dashboard (online/offline, last sync)
2. If offline for a long time, the dashboard visually highlights the warning (without being as intense as the patient alarm)
3. Jamilly physically checks the device/connection
```

### 4.7 Flow — Recording false positive/negative feedback

```
1. Jamilly identifies, in the history, an event that was not real (false positive)
2. Marks the event as "not a real call for help"
3. System uses this feedback as input for future recalibration suggestions (expansion — not required in the MVP)
```

---

## 5. High-level visual tone

### Density
- **Default:** **spacious/comfortable** — little information per screen, total focus on the essentials (patient status). Not a power-user tool.

### Color
- **Main tone:** **sober and calm** most of the time — neutral tones, low emotional contrast, so as not to generate constant anxiety.
- **Deliberate exception:** the alarm state uses an intense alert color (red, high contrast) exclusively when the event is real — absolute contrast with the rest of the experience, to be unmistakable.
- **Reason:** "calm technology" — the interface should be invisible when all is well, and impossible to ignore when it is not.

### Typography
- Legible sans-serif, large sizes for status text (e.g. "Márcio is okay") — prioritizes quick reading by someone tired or stressed, not information density.

### Iconography
- Simple, few icons, with obvious meaning without needing a caption (e.g. "connected" vs "disconnected" icon).

### External visual references
- Apple Health / home health-monitoring apps — calm, reliable, no technical jargon.
- Home alarm apps (e.g. Ring) — discreet normal state, unmistakable alert state.

---

## 6. What is NOT in this UI Concept

- **Specific screen layout** → see `wireframe.md` (0.3b)
- **Detailed components per screen** → see `wireframe.md` §5
- **Final color palette / tokens** → see `design-system/theme.css` (0.3a+)
- **Exact HTML/JSX structure** → see `prototype-bundle.html` (0.3c)

---

## 7. Principle validation — continuous checklist

- [ ] Does the home screen answer "Is Márcio okay?" in 2 seconds? (Principle 2.1)
- [ ] Is the alarm recognizable as an emergency in under 1 second, without prior context? (Principle 2.2)
- [ ] Does every critical action require explicit confirmation? (Principle 2.3)
- [ ] Can a non-technical person calibrate on their own? (Principle 2.4)
- [ ] Is the history readable without technical jargon? (Principle 2.5)
- [ ] Is the device connectivity status always visible? (Principle 2.6)
- [ ] Does the most critical action (view status / confirm alarm) take at most 2 clicks? (Principle 2.7)
