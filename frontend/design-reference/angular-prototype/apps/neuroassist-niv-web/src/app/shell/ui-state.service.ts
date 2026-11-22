import { Injectable, signal, effect } from '@angular/core';

/**
 * Shell UI state — light/dark theme only (single-tenant product, no RBAC/context).
 * LIGHT is the default (LBC Amendment 0 / design-system: "silent guardian" for a
 * non-technical caregiver in a home environment). Dark is a toggle, never the default.
 */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly theme = signal<'light' | 'dark'>('light');

  constructor() {
    // Applies the theme on <html> — theme.css uses [data-theme="dark"] as an override;
    // absence of the attribute = light (the @theme default).
    effect(() => {
      if (this.theme() === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    });
  }

  toggleTheme(): void {
    this.theme.update(v => (v === 'light' ? 'dark' : 'light'));
  }
}
