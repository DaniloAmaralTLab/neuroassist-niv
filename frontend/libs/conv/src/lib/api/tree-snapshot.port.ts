import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SpeechTreeNode } from '../conv.model';

// Wire types mirror the BE api-contract §2 (CONV — Conversation via Speech Tree).
// Keep in sync with conv-service (source of truth: api-contract.md §2).

/** One entry in the audioManifest returned with GET /conv/tree. */
export interface AudioManifestEntryWire {
  assetId: string;
  url: string;
  contentHash: string;
  mediaType: string;
  durationMs: number;
}

/**
 * Flattened domain snapshot — the tree bundle translated from the wire hierarchy
 * to the flat-list domain model the facade and component operate on.
 * Layer 2 (FE-CONV-005/FE-CONV-006): TreeCacheStore + atomic swap + ETag persistence
 * live here; this interface is the contract between the adapter and the facade today.
 */
export interface TreeSnapshot {
  etag: string;
  version: number;
  publishedAt: string;
  /** Flat list of all nodes (categories + phrases) for this patient. */
  nodes: SpeechTreeNode[];
  audioManifest: AudioManifestEntryWire[];
}

export interface TreeSnapshotResult {
  notModified: false;
  snapshot: TreeSnapshot;
}

export interface TreeNotModifiedResult {
  notModified: true;
}

export interface TreeSnapshotPort {
  /**
   * GET ${ACCESS_HTTP_BASE}/conv/tree.
   * Pass `ifNoneMatch` for conditional GET (304 optimization, ADR-003 / BE api-contract §2.2).
   * Returns `{ notModified: true }` on 304; `{ notModified: false, snapshot }` on 200.
   * Layer 2 (FE-CONV-005): cache-first reads + atomic IndexedDB swap belong in TreeSyncService,
   * which calls this port and writes to TreeCacheStore before the facade reads.
   */
  fetch(ifNoneMatch?: string): Observable<TreeSnapshotResult | TreeNotModifiedResult>;
}

export const TREE_SNAPSHOT_PORT = new InjectionToken<TreeSnapshotPort>('TreeSnapshotPort');
