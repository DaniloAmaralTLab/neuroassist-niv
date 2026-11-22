import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpeechTreeNodeFacade } from '../../core/data-access';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsBadgeComponent } from '../../ui/ds-badge.component';
import { DsButtonComponent } from '../../ui/ds-button.component';
import { Locale } from '../../shared/data-model';

// Contract: wireframe.md Screen 06 — Speech Tree (Amendment 3, 2026-08-30; ADR-013 accepted).
// Goal: category → phrase navigation, input-agnostic channel (gesture reusing
// GEST via engineFeatureRef, or direct touch/mouse) — the same "selected node" model
// is reachable through any channel, with no hierarchy among them (Principle 7 — ≤2 clicks).
// TTS is simulated in the prototype (visual highlight + audio icon), with no real synthesis.
//
// Amendment 4 (2026-08-31, wireframe §7 addendum) — without rewriting the behavior above:
// (1) only nodes with complete Dual Authorization appear here (pure retrieval
//     over already-reviewed content, see ADR-015/TECH-007); nodes still in TRAINING are
//     left out, except the "N phrases to confirm" banner (Screen 09);
// (2) content is keyed by Locale (`content.en`), no longer a single `text`
//     (ADR-018) — English only, no language selector;
// (3) TTSPlayer no longer has a "scope to be confirmed": it visually reflects whether the audio is
//     cached (ADR-017) or would fall back to the Web Speech API (OPS-004).
// NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

type EntryChannel = 'toque' | 'gesture';

