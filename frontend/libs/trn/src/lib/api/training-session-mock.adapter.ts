import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { TrainingSessionPort } from './training-session.port';
import { TrainingSession, DialogTurnResult } from '../trn.model';

/** Seed data follows the same wire shape as the HTTP adapter (toSession mapper is not bypassed). */
const MOCK_SESSION: TrainingSession = {
  id: 'sess-mock-001',
  patientId: 'pat-marcio',
  status: 'open',
  proposals: [],
  startedAt: new Date().toISOString(),
  endedAt: null,
};

@Injectable()
export class TrainingSessionMockAdapter implements TrainingSessionPort {
  private session: TrainingSession = { ...MOCK_SESSION, proposals: [] };

  create(_patientId: string): Observable<TrainingSession> {
    this.session = { ...MOCK_SESSION, proposals: [], startedAt: new Date().toISOString() };
    return of({ ...this.session }).pipe(delay(400));
  }

  get(_sessionId: string): Observable<TrainingSession> {
    return of({ ...this.session, proposals: [...this.session.proposals] }).pipe(delay(400));
  }

  postDialogTurn(sessionId: string, caregiverText: string): Observable<DialogTurnResult> {
    const now = new Date().toISOString();
    const result: DialogTurnResult = {
      messages: [
        { role: 'caregiver', content: caregiverText, timestamp: now },
        {
          role: 'assistant',
          content: `Here are some phrase suggestions based on your input: "${caregiverText}".`,
          timestamp: now,
        },
      ],
      newProposals: [
        {
          id: `prop-mock-${Date.now()}`,
          sessionId,
          text: `${caregiverText} (suggested)`,
          parentId: null,
          status: 'proposed',
          authorization: {
            caregiverConfirmed: false,
            caregiverConfirmedAt: null,
            patientAssented: false,
            patientAssentedAt: null,
            relationship: null,
            evidenceRef: null,
          },
          audioAssetId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    this.session = {
      ...this.session,
      proposals: [...this.session.proposals, ...result.newProposals],
    };
    return of(result).pipe(delay(900)); // simulate LLM latency
  }
}
