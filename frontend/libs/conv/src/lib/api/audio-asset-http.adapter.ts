import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { AudioAssetPort } from './audio-asset.port';

// Base: ${ACCESS_HTTP_BASE}/conv — NEVER /api/v1.
// Audio URLs are immutable (Cache-Control: public, max-age=31536000, immutable — BE api-contract §3).
// Layer 2 (FE-CONV-007): AudioCacheStore + Cache-Storage warm-on-sync live here.

@Injectable({ providedIn: 'root' })
export class AudioAssetHttpAdapter implements AudioAssetPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/conv`;

  getBlob(assetId: string): Observable<Blob> {
    return this.http.get(`${this.base}/audio/${assetId}`, { responseType: 'blob' });
  }

  prefetch(assetId: string): Observable<void> {
    // Fire-and-forget: fetch and discard — the browser will cache via standard HTTP cache.
    // Layer 2 (FE-CONV-007): write into AudioCacheStore (Cache-Storage API) here.
    return this.getBlob(assetId).pipe(map(() => undefined));
  }
}
