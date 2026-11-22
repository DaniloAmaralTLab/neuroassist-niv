# FE-GEST-018 -- Presentational runtime components — OperatorPreviewComponent, DetectionPausedOverlayComponent (ARIA live region), StationIdentityNoticeComponent

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
Three presentational components (pure `input()/output()`, standalone, `OnPush`, no injected facade, no `HttpClient`): `OperatorPreviewComponent` (binds `<video>` to the SAME stream as the worker, never a second capture); `DetectionPausedOverlayComponent` (always present in DOM — NOT `*ngIf` — ARIA live region `aria-live='assertive'` announced on state change, INV-GEST-6); `StationIdentityNoticeComponent` (blocking 'station unpaired — re-pair in EDGE' message on `unpaired=true`).

## Approach (execution path)
1. `OperatorPreviewComponent`: `input() stream: MediaStream | null`; `input() visible: boolean`; `<video #preview>` with `[srcObject]="stream"`; `muted autoplay playsinline`; visibility via CSS class (never `*ngIf` to keep the DOM stable).
2. `DetectionPausedOverlayComponent`: `input() paused: boolean`; `input() reason: string`; overlay div ALWAYS in DOM; `[class.hidden]="!paused"` (not `*ngIf`); `role='status'` `aria-live='assertive'` `aria-atomic='true'`; announced on `paused` change; content: "Detection paused — keep this tab in the foreground".
3. `StationIdentityNoticeComponent`: `input() unpaired: boolean`; `role='alertdialog'` `aria-modal='true'` when `unpaired=true`; content: "Station unpaired — re-pair this device in EDGE.".
4. All three: no injected facade, no `HttpClient`, pure presentational.
5. Spec: (a) overlay has `aria-live='assertive'` attribute; (b) overlay always present in DOM regardless of `paused` value; (c) `StationIdentityNoticeComponent` renders notice when `unpaired=true`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/feature-station-runtime/src/lib/operator-preview.component.ts`
- [ ] implementar `frontend/libs/gest/feature-station-runtime/src/lib/detection-paused-overlay.component.ts`
- [ ] implementar `frontend/libs/gest/feature-station-runtime/src/lib/station-identity-notice.component.ts`
- [ ] `DetectionPausedOverlayComponent` always in DOM (never `*ngIf`) — spec verifies
- [ ] `aria-live='assertive'` on overlay (ARIA live region)
- [ ] `OperatorPreviewComponent` binds single stream — never calls `getUserMedia` itself
- [ ] All three: `standalone: true`, `changeDetection: OnPush`, no facade injection
- [ ] `npx nx test gest-feature-station-runtime` PASS
- [ ] (no extra spec file needed — combined into FE-GEST-017's spec or separate)

## Acceptance criteria
- [ ] Overlay ARIA `role=status` and `aria-live='assertive'` attributes spec-verified
- [ ] Overlay present in DOM when `paused=false` (not removed by `*ngIf`)
- [ ] `npx nx test gest-feature-station-runtime` PASS

## Dependencies
- FE-GEST-017 (StationRuntimePageComponent hosts these components)

## Tenant-context impact
None — pure presentational; no tenant data.

## Prioridade
P4
