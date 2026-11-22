import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { COMMAND_PORT } from './api/command.port';
import type { CommandWire, CreateCommandRequest, CalibrateCommandRequest } from './api/command.port';

export type CommandRow = CommandWire;

@Injectable({ providedIn: 'root' })
export class CommandFacade {
  private readonly port = inject(COMMAND_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _items = signal<CommandWire[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(patientId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.port
      .listByPatient(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: commands => {
          this._items.set(commands);
          this._loading.set(false);
        },
        error: err => {
          this._error.set(err?.message ?? 'Failed to load commands');
          this._loading.set(false);
        },
      });
  }

  create(patientId: string, req: CreateCommandRequest): void {
    this._loading.set(true);
    this.port
      .create(patientId, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: command => {
          this._items.update(list => [...list, command]);
          this._loading.set(false);
        },
        error: err => {
          this._error.set(err?.message ?? 'Failed to create command');
          this._loading.set(false);
        },
      });
  }

  calibrate(commandId: string, req: CalibrateCommandRequest): void {
    this.port
      .calibrate(commandId, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this._items.update(list => list.map(c => (c.id === commandId ? updated : c)));
        },
        error: err => {
          this._error.set(err?.message ?? 'Failed to calibrate command');
        },
      });
  }

  retire(commandId: string): void {
    this.port
      .retire(commandId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this._items.update(list => list.filter(c => c.id !== commandId));
        },
        error: err => {
          this._error.set(err?.message ?? 'Failed to retire command');
        },
      });
  }
}
