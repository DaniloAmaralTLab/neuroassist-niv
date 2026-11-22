import {
  Injectable,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PUSH_SUBSCRIPTION_PORT } from './api/push-subscription.port';

// ── View-model types (SPEC-03 §4a) ────────────────────────────────────────────

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';
export type PhoneChannelState = 'available' | 'contact-missing';

export interface PushChannelVM {
  permission: PushPermission;
  pushEnrolled: boolean;      // true only after a successful POST /evnt/push-subscriptions
  subscriptionId: string | null;
  sms: PhoneChannelState;     // 'contact-missing' WHILE INT-EVNT-ACS-001 is OPEN
  voice: PhoneChannelState;   // 'contact-missing' WHILE INT-EVNT-ACS-001 is OPEN
  canManage: boolean;         // AccessDecisionService.can('evnt.subscription.create')
  message: string;
}

function channelMessage(vm: Omit<PushChannelVM, 'message'>): string {
  if (vm.permission === 'unsupported') {
    return 'Push notifications not supported in this browser. SMS and voice cover the gap once a phone is added.';
  }
  if (vm.permission === 'denied') {
    return 'Push blocked — go to Site Settings to re-enable. SMS and voice still reach you once a phone is added.';
  }
  if (vm.pushEnrolled) {
    return 'Push enrolled (Tier 0). Add a phone number in ACS to arm SMS and voice (Tiers 1–2).';
  }
  return 'Push off — enable to get alarms even when this window is in the background.';
}

// ── Facade ────────────────────────────────────────────────────────────────────

/**
 * PushChannelFacade — Tier-0 Web Push enrollment and honest channel-status surface.
 *
 * SAFETY invariant (SPEC-04 §5.6/§5.7):
 *  - pushEnrolled=true ONLY after a successful POST /evnt/push-subscriptions.
 *  - sms/voice always 'contact-missing' WHILE INT-EVNT-ACS-001 is OPEN.
 *  - permission requested ONLY on an explicit caregiver gesture (never on first paint, never in a loop).
 *  - On denied: degrade visibly, explain SMS/voice still cover, do NOT retry.
 *
 * The Shell owns the SW registration and notificationclick handler (SPEC-06 §5).
 * This facade owns the subscription LOGIC and UI via PUSH_SUBSCRIPTION_PORT.
 */
@Injectable({ providedIn: 'root' })
export class PushChannelFacade {
  private readonly port = inject(PUSH_SUBSCRIPTION_PORT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _permission = signal<PushPermission>(this.detectInitialPermission());
  private readonly _pushEnrolled = signal(false);
  private readonly _subscriptionId = signal<string | null>(null);
  private readonly _canManage = signal(false);
  private readonly _enrolling = signal(false);

  // sms/voice are contact-missing until INT-EVNT-ACS-001 (ACS exposes caregiver phone)
  private readonly _sms = signal<PhoneChannelState>('contact-missing');
  private readonly _voice = signal<PhoneChannelState>('contact-missing');

  readonly pushChannelVm = computed<PushChannelVM>(() => {
    const partial = {
      permission: this._permission(),
      pushEnrolled: this._pushEnrolled(),
      subscriptionId: this._subscriptionId(),
      sms: this._sms(),
      voice: this._voice(),
      canManage: this._canManage(),
    };
    return { ...partial, message: channelMessage(partial) };
  });

  readonly enrolling = this._enrolling.asReadonly();

  // ── Shell-integration methods ──────────────────────────────────────────────

  /** Update canManage from the shell guard (evnt.subscription.create). */
  setCanManage(value: boolean): void {
    this._canManage.set(value);
  }

  /**
   * Re-register the existing push subscription on shell start.
   * Called by EvntShellIntegrationService when permission is already 'granted' (SPEC-04 §5.6).
   * This is idempotent on the BE side (201 new / 200 re-register).
   */
  refreshSubscription(): void {
    if (this._permission() !== 'granted') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (!sub) {
          // Subscription was lost — resubscribe (SPEC-04 §5.6 "pushsubscriptionchange / 410 Gone")
          // TODO[INT-FE-EVNT-002]: fetch VAPID key from APP_CONFIG and call subscribe()
          return;
        }
        this.registerWithBackend(sub);
      }).catch(() => { /* best-effort */ });
    }).catch(() => { /* SW not ready — dev environment without HTTPS */ });
  }

  /**
   * Request notification permission and subscribe (explicit caregiver gesture ONLY).
   * NEVER called on first paint or in a loop (carry-forward `fe-push:no-permission-prompt-on-first-paint`).
   */
  requestAndSubscribe(): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this._permission.set('unsupported');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      this._permission.set('unsupported');
      return;
    }

    this._enrolling.set(true);

    Notification.requestPermission().then(result => {
      this._permission.set(result as PushPermission);

      if (result !== 'granted') {
        // Denied or dismissed — degrade VISIBLY, do NOT retry (SPEC-04 §5.7)
        this._enrolling.set(false);
        return;
      }

      navigator.serviceWorker.ready.then(reg => {
        // TODO[INT-FE-EVNT-002]: fetch VAPID public key from APP_CONFIG.vapidPublicKey
        const vapidKey = ''; // placeholder — wired in INT-FE-EVNT-002
        if (!vapidKey) {
          // DIFERIDO: VAPID key not yet configured; push enrollment cannot complete
          this._enrolling.set(false);
          return;
        }

        const keyArray = this.urlBase64ToUint8Array(vapidKey);
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyArray })
          .then(sub => { this.registerWithBackend(sub); this._enrolling.set(false); })
          .catch(() => { this._enrolling.set(false); });
      }).catch(() => { this._enrolling.set(false); });
    });
  }

  /** Unsubscribe locally and delete the BE subscription row (SPEC-04 §5.6). */
  unsubscribe(): void {
    const id = this._subscriptionId();
    if (!id) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => sub?.unsubscribe());
      }).catch(() => { /* best-effort */ });
    }

    this.port.deleteSubscription(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this._pushEnrolled.set(false);
          this._subscriptionId.set(null);
        },
        error: () => {
          // Idempotent BE-side — still mark unenrolled locally
          this._pushEnrolled.set(false);
          this._subscriptionId.set(null);
        },
      });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private registerWithBackend(sub: PushSubscription): void {
    const p256dh = this.keyToBase64(sub, 'p256dh');
    const auth   = this.keyToBase64(sub, 'auth');
    if (!p256dh || !auth) return;

    this.port.createSubscription({
      endpoint: sub.endpoint,
      keys: { p256dh, auth },
      userAgent: navigator.userAgent.slice(0, 128), // optional diagnostics only
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this._pushEnrolled.set(true);
          this._subscriptionId.set(result.id);
        },
        error: () => { /* best-effort; push channel degrades visibly via VM */ },
      });
  }

  private detectInitialPermission(): PushPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as PushPermission;
  }

  private keyToBase64(sub: PushSubscription, key: 'p256dh' | 'auth'): string | null {
    try {
      const raw = sub.getKey(key);
      if (!raw) return null;
      return btoa(String.fromCharCode(...new Uint8Array(raw)));
    } catch { return null; }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }
}
