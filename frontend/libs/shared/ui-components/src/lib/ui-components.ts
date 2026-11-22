// @neuroassist/shared/ui-components — Design System components (promoted from design-reference).
// Selector prefix: app-ds-* (matches prototype; no namespace collision in lib context).

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

// ── DsCardComponent ───────────────────────────────────────────────────────────

type CardVariant = 'default' | 'elevated' | 'surface-2';
const CARD_VARIANT: Record<CardVariant, string> = {
  default: 'glass',
  elevated: 'glass',
  'surface-2': 'glass',
};

@Component({
  selector: 'app-ds-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="rounded-card p-5" [class]="VARIANT[variant()]"><ng-content /></div>`,
})
export class DsCardComponent {
  readonly variant = input<CardVariant>('default');
  protected readonly VARIANT = CARD_VARIANT;
}

// ── DsButtonComponent ─────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'sm' | 'icon';

const BUTTON_SIZE: Record<ButtonSize, string> = {
  default: 'h-9 px-3.5 text-sm',
  sm: 'h-[30px] px-3 text-xs',
  icon: 'size-9 p-0',
};
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-strong shadow-card',
  secondary: 'border-[1.5px] border-line-strong text-ink-soft hover:bg-surface',
  ghost: 'text-ink-soft hover:bg-surface-2',
  danger: 'text-danger hover:bg-danger-bg',
};

@Component({
  selector: 'app-ds-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button class="inline-flex items-center justify-center gap-2 rounded-md font-body font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed" [class]="cls()" [disabled]="disabled()"><ng-content /></button>`,
})
export class DsButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('default');
  readonly disabled = input(false);
  protected readonly cls = computed(() => `${BUTTON_SIZE[this.size()]} ${BUTTON_VARIANT[this.variant()]}`);
}

// ── DsBadgeComponent ──────────────────────────────────────────────────────────

type BadgeTone = 'ok' | 'wn' | 'er' | 'nf' | 'pu' | 'ac' | 'mu';
const BADGE_TONE: Record<BadgeTone, string> = {
  ok: 'bg-success-bg text-success-ink',
  wn: 'bg-warning-bg text-warning-ink',
  er: 'bg-danger-bg text-danger-ink',
  nf: 'bg-info-bg text-info-ink',
  pu: 'bg-ai-bg text-ai-ink',
  ac: 'bg-accent/15 text-accent',
  mu: 'bg-surface-2 text-ink-soft border border-line',
};

@Component({
  selector: 'app-ds-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" [class]="TONE[tone()]"><ng-content /></span>`,
})
export class DsBadgeComponent {
  readonly tone = input<BadgeTone>('mu');
  protected readonly TONE = BADGE_TONE;
}

// ── DsInputComponent ──────────────────────────────────────────────────────────

@Component({
  selector: 'app-ds-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input class="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none" [placeholder]="placeholder()" [type]="type()" />`,
})
export class DsInputComponent {
  readonly placeholder = input('');
  readonly type = input<string>('text');
}

// ── DsKpiComponent ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-ds-kpi',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium text-ink-soft">{{ label() }}</span>
      <span class="font-display text-2xl font-bold text-ink">{{ value() }}</span>
    </div>
  `,
})
export class DsKpiComponent {
  readonly label = input('');
  readonly value = input<string | number>('—');
}

export const DS_COMPONENTS = [
  DsCardComponent,
  DsButtonComponent,
  DsBadgeComponent,
  DsInputComponent,
  DsKpiComponent,
];
