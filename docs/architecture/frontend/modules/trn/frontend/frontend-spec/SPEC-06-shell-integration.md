# SPEC-06 — Shell Integration — trn (TRN) Frontend

> How TRN plugs into the **caregiver web Shell** (`neuroassist-niv-web`) — the host is **decided** for
> TRN (both the training and the assisted patient-assent surfaces run under the caregiver JWT, SPEC-01
> §2/§4). TRN ships as a **library facade** (`TRN_MODULE_DESCRIPTOR` + `TRN_ROUTES` + `provideTrn`) so the
> Shell registers it as one "Training" destination. The assent surface additionally exposes a no-op
> `NAVIGATION_INTENT_PORT` seam so it **can** later be mounted in the Patient-Mode host (gap G1, optional)
> without a rewrite. Code fences are illustration. Sources: doc 02 §4, doc 04 §7, ADR-007.

## 1. `tool-descriptors.ts` (Shell registration)

```ts
export const TRN_MODULE_DESCRIPTOR: ModuleDescriptor = {
  key: 'trn',
  title: 'Training',
  icon: 'school',
  section: 'care',                                 // caregiver web Shell (beside DASH)
  order: 40,
  routeBase: '/training',
  identity: 'caregiver.jwt',                        // runs under the ACS caregiver token — the only TRN identity
  routePath: '/training',
  loadChildren: () => import('@neuroassist/trn').then(m => m.TRN_ROUTES),
  permissions: [                                    // caregiver authorities (SPEC-05 §2)
    'trn.session.create', 'trn.session.read',
    'trn.proposal.read', 'trn.proposal.update', 'trn.proposal.approve', 'trn.proposal.reject',
    'trn.publication.create', 'trn.publication.read',
    'trn.consent.create', 'trn.consent.read', 'trn.consent.revoke',
    'trn.content.delete',
  ],
};
```

The caregiver web Shell `neuroassist-niv-web` imports `@neuroassist/trn` in
`config/module-descriptors.ts` (the `scope:web → scope:trn` boundary is allowed) and lazy-loads
`TRN_ROUTES` under `/training`. The assent surface (`/training/assent`) is a sub-route of the same mount.

## 2. `TrnShellIntegrationService` (`libs/trn/integration/`) and the optional seam

Responsibilities:

1. **Egress identity.** TRN egress attaches the **caregiver-session** bearer (ACS caregiver JWT) on every
   `/trn` call. It **never** attaches a patient-session token (there is none — BE §0.1). The Shell wires
   the caregiver interceptor; TRN adds no second identity.
2. **Optional navigation-intent seam (assent surface).** The `feature-patient-assent` surface declares a
   `NAVIGATION_INTENT_PORT` with a `NoOpNavigationIntentPort` default so touch + switch-scan work with no
   host. **If** the owner later renders the assent surface inside the Patient-Mode host (gap G1,
   undecided), that host overrides the port so **GEST pushes** navigation intents in-process (mirror of
   the CONV seam, ADR-007). In the caregiver Shell today the no-op default is used and no host override is
   required.
3. **Resolve an intent to a node** at the current level: an intent carrying an `engineFeatureRef` resolves
   to the pending-assent node with the matching ref; if none / not-authorized, the intent is **ignored**
   (no navigation), leaving touch + switch-scan unaffected.

```ts
// TRN declares the port; a Patient-Mode host (optional) may provide the GEST-fed implementation.
export interface NavigationIntentPort {
  // GEST pushes these; the assent surface consumes them onto the one selected-node model.
}
export const NAVIGATION_INTENT_PORT =
  new InjectionToken<NavigationIntentPort>('NavigationIntentPort');

@Injectable({ providedIn: 'root' })
export class TrnShellIntegrationService {
  // attaches the caregiver bearer on egress; (optionally) routes intents to ProposalFacade on the assent surface
}
```

## 3. `trn.bootstrap.ts`

- **init:** register `TRN_MODULE_DESCRIPTOR`; wire `provideTrn({ adapter: 'http' })` (trn-service is
  specified, SPEC-04 §2); subscribe `TrnShellIntegrationService` to the (optional) host-provided
  `NAVIGATION_INTENT_PORT` — default no-op; read the consent gate lazily when a session opens. It starts
  **no** background timer.
- **destroy:** unsubscribe the intent port; clear only TRN's UI-local state (draft message text, scan
  cursor). It mutates **no** proposal content and issues **no** delete of a pending proposal (drafts
  persist server-side — SPEC-03 §3).

## 4. The Patient-Mode host is optional for TRN (open item G1)

Unlike CONV/GEST, TRN is **not** blocked by the undecided Patient-Mode host: both TRN surfaces run in the
caregiver web Shell under the caregiver JWT. The assent surface is built host-portable (large targets,
switch-scan, a no-op `NAVIGATION_INTENT_PORT`) so it **can** be mounted in the Patient-Mode host later if
the owner chooses, but that is an **optional future**, not a v1 requirement (cross-link §4).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL register `TRN_MODULE_DESCRIPTOR` as a single "Training" destination in the caregiver web Shell under the caregiver identity.
- THE SYSTEM SHALL attach the caregiver-session bearer on TRN egress and SHALL NOT attach a patient-session token.
- THE SYSTEM SHALL default the navigation-intent port to a no-op so that the assent surface's touch and switch-scan navigation work without a host.
- WHEN a Patient-Mode host wires the navigation-intent port with the GEST-fed implementation, THE SYSTEM SHALL route each gesture intent onto the same selected-node model as touch and switch-scan.
- IF a gesture intent targets a node absent or not authorized at the current level, THEN THE SYSTEM SHALL ignore the intent and SHALL leave touch and switch-scan navigation unaffected.
