import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { TREE_SNAPSHOT_PORT } from './api/tree-snapshot.port';
import { SpeechTreeNode, Locale } from './conv.model';

/**
 * SpeechTreeFacade — signals-based application layer for the CONV speech-tree runtime.
 *
 * Exposes:
 *  - `items`   — flat list of all SpeechTreeNodes for the patient (categories + phrases).
 *  - `loading` — true while the first tree sync is in flight (bounded — never infinite).
 *  - `error`   — set on network or parse failure (the station keeps reading stale cached data).
 *  - `isActive()` — dual-authorization gate for phrase nodes (ADR-016).
 *
 * Layer 2 (FE-CONV-005/FE-CONV-006): TreeCacheStore (IndexedDB) + atomic swap +
 * version-aware revalidate + TreeSyncService belong in the implement cycle.
 * Today the facade reads directly from the TREE_SNAPSHOT_PORT on `load()`.
 *
 * Zero network on the navigation/playback loop — the component filters `items()` by parentId
 * entirely in-memory; no I/O per navigation step (INV-CONV-5).
 */
@Injectable({ providedIn: 'root' })
export class SpeechTreeFacade {
  private readonly port = inject(TREE_SNAPSHOT_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _items = signal<SpeechTreeNode[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  /** Cached ETag for If-None-Match on the next revalidate (ADR-003). */
  private readonly _etag = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly etag = this._etag.asReadonly();

  /**
   * Load (or revalidate) the tree.
   * Passes the cached ETag so a 304 response is handled without replacing the items.
   * Call once on component init; Layer 2 adds periodic background revalidation.
   */
  load(): void {
    this._loading.set(true);
    this._error.set(null);
    from(this.port.fetch(this._etag() ?? undefined))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!result.notModified) {
            this._items.set(result.snapshot.nodes);
            this._etag.set(result.snapshot.etag);
          }
          this._loading.set(false);
        },
        error: err => {
          this._error.set((err as Error).message);
          this._loading.set(false);
        },
      });
  }

  /**
   * Dual-authorization gate (Amendment 4, ADR-016).
   * A phrase is "active" (shown in the runtime) only when both caregiver and patient
   * have confirmed the content for the given locale. Categories are always visible (structure,
   * not reviewable content — ADR-015, SPEC-03 §3).
   */
  isActive(node: SpeechTreeNode, locale: Locale): boolean {
    const c = node.content[locale];
    return c.caregiverConfirmed && c.patientConfirmed;
  }
}
