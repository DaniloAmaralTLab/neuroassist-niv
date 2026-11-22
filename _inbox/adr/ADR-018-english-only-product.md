# ADR-018 — English-only product

> **Date:** 2026-11-19 (supersedes the 2026-08-31 decision, Amendment 4, "Internationalization (EN/PT)")
> **Status:** accepted
> **Supersedes:** the original bilingual EN+PT decision (summarized under Context/History)
> **Decision maker:** Danilo Amaral (architect, combined role — see ORG-001 in constraints.md) — user-approved on 2026-11-19.

---

## Context / History

The original ADR-018 ("Internationalization (EN/PT): whole system, independent authoring per language in CONV/TRN", 2026-08-31, Amendment 4) required the whole system to be bilingual EN/PT: UI of `DASH` (caregiver), `ACS`/ops screens, and the spoken content of `CONV`/`TRN`. It specified per-locale content in `SpeechTreeNode` (`content: { pt: {...}, en: {...} }`, each locale authored and approved separately), per-locale Elasticsearch indexing (`embedding_pt`/`embedding_en`), per-locale ElevenLabs synthesis (2x per phrase), and Angular UI i18n (`@angular/localize` or a runtime i18n library). Constraint `TECH-009` captured that requirement.

That bilingual requirement is **dropped**. The product is English-only.

## Decision

- The UI (patient and caregiver shells, `DASH`, `ACS`/ops screens), notifications, TTS and documentation are **English-only**.
- No i18n framework and no locale switching are required in v1.
- The speech tree (`CONV`/`TRN`) has a single content set in English: `SpeechTreeNode` keeps a single `text`/audio reference per node (as in ADR-013 and ADR-017) and the two-field dual confirmation of ADR-016 (`caregiverConfirmed`, `patientConfirmed`) applies once per node, not once per locale.
- Elasticsearch indexes one document per node, one embedding per node (ADR-015); ElevenLabs synthesizes each phrase once, in English (ADR-017).

## Consequences

- The pt-BR language toggle is removed from the UI.
- The TTS voice is English only (cloned patient voice speaking English; fallback Web Speech API uses a generic English voice).
- Command and speech-tree catalog labels are free text in English.
- The per-locale `content` map, `embedding_pt`/`embedding_en` and double synthesis per phrase described in the original ADR-018 are not needed; the authoring workload is not doubled.
- The `@angular/localize` / `ngx-translate` / `transloco` choice (open TODO in the original ADR) is no longer needed; the "node active in one locale, pending in the other" UX question no longer exists.
- `TECH-009` (EN/PT support) is superseded by an English-only requirement.

## Rationale

The English-only scope removes the doubled authoring/approval effort, the i18n overhead in the administrative UI and the extra synthesis volume — consistent with the small-team (ORG-001) and no-budget (FIN-001) constraints. The safety rationale of ADR-015/016 (no unsupervised generation or translation of critical assistive content) is preserved trivially: there is no translation step.

## How to reverse if the decision proves wrong

Reintroducing localization later is additive: if user-visible strings are kept in a single place (not scattered through templates), adding a locale layer is a bounded change. Per-locale content for `SpeechTreeNode` would then be introduced as a new decision (the original bilingual design above is the starting point).

## Signals that it is wrong

- A real patient/caregiver who needs a language other than English joins the pilot.
- A deployment target (tenant) is identified whose users cannot use an English-only UI.

## Related constraints

- `TECH-009` — originally "system must support EN/PT"; superseded: the system is English-only.
