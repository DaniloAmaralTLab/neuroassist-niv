import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpeechTreeNodeFacade } from '../../core/data-access';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsButtonComponent } from '../../ui/ds-button.component';
import { Locale } from '../../shared/data-model';

// Contract: wireframe.md Screen 09 — Patient Confirmation (Amendment 4, 2026-08-31; ADR-016
// accepted). Goal: the patient sees proposals already approved by the caregiver (Screen 08) and
// confirms/adjusts/rejects, at their own pace — no synchronous screen handoff. Lives in the
// patient's restricted shell (patient-shell.component.ts, same shell as Screen 06). No
// free-text editing (limited motor control) — only yes/adjust (short variations)/reject,
// through the same input-agnostic channel as Screen 06.
// NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

@Component({
  selector: 'app-training-confirmation',
  standalone: true,
  imports: [DsCardComponent, DsButtonComponent, RouterLink],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-6">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">New phrases to confirm</h1>
      </header>

      @if (loading()) {
        <p class="text-sm text-ink-faint">Loading…</p>
      } @else if (pending().length === 0) {
        <app-ds-card>
          <p class="text-center text-sm text-ink-soft">No phrases awaiting confirmation.</p>
        </app-ds-card>
      } @else {
        <div class="flex flex-col gap-4">
          @for (no of pending(); track no.id) {
            <app-ds-card>
              <p class="font-display text-lg font-semibold text-ink">"{{ no.content[locale()].text }}"</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <app-ds-button size="sm" (click)="confirm(no.id)">
                  <span class="material-symbols-outlined text-[18px]">check</span> Confirm
                </app-ds-button>
                <app-ds-button size="sm" variant="secondary" (click)="ajustar(no.id)">
                  <span class="material-symbols-outlined text-[18px]">edit</span> Adjust
                </app-ds-button>
                <app-ds-button size="sm" variant="danger" (click)="recusar(no.id)">
                  <span class="material-symbols-outlined text-[18px]">close</span> Reject
                </app-ds-button>
              </div>
              @if (ajustandoId() === no.id) {
                <div class="mt-3 flex flex-wrap gap-2 rounded-lg bg-surface-2 p-3">
                  <p class="w-full text-xs text-ink-faint">Variations suggested by the LLM (prototype — no free-text editing):</p>
                  @for (variation of variations(no); track variation) {
                    <button (click)="confirmWithVariation(no.id, variation)"
                            class="rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface">
                      "{{ variation }}"
                    </button>
                  }
                </div>
              }
            </app-ds-card>
          }
        </div>
      }

      <div class="mt-8">
        <a routerLink="/patient/converse" class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span> Back to conversation
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingConfirmationComponent {
  private readonly facade = inject(SpeechTreeNodeFacade);
  readonly loading = this.facade.loading;

  /** Locale of the patient session — English only (no language selector). */
  readonly locale = signal<Locale>('en');
  readonly ajustandoId = signal<string | null>(null);

  // Only nodes with caregiverConfirmed=true and patientConfirmed=false in the active locale —
  // Dual Authorization pending on the patient's side (ADR-016/ADR-018).
  readonly pending = computed(() =>
    this.facade.items().filter(n => {
      const c = n.content[this.locale()];
      return c.caregiverConfirmed && !c.patientConfirmed;
    }),
  );

  protected confirm(id: string): void {
    this.facade.confirmPatient(id, this.locale());
    this.ajustandoId.set(null);
  }

  protected ajustar(id: string): void {
    this.ajustandoId.set(this.ajustandoId() === id ? null : id);
  }

  protected recusar(id: string): void {
    this.facade.recusar(id, this.locale());
    this.ajustandoId.set(null);
  }

  /** Illustrative short variations — in the real product, they would come from the LLM in the
   * TRAINING session (Screen 08), not hardcoded. The prototype shows the interaction without free editing. */
  protected variations(no: { content: Record<Locale, { text: string }> }): string[] {
    const base = no.content[this.locale()].text;
    return [base, `${base}, please`];
  }

  protected confirmWithVariation(id: string, _variation: string): void {
    // TODO[architect]: persist the chosen variation as the node's final text, not just
    // confirm the original text — the prototype only demonstrates the choice interaction.
    this.confirm(id);
  }
}
