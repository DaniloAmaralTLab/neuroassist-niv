import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ContentPort } from './content.port';
import { ErasureAck } from '../trn.model';

@Injectable()
export class ContentMockAdapter implements ContentPort {
  erase(patientId: string): Observable<ErasureAck> {
    const ack: ErasureAck = {
      patientId,
      erasedCount: 3,
      retiredCount: 2,
      requestedAt: new Date().toISOString(),
    };
    return of(ack).pipe(delay(600));
  }
}
