import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  CommandPort,
  CommandWire,
  CreateCommandRequest,
  CalibrateCommandRequest,
  CommandStatus,
  GestureTypePrimitive,
} from './command.port';

// Seed data from design-reference/shared/mock-data.ts (commands slice).
// Fields mapped to BE wire shape: minGestureDurationMs → minGestureTimeMs (api-contract §2).

/** Lookup table for mock gesture type resolution (matches gesture-type-mock.adapter.ts seeds). */
const GESTURE_DISPLAY: Record<string, { code: string; displayName: string }> = {
  'tg-eyebrow':      { code: 'RAISE_EYEBROW', displayName: 'Raise eyebrow' },
  'tg-blink-double': { code: 'DOUBLE_BLINK',  displayName: 'Blink twice'   },
  'tg-blink-fast':   { code: 'FAST_BLINK',    displayName: 'Quick blink'   },
  'tg-blink-slow':   { code: 'SLOW_BLINK',    displayName: 'Slow blink'    },
  'tg-close-eyes':   { code: 'CLOSE_EYES',    displayName: 'Close eyes'    },
  'tg-move-nose':    { code: 'NOSE_WRINKLE',  displayName: 'Move nose'     },
  'tg-lip-reading':  { code: 'LIP_READING',   displayName: 'Lip reading'   },
};

function resolveGT(id: string): GestureTypePrimitive {
  const r = GESTURE_DISPLAY[id];
  return r ? { id, ...r } : { id, code: id.toUpperCase().replace(/-/g, '_'), displayName: id };
}

const MOCK_COMMANDS: CommandWire[] = [
  {
    id: 'cmd-help', patientId: 'pat-marcio', label: 'Help', urgency: 'emergency',
    sensitivity: 'medium', primaryPrimitive: resolveGT('tg-eyebrow'),
    secondaryPrimitive: null, minGestureTimeMs: 400, maxGestureTimeMs: 1500, status: 'active',
  },
  {
    id: 'cmd-water', patientId: 'pat-marcio', label: 'Water', urgency: 'routine',
    sensitivity: 'high', primaryPrimitive: resolveGT('tg-eyebrow'),
    secondaryPrimitive: resolveGT('tg-blink-double'),
    minGestureTimeMs: 400, maxGestureTimeMs: 1800, status: 'active',
  },
  {
    id: 'cmd-frog', patientId: 'pat-marcio', label: 'Frog', urgency: 'routine',
    sensitivity: 'medium', primaryPrimitive: resolveGT('tg-blink-fast'),
    secondaryPrimitive: resolveGT('tg-blink-slow'),
    minGestureTimeMs: 400, maxGestureTimeMs: 1800, status: 'active',
  },
];

@Injectable()
export class CommandMockAdapter implements CommandPort {
  private commands: CommandWire[] = [...MOCK_COMMANDS];

  listByPatient(patientId: string, status: CommandStatus | 'all' = 'active'): Observable<CommandWire[]> {
    const result = this.commands.filter(
      c => c.patientId === patientId && (status === 'all' || c.status === status),
    );
    return of(result).pipe(delay(400));
  }

  get(commandId: string): Observable<CommandWire> {
    const command = this.commands.find(c => c.id === commandId) ?? MOCK_COMMANDS[0];
    return of(command).pipe(delay(400));
  }

  create(patientId: string, req: CreateCommandRequest): Observable<CommandWire> {
    const newCommand: CommandWire = {
      id: `cmd-${Date.now()}`,
      patientId,
      label: req.label,
      urgency: req.urgency,
      sensitivity: req.sensitivity,
      primaryPrimitive: resolveGT(req.primaryPrimitive),
      secondaryPrimitive: req.secondaryPrimitive ? resolveGT(req.secondaryPrimitive) : null,
      minGestureTimeMs: req.minGestureTimeMs,
      maxGestureTimeMs: req.maxGestureTimeMs,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.commands = [...this.commands, newCommand];
    return of(newCommand).pipe(delay(400));
  }

  calibrate(commandId: string, req: CalibrateCommandRequest): Observable<CommandWire> {
    const existing = this.commands.find(c => c.id === commandId);
    if (!existing) return of({} as CommandWire).pipe(delay(400));
    const updated: CommandWire = {
      ...existing,
      label: req.label ?? existing.label,
      urgency: req.urgency ?? existing.urgency,
      sensitivity: req.sensitivity ?? existing.sensitivity,
      primaryPrimitive: req.primaryPrimitive
        ? resolveGT(req.primaryPrimitive)
        : existing.primaryPrimitive,
      secondaryPrimitive:
        req.secondaryPrimitive !== undefined
          ? req.secondaryPrimitive
            ? resolveGT(req.secondaryPrimitive)
            : null
          : existing.secondaryPrimitive,
      minGestureTimeMs: req.minGestureTimeMs ?? existing.minGestureTimeMs,
      maxGestureTimeMs: req.maxGestureTimeMs ?? existing.maxGestureTimeMs,
      updatedAt: new Date().toISOString(),
    };
    this.commands = this.commands.map(c => (c.id === commandId ? updated : c));
    return of(updated).pipe(delay(400));
  }

  retire(commandId: string): Observable<void> {
    this.commands = this.commands.map(c =>
      c.id === commandId ? { ...c, status: 'retired' as const } : c,
    );
    return of(undefined).pipe(delay(400));
  }
}
