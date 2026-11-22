import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { CatalogPort, EdgeCatalogWire } from './catalog.port';

/**
 * HTTP adapter for CatalogPort.
 * Calls GET /edge/catalog authenticated by the edge.device token.
 * Cached via If-None-Match / 304 (EDGE §4.2 — 304 is the common case at runtime).
 * authority: edge.catalog.read.
 *
 * NOTE: This call reads EDGE's catalog read-model. GEST NEVER calls PAT directly.
 */
@Injectable()
export class CatalogHttpAdapter implements CatalogPort {
  private readonly http = inject(HttpClient);
  // Base: ${ACCESS_HTTP_BASE}/edge (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
  private readonly base = `${ACCESS_HTTP_BASE}/edge`;

  read(): Observable<EdgeCatalogWire> {
    return this.http.get<EdgeCatalogWire>(`${this.base}/catalog`);
  }
}
