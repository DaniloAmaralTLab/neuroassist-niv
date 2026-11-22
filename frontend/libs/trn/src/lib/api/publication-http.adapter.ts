import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { PublicationPort } from './publication.port';
import { Publication, PublicationWire, toPublication } from '../trn.model';

// POST /trn/proposals/{id}/publication returns 202 Accepted — the caller polls GET.
// Publication is NEVER optimistic (SPEC-04 §4).

@Injectable({ providedIn: 'root' })
export class PublicationHttpAdapter implements PublicationPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/trn`;

  request(proposalId: string): Observable<Publication> {
    return this.http
      .post<PublicationWire>(`${this.base}/proposals/${proposalId}/publication`, {})
      .pipe(map(toPublication));
  }

  get(publicationId: string): Observable<Publication> {
    return this.http
      .get<PublicationWire>(`${this.base}/publications/${publicationId}`)
      .pipe(map(toPublication));
  }
}
