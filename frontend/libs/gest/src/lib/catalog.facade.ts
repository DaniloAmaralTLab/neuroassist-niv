import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { CAPABILITY_SUPPORT_PORT, SupportCheckResultWire, SupportStatus } from './api/capability-support.port';
import { CATALOG_PORT, CatalogCommandWire } from './api/catalog.port';

// ── View-model types (SPEC-03 §2) ────────────────────────────────────────────

export interface ActiveCommandVM {
  commandId: string;
  label: string;
  urgency: 'emergency' | 'routine';
  primaryPrimitive: { code: string; displayName: string };
  secondaryPrimitive: { code: string; displayName: string } | null;
  sensitivity: 'low' | 'medium' | 'high';
  /** From EDGE catalog minGestureTimeMs → VM minGestureDurationMs (SPEC-04 §3). */
  minGestureDurationMs: number;
  /** From EDGE catalog maxGestureTimeMs → VM maxGestureDurationMs. */
  maxGestureDurationMs: number;
  /**
   * True iff ALL primitive codes are detectable per support-check (INV-GEST-7).
   * unknown/unsupported → not detectable. A non-detectable command is never armed.
   */
  detectable: boolean;
  supportByCode: { code: string; supportStatus: SupportStatus; detectable: boolean }[];
}

// ── Mapper: CatalogCommandWire + supportMap → ActiveCommandVM ─────────────────

function toActiveCommand(
  wire: CatalogCommandWire,
  supportMap: Map<string, { supportStatus: SupportStatus; detectable: boolean }>,
): ActiveCommandVM {
  const resolve = (code: string) =>
    supportMap.get(code) ?? { supportStatus: 'unknown' as SupportStatus, detectable: false };

  const primarySupport = resolve(wire.primaryPrimitive.code);
  const secondarySupport = wire.secondaryPrimitive ? resolve(wire.secondaryPrimitive.code) : null;

  const supportByCode = [
    { code: wire.primaryPrimitive.code, ...primarySupport },
    ...(wire.secondaryPrimitive
      ? [{ code: wire.secondaryPrimitive.code, ...secondarySupport! }]
      : []),
  ];

  const detectable = supportByCode.every(s => s.detectable);

  return {
    commandId: wire.id,
    label: wire.label,
    urgency: wire.urgency,
    primaryPrimitive: {
      code: wire.primaryPrimitive.code,
      displayName: wire.primaryPrimitive.displayName,
    },
    secondaryPrimitive: wire.secondaryPrimitive
      ? {
          code: wire.secondaryPrimitive.code,
          displayName: wire.secondaryPrimitive.displayName,
        }
      : null,
    sensitivity: wire.sensitivity,
    minGestureDurationMs: wire.minGestureTimeMs,
    maxGestureDurationMs: wire.maxGestureTimeMs,
    detectable,
    supportByCode,
  };
}

// ── CatalogFacade ────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly catalogPort = inject(CATALOG_PORT);
  private readonly capabilityPort = inject(CAPABILITY_SUPPORT_PORT);
  private readonly destroyRef = inject(DestroyRef);

  // Internal signals
  private readonly _rawCommands = signal<CatalogCommandWire[]>([]);
  private readonly _supportMap = signal<Map<string, { supportStatus: SupportStatus; detectable: boolean }>>(new Map());
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _engineVersion = signal<string | null>(null);

  // Public read-only
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly engineVersion = this._engineVersion.asReadonly();

  /**
   * Composed ActiveCommandVM list.
   * Recomputes whenever rawCommands or supportMap changes.
   * Non-detectable commands are included (marked detectable:false) so the UI can
   * surface "not yet detectable" — they are NEVER armed by the state machine.
   */
  readonly activeCommands = computed<ActiveCommandVM[]>(() =>
    this._rawCommands().map(cmd => toActiveCommand(cmd, this._supportMap())),
  );

  /** Count of detectable commands — drives RuntimeFacade.setActiveCommandCount. */
  readonly detectableCount = computed(() =>
    this.activeCommands().filter(c => c.detectable).length,
  );

  // ── Commands ─────────────────────────────────────────────────────────────

  /**
   * Load the EDGE catalog and immediately run support-check for the given engineVersion.
   * Called at station bootstrap (SPEC-06 §3 step 2).
   */
  loadCatalogAndCheckSupport(engineVersion: string): void {
    this._loading.set(true);
    this._error.set(null);
    this._engineVersion.set(engineVersion);

    from(this.catalogPort.read())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: catalog => {
          this._rawCommands.set(catalog.commands);
          this._runSupportCheck(engineVersion, catalog.commands.flatMap(cmd => {
            const codes = [cmd.primaryPrimitive.code];
            if (cmd.secondaryPrimitive) codes.push(cmd.secondaryPrimitive.code);
            return codes;
          }));
        },
        error: err => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  clearState(): void {
    this._rawCommands.set([]);
    this._supportMap.set(new Map());
    this._loading.set(false);
    this._error.set(null);
    this._engineVersion.set(null);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _runSupportCheck(engineVersion: string, codes: string[]): void {
    if (codes.length === 0) {
      this._loading.set(false);
      return;
    }
    from(this.capabilityPort.checkSupport({ engineVersion, codes: [...new Set(codes)] }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: SupportCheckResultWire) => {
          const map = new Map<string, { supportStatus: SupportStatus; detectable: boolean }>();
          result.results.forEach(r => map.set(r.code, { supportStatus: r.supportStatus, detectable: r.detectable }));
          this._supportMap.set(map);
          this._loading.set(false);
        },
        error: err => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }
}
