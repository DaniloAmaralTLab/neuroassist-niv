import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CONSENT_PORT } from './api/consent.port';
import { ConsentRecord } from './trn.model';

/**
 * ConsentFacade — signals-based application layer for TRN voice-cloning consent.
 *
 * Consent is a prerequisite for synthesis (ADR-005 TTS consent).
 * Revocation triggers server-side crypto-shred + CONV retire/erase + HIST audit —
 * the FE surfaces the consent status and delegates all vendor operations to trn-service.
 */
@Injectable({ providedIn: 'root' })
export class ConsentFacade {
  private readonly port = inject(CONSENT_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _consent = signal<ConsentRecord | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly consent = this._consent.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Loads the patient's current consent gate state. Authority: trn.consent.read. */
  load(patientId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .get(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => {
          this._consent.set(c);
          this._loading.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  /** Captures patient + representative voice-cloning consent. Authority: trn.consent.create. */
  captureConsent(patientId: string, representativeConsent: boolean): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .create(patientId, representativeConsent)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => {
          this._consent.set(c);
          this._loading.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  /** Revokes voice-cloning consent. Authority: trn.consent.revoke. */
  revokeConsent(consentId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .revoke(consentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => {
          this._consent.set(c);
          this._loading.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }
}
