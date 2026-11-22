import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { PublicationPort } from './publication.port';
import { Publication } from '../trn.model';

const pubStore = new Map<string, Publication>();

@Injectable()
export class PublicationMockAdapter implements PublicationPort {
  request(proposalId: string): Observable<Publication> {
    const now = new Date().toISOString();
    const pub: Publication = {
      id: `pub-mock-${Date.now()}`,
      proposalId,
      status: 'pending',
      requestedAt: now,
      publishedAt: null,
      failureReason: null,
    };
    pubStore.set(pub.id, pub);
    // Simulate async publish completing after 2 s (not optimistic — gate is server truth).
    setTimeout(() => {
      const resolved = pubStore.get(pub.id);
      if (resolved && resolved.status === 'pending') {
        pubStore.set(pub.id, {
          ...resolved,
          status: 'published',
          publishedAt: new Date().toISOString(),
        });
      }
    }, 2000);
    return of({ ...pub }).pipe(delay(400));
  }

  get(publicationId: string): Observable<Publication> {
    const pub = pubStore.get(publicationId);
    if (!pub) throw new Error(`Mock: publication ${publicationId} not found`);
    return of({ ...pub }).pipe(delay(400));
  }
}
