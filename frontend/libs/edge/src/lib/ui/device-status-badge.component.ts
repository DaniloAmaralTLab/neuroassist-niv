import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// DeviceStatusBadge — presentational (SPEC-02 §3, libs/edge/ui).
// Reused by: Shell topbar (always visible), EdgeDeviceCardComponent, DevicePairingPanelComponent.
// Holds NO logic: online/offline is determined by DeviceFacade (server-derived, ADR-005);
// the badge only renders the values it receives via input().
// CLS note: the badge slot is always present so layout does not shift on status change (doc 02 §5).

@Component({
  selector: 'edge-device-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      [class]="cls()"
      [attr.aria-label]="ariaLabel()"
      role="status"
    >
      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ icon() }}</span>
      {{ label() }}
      @if (lastSyncRelative()) {
        <span class="ml-0.5 opacity-70">· {{ lastSyncRelative() }}</span>
      }
    </span>
  `,
})
export class DeviceStatusBadgeComponent {
  /** Server-derived connectivity badge (never inferred from a client timer — ADR-005). */
  readonly status = input<'online' | 'offline' | 'unavailable'>('unavailable');
  /** Display-only computed relative time (e.g. "3 min ago"); null = not shown. */
  readonly lastSyncRelative = input<string | null>(null);

  protected readonly cls = computed(() => {
    switch (this.status()) {
      case 'online':
        return 'bg-success-bg text-success-ink';
      case 'offline':
        // Offline is an amber/warning state — NEVER danger/alarm (ADR-005, wireframe §0.6).
        return 'bg-warning-bg text-warning-ink';
      default:
        return 'bg-surface-2 text-ink-faint';
    }
  });

  protected readonly icon = computed(() => {
    switch (this.status()) {
      case 'online':  return 'wifi';
      case 'offline': return 'wifi_off';
      default:        return 'device_unknown';
    }
  });

  protected readonly label = computed(() => {
    switch (this.status()) {
      case 'online':  return 'Device online';
      case 'offline': return 'Device offline';
      default:        return 'Status unavailable';
    }
  });

  protected readonly ariaLabel = computed(() => {
    const rel = this.lastSyncRelative();
    return rel ? `${this.label()}, last sync ${rel}` : this.label();
  });
}
