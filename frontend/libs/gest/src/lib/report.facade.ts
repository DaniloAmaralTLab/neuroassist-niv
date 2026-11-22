import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { GESTURE_REPORT_PORT } from './api/gesture-report.port';

// ── View-model types (SPEC-03 §4) ────────────────────────────────────────────

export type ReportItemStatus = 'queued' | 'sending' | 'sent' | 'expired';

export interface ReportQueueItemVM {
  reportId: string;
  commandId: string;
  occurredAt: string;
  attempts: number;
  status: ReportItemStatus;
  ageMs: number;
  expiresInMs: number | null;
}

export interface ReportQueueVM {
  pending: number;
  items: ReportQueueItemVM[];
  lastSentAt: string | null;
  lastError: string | null;
  nextRetryInMs: number | null;
}

// ── Internal queue item (durable — survives reload via localStorage) ──────────

const QUEUE_STORAGE_KEY = 'gest:report-queue';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours (INV-GEST-5)

interface DurableQueueItem {
  reportId: string;
  commandId: string;
  occurredAt: string;
  attempts: number;
  enqueuedAt: string;
  status: ReportItemStatus;
}

function loadQueue(): DurableQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DurableQueueItem[];
  } catch {
    return [];
  }
}

function saveQueue(items: DurableQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // best-effort — a blocked localStorage must not crash the detection loop
  }
}

function toDurableItem(
  reportId: string,
  commandId: string,
  occurredAt: string,
): DurableQueueItem {
  return { reportId, commandId, occurredAt, attempts: 0, enqueuedAt: new Date().toISOString(), status: 'queued' };
}

function toVM(item: DurableQueueItem): ReportQueueItemVM {
  const ageMs = Date.now() - new Date(item.enqueuedAt).getTime();
  const expiresInMs = ageMs >= MAX_AGE_MS ? null : MAX_AGE_MS - ageMs;
  return {
    reportId: item.reportId,
    commandId: item.commandId,
    occurredAt: item.occurredAt,
    attempts: item.attempts,
    status: item.status,
    ageMs,
    expiresInMs,
  };
}

// ── ReportFacade ─────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ReportFacade {
  private readonly port = inject(GESTURE_REPORT_PORT);
  private readonly destroyRef = inject(DestroyRef);

  // Internal queue (durable — also held in localStorage)
  private _queue: DurableQueueItem[] = loadQueue();

  // Signals for the view
  private readonly _items = signal<DurableQueueItem[]>(this._queue);
  private readonly _lastSentAt = signal<string | null>(null);
  private readonly _lastError = signal<string | null>(null);
  private readonly _nextRetryInMs = signal<number | null>(null);

  // ── Public API ───────────────────────────────────────────────────────────

  get vm(): ReportQueueVM {
    const items = this._items();
    return {
      pending: items.filter(i => i.status === 'queued' || i.status === 'sending').length,
      items: items.map(toVM),
      lastSentAt: this._lastSentAt(),
      lastError: this._lastError(),
      nextRetryInMs: this._nextRetryInMs(),
    };
  }

  /**
   * Enqueue a recognition for exactly-once delivery.
   * The reportId is minted ONCE by the caller and reused across retries (INV-GEST-1).
   * occurredAt is stamped AT recognition and carried verbatim (INV-GEST-5).
   * Immediately attempts delivery if online.
   */
  enqueue(
    reportId: string,
    commandId: string,
    occurredAt: string,
    confidence?: number,
    recognitionWindowMs?: number,
  ): void {
    const existing = this._queue.find(i => i.reportId === reportId);
    if (existing) {
      // already queued — do not add a duplicate; retry will handle it
      return;
    }

    const item = toDurableItem(reportId, commandId, occurredAt);
    this._queue = [...this._queue, item];
    this._persist();
    this._attempt(item, confidence, recognitionWindowMs);
  }

  /**
   * Drain the queue — called on navigator.onLine / network-reconnect events.
   */
  drainQueue(): void {
    this._queue
      .filter(i => i.status === 'queued')
      .forEach(i => this._attempt(i));
  }

  clearState(): void {
    this._queue = [];
    this._persist();
    this._items.set([]);
    this._lastSentAt.set(null);
    this._lastError.set(null);
    this._nextRetryInMs.set(null);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _attempt(
    item: DurableQueueItem,
    confidence?: number,
    recognitionWindowMs?: number,
  ): void {
    // Expire items older than 24 h before attempting (INV-GEST-5)
    const ageMs = Date.now() - new Date(item.enqueuedAt).getTime();
    if (ageMs >= MAX_AGE_MS) {
      this._markExpired(item.reportId);
      return;
    }

    this._updateItem(item.reportId, { status: 'sending' });
    item.attempts += 1;

    from(
      this.port.report({
        commandId: item.commandId,
        reportId: item.reportId,
        occurredAt: item.occurredAt,
        ...(confidence !== undefined ? { confidence } : {}),
        ...(recognitionWindowMs !== undefined ? { recognitionWindowMs } : {}),
      }),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // 201 (new) or 200 (idempotent replay) — dequeue
          this._dequeue(item.reportId);
          this._lastSentAt.set(new Date().toISOString());
          this._lastError.set(null);
        },
        error: (err: { status?: number; headers?: { get: (k: string) => string | null } }) => {
          const status = err?.status;

          if (status === 400) {
            // occurred-at-out-of-bounds — expire (INV-GEST-5)
            this._markExpired(item.reportId);
            this._lastError.set('Report expired: out-of-bounds timestamp');
            return;
          }
          if (status === 401 || status === 403) {
            // Station unpaired / token revoked — stop retrying
            this._updateItem(item.reportId, { status: 'queued' });
            this._lastError.set('Station unpaired or token revoked — reporting paused');
            return;
          }
          if (status === 503) {
            // Retry-After header
            const retryAfter = err?.headers?.get('Retry-After');
            const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
            this._updateItem(item.reportId, { status: 'queued' });
            this._nextRetryInMs.set(retryMs);
            this._lastError.set(`Service unavailable, retrying in ${retryMs}ms`);
            return;
          }
          // Generic error — back to queued for next drain
          this._updateItem(item.reportId, { status: 'queued' });
          this._lastError.set(err?.toString() ?? 'Unknown error');
        },
      });
  }

  private _markExpired(reportId: string): void {
    this._updateItem(reportId, { status: 'expired' });
    // Surface as expired — never silently lose it (INV-GEST-5)
  }

  private _dequeue(reportId: string): void {
    this._queue = this._queue.filter(i => i.reportId !== reportId);
    this._persist();
    this._items.set([...this._queue]);
  }

  private _updateItem(reportId: string, patch: Partial<DurableQueueItem>): void {
    this._queue = this._queue.map(i => (i.reportId === reportId ? { ...i, ...patch } : i));
    this._persist();
    this._items.set([...this._queue]);
  }

  private _persist(): void {
    // Persist only {reportId, commandId, occurredAt, attempts, enqueuedAt, status}
    // — NEVER frames, landmarks, or video (INV-GEST-4)
    saveQueue(this._queue);
  }
}
