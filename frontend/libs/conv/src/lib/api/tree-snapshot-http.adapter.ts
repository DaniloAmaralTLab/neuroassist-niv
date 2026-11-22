import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  TreeSnapshotPort,
  TreeSnapshotResult,
  TreeNotModifiedResult,
  AudioManifestEntryWire,
} from './tree-snapshot.port';
import { SpeechTreeNode, ContentLocale, Locale } from '../conv.model';

// Base: ${ACCESS_HTTP_BASE}/conv — NEVER /api/v1 (carry-forward `http-adapter:wrong-prefix`).
// X-Tenant-Id is derived from the JWT tenantId claim server-side; never sent in the request (INV-CONV-7).

/** BE wire shape for GET /conv/tree §2.1. */
interface TreeBundleWire {
  patientId: string;
  version: number;
  etag: string;
  contentHash: string;
  publishedAt: string;
  tree: { categories: TreeCategoryWire[] };
  audioManifest: AudioManifestEntryWire[];
}

interface TreeCategoryWire {
  id: string;
  label: string;
  order: number;
  /** IDs of sub-categories of this category (references, not embedded). */
  children: string[];
  phrases: TreePhraseWire[];
}

interface TreePhraseWire {
  id: string;
  text: string;
  order: number;
  assetId: string | null;
}

/** Flatten the wire hierarchy to the domain model (SpeechTreeNode[]) consumed by the facade. */
function flattenBundle(bundle: TreeBundleWire): SpeechTreeNode[] {
  const nodes: SpeechTreeNode[] = [];

  // Build parentId map by inverting the category.children[] relationships.
  const parentOf = new Map<string, string | null>();
  for (const cat of bundle.tree.categories) {
    if (!parentOf.has(cat.id)) parentOf.set(cat.id, null);
    for (const childId of cat.children) {
      parentOf.set(childId, cat.id);
    }
  }

  for (const cat of bundle.tree.categories) {
    const content: Record<Locale, ContentLocale> = {
      en: { text: cat.label, audioRef: null, caregiverConfirmed: true, patientConfirmed: true },
    };
    nodes.push({
      id: cat.id,
      patientId: bundle.patientId,
      parentId: parentOf.get(cat.id) ?? null,
      type: 'category',
      content,
      order: cat.order,
      engineFeatureRef: null,
      proposedByTraining: false,
    });

    for (const phrase of cat.phrases) {
      const audioEntry = bundle.audioManifest.find(a => a.assetId === phrase.assetId);
      const phraseContent: Record<Locale, ContentLocale> = {
        en: {
          text: phrase.text,
          audioRef: audioEntry ? audioEntry.assetId : null,
          caregiverConfirmed: true,
          patientConfirmed: true,
        },
      };
      nodes.push({
        id: phrase.id,
        patientId: bundle.patientId,
        parentId: cat.id,
        type: 'phrase',
        content: phraseContent,
        order: phrase.order,
        engineFeatureRef: null,
        proposedByTraining: false,
      });
    }
  }

  return nodes;
}

@Injectable({ providedIn: 'root' })
export class TreeSnapshotHttpAdapter implements TreeSnapshotPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/conv`;

  fetch(ifNoneMatch?: string): Observable<TreeSnapshotResult | TreeNotModifiedResult> {
    let headers = new HttpHeaders();
    if (ifNoneMatch) {
      headers = headers.set('If-None-Match', ifNoneMatch);
    }

    return this.http
      .get<TreeBundleWire>(`${this.base}/tree`, {
        headers,
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<TreeBundleWire>) => {
          if (response.status === 304) {
            return { notModified: true as const };
          }
          const bundle = response.body!;
          const etag = response.headers.get('ETag') ?? bundle.etag;
          return {
            notModified: false as const,
            snapshot: {
              etag,
              version: bundle.version,
              publishedAt: bundle.publishedAt,
              nodes: flattenBundle(bundle),
              audioManifest: bundle.audioManifest,
            },
          };
        }),
      );
  }
}
