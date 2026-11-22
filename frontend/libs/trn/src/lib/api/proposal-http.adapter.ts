import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { ProposalPort } from './proposal.port';
import { Proposal, ProposalWire, toProposal } from '../trn.model';

// Base: ${ACCESS_HTTP_BASE}/trn — NEVER /api/v1 (carry-forward `http-adapter:wrong-prefix`).

@Injectable({ providedIn: 'root' })
export class ProposalHttpAdapter implements ProposalPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/trn`;

  get(sessionId: string, proposalId: string): Observable<Proposal> {
    return this.http
      .get<ProposalWire>(`${this.base}/sessions/${sessionId}/proposals/${proposalId}`)
      .pipe(map(toProposal));
  }

  update(sessionId: string, proposalId: string, text: string): Observable<Proposal> {
    return this.http
      .patch<ProposalWire>(
        `${this.base}/sessions/${sessionId}/proposals/${proposalId}`,
        { text },
      )
      .pipe(map(toProposal));
  }

  confirmCaregiver(proposalId: string): Observable<Proposal> {
    return this.http
      .post<ProposalWire>(`${this.base}/proposals/${proposalId}/caregiver-confirmation`, {})
      .pipe(map(toProposal));
  }

  recordPatientAssent(
    proposalId: string,
    opts: { relationship?: string; evidenceRef?: string },
  ): Observable<Proposal> {
    return this.http
      .post<ProposalWire>(`${this.base}/proposals/${proposalId}/patient-assent`, {
        relationship: opts.relationship ?? null,
        evidenceRef: opts.evidenceRef ?? null,
      })
      .pipe(map(toProposal));
  }

  reject(proposalId: string): Observable<Proposal> {
    return this.http
      .post<ProposalWire>(`${this.base}/proposals/${proposalId}/rejection`, {})
      .pipe(map(toProposal));
  }

  withdraw(proposalId: string): Observable<Proposal> {
    return this.http
      .post<ProposalWire>(`${this.base}/proposals/${proposalId}/withdrawal`, {})
      .pipe(map(toProposal));
  }
}
