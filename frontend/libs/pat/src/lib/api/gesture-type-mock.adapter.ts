import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { GestureTypePort, GestureTypeWire, RegisterGestureTypeRequest } from './gesture-type.port';

// Seed data from design-reference/shared/mock-data.ts (gestureTypes slice).
// Fields mapped to BE wire shape: `name` → `displayName` + derived `code` (api-contract §3).

const MOCK_GESTURE_TYPES: GestureTypeWire[] = [
  { id: 'tg-eyebrow',      code: 'RAISE_EYEBROW', displayName: 'Raise eyebrow',  description: 'A deliberate unilateral or bilateral eyebrow raise.' },
  { id: 'tg-blink-double', code: 'DOUBLE_BLINK',  displayName: 'Blink twice',    description: 'Two rapid eyelid closures in quick succession.' },
  { id: 'tg-blink-fast',   code: 'FAST_BLINK',    displayName: 'Quick blink',    description: 'A single fast eyelid closure.' },
  { id: 'tg-blink-slow',   code: 'SLOW_BLINK',    displayName: 'Slow blink',     description: 'A deliberate, sustained eyelid closure.' },
  { id: 'tg-close-eyes',   code: 'CLOSE_EYES',    displayName: 'Close eyes',     description: 'Both eyes closed for more than 1 s.' },
  { id: 'tg-move-nose',    code: 'NOSE_WRINKLE',  displayName: 'Move nose',      description: 'A nose wrinkle or flare.' },
  { id: 'tg-lip-reading',  code: 'LIP_READING',   displayName: 'Lip reading',    description: 'Mouth movement readable as a recognisable word.' },
];

@Injectable()
export class GestureTypeMockAdapter implements GestureTypePort {
  private gestureTypes: GestureTypeWire[] = [...MOCK_GESTURE_TYPES];

  list(): Observable<GestureTypeWire[]> {
    return of([...this.gestureTypes]).pipe(delay(400));
  }

  get(id: string): Observable<GestureTypeWire> {
    const gt = this.gestureTypes.find(t => t.id === id) ?? MOCK_GESTURE_TYPES[0];
    return of(gt).pipe(delay(400));
  }

  register(req: RegisterGestureTypeRequest): Observable<GestureTypeWire> {
    const newType: GestureTypeWire = {
      id: `tg-${Date.now()}`,
      code: req.code,
      displayName: req.displayName,
      description: req.description ?? '',
      createdAt: new Date().toISOString(),
    };
    this.gestureTypes = [...this.gestureTypes, newType];
    return of(newType).pipe(delay(400));
  }
}