@Component({
  selector: 'app-conv-tree',
  standalone: true,
  imports: [DsCardComponent, DsBadgeComponent, DsButtonComponent, RouterLink],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Talk</h1>
          <p class="mt-1 text-sm text-ink-soft">
            @if (nivelAtual(); as pai) {
              {{ pai.content[locale()].text }}
            } @else {
              Choose a category
            }
          </p>
        </div>
        <div class="flex items-center gap-2">
          <app-ds-badge [tone]="channel() === 'gesture' ? 'pu' : 'nf'">
            {{ channel() === 'gesture' ? 'Active channel: gesture' : 'Active channel: touch' }}
          </app-ds-badge>
        </div>
      </header>

      <!-- Amendment 4 (ADR-016) — link to Screen 09 when there are TRAINING proposals already
           approved by the caregiver, awaiting patient confirmation. Asynchronous, no
           synchronous screen handoff. -->
      @if (pendingConfirmation() > 0) {
        <a routerLink="/patient/confirm-training"
           class="mb-4 flex items-center justify-between rounded-card border border-ai-bg bg-ai-bg/40 px-4 py-3 text-sm font-semibold text-ai-ink transition-colors hover:bg-ai-bg/60">
          <span class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
            {{ pendingConfirmation() }} new phrase(s) to confirm
          </span>
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </a>
      }

      @if (loading()) {
        <p class="text-sm text-ink-faint">Loading tree…</p>
      } @else if (nosNoNivel().length === 0) {
        <app-ds-card>
          <p class="text-center text-sm text-ink-soft">Tree not yet configured for this patient.</p>
        </app-ds-card>
      } @else {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
          @for (no of nosNoNivel(); track no.id) {
            <button
              (click)="select(no.id)"
              class="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-card border-[1.5px] p-4 text-center transition-colors"
              [class]="selectedNodeId() === no.id
                ? 'border-brand bg-brand-subtle text-brand'
                : 'border-line-strong text-ink hover:bg-surface-2'">
              <span class="material-symbols-outlined text-[28px]">{{ no.type === 'category' ? 'folder' : 'chat_bubble' }}</span>
              <span class="text-sm font-semibold">{{ no.content[locale()].text }}</span>
              @if (no.engineFeatureRef) {
                <span class="text-2xs text-ink-faint">reachable by gesture</span>
              }
            </button>
          }
        </div>

        @if (selectedNode(); as sel) {
          <app-ds-card class="mt-6">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[22px] text-brand">{{ sel.content[locale()].audioRef ? 'volume_up' : 'record_voice_over' }}</span>
              <p class="font-display text-lg font-semibold text-ink">"{{ sel.content[locale()].text }}"</p>
            </div>
            @if (sel.content[locale()].audioRef) {
              <p class="mt-1 text-xs text-ink-faint">Played with cached audio of the patient's voice (ElevenLabs, synthesized in the TRAINING phase — ADR-017). Simulated in the prototype.</p>
            } @else {
              <p class="mt-1 text-xs text-ink-faint">Cached audio not yet available — native browser TTS fallback (Web Speech API, constraint OPS-004). Simulated in the prototype.</p>
            }
          </app-ds-card>
        }
      }

      <div class="mt-7 flex items-center justify-between">
        @if (nivelAtual()) {
          <app-ds-button variant="secondary" (click)="back()">
            <span class="material-symbols-outlined text-[18px]">arrow_back</span> Back to categories
          </app-ds-button>
        } @else {
          <span></span>
        }

        <!-- Gesture channel simulation — the prototype has no real webcam (see ADR-014, PLAT-001). -->
        <app-ds-button variant="ghost" size="sm" (click)="simulateGesture()">
          Simulate gesture (eyebrow)
        </app-ds-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvTreeComponent {
  private readonly facade = inject(SpeechTreeNodeFacade);
  readonly loading = this.facade.loading;

  readonly parentIdAtual = signal<string | null>(null);
  readonly selectedNodeId = signal<string | null>(null);
  readonly channel = signal<EntryChannel>('toque');
  /** Locale of the prototype (ADR-018) — English only; the set of "active" nodes
   * (complete Dual Authorization) is given by `SpeechTreeNodeFacade.isActive`. */
  readonly locale = signal<Locale>('en');

  readonly nivelAtual = computed(() =>
    this.facade.items().find(n => n.id === this.parentIdAtual()) ?? null,
  );

  // Pure retrieval (ADR-015, TECH-007): only nodes with complete Dual Authorization in the active
  // locale appear in navigation — categories always visible (structure, not content
  // subject to review), phrases only after being approved on both sides.
  readonly nosNoNivel = computed(() => {
    const locale = this.locale();
    return this.facade.items()
      .filter(n => n.parentId === this.parentIdAtual())
      .filter(n => n.type === 'category' || this.facade.isActive(n, locale))
      .sort((a, b) => a.order - b.order);
  });

  readonly selectedNode = computed(() =>
    this.facade.items().find(n => n.id === this.selectedNodeId()) ?? null,
  );

  /** Nodes already approved by the caregiver in the active locale, but still awaiting patient
   * confirmation — feeds the link banner to Screen 09 (ADR-016). */
  readonly pendingConfirmation = computed(() => {
    const locale = this.locale();
    return this.facade.items().filter(n => {
      const c = n.content[locale];
      return c.caregiverConfirmed && !c.patientConfirmed;
    }).length;
  });

  protected select(id: string): void {
    const no = this.facade.items().find(n => n.id === id);
    if (!no) return;
    if (no.type === 'category') {
      this.parentIdAtual.set(no.id);
      this.selectedNodeId.set(null);
    } else {
      this.channel.set('toque');
      this.selectedNodeId.set(no.id);
      // TODO[architect]: if the node has an engineFeatureRef mapped to a Command, evaluate whether
      // the selection should also generate an Event in the existing catalog (Framing §12 question 6).
    }
  }

  protected back(): void {
    const pai = this.nivelAtual();
    this.parentIdAtual.set(pai?.parentId ?? null);
    this.selectedNodeId.set(null);
  }

  /** Demonstrates the input-agnostic channel (Screen 06 principle): selects, via simulated
   * "gesture", the first node of the current level with engineFeatureRef = 'tg-eyebrow' —
   * the same destination that touch would reach, with no channel privilege. */
  protected simulateGesture(): void {
    const target = this.nosNoNivel().find(n => n.engineFeatureRef === 'tg-eyebrow');
    if (!target) return;
    this.channel.set('gesture');
    if (target.type === 'category') {
      this.parentIdAtual.set(target.id);
    } else {
      this.selectedNodeId.set(target.id);
    }
  }
}
