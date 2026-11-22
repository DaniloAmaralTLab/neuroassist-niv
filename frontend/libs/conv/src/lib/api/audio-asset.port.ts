import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §3 (CONV — audio delivery).
// Keep in sync with conv-service (source of truth: api-contract.md §3).

export interface AudioAssetPort {
  /**
   * GET ${ACCESS_HTTP_BASE}/conv/audio/{assetId}.
   * Returns the audio Blob for the given assetId.
   * Layer 2 (FE-CONV-007): AudioCacheStore + immutable Cache-Storage caching live here;
   * the facade reads from cache and only calls this port for a cache miss.
   * Returns 404 if not in the caller's patient manifest; 410 Gone if erased (ADR-005/ADR-006).
   */
  getBlob(assetId: string): Observable<Blob>;

  /**
   * Prefetch an audio clip into AudioCacheStore (called by TreeSyncService after a tree swap,
   * Layer 2 — FE-CONV-007).
   */
  prefetch(assetId: string): Observable<void>;
}

export const AUDIO_ASSET_PORT = new InjectionToken<AudioAssetPort>('AudioAssetPort');
