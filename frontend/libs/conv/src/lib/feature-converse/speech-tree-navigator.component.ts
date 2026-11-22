import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DsCardComponent, DsBadgeComponent, DsButtonComponent } from '@neuroassist/shared/ui-components';
import { SpeechTreeFacade } from '../speech-tree.facade';
import { SpeechTreeNode, Locale } from '../conv.model';

// Promoted from: design-reference/angular-prototype/apps/neuroassist-niv-web/src/app/screens/conv-tree/conv-tree.component.ts
// D-493 / D-494 — fe-architect-promote neuroassist-niv CONV
// Contract: wireframe.md Screen 06 — Speech Tree (Amendment 3/4, ADR-013/016/017/018 accepted).
// Goal: category → phrase navigation, input-agnostic channel (GEST via NAVIGATION_INTENT_PORT seam,
// or direct touch/mouse) — the same "selected node" model is reachable through any channel,
// with no hierarchy among them (ADR-007 — ≤2 selections, INV-CONV-5).
// NIV note: English-only product (ADR-018-english-only-product).

type EntryChannel = 'touch' | 'gesture';

@Component({
  selector: 'conv-speech-tree-navigator',
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
              <p class="mt-1 text-xs text-ink-faint">Played with cached audio of the patient's voice (ElevenLabs, synthesized in the TRAINING phase — ADR-017). Layer 2: AudioCacheStore + TTS fallback cascade (FE-CONV-007/008).</p>
            } @else {
              <p class="mt-1 text-xs text-ink-faint">Cached audio not yet available — native browser TTS fallback (Web Speech API, constraint OPS-004). Layer 2: fail-safe cascade (FE-CONV-008).</p>
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

        <!-- Gesture channel simulation — the prototype has no real webcam (ADR-014, PLAT-001).
             Layer 2 (FE-CONV-004): NAVIGATION_INTENT_PORT seam replaces this button (ADR-007). -->
        <app-ds-button variant="ghost" size="sm" (click)="simulateGesture()">
          Simulate gesture (eyebrow)
        </app-ds-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeechTreeNavigatorComponent implements OnInit {
  private readonly facade = inject(SpeechTreeFacade);

  readonly loading = this.facade.loading;

  readonly parentIdAtual = signal<string | null>(null);
  readonly selectedNodeId = signal<string | null>(null);
  readonly channel = signal<EntryChannel>('touch');
  /** English is the only supported locale (ADR-018). */
  readonly locale = signal<Locale>('en');

  readonly nivelAtual = computed(() =>
    this.facade.items().find(n => n.id === this.parentIdAtual()) ?? null,
  );

  // Pure retrieval (ADR-015): only nodes with complete Dual Authorization in the active
  // locale appear in navigation — categories always visible (structure, not content
  // subject to review), phrases only after being approved on both sides.
  readonly nosNoNivel = computed(() => {
    const locale = this.locale();
    return this.facade.items()
      .filter(n => n.parentId === this.parentIdAtual())
      .filter(n => n.type === 'category' || this.facade.isActive(n, locale))
      .sort((a, b) => a.order - b.order);
  });

  readonly selectedNode = computed((): SpeechTreeNode | null =>
    this.facade.items().find(n => n.id === this.selectedNodeId()) ?? null,
  );

  /** Nodes approved by the caregiver in the active locale, but still awaiting patient
   * confirmation — feeds the banner link to Screen 09 / TRN (ADR-016). */
  readonly pendingConfirmation = computed(() => {
    const locale = this.locale();
    return this.facade.items().filter(n => {
      const c = n.content[locale];
      return c.caregiverConfirmed && !c.patientConfirmed;
    }).length;
  });

  ngOnInit(): void {
    this.facade.load();
  }

  protected select(id: string): void {
    const no = this.facade.items().find(n => n.id === id);
    if (!no) return;
    if (no.type === 'category') {
      this.parentIdAtual.set(no.id);
      this.selectedNodeId.set(null);
    } else {
      this.channel.set('touch');
      this.selectedNodeId.set(no.id);
      // TODO[FE-CONV-004]: when NAVIGATION_INTENT_PORT seam is live (ADR-007),
      // evaluate if selecting a phrase via gesture should emit an Event in the existing
      // command catalog (Framing §12 question 6).
    }
  }

  protected back(): void {
    const pai = this.nivelAtual();
    this.parentIdAtual.set(pai?.parentId ?? null);
    this.selectedNodeId.set(null);
  }

  /** Demonstrates the input-agnostic channel (ADR-007): selects via simulated "gesture"
   * the first node at the current level with engineFeatureRef = 'tg-eyebrow' — the same
   * destination that touch would reach, with no channel privilege.
   * Layer 2: replaced by the real NAVIGATION_INTENT_PORT seam (FE-CONV-004). */
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
