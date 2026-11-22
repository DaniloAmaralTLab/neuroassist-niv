import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { SpeechTreeNodeFacade } from '../../core/data-access';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsBadgeComponent } from '../../ui/ds-badge.component';
import { DsButtonComponent } from '../../ui/ds-button.component';
import { DsInputComponent } from '../../ui/ds-input.component';
import { Locale, SpeechTreeNode } from '../../shared/data-model';

// Contract: wireframe.md Screen 08 — Training (Amendment 4, 2026-08-31; ADR-016 accepted).
// Goal: the caregiver starts/watches a conversation with the LLM (Claude/Anthropic API, see
// ADR-016) to propose new CONV categories/phrases, in English. Lives in the
// caregiver's shell (DASH), not in the patient's restricted shell. Each proposal requires Dual
// Authorization (ADR-018) — the caregiver approves their own side here; the patient's
// confirmation happens asynchronously on Screen 09, with no synchronous screen handoff.
// The LLM conversation is SCRIPTED in the prototype — no real API call.
// NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

interface Message { de: 'llm' | 'caregiver'; text: string; }

const SCRIPT_LLM: Message[] = [
  { de: 'llm', text: 'Hello! Let\'s review new phrases for Márcio\'s speech tree. Would you like to add anything today?' },
  { de: 'caregiver', text: 'Yes — one to ask for water with ice, and another to call Danilo.' },
  { de: 'llm', text: 'Done. I prepared the two proposals below. Review and approve whatever makes sense — Márcio confirms his side later, on his mobile phone.' },
];

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [DsCardComponent, DsBadgeComponent, DsButtonComponent, DsInputComponent],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-2 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Speech tree training</h1>
          <p class="mt-1 text-sm text-ink-soft">Led by the caregiver — Márcio confirms his side later, on his mobile phone.</p>
        </div>
        <app-ds-badge tone="pu">
          <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
          Training — not the patient app
        </app-ds-badge>
      </header>

      @if (!sessionStarted()) {
        <app-ds-card>
          <p class="text-center text-sm text-ink-soft">No training session started.</p>
          <div class="mt-4 flex justify-center">
            <app-ds-button (click)="startSession()">Start training</app-ds-button>
          </div>
        </app-ds-card>
      } @else {
        <app-ds-card class="mb-5">
          <div class="flex flex-col gap-3">
            @for (m of messages(); track $index) {
              <div class="flex" [class]="m.de === 'llm' ? 'justify-start' : 'justify-end'">
                <div class="max-w-[80%] rounded-card px-3.5 py-2 text-sm"
                     [class]="m.de === 'llm' ? 'bg-ai-bg text-ai-ink' : 'bg-brand-subtle text-brand'">
                  <span class="mb-0.5 block text-2xs font-semibold uppercase tracking-wide opacity-70">{{ m.de === 'llm' ? 'LLM' : 'Caregiver' }}</span>
                  {{ m.text }}
                </div>
              </div>
            }
            @if (digitando()) {
              <div class="flex items-center gap-2 text-xs text-ink-faint">
                <span class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                LLM replying…
              </div>
            }
          </div>

          @if (nextCaregiverSpeech()) {
            <div class="mt-4 flex justify-end">
              <app-ds-button size="sm" variant="secondary" (click)="advanceScript()">
                {{ nextCaregiverSpeech() }}
              </app-ds-button>
            </div>
          }
        </app-ds-card>

        <h2 class="mb-3 font-display text-sm font-semibold text-ink">Pending proposals</h2>
        @if (proposals().length === 0) {
          <app-ds-card><p class="text-center text-sm text-ink-soft">No pending proposals.</p></app-ds-card>
        } @else {
          <div class="flex flex-col gap-3">
            @for (p of proposals(); track p.id) {
              <app-ds-card>
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="font-display text-base font-semibold text-ink">"{{ p.content[locale()].text }}"</p>
                    <p class="mt-0.5 text-xs text-ink-faint">category: {{ categoryOf(p) }}</p>
                    <div class="mt-2 flex items-center gap-2">
                      <app-ds-badge [tone]="p.content[locale()].caregiverConfirmed ? 'ok' : 'wn'">
                        {{ p.content[locale()].caregiverConfirmed ? '✅ caregiver' : '⏳ caregiver' }}
                      </app-ds-badge>
                      <app-ds-badge [tone]="p.content[locale()].patientConfirmed ? 'ok' : 'wn'">
                        {{ p.content[locale()].patientConfirmed ? '✅ patient' : '⏳ patient' }}
                      </app-ds-badge>
                    </div>
                  </div>
                  @if (!p.content[locale()].caregiverConfirmed) {
                    <app-ds-button size="sm" (click)="approve(p.id)">Approve</app-ds-button>
                  }
                </div>
              </app-ds-card>
            }
          </div>
        }

        <div class="mt-6 flex flex-col gap-3 border-t border-line pt-5">
          <p class="text-xs font-semibold text-ink-soft">Add phrase manually (no LLM)</p>
          <div class="flex gap-2">
            <app-ds-input placeholder="Phrase text" [(value)]="newTextEn" />
            <app-ds-button variant="secondary" [disabled]="!newTextEn()" (click)="addManual()">Propose</app-ds-button>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <app-ds-button variant="ghost" size="sm" (click)="endSession()">End training session</app-ds-button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingComponent {
  private readonly facade = inject(SpeechTreeNodeFacade);

  readonly locale = signal<Locale>('en');
  readonly sessionStarted = signal(false);
  readonly digitando = signal(false);
  readonly messages = signal<Message[]>([]);
  readonly newTextEn = signal('');

  private scriptIndex = 0;

  // Nodes proposed via TRAINING (proposedByTraining=true) still without complete Dual
  // Authorization in the active locale — what the caregiver reviews on this screen.
  readonly proposals = computed(() =>
    this.facade.items().filter(n => n.proposedByTraining && !this.facade.isActive(n, this.locale())),
  );

  readonly nextCaregiverSpeech = computed(() => {
    const next = SCRIPT_LLM[this.scriptIndex];
    return next?.de === 'caregiver' ? next.text : null;
  });

  protected startSession(): void {
    this.sessionStarted.set(true);
    this.playNextSpeechLlm();
  }

  /** Scripted flow (prototype, no real API) — the caregiver's line advances on click
   * (simulates her input); the LLM's next line plays automatically, with a
   * "typing" indicator. */
  protected advanceScript(): void {
    const next = SCRIPT_LLM[this.scriptIndex];
    if (next?.de !== 'caregiver') return;
    this.messages.update(list => [...list, next]);
    this.scriptIndex++;
    this.playNextSpeechLlm();
  }

  private playNextSpeechLlm(): void {
    const next = SCRIPT_LLM[this.scriptIndex];
    if (next?.de !== 'llm') return;
    this.digitando.set(true);
    setTimeout(() => {
      this.digitando.set(false);
      this.messages.update(list => [...list, next]);
      this.scriptIndex++;
    }, 900);
  }

  protected categoryOf(no: SpeechTreeNode): string {
    const pai = this.facade.items().find(n => n.id === no.parentId);
    return pai?.content[this.locale()]?.text ?? '—';
  }

  protected approve(id: string): void {
    this.facade.confirmCaregiver(id, this.locale());
  }

  protected addManual(): void {
    if (!this.newTextEn()) return;
    this.facade.propose('pat-marcio', 'node-cat-conversation', this.newTextEn());
    this.newTextEn.set('');
  }

  protected endSession(): void {
    // Pending proposals are NOT discarded on ending — they stay as drafts
    // indefinitely (ADR-016 "Complementary decisions", no automatic expiry).
    this.sessionStarted.set(false);
    this.messages.set([]);
    this.scriptIndex = 0;
  }
}
