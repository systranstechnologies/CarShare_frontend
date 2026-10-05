import { Injectable } from '@angular/core';
import { MockDataService } from './mock-data.service';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private subscriptionPromise: Promise<{ ok: boolean; message?: string; subscription?: any }> | null = null;

  constructor(private data: MockDataService, private auth: AuthService) {}

  async requestPermissionAndSubscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { ok: false, message: 'Push not supported' };
    if (this.subscriptionPromise) return this.subscriptionPromise;
    this.subscriptionPromise = this.subscribe();
    try {
      return await this.subscriptionPromise;
    } finally {
      this.subscriptionPromise = null;
    }
  }

  private async subscribe(): Promise<{ ok: boolean; message?: string; subscription?: any }> {
    try {
      let registration: ServiceWorkerRegistration | null = null;
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (perm !== 'granted') {
        return { ok: false, message: 'Permission denied' };
      }
      const existing = await registration.pushManager.getSubscription();
      const sub = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.urlBase64ToUint8Array(environment.vapidPublic || '') });
      try {
        const token = localStorage.getItem('accessToken');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        // The backend upserts by endpoint, so re-save existing subscriptions after login or recovery.
        const resp = await fetch(environment.apiBaseUrl.replace(/\/api\/?$/, '') + '/api/push-subscriptions/push', { method: 'POST', headers, body: JSON.stringify(sub) });
        if (!resp.ok) console.warn('Failed to save subscription to backend, status=', resp.status);
      } catch (e) { console.warn('Failed to save subscription to backend', e); }
      // Return subscription details for debugging UI
      try { return { ok: true, subscription: sub ? JSON.parse(JSON.stringify(sub)) : null }; } catch (e) { return { ok: true, subscription: null }; }
    } catch (e) {
      console.error('subscribe error', e);
      return { ok: false, message: String(e) };
    }
  }

  private urlBase64ToUint8Array(base64String: string) {
    if (!base64String) return new Uint8Array();
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  }
}
