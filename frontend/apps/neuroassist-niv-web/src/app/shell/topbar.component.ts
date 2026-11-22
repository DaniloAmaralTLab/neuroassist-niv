import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlarmFacade } from '@neuroassist/evnt';
import { RoutineNoticeIndicatorComponent } from '@neuroassist/evnt';

// EVNT — RoutineNoticeIndicatorComponent wired into the topbar notification slot (SPEC-02 §3.2.E).
// This is the DISCREET routine notice surface — NOT an emergency indicator.
// The emergency alarm is handled exclusively by the full-screen AlarmPageComponent at /alarm.

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    FormsModule,
    RoutineNoticeIndicatorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <span class="topbar-title">NeuroAssist NIV</span>
      <select class="topbar-tenant" [ngModel]="activeTenant()" (ngModelChange)="activeTenant.set($event)">
        <!-- Populated at runtime from the auth/tenant service -->
      </select>
      <div class="topbar-actions">
        <!-- EVNT routine notice indicator (Tier-B routine notices, NOT emergency alarms) -->
        <evnt-routine-notice-indicator
          [count]="alarmFacade.routineNoticeCount()"
          [hasUnseen]="alarmFacade.routineNoticeCount() > 0"
        />
        <!-- Additional topbar slots: user menu, tenant switcher — added per module via /fe-architect-promote -->
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .topbar-title { font-weight: 600; }
    .topbar-actions { margin-left: auto; display: flex; gap: 0.5rem; }
  `],
})
export class TopbarComponent {
  readonly activeTenant = signal<string>('');
  protected readonly alarmFacade = inject(AlarmFacade);
}
