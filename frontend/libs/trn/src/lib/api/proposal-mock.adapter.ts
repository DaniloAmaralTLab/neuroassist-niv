import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ProposalPort } from './proposal.port';
import { Proposal } from '../trn.model';

/** In-memory proposal store shared across mock calls. */
const store = new Map<string, Proposal>();

function getOrThrow(proposalId: string): Proposal {
  const p = store.get(proposalId);
  if (!p) throw new Error(`Mock: proposal ${proposalId} not found`);
  return p;
}

@Injectable()
export class ProposalMockAdapter implements ProposalPort {
  /** Seed a proposal into the mock store (called by TrainingSessionMockAdapter). */
  static seed(proposal: Proposal): void {
    store.set(proposal.id, { ...proposal });
  }

  get(_sessionId: string, proposalId: string): Observable<Proposal> {
    return of({ ...getOrThrow(proposalId) }).pipe(delay(400));
  }

  update(_sessionId: string, proposalId: string, text: string): Observable<Proposal> {
    const p = getOrThrow(proposalId);
    const updated: Proposal = { ...p, text, updatedAt: new Date().toISOString() };
    store.set(proposalId, updated);
    return of({ ...updated }).pipe(delay(400));
  }

  confirmCaregiver(proposalId: string): Observable<Proposal> {
    const p = getOrThrow(proposalId);
    const now = new Date().toISOString();
    const updated: Proposal = {
      ...p,
      status: p.authorization.patientAssented ? 'approved' : 'caregiver_approved',
      authorization: { ...p.authorization, caregiverConfirmed: true, caregiverConfirmedAt: now },
      updatedAt: now,
    };
    store.set(proposalId, updated);
    return of({ ...updated }).pipe(delay(400));
  }

  recordPatientAssent(
    proposalId: string,
    opts: { relationship?: string; evidenceRef?: string },
  ): Observable<Proposal> {
    const p = getOrThrow(proposalId);
    const now = new Date().toISOString();
    const updated: Proposal = {
      ...p,
      status: p.authorization.caregiverConfirmed ? 'approved' : 'patient_approved',
      authorization: {
        ...p.authorization,
        patientAssented: true,
        patientAssentedAt: now,
        relationship: opts.relationship ?? null,
        evidenceRef: opts.evidenceRef ?? null,
      },
      updatedAt: now,
    };
    store.set(proposalId, updated);
    return of({ ...updated }).pipe(delay(400));
  }

  reject(proposalId: string): Observable<Proposal> {
    const p = getOrThrow(proposalId);
    const updated: Proposal = {
      ...p,
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    };
    store.set(proposalId, updated);
    return of({ ...updated }).pipe(delay(400));
  }

  withdraw(proposalId: string): Observable<Proposal> {
    const p = getOrThrow(proposalId);
    const updated: Proposal = {
      ...p,
      status: 'withdrawn',
      updatedAt: new Date().toISOString(),
    };
    store.set(proposalId, updated);
    return of({ ...updated }).pipe(delay(400));
  }
}
