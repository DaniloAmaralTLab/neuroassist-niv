import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveCommandVM, CatalogFacade } from '../catalog.facade';
import { ReportFacade, ReportQueueVM } from '../report.facade';
import { RuntimeFacade, StationRuntimeVM } from '../runtime.facade';

/**
 * On-station detection-status surface — SPEC-02 §2, SPEC-01 §1.
 *
 * The operator (family caregiver physically at the patient's station) navigates here
 * to verify that detection is running. This is the module's ONLY navigable surface.
 *
 * Route: /station/status (canActivate: stationIdentityGuard)
 * Breadcrumb: [Station, Detection status]
 */
@Component({
  selector: 'lib-station-status-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="station-status-page">
      <h1 class="page-title">Detection Status</h1>

      <!-- Runtime health panel -->
      <section class="status-panel" aria-label="Station runtime health">
        <h2 class="panel-title">Station</h2>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Camera</span>
            <span class="status-value" [class]="cameraClass()">{{ vm().camera }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Model</span>
            <span class="status-value" [class]="modelClass()">{{ vm().model }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Detection</span>
            <span class="status-value" [class]="detectionClass()">{{ vm().detection }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">FPS</span>
            <span class="status-value">{{ vm().fps | number:'1.0-0' }} / {{ vm().fpsBudget }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Wake Lock</span>
            <span class="status-value">{{ vm().wakeLock }}</span>
          </div>
        </div>
      </section>

      <!-- Active command list (detectable gate — INV-GEST-7) -->
      <section class="status-panel" aria-label="Active commands">
        <h2 class="panel-title">Commands ({{ activeCommands().length }})</h2>
        @for (cmd of activeCommands(); track cmd.commandId) {
          <div class="command-item" [class.command-item--undetectable]="!cmd.detectable">
            <span class="command-label">{{ cmd.label }}</span>
            <span class="command-urgency">{{ cmd.urgency }}</span>
            @if (!cmd.detectable) {
              <span class="not-detectable-badge">Not yet detectable</span>
            }
          </div>
        }
        @if (activeCommands().length === 0) {
          <p class="no-commands">No commands loaded.</p>
        }
      </section>

      <!-- Report queue panel (offline queue status) -->
      <section class="status-panel" aria-label="Report queue">
        <h2 class="panel-title">Report Queue</h2>
        <div class="queue-summary">
          <span>Pending: {{ queueVm().pending }}</span>
          @if (queueVm().lastError) {
            <span class="queue-error">{{ queueVm().lastError }}</span>
          }
          @if (queueVm().lastSentAt) {
            <span>Last sent: {{ queueVm().lastSentAt }}</span>
          }
        </div>
        @for (item of queueVm().items; track item.reportId) {
          <div class="queue-item queue-item--{{ item.status }}">
            <span>{{ item.commandId }}</span>
            <span>{{ item.status }}</span>
            <span>{{ item.attempts }} attempts</span>
            @if (item.status === 'expired') {
              <span class="expired-notice">Report expired — not delivered</span>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .station-status-page { padding: 1.5rem; max-width: 640px; margin: 0 auto; }
    .page-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 1.5rem; }
    .status-panel { background: var(--surface-2, #1e1e2e); border-radius: 0.5rem;
      padding: 1rem; margin-bottom: 1rem; }
    .panel-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; }
    .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .status-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .status-label { font-size: 0.75rem; opacity: 0.7; }
    .status-value { font-size: 0.875rem; font-weight: 500; }
    .status-running { color: var(--color-primary, #00B4A6); }
    .status-unavailable, .status-denied { color: var(--color-alarm, #ef4444); }
    .status-paused, .status-degraded { color: var(--color-warning, #F59E0B); }
    .status-ready, .status-granted { color: var(--color-primary, #00B4A6); }
    .command-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0;
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); }
    .command-item--undetectable { opacity: 0.6; }
    .not-detectable-badge { font-size: 0.75rem; background: var(--color-warning, #F59E0B);
      color: #000; border-radius: 999px; padding: 0.1rem 0.5rem; }
    .command-urgency { font-size: 0.75rem; opacity: 0.7; }
    .queue-error { color: var(--color-alarm, #ef4444); font-size: 0.875rem; }
    .expired-notice { color: var(--color-alarm, #ef4444); font-size: 0.75rem; }
    .queue-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0;
      font-size: 0.875rem; }
  `],
})
export class StationStatusPageComponent implements OnInit {
  private readonly runtimeFacade = inject(RuntimeFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly reportFacade = inject(ReportFacade);

  readonly vm = computed<StationRuntimeVM>(() => this.runtimeFacade.vm());
  readonly activeCommands = computed<ActiveCommandVM[]>(() => this.catalogFacade.activeCommands());

  get queueVm(): () => ReportQueueVM {
    return () => this.reportFacade.vm;
  }

  cameraClass(): string {
    const c = this.vm().camera;
    if (c === 'granted') return 'status-granted';
    if (c === 'denied' || c === 'no-device') return 'status-denied';
    return '';
  }

  modelClass(): string {
    const m = this.vm().model;
    if (m === 'ready') return 'status-ready';
    if (m === 'failed') return 'status-unavailable';
    return '';
  }

  detectionClass(): string {
    const d = this.vm().detection;
    if (d === 'running') return 'status-running';
    if (d === 'unavailable') return 'status-unavailable';
    if (d === 'paused' || d === 'degraded') return 'status-paused';
    return '';
  }

  ngOnInit(): void {
    // Status page is read-only; facades update from bootstrap-driven state.
  }
}
