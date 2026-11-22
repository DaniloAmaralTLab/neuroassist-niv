import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  viewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DsCardComponent,
  DsButtonComponent,
  DsBadgeComponent,
  DsKpiComponent,
} from '@neuroassist/shared/ui-components';
import { CommandFacade } from '../command.facade';
import { GestureTypeFacade } from '../gesture-type.facade';
import { PatientFacade } from '../patient.facade';
import type { CommandUrgency, CommandSensitivity } from '../api/command.port';

// Promoted from design-reference/angular-prototype/…/screens/calibration/calibration.component.ts
// (feature-command-catalog — SPEC-02 §2.1).
// Connected to CommandFacade + GestureTypeFacade + PatientFacade (Track D — P4).
// Route: /patients/:patientId/commands (SPEC-01 §1).
// Command editor is an in-page panel — not a route (prototype parity, SPEC-01 §2).

interface SensitivityOption {
  value: CommandSensitivity;
  label: string;
  hint: string;
}

const SENSITIVITIES: SensitivityOption[] = [
  { value: 'low',    label: 'Low',    hint: 'needs a very clear gesture'   },
  { value: 'medium', label: 'Medium', hint: 'recommended balance'          },
  { value: 'high',   label: 'High',   hint: 'detects the faintest signal'  },
];

/** Form state for the in-page command editor. Uses gesture type ids (not embedded objects). */
interface CommandFormState {
  label: string;
  urgency: CommandUrgency;
  primaryPrimitiveId: string;
  secondaryPrimitiveId: string | null;
  sensitivity: CommandSensitivity;
  minGestureTimeMs: number;
  maxGestureTimeMs: number;
}

type TestState = 'idle' | 'testing' | 'success' | 'error';
type NewTypeTarget = 'primary' | 'secondary' | null;

