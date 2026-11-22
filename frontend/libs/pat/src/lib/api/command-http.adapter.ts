import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  CommandPort,
  CommandWire,
  CreateCommandRequest,
  CalibrateCommandRequest,
  CommandStatus,
} from './command.port';

@Injectable({ providedIn: 'root' })
export class CommandHttpAdapter implements CommandPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/pat`;

  listByPatient(patientId: string, status: CommandStatus | 'all' = 'active'): Observable<CommandWire[]> {
    return this.http
      .get<{ commands: CommandWire[] }>(`${this.base}/patients/${patientId}/commands`, {
        params: { status },
      })
      .pipe(map(r => r.commands));
  }

  get(commandId: string): Observable<CommandWire> {
    return this.http.get<CommandWire>(`${this.base}/commands/${commandId}`);
  }

  create(patientId: string, req: CreateCommandRequest): Observable<CommandWire> {
    return this.http.post<CommandWire>(`${this.base}/patients/${patientId}/commands`, {
      label: req.label,
      urgency: req.urgency,
      sensitivity: req.sensitivity,
      primaryPrimitive: req.primaryPrimitive,
      secondaryPrimitive: req.secondaryPrimitive,
      minGestureTimeMs: req.minGestureTimeMs,
      maxGestureTimeMs: req.maxGestureTimeMs,
    });
  }

  calibrate(commandId: string, req: CalibrateCommandRequest): Observable<CommandWire> {
    return this.http.patch<CommandWire>(`${this.base}/commands/${commandId}`, req);
  }

  retire(commandId: string): Observable<void> {
    return this.http
      .delete(`${this.base}/commands/${commandId}`)
      .pipe(map(() => undefined));
  }
}
