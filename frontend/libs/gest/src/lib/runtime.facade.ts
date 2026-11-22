import { Injectable, computed, inject, signal } from '@angular/core';
import { DetectionReason, DetectionStateEnum, STATION_LIVENESS_PORT } from './integration/station-liveness.port';

// ── View-model types (SPEC-03 §1 + §3 + §7) ────────────────────────────────

export type CameraState = 'idle' | 'requesting' | 'granted' | 'denied' | 'no-device';
export type ModelState = 'loading' | 'ready' | 'failed';
/**
 * Detection state as seen by the UI.
 * running ONLY while the loop is actually producing frames (INV-GEST-6).
 */
export type DetectionState = 'stopped' | 'running' | 'unavailable' | 'paused' | 'degraded';

export interface StationRuntimeVM {
  camera: CameraState;
  model: ModelState;
  /** running ONLY while the loop produces frames (INV-GEST-6). */
  detection: DetectionState;
  /** Measured landmark cadence; 0 while stopped / paused / unavailable. */
  fps: number;
  /** Acceptable-cadence floor; sustained fps < fpsBudget ⇒ degraded. */
  fpsBudget: number;
  activeCommandCount: number;
  wakeLock: 'held' | 'released' | 'unsupported';
  /** True WHILE document.hidden / backgrounded (SPEC-09). */
  paused: boolean;
  /** edge.device token state. */
  stationIdentity: 'valid' | 'unpaired';
  /** EDGE heartbeat enum — what EDGE carries (INV-GEST-8). Set by §7 mapping. */
  reportedDetectionState: DetectionStateEnum;
  /** Cause beside a non-RUNNING state; null for RUNNING. */
  reportedReason: DetectionReason | null;
}

export interface RecognitionVM {
  commandId: string;
  label: string;
  confidence: number;
  recognitionWindowMs: number;
  /** ISO; stamped AT recognition, carried verbatim through the queue (INV-GEST-5). */
  occurredAt: string;
  /** Minted once; reused across every retry (INV-GEST-1). */
  reportId: string;
}

// ── Mapping: StationRuntimeVM → EDGE heartbeat enum (SPEC-03 §7, INV-GEST-8) ──

/**
 * Maps the live StationRuntimeVM to the EDGE heartbeat enum in first-match priority order.
 * RUNNING is reported ONLY at the very bottom, when frames are actually produced.
 * Any hard fault (camera/model) is reported before tab-hidden, before degraded.
 */
function mapToEdgeEnum(
  camera: CameraState,
  model: ModelState,
  detection: DetectionState,
  paused: boolean,
  fps: number,
  fpsBudget: number,
): { state: DetectionStateEnum; reason: DetectionReason | null } {
  // 1. Camera denied / no device
  if (camera === 'denied' || camera === 'no-device') {
    return { state: 'UNAVAILABLE', reason: 'CAMERA_DENIED' };
  }
  // 2. Model failed
  if (model === 'failed') {
    return { state: 'UNAVAILABLE', reason: 'MODEL_FAILED' };
  }
  // 3. Not yet started (camera requesting, model loading, loop stopped)
  if (camera === 'idle' || camera === 'requesting' || model === 'loading' || detection === 'stopped') {
    return { state: 'UNAVAILABLE', reason: null };
  }
  // 4. Tab hidden / backgrounded
  if (paused) {
    return { state: 'PAUSED', reason: 'HIDDEN' };
  }
  // 5. Loop producing frames but sub-budget fps (degraded / thermal throttle)
  if (detection === 'degraded' || (fps > 0 && fps < fpsBudget)) {
    return { state: 'DEGRADED', reason: 'LOW_FPS' };
  }
  // 6. Loop producing frames at or above budget — camera granted, model ready, tab visible
  if (detection === 'running' && camera === 'granted' && model === 'ready' && !paused) {
    return { state: 'RUNNING', reason: null };
  }
  // Fallback: unavailable (unknown state must never be reported as RUNNING)
  return { state: 'UNAVAILABLE', reason: null };
}

