import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  computed,
} from '@angular/core';
import { AlarmFacade, AlarmVM, AcknowledgedVM, MonitoringVM } from '../alarm.facade';
import { MonitoringStatusBannerComponent } from './monitoring-status-banner.component';

// Promoted from: design-reference/angular-prototype/apps/neuroassist-niv-web/src/app/screens/alarm/alarm.component.ts
// Wireframe ref: §5.1–5.5 — Alarm — the product's parent flow (4.2).
// Connected to AlarmFacade via EVENT_PORT (P4).
// Mock data removed; prototype facades replaced by AlarmFacade/Port/Adapter layer.
//
// SAFETY:
//  - Full-screen takeover for urgency=emergency ONLY (Principle 2.2).
//  - Single acknowledge action; returns to normal ONLY on explicit human confirmation (Principle 2.3).
//  - Confirm awaits 200 before clearing alarm (ADR-005 §Decision 2).
//  - On confirm failure: alarm stays active, error banner shown, never dismissed.
//  - MonitoringStatusBanner always evaluated (never hidden, never replaced by a false all-clear).
//  - 'none' state shown ONLY after a successful read returned activeAlarm: null.

function hour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'evnt-alarm-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MonitoringStatusBannerComponent],
  template: `
    <!-- SAFETY: MonitoringStatusBanner always evaluated first — NEVER hidden -->
    @if (monitoringVm().foregroundRequired) {
      <div class="fixed top-0 left-0 right-0 z-[60] p-3">
        <evnt-monitoring-status-banner [vm]="monitoringVm()" />
      </div>
    }

    @switch (alarmVm().state) {

      @case ('active') {
        <!-- Full-screen emergency takeover (Principle 2.2) -->
        <!-- role="alertdialog" + aria-modal for a11y (SPEC-02 §4) -->
        <div
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="'Emergency: ' + alarmVm().patientName + ' needs help'"
          class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-alarm px-8 text-center"
        >
          <span
            class="material-symbols-outlined text-[96px] text-alarm-ink"
            aria-hidden="true"
          >emergency_home</span>

          <h1 class="mt-6 font-display text-4xl font-extrabold tracking-tight text-alarm-ink">
            {{ alarmVm().patientName }} needs help
          </h1>
          <p class="mt-3 text-lg font-semibold text-alarm-ink/90">
            "{{ alarmVm().commandLabel }}"
          </p>
          @if (alarmVm().detectedAt) {
            <p class="mt-2 text-base font-medium text-alarm-ink/80">
              Gesture detected at {{ hour(alarmVm().detectedAt!) }}
            </p>
          }

          <!-- Single acknowledge action — hidden WHILE session lacks evnt.event.confirm -->
          @if (alarmVm().canConfirm) {
            <button
              #confirmBtn
              (click)="confirm(alarmVm().eventId!)"
              class="mt-12 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-alarm shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              [attr.aria-label]="'Confirm I attended to ' + alarmVm().patientName"
            >
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">check</span>
              Confirm I attended to {{ alarmVm().patientName.split(' ')[0] }}
            </button>
          }
        </div>
      }

      @case ('acknowledging') {
        <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-alarm px-8 text-center">
          <span class="material-symbols-outlined animate-spin text-[64px] text-alarm-ink" aria-hidden="true">
            progress_activity
          </span>
          <p class="mt-6 text-lg font-semibold text-alarm-ink">Recording confirmation…</p>
          <p class="mt-2 text-sm text-alarm-ink/80">Please wait — do not close this window.</p>
        </div>
      }

      @case ('acknowledged') {
        <!-- Transient session feedback — alarm cleared by next poll cycle -->
        <div
          role="status"
          aria-live="polite"
          class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-8 text-center"
        >
          <span class="material-symbols-outlined text-[64px] text-success" aria-hidden="true">check_circle</span>
          <h1 class="mt-5 font-display text-2xl font-bold text-ink">Attendance confirmed</h1>
          @if (acknowledgedVm()) {
            <p class="mt-2 text-sm text-ink-soft">
              {{ acknowledgedVm()!.patientName }} was attended to at
              {{ hour(acknowledgedVm()!.confirmedAt) }}.
            </p>
          }
          <p class="mt-4 text-xs text-ink-faint">Returning you to the dashboard shortly…</p>
        </div>
      }

      @case ('error') {
        <!-- Confirm failed — alarm stays active (SAFETY: never dismissed on a failed write) -->
        <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-alarm px-8 text-center">
          <span class="material-symbols-outlined text-[96px] text-alarm-ink" aria-hidden="true">emergency_home</span>
          <h1 class="mt-6 font-display text-4xl font-extrabold tracking-tight text-alarm-ink">
            {{ alarmVm().patientName }} needs help
          </h1>

          <div class="mt-6 rounded-xl bg-white/10 px-6 py-4 text-sm text-alarm-ink">
            <span class="material-symbols-outlined text-[18px] align-middle" aria-hidden="true">error</span>
            Could not record confirmation. Please try again — the alarm is still active.
          </div>

          @if (alarmVm().canConfirm) {
            <button
              (click)="confirm(alarmVm().eventId!)"
              class="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-alarm shadow-lg"
            >
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">refresh</span>
              Retry confirmation
            </button>
          }
        </div>
      }

      @case ('loading') {
        <div class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-8 text-center">
          <span class="material-symbols-outlined animate-spin text-[48px] text-ink-faint" aria-hidden="true">
            progress_activity
          </span>
          <p class="mt-4 text-sm text-ink-soft">Checking for active alarms…</p>
        </div>
      }

      @case ('none') {
        <!-- 'none' shown ONLY after a successful read returned null (POSITIVE server answer) -->
        <div class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-8 text-center">
          <span class="material-symbols-outlined text-[64px] text-ink-faint" aria-hidden="true">
            notifications_off
          </span>
          <p class="mt-4 text-sm text-ink-soft">No active emergency alarm right now.</p>
        </div>
      }

      @default {
        <!-- Degraded state — do not render all-clear (foreground banner is already shown) -->
        <div class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-8 text-center">
          <span class="material-symbols-outlined text-[48px] text-ink-faint" aria-hidden="true">
            cloud_off
          </span>
          <p class="mt-4 text-sm text-ink-soft">Alarm status is temporarily unavailable.</p>
        </div>
      }
    }
  `,
})
export class AlarmPageComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(AlarmFacade);
  protected readonly hour = hour;

  readonly alarmVm = this.facade.alarmVm;
  readonly monitoringVm = this.facade.monitoringVm;
  readonly acknowledgedVm = this.facade.acknowledgedVm;

  ngOnInit(): void {
    // Start monitoring if not already running (pilot: pat-marcio).
    // In the full impl, patient ids come from the session / ACS link (FE-EVNT-010).
    // TODO[FE-EVNT-010]: inject CaregiverFacade and start monitoring with linked patient ids.
    this.facade.startMonitoring(['pat-marcio']);
    // canConfirm: evnt.event.confirm authority — set via canConfirmEventGuard (SPEC-01 §1)
    // TODO[FE-EVNT-004]: wire canConfirm from AccessDecisionService.can('evnt.event.confirm')
    this.facade.setCanConfirm(true); // stub — replace with real guard signal
  }

  ngOnDestroy(): void {
    // Do NOT stop monitoring here — the shell owns the monitoring lifecycle (SPEC-06 §3).
    // AlarmFacade.stopMonitoring() is called by EvntShellIntegrationService.destroy().
  }

  protected confirm(eventId: string): void {
    this.facade.confirmAlarm(eventId);
  }
}
