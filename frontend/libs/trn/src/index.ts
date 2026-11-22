// @neuroassist/trn — public API
// Import path: @neuroassist/trn (see frontend/tsconfig.base.json)
// D-493/D-494 — promoted by /fe-architect-promote neuroassist-niv TRN

export { TRN_ROUTES } from './lib/trn.routes';
export { provideTrn } from './lib/trn.providers';
export type { TrnAdapterMode, TrnProviderConfig } from './lib/trn.providers';

// Facades
export { TrainingSessionFacade } from './lib/training-session.facade';
export { ProposalFacade } from './lib/proposal.facade';
export { ConsentFacade } from './lib/consent.facade';
export { PublicationFacade } from './lib/publication.facade';
export { ContentFacade } from './lib/content.facade';

// Contract
export {
  TRN_MODULE_DESCRIPTOR,
  MODULE_KEY,
  MODULE_MENU_METADATA,
  MODULE_PERMISSION_MAP,
  MODULE_FEATURE_FLAGS,
} from './lib/trn.contract';
export type {
  ModuleMenuMetadata,
  ModulePermissionMap,
  ModuleFeatureFlags,
} from './lib/trn.contract';

// Ports (re-exported for host-level integration — INT-FE-TRN-*)
export { TRAINING_SESSION_PORT } from './lib/api/training-session.port';
export { PROPOSAL_PORT } from './lib/api/proposal.port';
export { CONSENT_PORT } from './lib/api/consent.port';
export { PUBLICATION_PORT } from './lib/api/publication.port';
export { CONTENT_PORT } from './lib/api/content.port';

// Domain model
export type {
  Locale,
  TrainingSession,
  Proposal,
  ProposalStatus,
  ProposalAuthorization,
  SessionStatus,
  DialogMessage,
  DialogTurnResult,
  ConsentRecord,
  ConsentStatus,
  Publication,
  PublicationStatus,
  ErasureAck,
} from './lib/trn.model';

// Error handler
export { normalizeTrnError } from './lib/trn.error-handler';
export type { TrnError, TrnErrorCode } from './lib/trn.error-handler';
