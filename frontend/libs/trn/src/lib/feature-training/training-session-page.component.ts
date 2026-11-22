import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrainingSessionFacade } from '../training-session.facade';
import { ProposalFacade } from '../proposal.facade';
import { PublicationFacade } from '../publication.facade';
import { Proposal } from '../trn.model';

// Contract: SPEC-01 §1 (route /training), SPEC-02 §1 (TrainingSessionPageComponent),
// SPEC-03 §1 (view model), ADR-007 (AI is BE-mediated — no direct vendor calls).
// Screen 08 — caregiver authoring surface (Speech Tree Training).
// Lives in the caregiver web Shell (neuroassist-niv-web), not the patient surface.
//
// Prototype note (D-493): training.component.ts in the BA angular-prototype was a draft
// only (no build plan entry). This production component is built from SPEC, not promoted.
// It preserves the prototype's UX intent (chat panel + pending-proposals list) while
// connecting to the real Port/Facade layer instead of the scripted mock.

/** MOCK patient id — replace with real session context from ACS once wired (FE-TRN-029). */
const MOCK_PATIENT_ID = 'pat-marcio';

@Component({
  selector: 'trn-training-session-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-2 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">
            Speech tree training
          </h1>
          <p class="mt-1 text-sm text-ink-soft">
            Led by the caregiver — the patient confirms their side later, on their device.
          </p>
        </div>
        <!-- TECH-007: persistent badge distinguishing TRN from CONV runtime -->
        <span class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5
                     text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
          Training — not the patient app
        </span>
      </header>

      @if (sessionFacade.error()) {
        <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800
                    dark:border-red-800 dark:bg-red-950 dark:text-red-200" role="alert">
          <strong>Error:</strong> {{ sessionFacade.error() }}
        </div>
      }

      @if (!sessionFacade.session()) {
        <!-- No session started -->
        <div class="mt-6 rounded-lg border border-line bg-surface p-8 text-center">
          @if (sessionFacade.loading()) {
            <p class="text-sm text-ink-faint">Starting session…</p>
          } @else {
            <p class="mb-4 text-sm text-ink-soft">No training session started.</p>
            <button
              class="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold
                     text-white hover:bg-brand-hover focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-brand disabled:opacity-50"
              (click)="startSession()">
              Start training
            </button>
          }
        </div>

      } @else {

        <!-- Chat conversation panel -->
        <div class="mt-6 rounded-lg border border-line bg-surface p-5">
          <div class="flex max-h-72 flex-col gap-3 overflow-y-auto">
            @if (sessionFacade.messages().length === 0) {
              <p class="text-sm text-ink-faint">Session started. Ask the assistant for ideas.</p>
            }
            @for (m of sessionFacade.messages(); track $index) {
              <div class="flex" [class]="m.role === 'assistant' ? 'justify-start' : 'justify-end'">
                <div class="max-w-[80%] rounded-xl px-3.5 py-2 text-sm"
                     [class]="m.role === 'assistant'
                       ? 'bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100'
                       : 'bg-brand-subtle text-brand'">
                  <span class="mb-0.5 block text-2xs font-semibold uppercase tracking-wide opacity-70">
                    {{ m.role === 'assistant' ? 'LLM' : 'Caregiver' }}
                  </span>
                  {{ m.content }}
                </div>
              </div>
            }
            @if (sessionFacade.dialogPending()) {
              <div class="flex items-center gap-2 text-xs text-ink-faint">
                <span class="material-symbols-outlined animate-spin text-[16px]">
                  progress_activity
                </span>
                LLM replying…
              </div>
            }
            @if (sessionFacade.dialogError()) {
              <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700
                          dark:border-red-800 dark:bg-red-950 dark:text-red-300" role="alert">
                {{ sessionFacade.dialogError() }}
                <span class="block mt-1 font-semibold">
                  Your drafts are preserved. The LLM will be retried on the next turn.
                </span>
              </div>
            }
          </div>

          <!-- Caregiver input -->
          <div class="mt-4 flex gap-2 border-t border-line pt-4">
            <input
              type="text"
              class="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm
                     placeholder-ink-faint focus:border-brand focus:outline-none
                     dark:bg-surface-2"
              placeholder="Ask the assistant (e.g. add a phrase to ask for water)"
              [value]="caregiverInput()"
              (input)="caregiverInput.set($any($event.target).value)"
              (keydown.enter)="sendTurn()"
              [disabled]="sessionFacade.dialogPending()" />
            <button
              class="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold
                     text-white hover:bg-brand-hover disabled:opacity-50"
              [disabled]="!caregiverInput().trim() || sessionFacade.dialogPending()"
              (click)="sendTurn()">
              Send
            </button>
          </div>
        </div>

        <!-- Pending proposals panel -->
        <section class="mt-6">
          <h2 class="mb-3 font-display text-sm font-semibold text-ink">
            Pending proposals
            @if (pendingApproval().length > 0) {
              <span class="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5
                           text-xs font-semibold text-amber-800">
                {{ pendingApproval().length }}
              </span>
            }
          </h2>

          @if (pendingApproval().length === 0) {
            <div class="rounded-lg border border-line bg-surface p-4 text-center">
              <p class="text-sm text-ink-soft">No proposals pending your approval.</p>
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (p of pendingApproval(); track p.id) {
                <div class="rounded-lg border border-line bg-surface p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <p class="font-display text-base font-semibold text-ink">
                        "{{ p.text }}"
                      </p>
                      <!-- Dual-authorization indicators -->
                      <div class="mt-2 flex items-center gap-2">
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs
                                     font-semibold"
                              [class]="p.authorization.caregiverConfirmed
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'">
                          {{ p.authorization.caregiverConfirmed ? '✅ caregiver' : '⏳ caregiver' }}
                        </span>
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs
                                     font-semibold"
                              [class]="p.authorization.patientAssented
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'">
                          {{ p.authorization.patientAssented ? '✅ patient' : '⏳ patient' }}
                        </span>
                        @if (publicationFacade.publicationFor(p.id); as pub) {
                          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs
                                       font-semibold"
                                [class]="pub.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : pub.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-sky-100 text-sky-800'">
                            {{ pub.status }}
                          </span>
                        }
                      </div>
                      @if (proposalFacade.errorFor(p.id)) {
                        <p class="mt-1 text-xs text-red-600">
                          {{ proposalFacade.errorFor(p.id) }}
                        </p>
                      }
                    </div>
                    <div class="flex flex-shrink-0 gap-2">
                      @if (!p.authorization.caregiverConfirmed) {
                        <button
                          class="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white
                                 hover:bg-brand-hover disabled:opacity-50"
                          [disabled]="proposalFacade.isPending(p.id)"
                          (click)="approveCaregiver(p.id)">
                          Approve
                        </button>
                      }
                      <button
                        class="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold
                               text-ink-soft hover:bg-surface-2 disabled:opacity-50"
                        [disabled]="proposalFacade.isPending(p.id)"
                        (click)="reject(p.id)">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Link to patient assent surface -->
        @if (pendingAssent().length > 0) {
          <div class="mt-4 rounded-lg border border-line bg-surface p-4">
            <p class="text-sm text-ink-soft">
              <span class="font-semibold text-ink">
                {{ pendingAssent().length }}
                {{ pendingAssent().length === 1 ? 'proposal' : 'proposals' }}
              </span>
              approved by you, waiting for the patient to confirm.
            </p>
            <a
              routerLink="assent"
              class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2
                     text-sm font-semibold text-white hover:bg-brand-hover">
              <span class="material-symbols-outlined text-[18px]">person</span>
              Open patient assent surface
            </a>
          </div>
        }

        <!-- End session -->
        <div class="mt-8 flex justify-end border-t border-line pt-6">
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-soft
                   hover:bg-surface-2"
            (click)="endSession()">
            End training session
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingSessionPageComponent implements OnInit {
  protected readonly sessionFacade = inject(TrainingSessionFacade);
  protected readonly proposalFacade = inject(ProposalFacade);
  protected readonly publicationFacade = inject(PublicationFacade);

  protected readonly caregiverInput = signal('');

  protected readonly pendingApproval = computed(() =>
    this.sessionFacade.pendingApproval(),
  );

  protected readonly pendingAssent = computed(() =>
    this.sessionFacade.pendingAssent(),
  );

  ngOnInit(): void {
    // Attempt to resume an open session stored in the session key (FE-TRN-003).
    // For v1, the page always starts fresh; Layer 2 adds session persistence.
    // Currently we do nothing here — the user starts the session manually.
  }

  protected startSession(): void {
    this.sessionFacade.startSession(MOCK_PATIENT_ID);
  }

  protected sendTurn(): void {
    const text = this.caregiverInput().trim();
    if (!text) return;
    this.caregiverInput.set('');
    this.sessionFacade.sendDialogTurn(text);
  }

  protected approveCaregiver(proposalId: string): void {
    this.proposalFacade.confirmCaregiver(proposalId);
  }

  protected reject(proposalId: string): void {
    this.proposalFacade.reject(proposalId);
  }

  protected publishApproved(proposal: Proposal): void {
    if (proposal.authorization.caregiverConfirmed && proposal.authorization.patientAssented) {
      this.publicationFacade.requestPublication(proposal.id);
    }
  }

  protected endSession(): void {
    this.sessionFacade.endSession();
  }
}
