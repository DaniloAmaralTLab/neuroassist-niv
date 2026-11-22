import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MODULE_DESCRIPTORS } from '../config/module-descriptors';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="sidebar">
      <div class="sidebar-brand">
        <span class="material-symbols-outlined text-[20px] text-brand">hub</span>
        NeuroAssist NIV
      </div>
      <ul class="sidebar-nav">
        @for (mod of navModules(); track mod.key) {
          <li>
            <a
              [routerLink]="mod.route"
              routerLinkActive="active"
              class="sidebar-link"
            >
              <span class="material-symbols-outlined text-[18px]">{{ mod.icon }}</span>
              {{ mod.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .sidebar { display: flex; flex-direction: column; width: 240px; height: 100%; }
    .sidebar-brand { display: flex; align-items: center; gap: 0.5rem; padding: 1rem; font-weight: 600; }
    .sidebar-nav { list-style: none; margin: 0; padding: 0; }
    .sidebar-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; text-decoration: none; }
    .sidebar-link.active { font-weight: 600; }
  `],
})
export class SidebarComponent {
  /** Module registry — fed by MODULE_DESCRIPTORS (added per /fe-architect-promote). */
  readonly navModules = signal(MODULE_DESCRIPTORS);
}
