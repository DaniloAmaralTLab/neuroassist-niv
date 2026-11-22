# NeuroAssist AI — Angular Prototype

Workspace generated automatically by `wireframe-to-angular` from `wireframe.md`.

> NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

## Quick start

```bash
npm install
npm audit fix          # fixes auto-fixable CVEs in the build deps
npx nx serve neuroassist-niv-web
```

Open `http://localhost:4200` after the server starts.

> **About npm vulnerabilities:** the CVEs reported by `npm audit` are in
> **devDependencies** (Angular/Nx build tooling) and **do not affect the production bundle**.
> `package.json` includes an `overrides` section that forces patched versions of the most
> critical transitive deps (`tar`, `semver`, `micromatch`, `path-to-regexp`).
> Run `npm audit fix` after the install to apply the remaining fixes.

## Styles structure (Tailwind v4 + Design System)

No SCSS. The design system tokens live in `theme.css` (`@theme` block, oklch — see `plans/design-system/FORMAT.md §2`) and Tailwind v4 turns them into utilities (`--color-brand` → `bg-brand`; `--radius-card` → `rounded-card`; `--font-display` → `font-display`).

1. **Tokens** (`apps/<proj>-web/src/theme.css`) — mirror of `design/design-system/theme.css`. `styles.css` does `@import "tailwindcss"; @import "./theme.css"`.
2. **DS library** (`apps/<proj>-web/src/app/ui/`) — token-driven standalone components: `ds-button`, `ds-badge`, `ds-card`, `ds-kpi`, `ds-input` (faithful to `plans/design-system/ds/components.jsx`). Hand-curated components (`tab-bar`, `modal`) live alongside here and are **not** overwritten by generation.
3. **Shell and Screens** (`app/shell/`, `app/screens/<id>/`) — standalone components with inline Tailwind utilities; the screens compose from the DS library.

## Screens

| ID | Label | Route | Component | Wireframe ref |
|---|---|---|---|---|
| `entry` | Entry | `/entry` | `EntryComponent` | §5.1–5.5 |
| `home` | Home | `/home` | `HomeComponent` | §5.1–5.5 |
| `alarm` | Alarm | `/alarm` | `AlarmComponent` | §5.1–5.5 |
| `history` | History | `/history` | `HistoryComponent` | §5.1–5.5 |
| `calibration` | Calibration | `/calibration` | `CalibrationComponent` | §5.1–5.5 |
| `onboarding` | Onboarding | `/onboarding` | `OnboardingComponent` | §5.1–5.5 |
| `conv-tree` *(Amendment 3; semantic search Amendment 4, 2026-08-31)* | Converse | `/patient/converse` | `ConvTreeComponent` | §5.1–5.5 — Screen 06 |
| `phone-activation` *(Amendment 3, 2026-08-30)* | Activate patient's mobile phone | `/patient-phone` | `PhoneActivationComponent` | §5.1–5.5 — Screen 07 |
| `training` *(Amendment 4, 2026-08-31)* | Training | `/training` | `TrainingComponent` | §5.1–5.5 — Screen 08 |
| `training-confirmation` *(Amendment 4, 2026-08-31)* | Confirm new phrases | `/patient/confirm-training` | `TrainingConfirmationComponent` | §5.1–5.5 — Screen 09 |

> **CONV module (Amendment 3, ADR-013 accepted).** The CONV/TRN screens above and `patient-shell.component.ts`
> (restricted shell for the patient session, see the wireframe decision in `wireframe.md` §3.2.B
> addendum) currently live inside this single app, alongside the other modules — just like the rest of the
> prototype. In the **real product**, CONV is its own Nx module (`frontend/libs/conv`), following the
> same pattern as the existing modules (`frontend/libs/edge`, `frontend/libs/pat`, etc.). This
> code is a design starting point, not the production code — it is up to the architect to promote it
> to the real lib when integrating Amendment 3.
>
> **TRN module (Amendment 4, ADR-015/016/017/018 accepted).** `training` and `training-confirmation`
> simulate the TRAINING phase — a **scripted** LLM conversation in the prototype (no real
> Claude/Anthropic API call), Dual Authorization (`caregiverConfirmed`/`patientConfirmed` per
> `Locale` in `SpeechTreeNode.content`, see `shared/data-model.ts`), and pure retrieval on Screen 06
> (only nodes with complete Dual Authorization appear in the patient's navigation — Elasticsearch and
> ElevenLabs are simulated, with no real indexing/synthesis). In the **real product**, TRN is its own
> Nx module, just like CONV — it is up to the architect to promote it when integrating Amendment 4.

## Next steps

The `prototype-map.json` file at the workspace root contains metadata for all screens (Angular route, selector, file paths, wireframe reference, objective and components). In the **architecture phase**, the frontend agent reads this JSON to:

- Replace the `MOCK`s with real calls to services/APIs.
- Implement the components listed in `componentes` using the DS library from `app/ui/`.
- Refine the Tailwind utilities on top of the `theme.css` tokens.
- Add unit and e2e tests.
- **Promote the CONV module** (`screens/conv-tree`, `screens/phone-activation`, `shell/patient-shell.component.ts`, the `SpeechTreeNodeFacade`/`PatientSessionFacade` facades in `core/data-access.ts`) to `frontend/libs/conv` in the product repository, and design the real schema of the "Patient with session" actor in `acs-service` (see ADR-012/013/014, all `accepted`).
- **Promote the TRN module** (`screens/training`, `screens/training-confirmation`) to `frontend/libs/trn`; replace the scripted script with a real call to the Claude/Anthropic API; implement the real asynchronous indexing pipeline (Elasticsearch, self-hosted embedding) and synthesis (ElevenLabs, cache in file storage) triggered when `caregiverConfirmed AND patientConfirmed` become `true` for the same `Locale` (see ADR-015/016/017, all `accepted`).
- **UI i18n** — dropped: the product is English-only (see ADR-018-english-only-product); the language selector in CONV/TRN and any pt locale in the prototype are to be removed.
