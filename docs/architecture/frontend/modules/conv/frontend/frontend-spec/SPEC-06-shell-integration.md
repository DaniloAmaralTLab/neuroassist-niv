# SPEC-06 — Shell Integration — conv (CONV) Frontend

> How CONV plugs into the **Patient-Mode host** (the host app is **undecided** — gap G1, shared with GEST,
> `INT-FE-GEST-003`). CONV ships as a **library facade** (Port / Adapter / Facade) so it composes into
> whatever host is chosen, with sensible no-op defaults so touch + switch-scan work even before the host
> wires the gesture seam. Code fences are illustration. Sources: doc 02 §2/§4, doc 04 §7, ADR-007.

## 1. `tool-descriptors.ts` (host fallback)

```ts
export const CONV_MODULE_DESCRIPTOR: ModuleDescriptor = {
  key: 'conv',
  title: 'Talk',
  icon: 'chat_bubble',
  section: 'patient',
  order: 0,
  routeBase: '/patient',
  identity: 'patient.session',                     // runs under the ACS patient-session token
  routePath: '/patient/converse',
  loadChildren: () => import('@neuroassist/conv').then(m => m.CONV_ROUTES),
  permissions: ['conv.tree.read', 'conv.audio.read', 'conv.usage.record'],  // patient-session (SPEC-05 §2)
};
```

The Patient-Mode host lazy-loads `@neuroassist/conv` under `/patient` and co-mounts it beside GEST +
libs/edge in **one host** (the G1 gap, §4).

## 2. `ConvShellIntegrationService` (`libs/conv/integration/`) and the two seams

Responsibilities:

1. **Receive gesture navigation intents** via the `NAVIGATION_INTENT_PORT` (ADR-007). CONV declares the
   token with a `NoOpNavigationIntentPort` default; the host overrides it so **GEST pushes** intents
   (`selectByFeatureRef`, `descend`, `back`) to CONV **in-process** — **GEST never HTTP-calls CONV**. This is
   the mirror of GEST's `STATION_LIVENESS_PORT` (publisher pushes, consumer carries, no-op default), with the
   direction reversed (GEST = publisher, CONV = consumer).
2. **Resolve an intent to a node** at the current level: an intent carrying an `engineFeatureRef` resolves to
   the level node with the matching `engineFeatureRef`; if none / not-authorized, the intent is **ignored**
   (no navigation), leaving touch + switch-scan unaffected.
3. **Egress identity.** CONV egress attaches the **patient-session** bearer (ACS ADR-012), **not** the
   `edge.device` token GEST/EDGE use. The host wires both interceptors, scoped per egress (open item Q1).

```ts
// CONV declares the port; the host provides the GEST-fed implementation.
export interface NavigationIntentPort {
  // GEST pushes these; CONV consumes them onto the one selected-node model.
}
export const NAVIGATION_INTENT_PORT =
  new InjectionToken<NavigationIntentPort>('NavigationIntentPort');

@Injectable({ providedIn: 'root' })
export class ConvShellIntegrationService {
  // subscribes to NAVIGATION_INTENT_PORT; routes intents to SpeechTreeFacade.select/descend/back
}
```

## 3. `conv.bootstrap.ts`

- **init:** register `CONV_MODULE_DESCRIPTOR`; wire `provideConv({ adapter: 'http' })`; subscribe
  `ConvShellIntegrationService` to the host-provided `NAVIGATION_INTENT_PORT`; kick a **background**
  `TreeSyncService.check()` (non-blocking — the cache serves immediately). It starts **no** per-step timer.
- **destroy:** unsubscribe the intent port and sync signals; clear only CONV's UI-local state (level stack,
  scan cursor). It mutates **no** tree content and flushes any pending opt-in usage signal best-effort.

## 4. The Patient-Mode host is undecided (open item G1)

The host that composes **CONV + GEST + libs/edge** is **not yet decided**. Whatever host is chosen MUST wire:
the **patient-session interceptor** (CONV egress), the **device-token interceptor** (GEST/EDGE egress), the
**`STATION_LIVENESS_PORT`** (edge ← gest), and the **`NAVIGATION_INTENT_PORT`** (gest → conv). Until then CONV
runs standalone with the **no-op intent port** (touch + switch-scan only) and its own patient-session egress.
The host choice is an **open item** (cross-link §4) — this spec assumes **no** concrete host app.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL default the navigation-intent port to a no-op so that, without a host override, touch and switch-scan navigation still work.
- WHEN the Patient-Mode host wires the navigation-intent port with the GEST-fed implementation, THE SYSTEM SHALL route each gesture intent onto the same selected-node model as touch and switch-scan.
- IF a gesture intent targets a node absent or not authorized at the current level, THEN THE SYSTEM SHALL ignore the intent and SHALL leave touch and switch-scan navigation unaffected.
- THE SYSTEM SHALL attach the patient-session bearer on CONV egress and SHALL NOT attach the edge.device station token.
