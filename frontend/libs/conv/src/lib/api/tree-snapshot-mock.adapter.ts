import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  TreeSnapshotPort,
  TreeSnapshotResult,
  TreeNotModifiedResult,
} from './tree-snapshot.port';
import { SpeechTreeNode } from '../conv.model';

// Seed data from design-reference/shared/mock-data.ts (Amendment 3/4 — CONV slice).
// Inline to avoid cross-boundary import from design-reference.
// NIV note: English-only (ADR-018). contentActive() sets dual-authorization to true for seed nodes.

function contentActive(en: string, audioSlug?: string): SpeechTreeNode['content'] {
  return {
    en: {
      text: en,
      audioRef: audioSlug ? `audio/en/${audioSlug}.mp3` : null,
      caregiverConfirmed: true,
      patientConfirmed: true,
    },
  };
}

const MOCK_PATIENT_ID = 'pat-marcio';

const MOCK_NODES: SpeechTreeNode[] = [
  // Root categories
  { id: 'node-cat-comfort',      patientId: MOCK_PATIENT_ID, parentId: null, type: 'category', content: contentActive('Comfort'),     order: 1, engineFeatureRef: null, proposedByTraining: false },
  { id: 'node-cat-conversation', patientId: MOCK_PATIENT_ID, parentId: null, type: 'category', content: contentActive('Talk'),        order: 2, engineFeatureRef: null, proposedByTraining: false },
  { id: 'node-cat-help',         patientId: MOCK_PATIENT_ID, parentId: null, type: 'category', content: contentActive('I need help'), order: 3, engineFeatureRef: null, proposedByTraining: false },

  // Comfort phrases
  { id: 'node-phrase-water',      patientId: MOCK_PATIENT_ID, parentId: 'node-cat-comfort', type: 'phrase', content: contentActive('I want water',      'i-want-water'),          order: 1, engineFeatureRef: 'tg-eyebrow', proposedByTraining: false },
  { id: 'node-phrase-reposition', patientId: MOCK_PATIENT_ID, parentId: 'node-cat-comfort', type: 'phrase', content: contentActive('I want to reposition', 'i-want-to-reposition'), order: 2, engineFeatureRef: null,        proposedByTraining: false },

  // Talk phrases
  { id: 'node-phrase-hi',     patientId: MOCK_PATIENT_ID, parentId: 'node-cat-conversation', type: 'phrase', content: contentActive('Hi, how are you?', 'hi-how-are-you'), order: 1, engineFeatureRef: null, proposedByTraining: false },
  { id: 'node-phrase-thanks', patientId: MOCK_PATIENT_ID, parentId: 'node-cat-conversation', type: 'phrase', content: contentActive('Thank you',         'thank-you'),      order: 2, engineFeatureRef: null, proposedByTraining: false },
  { id: 'node-phrase-tired',  patientId: MOCK_PATIENT_ID, parentId: 'node-cat-conversation', type: 'phrase', content: contentActive("I'm tired",         'im-tired'),       order: 3, engineFeatureRef: null, proposedByTraining: false },

  // Help phrases
  { id: 'node-phrase-help-now',   patientId: MOCK_PATIENT_ID, parentId: 'node-cat-help', type: 'phrase', content: contentActive('I need help now',   'i-need-help-now'),  order: 1, engineFeatureRef: 'tg-eyebrow', proposedByTraining: false },
  { id: 'node-phrase-not-urgent', patientId: MOCK_PATIENT_ID, parentId: 'node-cat-help', type: 'phrase', content: contentActive('It can wait a bit', 'it-can-wait-a-bit'), order: 2, engineFeatureRef: null,        proposedByTraining: false },

  // Proposals from TRAINING (Amendment 4, ADR-016) — illustrate Dual Authorization states.
  {
    id: 'node-phrase-water-ice', patientId: MOCK_PATIENT_ID, parentId: 'node-cat-comfort', type: 'phrase', order: 3, engineFeatureRef: null, proposedByTraining: true,
    content: { en: { text: 'I want water with ice', audioRef: null, caregiverConfirmed: true, patientConfirmed: false } },
  },
  {
    id: 'node-phrase-call-danilo', patientId: MOCK_PATIENT_ID, parentId: 'node-cat-conversation', type: 'phrase', order: 4, engineFeatureRef: null, proposedByTraining: true,
    content: { en: { text: 'Call Danilo', audioRef: null, caregiverConfirmed: false, patientConfirmed: false } },
  },
];

const MOCK_ETAG = '"sha256:mock-seed-v1"';

@Injectable()
export class TreeSnapshotMockAdapter implements TreeSnapshotPort {
  private readonly nodes: SpeechTreeNode[] = [...MOCK_NODES];

  fetch(ifNoneMatch?: string): Observable<TreeSnapshotResult | TreeNotModifiedResult> {
    if (ifNoneMatch === MOCK_ETAG) {
      return of({ notModified: true as const }).pipe(delay(100));
    }
    return of({
      notModified: false as const,
      snapshot: {
        etag: MOCK_ETAG,
        version: 1,
        publishedAt: '2026-11-20T12:00:00Z',
        nodes: this.nodes,
        audioManifest: this.nodes
          .filter(n => n.content.en.audioRef)
          .map(n => ({
            assetId: n.id,
            url: `/conv/audio/${n.id}`,
            contentHash: `sha256:mock-${n.id}`,
            mediaType: 'audio/mpeg',
            durationMs: 1200,
          })),
      },
    }).pipe(delay(400));
  }
}
