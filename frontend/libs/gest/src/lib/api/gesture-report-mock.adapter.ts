import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { EventWire, GestureReportPort, GestureReportWire } from './gesture-report.port';

/**
 * Mock adapter for GestureReportPort.
 * Returns a stubbed EventWire with 400 ms simulated latency.
 * Carry-forward: mock-adapter-delay-400ms.
 *
 * Used ONLY under an explicit mock provider in tests / offline dev.
 * The default adapter is HTTP (provideGest() → 'http').
 */
@Injectable()
export class GestureReportMockAdapter implements GestureReportPort {
  report(payload: GestureReportWire): Observable<EventWire> {
    const event: EventWire = {
      id: `mock-event-${payload.reportId}`,
      patientId: 'mock-patient-01',
      commandId: payload.commandId,
      commandLabel: 'Mock Command',
      urgency: 'routine',
      deviceId: 'mock-device-01',
      reportId: payload.reportId,
      occurredAt: payload.occurredAt,
      confirmedAt: null,
      feedback: 'pending',
      createdAt: new Date().toISOString(),
    };
    return of(event).pipe(delay(400));
  }
}
