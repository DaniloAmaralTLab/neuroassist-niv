import { Component, ChangeDetectionStrategy, inject, signal, computed, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommandsFacade, GestureTypesFacade, PatientsFacade } from '../../core/data-access';
import { Command, CommandSensitivity, CommandUrgency } from '../../shared/data-model';
import { DsBadgeComponent } from '../../ui/ds-badge.component';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsButtonComponent } from '../../ui/ds-button.component';
import { DsInputComponent } from '../../ui/ds-input.component';
import { DsKpiComponent } from '../../ui/ds-kpi.component';

// Contract: .build-plans/calibration.plan.md  (the implementer reads ONLY the build-plan)
// Wireframe ref: §5.1–5.5 — Calibration (Amendment 1 — command catalog; Amendment 2 —
// extensible gesture-type catalog, no longer closed to 6 values)
// Goal: manage Márcio's command catalog (add/edit/remove) and
// calibrate each one independently — gesture (simple or compound), sensitivity,
// urgency (Principle 2.4). The caregiver/operator can register a new gesture TYPE
// (e.g. "Lip reading") right here — see TODO[architect] in Framing §6.1/§9.3:
// registering the name does not mean the detection engine already recognizes the movement.

interface SensitivityOption { value: CommandSensitivity; label: string; hint: string; }
const SENSITIVITIES: SensitivityOption[] = [
  { value: 'low', label: 'Low', hint: 'needs a very clear gesture' },
  { value: 'medium', label: 'Medium', hint: 'recommended balance' },
  { value: 'high', label: 'High', hint: 'detects the faintest signal' },
];

type TestState = 'idle' | 'testando' | 'success' | 'error';
type NewTypeTarget = 'principal' | 'secondary' | null;

/** Editor form state — mirrors the editable fields of Command.
 * primaryPrimitive/Secondary hold the id of a GestureType (extensible catalog). */
interface CommandForm {
  label: string;
  urgency: CommandUrgency;
  primaryPrimitive: string;
  secondaryPrimitive: string | null;
  sensitivity: CommandSensitivity;
  minGestureDurationMs: number;
  maxGestureDurationMs: number;
}