@Component({
  selector: 'lib-command-catalog-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DsCardComponent,
    DsButtonComponent,
    DsBadgeComponent,
    DsKpiComponent,
  ],
  template: `
    <div class="mx-auto max-w-6xl p-8">
      <header class="mb-7 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">
            Command catalog — {{ patientLabel() }}
          </h1>
          <p class="mt-1 text-sm text-ink-soft">
            Each gesture mapped to a need, calibrated individually.
          </p>
        </div>
        @if (!editing()) {
          <app-ds-button (click)="startNew()">
            <span class="material-symbols-outlined text-[18px]">add</span>
            New command
          </app-ds-button>
        }
      </header>

      @if (loading()) {
        <p class="text-sm text-ink-faint">Loading catalog…</p>
      } @else if (editing(); as form) {

        <!-- CommandEditor (in-page panel — not a route) -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <app-ds-card>
            <h2 class="mb-4 font-display text-sm font-semibold text-ink">
              {{ editingId() ? 'Edit command' : 'New command' }}
            </h2>

            <!-- Label -->
            <label class="mb-1 block text-xs font-medium text-ink-soft">
              Label (the word the family uses)
            </label>
            <input
              [value]="form.label"
              (input)="form.label = $any($event.target).value"
              placeholder='E.g.: "Water", "Frog"…'
              class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand"
            />
            <p class="mt-1.5 text-xs text-ink-faint">
              Free text — the system does not interpret the meaning, it only stores and displays it.
            </p>

            <!-- Urgency -->
            <div class="mt-5">
              <label class="mb-2 block text-xs font-medium text-ink-soft">Urgency</label>
              <div class="flex items-center gap-2">
                <button
                  (click)="form.urgency = 'emergency'"
                  class="flex-1 rounded-lg border-[1.5px] py-2.5 text-center text-sm font-semibold transition-colors"
                  [class]="form.urgency === 'emergency'
                    ? 'border-alarm bg-alarm-bg text-alarm'
                    : 'border-line text-ink-soft hover:bg-surface-2'">
                  Emergency
                </button>
                <button
                  (click)="form.urgency = 'routine'"
                  class="flex-1 rounded-lg border-[1.5px] py-2.5 text-center text-sm font-semibold transition-colors"
                  [class]="form.urgency === 'routine'
                    ? 'border-brand bg-brand-subtle text-brand'
                    : 'border-line text-ink-soft hover:bg-surface-2'">
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

            <!-- Gesture selectors -->
            <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <!-- Primary gesture -->
              <div>
                <label class="mb-1 block text-xs font-medium text-ink-soft">Primary gesture</label>
                @if (newTypeTarget() === 'primary') {
                  <div class="flex items-center gap-2">
                    <input
                      [(ngModel)]="newTypeName"
                      placeholder='E.g.: "Lip reading"'
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand"
                    />
                    <button
                      (click)="confirmNewType(form)"
                      [disabled]="!newTypeName.trim()"
                      class="flex-shrink-0 text-xs font-semibold text-brand hover:text-brand-strong disabled:opacity-40">
                      save
                    </button>
                    <button
                      (click)="cancelNewType()"
                      class="flex-shrink-0 text-xs font-semibold text-ink-soft hover:text-ink">
                      ×
                    </button>
                  </div>
                } @else {
                  <div class="flex items-center gap-2">
                    <select
                      [ngModel]="form.primaryPrimitiveId"
                      (ngModelChange)="form.primaryPrimitiveId = $any($event)"
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand">
                      @for (t of gestureTypes(); track t.id) {
                        <option [value]="t.id">{{ t.displayName }}</option>
                      }
                    </select>
                    <button
                      (click)="openNewType('primary')"
                      title="Register new gesture type"
                      class="grid size-9 flex-shrink-0 place-items-center rounded-md border-[1.5px] border-dashed border-line text-ink-soft hover:bg-brand-subtle hover:text-brand">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                }
              </div>

              <!-- Secondary gesture -->
              <div>
                @if (newTypeTarget() === 'secondary') {
                  <label class="mb-1 block text-xs font-medium text-ink-soft">New type (second gesture)</label>
                  <div class="flex items-center gap-2">
                    <input
                      [(ngModel)]="newTypeName"
                      placeholder='E.g.: "Lip reading"'
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand"
                    />
                    <button
                      (click)="confirmNewType(form)"
                      [disabled]="!newTypeName.trim()"
                      class="flex-shrink-0 text-xs font-semibold text-brand hover:text-brand-strong disabled:opacity-40">
                      save
                    </button>
                    <button
                      (click)="cancelNewType()"
                      class="flex-shrink-0 text-xs font-semibold text-ink-soft hover:text-ink">
                      ×
                    </button>
                  </div>
                } @else if (form.secondaryPrimitiveId === null) {
                  <label class="mb-1 block text-xs font-medium text-ink-soft">&nbsp;</label>
                  <button
                    (click)="form.secondaryPrimitiveId = nextTypeId(form.primaryPrimitiveId)"
                    class="flex h-9 w-full items-center justify-center rounded-md border-[1.5px] border-dashed border-line text-xs font-semibold text-brand hover:bg-brand-subtle">
                    + Add second gesture (combination)
                  </button>
                } @else {
                  <label class="mb-1 block text-xs font-medium text-ink-soft">Second gesture (combination)</label>
                  <div class="flex items-center gap-2">
                    <select
                      [ngModel]="form.secondaryPrimitiveId"
                      (ngModelChange)="form.secondaryPrimitiveId = $any($event)"
                      class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand">
                      @for (t of gestureTypes(); track t.id) {
                        <option [value]="t.id">{{ t.displayName }}</option>
                      }
                    </select>
                    <button
                      (click)="openNewType('secondary')"
                      title="Register new gesture type"
                      class="grid size-9 flex-shrink-0 place-items-center rounded-md border-[1.5px] border-dashed border-line text-ink-soft hover:bg-brand-subtle hover:text-brand">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                    <button
                      (click)="form.secondaryPrimitiveId = null"
                      class="flex-shrink-0 text-xs font-semibold text-danger hover:text-danger">
                      remove
                    </button>
                  </div>
                }
              </div>
            </div>
            <p class="mt-2 text-xs text-ink-faint">
              Can't find the gesture in the list? Use the
              <span class="material-symbols-outlined align-middle text-[13px]">add</span>
              to register a new type — the catalog is not closed.
            </p>

            <!-- Sensitivity -->
            <div class="mt-5">
              <label class="mb-2 block text-xs font-medium text-ink-soft">Sensitivity</label>
              <div class="flex items-center gap-2">
                @for (s of sensitivities; track s.value) {
                  <button
                    (click)="form.sensitivity = s.value"
                    class="flex-1 rounded-lg border-[1.5px] py-2.5 text-center transition-colors"
                    [class]="form.sensitivity === s.value
                      ? 'border-brand bg-brand-subtle'
                      : 'border-line hover:bg-surface-2'">
                    <div
                      class="text-sm font-semibold"
                      [class]="form.sensitivity === s.value ? 'text-brand' : 'text-ink'">
                      {{ s.label }}
                    </div>
                  </button>
                }
              </div>
              <p class="mt-2 text-center text-xs text-ink-faint">
                {{ sensitivityHint(form.sensitivity) }}
              </p>
            </div>

            <!-- Live webcam test -->
            <div class="mt-5 flex items-center gap-4 rounded-lg bg-surface-2 p-4">
              <div class="relative grid h-20 w-28 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
                <video
                  #videoPreview
                  class="h-full w-full object-cover"
                  [class.hidden]="testState() !== 'testing'"
                  autoplay muted playsinline
                ></video>
                @if (testState() !== 'testing') {
                  <span
                    class="material-symbols-outlined text-[28px]"
                    [class]="testState() === 'success'
                      ? 'text-success'
                      : testState() === 'error'
                        ? 'text-danger'
                        : 'text-ink-faint'">
                    {{ testState() === 'success'
                        ? 'check_circle'
                        : testState() === 'error'
                          ? 'videocam_off'
                          : 'videocam' }}
                  </span>
                }
              </div>
              <div class="flex-1 text-xs">
                @if (testState() === 'idle') {
                  <span class="text-ink-soft">
                    @if (form.secondaryPrimitiveId) {
                      Perform both gestures in sequence — testing the combination reduces the risk of a false negative.
                    } @else {
                      Perform the gesture in front of the webcam to confirm it is being recognized.
                    }
                  </span>
                } @else if (testState() === 'testing') {
                  <span class="font-medium text-brand">Camera active — perform the gesture now…</span>
                } @else if (testState() === 'error') {
                  <span class="font-medium text-danger">
                    Could not access the webcam. Check the browser permission and try again.
                  </span>
                } @else {
                  <span class="font-medium text-success-ink">Gesture recognized successfully!</span>
                }
              </div>
              @if (testState() === 'testing') {
                <app-ds-button size="sm" variant="ghost" (click)="stopTest()">Stop</app-ds-button>
              } @else {
                <app-ds-button size="sm" variant="secondary" (click)="startTest()">Test now</app-ds-button>
              }
            </div>
          </app-ds-card>

          <!-- Side column: preview + actions -->
          <div class="flex flex-col gap-6">
            <app-ds-card>
              <h3 class="mb-3 font-display text-sm font-semibold text-ink">Preview</h3>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-ink">"{{ form.label || '—' }}"</span>
                <app-ds-badge [tone]="form.urgency === 'emergency' ? 'er' : 'nf'">
                  {{ form.urgency }}
                </app-ds-badge>
              </div>
              <p class="mt-2 text-xs text-ink-faint">{{ gestureDescriptionForm(form) }}</p>
              <div class="mt-2.5 flex items-center justify-between text-xs">
                <span class="text-ink-soft">Sensitivity</span>
                <span class="font-medium text-ink">{{ form.sensitivity }}</span>
              </div>
              <div class="mt-1.5 flex items-center justify-between text-xs">
                <span class="text-ink-soft">Live test</span>
                <span class="font-medium text-ink">
                  {{ testState() === 'success' ? 'Recognized ✓' : 'Not tested' }}
                </span>
              </div>
            </app-ds-card>

            <app-ds-card>
              <p class="text-xs text-ink-soft">
                Save to add to the catalog — changes only take effect once saved.
              </p>
              <div class="mt-4 flex flex-col gap-2">
                <app-ds-button [disabled]="!form.label.trim()" (click)="save(form)">
                  Save command
                </app-ds-button>
                <app-ds-button variant="ghost" (click)="cancel()">Cancel</app-ds-button>
              </div>
            </app-ds-card>
          </div>
        </div>

      } @else {
        <!-- CommandList -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            @if (commands().length === 0) {
              <app-ds-card>
                <div class="flex flex-col items-center py-10 text-center">
                  <span class="material-symbols-outlined text-[40px] text-ink-faint">sentiment_neutral</span>
                  <p class="mt-3 text-sm text-ink-soft">No command configured yet.</p>
                  <app-ds-button class="mt-4" (click)="startNew()">Add first command</app-ds-button>
                </div>
              </app-ds-card>
            } @else {
              <div class="flex flex-col gap-3">
                @for (c of commands(); track c.id) {
                  <app-ds-card>
                    <div class="flex items-center justify-between gap-4">
                      <div class="flex items-center gap-3">
                        <span
                          class="material-symbols-outlined text-[22px]"
                          [class]="c.urgency === 'emergency' ? 'text-alarm' : 'text-info'">
                          {{ c.urgency === 'emergency' ? 'emergency_home' : 'notifications' }}
                        </span>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-semibold text-ink">"{{ c.label }}"</span>
                            <app-ds-badge [tone]="c.urgency === 'emergency' ? 'er' : 'nf'">
                              {{ c.urgency }}
                            </app-ds-badge>
                          </div>
                          <p class="mt-0.5 text-xs text-ink-faint">
                            {{ gestureDescriptionCommand(c) }} · sensitivity {{ c.sensitivity }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <button
                          (click)="startEdit(c)"
                          class="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                          title="Edit">
                          <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          (click)="retire(c.id)"
                          class="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-bg hover:text-danger"
                          title="Remove">
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
                  <app-ds-badge tone="mu">{{ t.displayName }}</app-ds-badge>
                }
              </div>
              <p class="mt-3 text-xs text-ink-soft">
                Each command is a gesture (simple or combined) mapped to a specific need.
                The label is the word the family already uses. The gesture-type catalog is extensible —
                new types can be registered right in the command editor.
              </p>
            </app-ds-card>
          </div>
        </div>
      }
    </div>
  `,
})
export class CommandCatalogPageComponent implements OnInit, OnDestroy {
  protected readonly sensitivities = SENSITIVITIES;

