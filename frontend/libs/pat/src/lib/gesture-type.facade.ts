import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GESTURE_TYPE_PORT } from './api/gesture-type.port';
import type { GestureTypeWire, RegisterGestureTypeRequest } from './api/gesture-type.port';

export type GestureTypeRow = GestureTypeWire;

@Injectable({ providedIn: 'root' })
export class GestureTypeFacade {
  private readonly port = inject(GESTURE_TYPE_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _items = signal<GestureTypeWire[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: types => {
          this._items.set(types);
          this._loading.set(false);
        },
        error: err => {
          this._error.set(err?.message ?? 'Failed to load gesture types');
          this._loading.set(false);
        },
      });
  }

  /**
   * Register a new gesture type inline from the command editor.
   * Returns an Observable so the component can react to the new type's id.
   * The new type is also appended to the `items` signal.
   */
  registerAsync(displayName: string): Observable<GestureTypeWire> {
    const code = displayName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const req: RegisterGestureTypeRequest = {
      code,
      displayName: displayName.trim(),
      description: '',
    };
    return this.port.register(req).pipe(
      tap(newType => {
        this._items.update(list => [...list, newType]);
      }),
      takeUntilDestroyed(this.destroyRef),
    );
  }
}
