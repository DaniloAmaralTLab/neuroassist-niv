# SPEC-01 — API Surface

> EARS guide: `../../../../standards/ears-notation.md`. Canonical detail: `../../contracts/api-contract.md`.

## Objective
Define the complete CONV HTTP surface and the token/authority bound to each endpoint.

## Scope
- **In:** the 7 endpoints of `api-contract.md` §1; token-class split (patient-session vs TRN
  service-client); the public health endpoint.
- **Out:** no patient-facing search endpoint (ADR-002 — client-side search); no per-phrase/navigation
  endpoint (ADR-003/004, INV-CONV-5); no token minting (ACS owns it).

## Technical decisions
- ADR-003 (ETag bundle), ADR-005 (play-only, no synthesis), ADR-006 (authorities & audit).
- Authorities computed with the English verb table (D-639): see `../../generator-config.yml`.

## Implementation (endpoints → authority)
| Endpoint | Verb | Authority | Token |
|---|---|---|---|
| `/conv/tree` | GET | `conv.tree.read` | patient-session |
| `/conv/audio/{assetId}` | GET | `conv.audio.read` | patient-session |
| `/conv/usage-signals` | POST | `conv.usage.record` | patient-session |
| `/conv/trees` | POST | `conv.tree.publish` | TRN service-client |
| `/conv/tree-versions/{versionId}:retire` | POST | `conv.tree-version.retire` | TRN service-client |
| `/conv/patients/{patientId}/audio` | DELETE | `conv.audio.delete` | TRN service-client |
| `/conv/health` | GET | — public | — |

## Edge cases
- Wrong token class → `403` (patient-session on TRN path and vice-versa, ACS INV-3).
- `X-Tenant-Id` header supplied → ignored; tenant from JWT claim (INV-CONV-7).

## Acceptance criteria (EARS)
- THE SYSTEM SHALL expose exactly the seven endpoints above and no patient-facing search endpoint (ADR-002).
- WHEN any station endpoint is called without a valid patient-session token, THE SYSTEM SHALL respond `401` (or `403` if the token is a service-client token).
- WHEN a publish/retire/erase endpoint is called with a patient-session token, THE SYSTEM SHALL respond `403` (ACS INV-3).
- THE SYSTEM SHALL derive tenant and patient from JWT claims and SHALL ignore request-supplied tenant/patient (INV-CONV-7).
