import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { GestureTypePort, GestureTypeWire, RegisterGestureTypeRequest } from './gesture-type.port';

@Injectable({ providedIn: 'root' })
export class GestureTypeHttpAdapter implements GestureTypePort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/pat`;

  list(): Observable<GestureTypeWire[]> {
    return this.http
      .get<{ gestureTypes: GestureTypeWire[] }>(`${this.base}/gesture-types`)
      .pipe(map(r => r.gestureTypes));
  }

  get(id: string): Observable<GestureTypeWire> {
    return this.http.get<GestureTypeWire>(`${this.base}/gesture-types/${id}`);
  }

  register(req: RegisterGestureTypeRequest): Observable<GestureTypeWire> {
    return this.http.post<GestureTypeWire>(`${this.base}/gesture-types`, {
      code: req.code,
      displayName: req.displayName,
      description: req.description ?? '',
    });
  }
}