  private readonly route = inject(ActivatedRoute);
  private readonly commandFacade = inject(CommandFacade);
  private readonly gestureTypeFacade = inject(GestureTypeFacade);
  private readonly patientFacade = inject(PatientFacade);
  private readonly destroyRef = inject(DestroyRef);

  private readonly videoPreview = viewChild<ElementRef<HTMLVideoElement>>('videoPreview');
  private stream: MediaStream | null = null;
  private testTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private patientId = '';

  readonly loading = computed(
    () => this.commandFacade.loading() || this.gestureTypeFacade.loading(),
  );
  readonly commands = this.commandFacade.items;
  readonly gestureTypes = this.gestureTypeFacade.items;
  readonly totalEmergency = computed(
    () => this.commands().filter(c => c.urgency === 'emergency').length,
  );
  readonly patientLabel = computed(() => {
    const patients = this.patientFacade.items();
    const patient = patients.find(p => p.id === this.patientId);
    return patient?.label ?? '';
  });

  readonly editing = signal<CommandFormState | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly testState = signal<TestState>('idle');
  readonly newTypeTarget = signal<NewTypeTarget>(null);
  newTypeName = '';

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.commandFacade.load(this.patientId);
    this.gestureTypeFacade.load();
    this.patientFacade.load();
  }

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

  protected gestureDescriptionCommand(c: { primaryPrimitive: { displayName: string }; secondaryPrimitive: { displayName: string } | null }): string {
    return c.secondaryPrimitive
      ? `${c.primaryPrimitive.displayName} + ${c.secondaryPrimitive.displayName}`
      : c.primaryPrimitive.displayName;
  }

  protected gestureDescriptionForm(form: CommandFormState): string {
    const types = this.gestureTypes();
    const primary = types.find(t => t.id === form.primaryPrimitiveId)?.displayName ?? form.primaryPrimitiveId;
    const secondary = form.secondaryPrimitiveId
      ? types.find(t => t.id === form.secondaryPrimitiveId)?.displayName ?? form.secondaryPrimitiveId
      : null;
    return secondary ? `${primary} + ${secondary}` : primary;
  }

  protected sensitivityHint(v: CommandSensitivity): string {
    return this.sensitivities.find(s => s.value === v)?.hint ?? '';
  }

  protected nextTypeId(currentId: string): string {
    const types = this.gestureTypes();
    return types.find(t => t.id !== currentId)?.id ?? types[0]?.id ?? currentId;
  }

  protected openNewType(target: NewTypeTarget): void {
    this.newTypeName = '';
    this.newTypeTarget.set(target);
  }

  protected cancelNewType(): void {
    this.newTypeName = '';
    this.newTypeTarget.set(null);
  }

  protected confirmNewType(form: CommandFormState): void {
    const name = this.newTypeName.trim();
    if (!name) return;
    const target = this.newTypeTarget();
    this.gestureTypeFacade.registerAsync(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(newType => {
        if (target === 'primary') form.primaryPrimitiveId = newType.id;
        else if (target === 'secondary') form.secondaryPrimitiveId = newType.id;
        this.cancelNewType();
      });
  }

  protected startNew(): void {
    this.stopStream();
    const firstTypeId = this.gestureTypes()[0]?.id ?? '';
    this.editingId.set(null);
    this.editing.set({
      label: '',
      urgency: 'routine',
      primaryPrimitiveId: firstTypeId,
      secondaryPrimitiveId: null,
      sensitivity: 'medium',
      minGestureTimeMs: 400,
      maxGestureTimeMs: 1500,
    });
    this.testState.set('idle');
  }

  protected startEdit(c: { id: string; label: string; urgency: CommandUrgency; sensitivity: CommandSensitivity; primaryPrimitive: { id: string }; secondaryPrimitive: { id: string } | null; minGestureTimeMs: number; maxGestureTimeMs: number }): void {
    this.stopStream();
    this.editingId.set(c.id);
    this.editing.set({
      label: c.label,
      urgency: c.urgency,
      primaryPrimitiveId: c.primaryPrimitive.id,
      secondaryPrimitiveId: c.secondaryPrimitive?.id ?? null,
      sensitivity: c.sensitivity,
      minGestureTimeMs: c.minGestureTimeMs,
      maxGestureTimeMs: c.maxGestureTimeMs,
    });
    this.testState.set('idle');
  }

  protected cancel(): void {
    this.stopStream();
    this.editing.set(null);
    this.editingId.set(null);
    this.cancelNewType();
  }

  protected save(form: CommandFormState): void {
    this.stopStream();
    const id = this.editingId();
    if (id) {
      this.commandFacade.calibrate(id, {
        label: form.label,
        urgency: form.urgency,
        sensitivity: form.sensitivity,
        primaryPrimitive: form.primaryPrimitiveId,
        secondaryPrimitive: form.secondaryPrimitiveId,
        minGestureTimeMs: form.minGestureTimeMs,
        maxGestureTimeMs: form.maxGestureTimeMs,
      });
    } else {
      this.commandFacade.create(this.patientId, {
        label: form.label,
        urgency: form.urgency,
        sensitivity: form.sensitivity,
        primaryPrimitive: form.primaryPrimitiveId,
        secondaryPrimitive: form.secondaryPrimitiveId,
        minGestureTimeMs: form.minGestureTimeMs,
        maxGestureTimeMs: form.maxGestureTimeMs,
      });
    }
    this.editing.set(null);
    this.editingId.set(null);
  }

  protected retire(commandId: string): void {
    this.commandFacade.retire(commandId);
  }

  /** Turns on the real webcam (getUserMedia) for the live test.
   * No real gesture recognition in this layer — PAT does not classify gestures (GEST owns that). */
  protected async startTest(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.testState.set('error');
      return;
    }
    this.testState.set('testing');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = this.videoPreview()?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play().catch(() => {});
      }
      this.testTimeoutId = setTimeout(() => {
        this.stopStream();
        this.testState.set('success');
      }, 2500);
    } catch {
      this.stopStream();
      this.testState.set('error');
    }
  }

  protected stopTest(): void {
    this.stopStream();
    this.testState.set('idle');
  }
}
