import { Provider } from '@angular/core';
import { TRAINING_SESSION_PORT } from './api/training-session.port';
import { PROPOSAL_PORT } from './api/proposal.port';
import { CONSENT_PORT } from './api/consent.port';
import { PUBLICATION_PORT } from './api/publication.port';
import { CONTENT_PORT } from './api/content.port';
import { TrainingSessionHttpAdapter } from './api/training-session-http.adapter';
import { TrainingSessionMockAdapter } from './api/training-session-mock.adapter';
import { ProposalHttpAdapter } from './api/proposal-http.adapter';
import { ProposalMockAdapter } from './api/proposal-mock.adapter';
import { ConsentHttpAdapter } from './api/consent-http.adapter';
import { ConsentMockAdapter } from './api/consent-mock.adapter';
import { PublicationHttpAdapter } from './api/publication-http.adapter';
import { PublicationMockAdapter } from './api/publication-mock.adapter';
import { ContentHttpAdapter } from './api/content-http.adapter';
import { ContentMockAdapter } from './api/content-mock.adapter';

export type TrnAdapterMode = 'http' | 'mock';

export interface TrnProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — trn-service is specified (api-contract, SPEC-01..11 and generator-config
   * are published). The earlier 'mock' default (vision ADR-007 §7, written while trn-service was
   * unarchitected) is superseded; the Mock adapter remains available by explicit override for
   * offline dev / e2e only.
   * Carry-forward: scaffold:mock-adapter-default:shell-provider-not-switched-to-http
   */
  adapter?: TrnAdapterMode;
}

/**
 * Returns the TRN module's DI providers.
 * Use in `app.config.ts`:
 *
 * ```ts
 * provideTrn()                     // http (default) — trn-service must be reachable
 * provideTrn({ adapter: 'mock' }) // mock — offline dev / e2e only
 * ```
 */
export function provideTrn(config: TrnProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http';

  if (mode === 'mock') {
    return [
      { provide: TRAINING_SESSION_PORT, useClass: TrainingSessionMockAdapter },
      { provide: PROPOSAL_PORT,         useClass: ProposalMockAdapter },
      { provide: CONSENT_PORT,          useClass: ConsentMockAdapter },
      { provide: PUBLICATION_PORT,      useClass: PublicationMockAdapter },
      { provide: CONTENT_PORT,          useClass: ContentMockAdapter },
    ];
  }

  return [
    { provide: TRAINING_SESSION_PORT, useClass: TrainingSessionHttpAdapter },
    { provide: PROPOSAL_PORT,         useClass: ProposalHttpAdapter },
    { provide: CONSENT_PORT,          useClass: ConsentHttpAdapter },
    { provide: PUBLICATION_PORT,      useClass: PublicationHttpAdapter },
    { provide: CONTENT_PORT,          useClass: ContentHttpAdapter },
  ];
}
