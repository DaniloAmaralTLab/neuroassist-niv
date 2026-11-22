import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogFacade } from '../catalog.facade';
import { ReportFacade } from '../report.facade';
import { RuntimeFacade, StationRuntimeVM } from '../runtime.facade';

/**
 * Station runtime page — SPEC-02 §1, SPEC-01 §1.
 *
 * Near-headless: the patient NEVER navigates to this route.
 * It is mounted by the Patient-Mode host as a background runtime.
 * No breadcrumb is rendered for this route.
 *
 * The UI surface is intentionally minimal — a live status indicator for the
 * operator-at-the-station (camera / model / detection state). The patient
 * interacts only via the gesture itself.
 *
 * Route: /station/runtime (canActivate: stationIdentityGuard)
 */
@Component({
  selector: 'lib-station-runtime-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="station-runtime-page" role="status" aria-live="polite">
      <span class="sr-only">Station detection runtime active</span>

      @if (vm().detection === 'running') {
        <!-- Near-headless: minimal indicator only -->
        <div class="runtime-indicator runtime-indicator--running" aria-hidden="true">
          <span class="runtime-dot"></span>
        </div>
      }

      @if (vm().detection === 'unavailable') {
        <div class="runtime-indicator runtime-indicator--unavailable" role="alert">
          <p>Detection unavailable — camera: {{ vm().camera }}, model: {{ vm().model }}</p>
        </div>
      }

      @if (vm().detection === 'paused') {
        <div class="runtime-indicator runtime-indicator--paused" aria-hidden="true">
          <span class="sr-only">Detection paused — tab not visible</span>
        </div>
      }

      @if (vm().detection === 'degraded') {
        <div class="runtime-indicator runtime-indicator--degraded" aria-hidden="true">
          <span class="sr-only">Detection degraded — low fps</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .station-runtime-page { position: fixed; bottom: 1rem; right: 1rem; z-index: 9000; }
    .runtime-indicator { display: flex; align-items: center; gap: 0.5rem; }
    .runtime-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--color-primary, #00B4A6);
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .runtime-indicator--unavailable { color: var(--color-alarm, #ef4444); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  `],
})
export class StationRuntimePageComponent implements OnInit {
  private readonly runtimeFacade = inject(RuntimeFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  readonly reportFacade = inject(ReportFacade);

  /** Live station runtime view-model (§7 mapping included). */
  readonly vm = computed<StationRuntimeVM>(() => this.runtimeFacade.vm());

  ngOnInit(): void {
    // Wire active command count to the runtime facade (drives reportedDetectionState)
    // The bootstrap (gest.bootstrap.ts) calls loadCatalogAndCheckSupport.
    // Here we just track detectable count changes.
    // Real detection loop start is in gest.bootstrap.ts, not in the component.
  }
}
