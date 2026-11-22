# Backend API Cross-link — pat (PAT) Frontend ↔ `pat-service`

> Source of truth for all BE shapes and authorities:
> `../../../../../backend/services/pat-service/contracts/api-contract.md`.
> The FE references the BE contract; it never redefines it. This file records the FE↔BE mapping and
> the reconciliation gaps the FE specs carry.

## 1. Endpoint ↔ FE consumer map (13 BE endpoints)

| BE endpoint | Verb | Authority | FE Facade.method | FE surface |
|---|---|---|---|---|
| `/pat/patients` | POST | `pat.patient.create` | `PatientFacade.register` | Register-patient form (onboarding) |
| `/pat/patients` | GET | `pat.patient.read` | `PatientFacade.list` | active-patient resolution (`PatRootComponent`) |
| `/pat/patients/{id}` | GET | `pat.patient.read` | `PatientFacade.get` | catalog breadcrumb patient name |
| `/pat/patients/{id}` | DELETE | `pat.patient.deactivate` | — (no FE screen, G2) | — |
| `/pat/patients/{id}/activation` | POST | `pat.patient.activate` | — (no FE screen, G2) | — |
| `/pat/patients/{id}/commands` | POST | `pat.command.create` | `CommandFacade.create` | command editor (new) |
| `/pat/patients/{id}/commands` | GET | `pat.command.read` | `CommandFacade.listByPatient` | command catalog list |
| `/pat/commands/{id}` | GET | `pat.command.read` | `CommandFacade.get` | single-command reload (edit) |
| `/pat/commands/{id}` | PATCH | `pat.command.calibrate` | `CommandFacade.calibrate` | command editor (edit) |
| `/pat/commands/{id}` | DELETE | `pat.command.retire` | `CommandFacade.retire` | command row remove |
| `/pat/gesture-types` | GET | `pat.gesture-type.read` | `GestureTypeFacade.list` | gesture slot dropdown |
| `/pat/gesture-types/{id}` | GET | `pat.gesture-type.read` | `GestureTypeFacade.get` | (available; unused in v1 — list suffices) |
| `/pat/gesture-types` | POST | `pat.gesture-type.create` | `GestureTypeFacade.register` | inline "+ register new type" |

All 13 endpoints are mapped: 11 consumed by the PAT FE MVP surfaces, 2 (patient deactivate / activate)
carried as BE-only until a patient-lifecycle UI is specified (G2), and 1 (`GET /pat/gesture-types/{id}`)
available but unused in v1.

## 2. Reconciliation gaps (FE specs carry these; BE contract is canonical)

| # | Gap | FE handling |
|---|---|---|
| G1 | Vision authority names (`pat.patient.view`, `pat.command.view/edit/remove`, `pat.gesture-type.view/create`) differ from BE (`pat.patient.read`, `pat.command.read/calibrate/retire`, `pat.gesture-type.read/register`). | FE uses the **BE authority strings** everywhere (INV-PAT-8). |
| G2 | BE exposes `pat.patient.deactivate` / `pat.patient.activate` (§1.4/§1.5) but the prototype has no patient-lifecycle screen. | Out of the MVP FE contract; no UI control is rendered until a lifecycle SPEC lands. Authorities stay documented here. |
| G3 | No multi-patient picker screen in the prototype (single pilot patient). | `PatRootComponent` resolves the active patient and redirects; a picker is a future addition. `GET /pat/patients` seeds that resolution. |
| G4 | BE offers `ETag` / `If-None-Match` → `304` conditional refresh on catalog reads (§3.3.1, ADR-004). | PAT FE v1 keeps no cache (`frontend/05` §3), so it does not send `If-None-Match`; conditional refresh is reserved for edge/detection clients and a later PAT cache SPEC. |
| G5 | Prototype Calibration screen renders no UI control for `minGestureTimeMs` / `maxGestureTimeMs` (R2). | Resolved in SPEC-02 (`DurationWindowControlComponent`) + SPEC-03 (`CommandEditorForm` with `min < max` invariant); promote must ship explicit duration controls. |
| G6 | The onboarding wizard spans ACS → PAT → EDGE; which module owns the wizard chrome is undecided (`frontend/06`). | PAT contributes the patient-registry and first-command panels only; the shell owns the wizard chrome (SPEC-06 §2). |
| G7 | Gesture-type → engine-support mapping is unspecified (R1 / INV-PAT-6). | PAT only stores and displays types; it surfaces the honest caveat that naming a type ≠ engine support. The mapping is a GEST decision. |

## 3. Error contract

BE `ProblemDetail` `type` slugs are mapped 1:1 in `SPEC-07-error-handling.md` §2
(`unauthenticated`, `forbidden`, `not-found`, `validation-error`, `unknown-gesture-type`,
`command-retired`, `gesture-type-code-taken`). The FE maps by `type` slug (not HTTP status), preserves
`detail` + `correlationId`, and never shows a raw body. `webcam_unavailable` is a client-only state,
never a BE ProblemDetail.

## 4. Invariants referenced (declared once in BE; cited here, not redefined)

INV-PAT-1 (tenant from JWT claim; `X-Tenant-Id` never trusted), INV-PAT-2 (command belongs to one
patient of the same tenant; cross-tenant 404), INV-PAT-3 (`0 < min < max`), INV-PAT-4 (primary
required + existing GestureType; secondary distinct), INV-PAT-5 (retired is terminal; excluded from
the active catalog but resolvable by id), INV-PAT-6 (a GestureType name ≠ engine support; GEST owns
support truth), INV-PAT-7 (patient-session token rejected `403` on every `/pat` path), INV-PAT-8 (FE
decision keys equal the BE authority constants / `@PreAuthorize`). Conditional-read / ADR-004 caching
is a BE concern (§3.3.1).
