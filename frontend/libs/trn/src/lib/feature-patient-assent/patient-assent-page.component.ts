import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrainingSessionFacade } from '../training-session.facade';
import { ProposalFacade } from '../proposal.facade';
import { PublicationFacade } from '../publication.facade';

// Contract: SPEC-01 §1 (route /training/assent), SPEC-02 §2 (PatientAssentPageComponent).
// Screen 09 — assisted patient-assent surface.
//
// Design decisions carried from SPEC-01 §2 (single-identity):
//  - This surface runs under the CAREGIVER session, not a patient-session token.
//  - There is NO patientConfirmGuard and NO trn.proposal.confirm authority.
//  - The patient/guardian performs assent physically present with the caregiver;
//    the caregiver records the assent as an in-session domain fact (ADR-002, Option C).
//  - Input-channel-agnostic: large targets, designed for switch-scan (trn.switch-scan.enabled).
//
// Prototype note (D-493): training-confirmation.component.ts was a BA draft only.
// This production component is built from SPEC-02 §2 and SPEC-01 §2.

@Component({
  selector: 'trn-patient-assent-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-2xl p-8">
      <header class="mb-6">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">
          Patient assent — confirm new phrases
        </h1>
        <p class="mt-1 text-sm text-ink-soft">
          The patient confirms (or rejects) each phrase. The caregiver records their answer.
        </p>
      </header>

      <!-- TECH-007 badge (same as Screen 08) -->
      <div class="mb-6 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5
                  text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
        <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
        Training — not the patient app
      </div>

      @if (sessionFacade.loading()) {
        <p class="text-sm text-ink-faint">Loading session…</p>
      } @else if (pending().length === 0) {
        <div class="rounded-lg border border-line bg-surface p-8 text-center">
          <p class="text-sm text-ink-soft">
            No phrases awaiting the patient's assent.
          </p>
          <a
            routerLink=".."
            class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft
                   hover:text-ink">
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to training
          </a>
        </div>
      } @else {
        <div class="flex flex-col gap-4">
          @for (p of pending(); track p.id) {
            <div class="rounded-lg border border-line bg-surface p-5">
              <!-- Large text for accessibility (switch-scan, low motor control) -->
              <p class="font-display text-xl font-semibold text-ink">"{{ p.text }}"</p>

              @if (proposalFacade.errorFor(p.id)) {
                <p class="mt-2 text-xs text-red-600">
                  {{ proposalFacade.errorFor(p.id) }}
                </p>
              }

              <!-- Action buttons — large targets (SPEC-01 §5: host-portable, switch-scan) -->
              <div class="mt-4 flex flex-wrap gap-3">
                <button
                  class="inline-flex min-h-[44px] min-w-[120px] items-center justify-center
                         gap-2 rounded-xl bg-green-600 px-5 py-3 text-base font-semibold
                         text-white hover:bg-green-700 focus-visible:outline
                         focus-visible:outline-2 focus-visible:outline-green-600
                         disabled:opacity-50"
                  [disabled]="proposalFacade.isPending(p.id)"
                  (click)="recordAssent(p.id)">
                  <span class="material-symbols-outlined text-[20px]">check_circle</span>
                  Confirm
                </button>
                <button
                  class="inline-flex min-h-[44px] min-w-[120px] items-center justify-center
                         gap-2 rounded-xl border border-line px-5 py-3 text-base font-semibold
                         text-ink-soft hover:bg-surface-2 focus-visible:outline
                         focus-visible:outline-2 focus-visible:outline-ink-soft
                         disabled:opacity-50"
                  [disabled]="proposalFacade.isPending(p.id)"
                  (click)="toggleAdjust(p.id)">
                  <span class="material-symbols-outlined text-[20px]">edit</span>
                  Adjust
                </button>
                <button
                  class="inline-flex min-h-[44px] min-w-[120px] items-center justify-center
                         gap-2 rounded-xl border border-red-200 px-5 py-3 text-base font-semibold
                         text-red-600 hover:bg-red-50 focus-visible:outline
                         focus-visible:outline-2 focus-visible:outline-red-600
                         disabled:opacity-50"
                  [disabled]="proposalFacade.isPending(p.id)"
                  (click)="reject(p.id)">
                  <span class="material-symbols-outlined text-[20px]">cancel</span>
                  Reject
                </button>
              </div>

              <!-- Adjust panel (INT-FE-TRN-2: v1 Adjust = caregiver PATCH refine; no free-text) -->
              @if (adjustingId() === p.id) {
                <div class="mt-4 rounded-xl border border-line bg-surface-2 p-4">
                  <p class="mb-2 text-xs font-semibold text-ink-soft">
                    Adjust: re-enter the session and edit the phrase (then re-approve).
                  </p>
                  <p class="text-xs text-ink-faint">
                    INT-FE-TRN-2: LLM-suggested short variations are not yet available.
                    The caregiver will edit the phrase text in the training session.
                  </p>
                  <a
                    routerLink=".."
                    class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand
                           hover:underline">
                    <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back to training session to edit
                  </a>
                </div>
              }

              @if (proposalFacade.isPending(p.id)) {
                <div class="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                  <span class="material-symbols-outlined animate-spin text-[16px]">
                    progress_activity
                  </span>
                  Saving…
                </div>
              }
            </div>
          }
        </div>

        <div class="mt-8">
          <a
            routerLink=".."
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft
                   hover:text-ink">
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to training session
          </a>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientAssentPageComponent {
  protected readonly sessionFacade = inject(TrainingSessionFacade);
  protected readonly proposalFacade = inject(ProposalFacade);
  protected readonly publicationFacade = inject(PublicationFacade);

  protected readonly adjustingId = signal<string | null>(null);

  /**
   * Proposals with caregiver confirmation but no patient assent yet.
   * These are the ones the patient sees and responds to on this surface.
   */
  protected readonly pending = computed(() =>
    this.sessionFacade.pendingAssent(),
  );

  /**
   * Records the in-session patient/guardian assent attested by the caregiver.
   * Authority: trn.proposal.approve (BE §4.2 — caregiver bears both halves, ACS INV-3).
   * No patient-session token is used (SPEC-01 §2, ADR-002, Option C).
   */
  protected recordAssent(proposalId: string): void {
    this.adjustingId.set(null);
    this.proposalFacade.recordPatientAssent(proposalId);
  }

  protected toggleAdjust(proposalId: string): void {
    this.adjustingId.set(this.adjustingId() === proposalId ? null : proposalId);
  }

  protected reject(proposalId: string): void {
    this.adjustingId.set(null);
    this.proposalFacade.reject(proposalId);
  }
}