// ── RuntimeFacade ────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RuntimeFacade {
  private readonly livenessPort = inject(STATION_LIVENESS_PORT);

  // Internal state signals
  private readonly _camera = signal<CameraState>('idle');
  private readonly _model = signal<ModelState>('loading');
  private readonly _detection = signal<DetectionState>('stopped');
  private readonly _fps = signal(0);
  private readonly _fpsBudget = signal(10);
  private readonly _activeCommandCount = signal(0);
  private readonly _wakeLock = signal<'held' | 'released' | 'unsupported'>('released');
  private readonly _paused = signal(false);
  private readonly _stationIdentity = signal<'valid' | 'unpaired'>('unpaired');
  private readonly _engineVersion = signal<string | null>(null);
  private readonly _lastRecognition = signal<RecognitionVM | null>(null);

  // Public read-only signals
  readonly camera = this._camera.asReadonly();
  readonly model = this._model.asReadonly();
  readonly detection = this._detection.asReadonly();
  readonly fps = this._fps.asReadonly();
  readonly fpsBudget = this._fpsBudget.asReadonly();
  readonly paused = this._paused.asReadonly();
  readonly stationIdentity = this._stationIdentity.asReadonly();
  readonly lastRecognition = this._lastRecognition.asReadonly();
  readonly engineVersion = this._engineVersion.asReadonly();

  /**
   * Composed StationRuntimeVM — includes the §7 EDGE enum mapping.
   * Reactive: recomputes whenever any constituent signal changes.
   */
  readonly vm = computed<StationRuntimeVM>(() => {
    const camera = this._camera();
    const model = this._model();
    const detection = this._detection();
    const fps = this._fps();
    const fpsBudget = this._fpsBudget();
    const paused = this._paused();
    const { state: reportedDetectionState, reason: reportedReason } =
      mapToEdgeEnum(camera, model, detection, paused, fps, fpsBudget);

    return {
      camera,
      model,
      detection,
      fps,
      fpsBudget,
      activeCommandCount: this._activeCommandCount(),
      wakeLock: this._wakeLock(),
      paused,
      stationIdentity: this._stationIdentity(),
      reportedDetectionState,
      reportedReason,
    };
  });

  // ── State-transition commands ─────────────────────────────────────────────

  setCameraState(state: CameraState): void {
    this._camera.set(state);
    this._pushLivenessAndBeat();
  }

  setModelState(state: ModelState): void {
    this._model.set(state);
    if (state === 'ready') {
      this._detection.set('stopped'); // loop not yet started — bootstrap will start it
    }
    this._pushLivenessAndBeat();
  }

  setDetectionState(state: DetectionState): void {
    this._detection.set(state);
    if (state !== 'running') {
      this._fps.set(0);
    }
    this._pushLivenessAndBeat();
  }

  setFps(fps: number): void {
    const fpsBudget = this._fpsBudget();
    const wasRunning = this._detection() === 'running';
    this._fps.set(fps);
    if (wasRunning && fps > 0 && fps < fpsBudget) {
      this._detection.set('degraded');
    } else if (this._detection() === 'degraded' && fps >= fpsBudget) {
      this._detection.set('running');
    }
    this._pushLivenessAndBeat();
  }

  setFpsBudget(budget: number): void {
    this._fpsBudget.set(budget);
  }

  setActiveCommandCount(count: number): void {
    this._activeCommandCount.set(count);
  }

  setWakeLockState(state: 'held' | 'released' | 'unsupported'): void {
    this._wakeLock.set(state);
  }

  setPaused(paused: boolean): void {
    const prev = this._paused();
    this._paused.set(paused);
    if (paused && this._detection() === 'running') {
      this._detection.set('paused');
    } else if (!paused && this._detection() === 'paused') {
      this._detection.set('stopped'); // bootstrap will restart when visible
    }
    if (prev !== paused) {
      this._pushLivenessAndBeat();
    }
  }

  setStationIdentity(state: 'valid' | 'unpaired'): void {
    this._stationIdentity.set(state);
  }

  setEngineVersion(version: string | null): void {
    this._engineVersion.set(version);
  }

  /**
   * Register a recognition event.
   * Clears after the recognition is enqueued and the debounce cooldown re-arms.
   */
  setLastRecognition(vm: RecognitionVM | null): void {
    this._lastRecognition.set(vm);
  }

  /**
   * Reset all runtime state — called by bootstrap.destroy.
   */
  clearState(): void {
    this._camera.set('idle');
    this._model.set('loading');
    this._detection.set('stopped');
    this._fps.set(0);
    this._activeCommandCount.set(0);
    this._wakeLock.set('released');
    this._paused.set(false);
    this._stationIdentity.set('unpaired');
    this._engineVersion.set(null);
    this._lastRecognition.set(null);
    this._pushLivenessAndBeat();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Push the current mapped state to libs/edge's liveness port and
   * request an immediate heartbeat (called on every transition — SPEC-06 §3).
   * GEST NEVER sends POST /edge/heartbeat itself.
   */
  private _pushLivenessAndBeat(): void {
    const { state, reason } = mapToEdgeEnum(
      this._camera(),
      this._model(),
      this._detection(),
      this._paused(),
      this._fps(),
      this._fpsBudget(),
    );
    this.livenessPort.setDetectionState(state, reason, this._engineVersion());
    this.livenessPort.beatNow();
  }
}
