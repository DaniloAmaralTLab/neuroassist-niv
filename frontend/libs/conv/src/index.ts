// @neuroassist/conv — public API
// Import path: @neuroassist/conv (see frontend/tsconfig.base.json)
// D-493/D-494 — promoted by /fe-architect-promote neuroassist-niv CONV

export { CONV_ROUTES } from './lib/conv.routes';
export { provideConv } from './lib/conv.providers';
export type { ConvAdapterMode, ConvProviderConfig } from './lib/conv.providers';
export { SpeechTreeFacade } from './lib/speech-tree.facade';
export { CONV_MODULE_DESCRIPTOR, MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS } from './lib/conv.contract';
// Ports (re-exported for use by host-level integration — INT-FE-CONV-1)
export { TREE_SNAPSHOT_PORT } from './lib/api/tree-snapshot.port';
export { AUDIO_ASSET_PORT } from './lib/api/audio-asset.port';
export { USAGE_SIGNAL_PORT } from './lib/api/usage-signal.port';
export { NAVIGATION_INTENT_PORT, NoOpNavigationIntentPort } from './lib/api/navigation-intent.port';
export type { NavigationIntent } from './lib/api/navigation-intent.port';
export type { SpeechTreeNode, Locale, ContentLocale } from './lib/conv.model';
