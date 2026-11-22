import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Publication } from '../trn.model';

// ---------------------------------------------------------------------------
// PublicationPort — covers BE api-contract §6 (async publish lifecycle).
// Publication is NEVER optimistic: a node is shown "published" only when the
// server confirms publication.status = 'published' (SPEC-04 §4).
// ---------------------------------------------------------------------------

export interface PublicationPort {
  /**
   * POST /trn/proposals/{proposalId}/publication
   * Requests synthesize + index + publish. Returns 202 Accepted; the caller polls get().
   * Authority: trn.publication.create (BE §6.1).
   */
  request(proposalId: string): Observable<Publication>;

  /**
   * GET /trn/publications/{publicationId}
   * Polls the publication lifecycle status (pending → published | failed).
   * Authority: trn.publication.read (BE §6.2).
   */
  get(publicationId: string): Observable<Publication>;
}

export const PUBLICATION_PORT = new InjectionToken<PublicationPort>('PublicationPort');
