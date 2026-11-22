import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { AudioAssetPort } from './audio-asset.port';

/**
 * AudioAssetMockAdapter — no-op stub for dev / e2e.
 * Returns an empty Blob (no real audio synthesis in the prototype — CONV simulates visually).
 * Layer 2 (FE-CONV-007): real AudioCacheStore + Cache-Storage caching via AudioAssetHttpAdapter.
 */
@Injectable()
export class AudioAssetMockAdapter implements AudioAssetPort {
  getBlob(_assetId: string): Observable<Blob> {
    return of(new Blob([], { type: 'audio/mpeg' })).pipe(delay(200));
  }

  prefetch(_assetId: string): Observable<void> {
    return of(undefined).pipe(delay(50));
  }
}
