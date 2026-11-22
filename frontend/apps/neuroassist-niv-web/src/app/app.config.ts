import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { provideAcs } from '@neuroassist/acs';
import { provideConv } from '@neuroassist/conv';
import { provideTrn } from '@neuroassist/trn';
import { providePat } from '@neuroassist/pat';
import { provideEdge } from '@neuroassist/edge';
import { provideEvnt } from '@neuroassist/evnt';
import { provideHist } from '@neuroassist/hist';
import { provideDash } from '@neuroassist/dash';

// withHashLocation() removed — uses HTML5 history API (carry-forward P2.4 shell setup).
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptorsFromDi()),
    // ACS defaults to http adapter (acs-service exists; see acs.providers.ts).
    ...provideAcs(),
    // PAT defaults to http adapter (pat-service exists; see pat.providers.ts).
    ...providePat(),
    // EDGE defaults to http adapter (edge-service api-contract published — SPEC-04 §2, G-EDGE-3).
    ...provideEdge(),
    // EVNT defaults to http adapter (evnt-service published — SPEC-04 §2, Learning pitfall #1).
    // Pass { adapter: 'mock' } only under explicit dev/test override.
    ...provideEvnt(),
    // HIST defaults to http adapter (hist-service api-contract published — SPEC-04 §2).
    // carry-forward `scaffold:mock-adapter-default` — default is 'http', not 'mock'.
    ...provideHist(),
    // DASH — composition host (BE ADR-001: no dash-service, no HttpClient in libs/dash).
    // Promotes screens/home as /home (default shell landing) and screens/entry as /entry (shell-level).
    // Promoted by /fe-architect-promote neuroassist-niv DASH.
    ...provideDash(),
    // CONV defaults to http adapter (conv-service published — BE M1.5; SPEC-04 §2).
    // carry-forward `scaffold:mock-adapter-default` — default is 'http', not 'mock'.
    // Promoted by /fe-architect-promote neuroassist-niv CONV.
    ...provideConv(),
    // TRN defaults to http adapter (trn-service is specified — api-contract + SPEC-01..11 published).
    // carry-forward `scaffold:mock-adapter-default` — default is 'http', not 'mock'.
    // Both TRN routes run under the caregiver JWT (no patient-session token, ACS INV-3).
    // Promoted by /fe-architect-promote neuroassist-niv TRN.
    ...provideTrn(),
  ],
};
