import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CONTENT_PORT } from './api/content.port';
import { ErasureAck } from './trn.model';

/**
 * ContentFacade — signals-based application layer for TRN right-to-be-forgotten erasure.
 *
 * Erasure is irreversible. trn-service handles the full pipeline server-side:
 * voice-model crypto-shred + vendor deletion + CONV retire/erase + HIST audit.
 * None of that is surfaced on the FE — only the acknowledgement is.
 *
 * Authority: trn.content.delete.
 */
@Injectable({ providedIn: 'root' })
export class ContentFacade {
  private readonly port = inject(CONTENT_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _ack = signal<ErasureAck | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly ack = this._ack.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Erases all voice content for the given patient.
   * The confirmation dialog lives in the component; this facade fires the request.
   */
  erase(patientId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .erase(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ack => {
          this._ack.set(ack);
          this._loading.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }
}
