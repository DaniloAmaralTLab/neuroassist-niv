import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { interval, switchMap, takeWhile } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PUBLICATION_PORT } from './api/publication.port';
import { Publication } from './trn.model';

/**
 * PublicationFacade — signals-based application layer for TRN publication lifecycle.
 *
 * Publication is NEVER optimistic (SPEC-04 §4):
 *  - POST /trn/proposals/{id}/publication returns 202 Accepted.
 *  - The facade polls GET /trn/publications/{id} until status = 'published' | 'failed'.
 *  - A node is shown "published" only when the server confirms publication.status = 'published'.
 *  - On ElevenLabs delay the node stays in 'pending-synth' (never faked "published").
 *
 * Layer 2 (FE-TRN-022): configurable poll interval and exponential backoff live here.
 */
@Injectable({ providedIn: 'root' })
export class PublicationFacade {
  private readonly port = inject(PUBLICATION_PORT);
  private readonly destroyRef = inject(DestroyRef);

  /** Per-proposal publication state keyed by proposalId. */
  private readonly _publicationMap = signal<Record<string, Publication>>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly publicationMap = this._publicationMap.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  publicationFor(proposalId: string): Publication | null {
    return this._publicationMap()[proposalId] ?? null;
  }

  /**
   * Requests publication of the given proposal and starts polling for the result.
   * Authority: trn.publication.create (POST) + trn.publication.read (GET poll).
   */
  requestPublication(proposalId: string): void {
    this._loading.set(true);
    this._error.set(null);

    this.port
      .request(proposalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pub => {
          this._updateMap(pub);
          this._loading.set(false);
          if (pub.status === 'pending') {
            this._pollUntilSettled(pub.id, proposalId);
          }
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _updateMap(pub: Publication): void {
    this._publicationMap.update(m => ({ ...m, [pub.proposalId]: pub }));
  }

  /** Poll GET /trn/publications/{id} every 3 s until settled (published | failed). */
  private _pollUntilSettled(publicationId: string, proposalId: string): void {
    interval(3000)
      .pipe(
        switchMap(() => this.port.get(publicationId)),
        takeWhile(pub => pub.status === 'pending', /* inclusive */ true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: pub => this._updateMap(pub),
        error: (err: Error) => {
          this._publicationMap.update(m => ({
            ...m,
            [proposalId]: {
              ...(m[proposalId] ?? { id: publicationId, proposalId, requestedAt: '' }),
              status: 'failed',
              failureReason: err.message,
              publishedAt: null,
            },
          }));
        },
      });
  }
}