@Component({
  selector: 'app-calibration',
  standalone: true,
  imports: [FormsModule, DsBadgeComponent, DsCardComponent, DsButtonComponent, DsInputComponent, DsKpiComponent],
  template: `
    <div class="mx-auto max-w-6xl p-8">
      <header class="mb-7 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Calibration — Márcio Amaral</h1>
          <p class="mt-1 text-sm text-ink-soft">Command catalog: each gesture mapped to a need, calibrated individually.</p>
        </div>
        @if (!editando()) {
          <app-ds-button (click)="new()">
            <span class="material-symbols-outlined text-[18px]">add</span>
            New command
          </app-ds-button>
        }
      </header>

      @if (loading()) {
        <p class="text-sm text-ink-faint">Loading catalog…</p>
      } @else if (editando(); as form) {
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <!-- CommandEditor -->
          <app-ds-card>
            <h2 class="mb-4 font-display text-sm font-semibold text-ink">
              {{ editandoId() ? 'Edit command' : 'New command' }}
            </h2>

            <label class="mb-1 block text-xs font-medium text-ink-soft">Label (the word the family uses)</label>
            <app-ds-input placeholder='E.g.: "Water", "Frog"...' [(value)]="form.label" icon="edit" />
            <p class="mt-1.5 text-xs text-ink-faint">Free text — the system does not interpret the meaning, it only stores and displays it.</p>

            <div class="mt-5">
              <label class="mb-2 block text-xs font-medium text-ink-soft">Urgency</label>
              <div class="flex items-center gap-2">
                <button
                  (click)="form.urgency = 'emergency'"
                  class="flex-1 rounded-lg border-[1.5px] py-2.5 text-center text-sm font-semibold transition-colors"
                  [class]="form.urgency === 'emergency' ? 'border-alarm bg-alarm-bg text-alarm' : 'border-line text-ink-soft hover:bg-surface-2'">
                  Emergency
                </button>
                <button
                  (click)="form.urgency = 'routine'"
                  class="flex-1 rounded-lg border-[1.5px] py-2.5 text-center text-sm font-semibold transition-colors"
                  [class]="form.urgency === 'routine' ? 'border-brand bg-brand-subtle text-brand' : 'border-line text-ink-soft hover:bg-surface-2'">
                  Routine
                </button>
              </div>
              <p class="mt-1.5 text-xs text-ink-faint">
                @if (form.urgency === 'emergency') {
                  Triggers the full-screen alarm — requires immediate confirmation from the caregiver.
                } @else {
                  Appears as a discreet notice, without interrupting the screen — it is recorded in the history.
                }
              </p>
            </div>

            <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium text-ink-soft">Primary gesture</label>
                @if (newTypeOpen() === 'principal') {
                  <div class="flex items-center gap-2">
                    <input [(ngModel)]="newTypeName" placeholder='E.g.: "Lip reading"'
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand" />
                    <button (click)="confirmNewType(form)" [disabled]="!newTypeName.trim()" class="flex-shrink-0 text-xs font-semibold text-brand hover:text-brand-strong disabled:opacity-40">save</button>
                    <button (click)="cancelNewType()" class="flex-shrink-0 text-xs font-semibold text-ink-soft hover:text-ink">×</button>
                  </div>
                } @else {
                  <div class="flex items-center gap-2">
                    <select [ngModel]="form.primaryPrimitive" (ngModelChange)="form.primaryPrimitive = $any($event)"
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand">
                      @for (t of gestureTypes(); track t.id) {
                        <option [value]="t.id">{{ t.name }}</option>
                      }
                    </select>
                    <button (click)="openNewType('principal')" title="Register new gesture type"
                      class="grid size-9 flex-shrink-0 place-items-center rounded-md border-[1.5px] border-dashed border-line text-ink-soft hover:bg-brand-subtle hover:text-brand">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                }
              </div>

              <div>
                @if (newTypeOpen() === 'secondary') {
                  <label class="mb-1 block text-xs font-medium text-ink-soft">New type (second gesture)</label>
                  <div class="flex items-center gap-2">
                    <input [(ngModel)]="newTypeName" placeholder='E.g.: "Lip reading"'
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand" />
                    <button (click)="confirmNewType(form)" [disabled]="!newTypeName.trim()" class="flex-shrink-0 text-xs font-semibold text-brand hover:text-brand-strong disabled:opacity-40">save</button>
                    <button (click)="cancelNewType()" class="flex-shrink-0 text-xs font-semibold text-ink-soft hover:text-ink">×</button>
                  </div>
                } @else if (form.secondaryPrimitive === null) {
                  <label class="mb-1 block text-xs font-medium text-ink-soft">&nbsp;</label>
                  <button (click)="form.secondaryPrimitive = nextType(form.primaryPrimitive)"
                    class="flex h-9 w-full items-center justify-center rounded-md border-[1.5px] border-dashed border-line text-xs font-semibold text-brand hover:bg-brand-subtle">
                    + Add second gesture (combination)
                  </button>
                } @else {
                  <label class="mb-1 block text-xs font-medium text-ink-soft">Second gesture (combination)</label>
                  <div class="flex items-center gap-2">
                    <select [ngModel]="form.secondaryPrimitive" (ngModelChange)="form.secondaryPrimitive = $any($event)"
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand">
                      @for (t of gestureTypes(); track t.id) {
                        <option [value]="t.id">{{ t.name }}</option>
                      }
                    </select>
                    <button (click)="openNewType('secondary')" title="Register new gesture type"
                      class="grid size-9 flex-shrink-0 place-items-center rounded-md border-[1.5px] border-dashed border-line text-ink-soft hover:bg-brand-subtle hover:text-brand">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                    <button (click)="form.secondaryPrimitive = null" class="flex-shrink-0 text-xs font-semibold text-danger hover:text-danger">remove</button>
                  </div>
                }
              </div>
            </div>
            <p class="mt-2 text-xs text-ink-faint">
              Can't find the gesture in the list? Use the <span class="material-symbols-outlined align-middle text-[13px]">add</span> to register a new type — the catalog is not closed.
            </p>

            <div class="mt-5">
              <label class="mb-2 block text-xs font-medium text-ink-soft">Sensitivity</label>
              <div class="flex items-center gap-2">
                @for (s of sensitivities; track s.value) {
                  <button
                    (click)="form.sensitivity = s.value"
                    class="flex-1 rounded-lg border-[1.5px] py-2.5 text-center transition-colors"
                    [class]="form.sensitivity === s.value ? 'border-brand bg-brand-subtle' : 'border-line hover:bg-surface-2'">
                    <div class="text-sm font-semibold" [class]="form.sensitivity === s.value ? 'text-brand' : 'text-ink'">{{ s.label }}</div>
                  </button>
                }
              </div>
              <p class="mt-2 text-center text-xs text-ink-faint">{{ sensitivityHint(form.sensitivity) }}</p>
            </div>

            <div class="mt-5 flex items-center gap-4 rounded-lg bg-surface-2 p-4">
              <div class="relative grid h-20 w-28 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
                <video #videoPreview class="h-full w-full object-cover" [class.hidden]="test() !== 'testando'" autoplay muted playsinline></video>
                @if (test() !== 'testando') {
                  <span class="material-symbols-outlined text-[28px]"
                    [class]="test() === 'success' ? 'text-success' : test() === 'error' ? 'text-danger' : 'text-ink-faint'">
                    {{ test() === 'success' ? 'check_circle' : test() === 'error' ? 'videocam_off' : 'videocam' }}
                  </span>
                }
              </div>
              <div class="flex-1 text-xs">
                @if (test() === 'idle') {
                  <span class="text-ink-soft">
                    @if (form.secondaryPrimitive) {
                      Perform both gestures in sequence — testing the combination reduces the risk of a false negative.
                    } @else {
                      Perform the gesture in front of the webcam to confirm it is being recognized.
                    }
                  </span>
                } @else if (test() === 'testando') {
                  <span class="font-medium text-brand">Camera active — perform the gesture now…</span>
                } @else if (test() === 'error') {
                  <span class="font-medium text-danger">Could not access the webcam. Check the browser permission and try again.</span>
                } @else {
                  <span class="font-medium text-success-ink">Gesture recognized successfully!</span>
                }
              </div>
              @if (test() === 'testando') {
                <app-ds-button size="sm" variant="ghost" (click)="stopTest()">Stop</app-ds-button>
              } @else {
                <app-ds-button size="sm" variant="secondary" (click)="testar()">Test now</app-ds-button>
              }
            </div>
          </app-ds-card>

          <!-- Side column: preview + actions -->
          <div class="flex flex-col gap-6">
            <app-ds-card>
              <h3 class="mb-3 font-display text-sm font-semibold text-ink">Preview</h3>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-ink">"{{ form.label || '—' }}"</span>
                <app-ds-badge [tone]="form.urgency === 'emergency' ? 'er' : 'nf'">{{ form.urgency }}</app-ds-badge>
              </div>
              <p class="mt-2 text-xs text-ink-faint">{{ gestureDescriptionForm(form) }}</p>
              <div class="mt-2.5 flex items-center justify-between text-xs">
                <span class="text-ink-soft">Sensitivity</span>
                <span class="font-medium text-ink">{{ form.sensitivity }}</span>
              </div>
              <div class="mt-1.5 flex items-center justify-between text-xs">
                <span class="text-ink-soft">Live test</span>
                <span class="font-medium text-ink">{{ test() === 'success' ? 'Recognized ✓' : 'Not tested' }}</span>
              </div>
            </app-ds-card>

            <app-ds-card>
              <p class="text-xs text-ink-soft">Save to add to the catalog — changes only take effect once saved.</p>
              <div class="mt-4 flex flex-col gap-2">
                <app-ds-button [disabled]="!form.label.trim()" (click)="save(form)">Save command</app-ds-button>
                <app-ds-button variant="ghost" (click)="cancel()">Cancel</app-ds-button>
              </div>
            </app-ds-card>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <!-- CommandList -->
          <div>
            @if (commands().length === 0) {
              <app-ds-card>
                <div class="flex flex-col items-center py-10 text-center">
                  <span class="material-symbols-outlined text-[40px] text-ink-faint">sentiment_neutral</span>
                  <p class="mt-3 text-sm text-ink-soft">No command configured yet.</p>
                  <app-ds-button class="mt-4" (click)="new()">Add first command</app-ds-button>
                </div>
              </app-ds-card>
            } @else {
              <div class="flex flex-col gap-3">
                @for (c of commands(); track c.id) {
                  <app-ds-card>
                    <div class="flex items-center justify-between gap-4">
                      <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-[22px]" [class]="c.urgency === 'emergency' ? 'text-alarm' : 'text-info'">
                          {{ c.urgency === 'emergency' ? 'emergency_home' : 'notifications' }}
                        </span>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-semibold text-ink">"{{ c.label }}"</span>
                            <app-ds-badge [tone]="c.urgency === 'emergency' ? 'er' : 'nf'">{{ c.urgency }}</app-ds-badge>
                          </div>
                          <p class="mt-0.5 text-xs text-ink-faint">
                            {{ gestureDescription(c) }} · sensitivity {{ c.sensitivity }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <button (click)="edit(c)" class="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink" title="Edit">
                          <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button (click)="remove(c.id)" class="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-bg hover:text-danger" title="Remove">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </app-ds-card>
                }
              </div>
            }
          </div>

          <!-- Side column: catalog summary -->
          <div class="flex flex-col gap-6">
            <div class="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <app-ds-kpi label="Commands" [value]="commands().length" kind="tint" />
              <app-ds-kpi label="Emergency" [value]="totalEmergency()" kind="tint" />
            </div>
            <app-ds-card>
              <h3 class="mb-3 font-display text-sm font-semibold text-ink">Registered gesture types</h3>
              <div class="flex flex-wrap gap-1.5">
                @for (t of gestureTypes(); track t.id) {
                  <app-ds-badge tone="mu">{{ t.name }}</app-ds-badge>
                }
              </div>
              <p class="mt-3 text-xs text-ink-soft">
                Each command is a gesture (simple or combined) mapped to a specific need of Márcio's.
                The label is the word the family already uses. The gesture-type catalog is extensible — new types
                can be registered right in the command editor.
              </p>
            </app-ds-card>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalibrationComponent implements OnDestroy {
  private readonly facade = inject(CommandsFacade);
  private readonly gestureTypesFacade = inject(GestureTypesFacade);
  private readonly patientsFacade = inject(PatientsFacade);
  protected readonly sensitivities = SENSITIVITIES;

  private readonly videoPreview = viewChild<ElementRef<HTMLVideoElement>>('videoPreview');
  private stream: MediaStream | null = null;
  private testTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly loading = computed(() => this.facade.loading() || this.gestureTypesFacade.loading() || this.patientsFacade.loading());
  readonly commands = computed(() => this.facade.items());
  readonly gestureTypes = computed(() => this.gestureTypesFacade.items());
  readonly totalEmergency = computed(() => this.commands().filter(c => c.urgency === 'emergency').length);

  readonly editando = signal<CommandForm | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly test = signal<TestState>('idle');

  readonly newTypeOpen = signal<NewTypeTarget>(null);
  newTypeName = '';

  ngOnDestroy(): void {
    this.stopStream();
  }

  private stopStream(): void {
    if (this.testTimeoutId !== null) {
      clearTimeout(this.testTimeoutId);
      this.testTimeoutId = null;
    }
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    const video = this.videoPreview()?.nativeElement;
    if (video) video.srcObject = null;
  }

  private nameOfType(id: string): string {
    return this.gestureTypes().find(t => t.id === id)?.name ?? id;
  }

  protected gestureDescription(c: Command): string {
    const principal = this.nameOfType(c.primaryPrimitive);
    return c.secondaryPrimitive ? `${principal} + ${this.nameOfType(c.secondaryPrimitive)}` : principal;
  }

  protected gestureDescriptionForm(form: CommandForm): string {
    const principal = this.nameOfType(form.primaryPrimitive);
    return form.secondaryPrimitive ? `${principal} + ${this.nameOfType(form.secondaryPrimitive)}` : principal;
  }

  protected sensitivityHint(v: CommandSensitivity): string {
    return this.sensitivities.find(s => s.value === v)?.hint ?? '';
  }

  protected nextType(atual: string): string {
    const types = this.gestureTypes();
    return types.find(t => t.id !== atual)?.id ?? types[0]?.id ?? atual;
  }

  protected openNewType(target: NewTypeTarget): void {
    this.newTypeName = '';
    this.newTypeOpen.set(target);
  }

  protected cancelNewType(): void {
    this.newTypeName = '';
    this.newTypeOpen.set(null);
  }

  protected confirmNewType(form: CommandForm): void {
    const name = this.newTypeName.trim();
    if (!name) return;
    const id = this.gestureTypesFacade.add(name);
    if (this.newTypeOpen() === 'principal') {
      form.primaryPrimitive = id;
    } else if (this.newTypeOpen() === 'secondary') {
      form.secondaryPrimitive = id;
    }
    this.cancelNewType();
  }

  protected new(): void {
    this.stopStream();
    this.editandoId.set(null);
    this.editando.set({
      label: '',
      urgency: 'routine',
      primaryPrimitive: this.gestureTypes()[0]?.id ?? '',
      secondaryPrimitive: null,
      sensitivity: 'medium',
      minGestureDurationMs: 400,
      maxGestureDurationMs: 1500,
    });
    this.test.set('idle');
  }

  protected edit(c: Command): void {
    this.stopStream();
    this.editandoId.set(c.id);
    this.editando.set({
      label: c.label,
      urgency: c.urgency,
      primaryPrimitive: c.primaryPrimitive,
      secondaryPrimitive: c.secondaryPrimitive,
      sensitivity: c.sensitivity,
      minGestureDurationMs: c.minGestureDurationMs,
      maxGestureDurationMs: c.maxGestureDurationMs,
    });
    this.test.set('idle');
  }

  protected cancel(): void {
    this.stopStream();
    this.editando.set(null);
    this.editandoId.set(null);
    this.cancelNewType();
  }

  /** Turns on the real webcam (getUserMedia) for the live test. There is no real gesture
   * recognition in the prototype — only the camera turned on, to give concrete tactile feedback
   * that "the webcam is seeing you" before simulating the result (see LBC §12 Amendment 1:
   * the false-negative risk in compound gestures is an architecture decision, not a UI one). */
  protected async testar(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.test.set('error');
      return;
    }
    this.test.set('testando');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = this.videoPreview()?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play().catch(() => {});
      }
      this.testTimeoutId = setTimeout(() => {
        this.stopStream();
        this.test.set('success');
      }, 2500);
    } catch {
      this.stopStream();
      this.test.set('error');
    }
  }

  protected stopTest(): void {
    this.stopStream();
    this.test.set('idle');
  }

  protected save(form: CommandForm): void {
    this.stopStream();
    const id = this.editandoId();
    if (id) {
      this.facade.items.update(list => list.map(c => (c.id === id ? { ...c, ...form } : c)));
    } else {
      const patientId = this.patientsFacade.items()[0]?.id ?? '';
      const newId = `cmd-${form.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || Date.now()}`;
      this.facade.items.update(list => [...list, { id: newId, patientId, ...form }]);
    }
    this.editando.set(null);
    this.editandoId.set(null);
    // TODO[fe-autopilot]: persist the catalog and sync with the edge device on the next heartbeat
  }

  protected remove(id: string): void {
    this.facade.items.update(list => list.filter(c => c.id !== id));
  }
}
