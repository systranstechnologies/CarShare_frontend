import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { getMessaging, getToken, onMessage, MessagePayload, Messaging, deleteToken } from 'firebase/messaging';
import { firebaseApp } from './firebase.config';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface PushNotificationMessage {
  title: string;
  body: string;
  route?: string;
  icon?: string;
  image?: string;
  tag?: string;
}

export interface UserTokenRegistration {
  userId?: string;
  token: string;
  deviceType?: string;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private messaging: Messaging | null = null;
  private initializationPromise: Promise<{ ok: boolean; message?: string; token?: string }> | null = null;
  private nativePushInitialized = false;
  private nativeListenersInitialized = false;
  private webListenersInitialized = false;
  private nativeInitializationPromise: Promise<{ ok: boolean; message?: string; token?: string }> | null = null;
  private readonly tokenKey = 'fcm_device_token';
  private readonly tokenUserKey = 'fcm_device_token_user';
  public notificationCount$ = new BehaviorSubject<number>(0);
  public foregroundMessage$ = new BehaviorSubject<PushNotificationMessage | null>(null);

  constructor(private http: HttpClient) {
    // Firebase Web Messaging must not be initialized inside the native WebView.
    if (!Capacitor.isNativePlatform()) {
      this.initializeMessaging();
    }
  }

  async initializePushNotifications(): Promise<{ ok: boolean; message?: string; token?: string }> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializePushNotificationsInternal();
    try {
      return await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async initializePushNotificationsInternal(): Promise<{ ok: boolean; message?: string; token?: string }> {
    if (Capacitor.isNativePlatform()) {
      return this.initializeNativePushNotifications();
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return { ok: false, message: 'Push notifications are not supported in this browser.' };
    }

    try {
      await this.registerServiceWorker();
      await this.initializeMessaging();
      const permission = await this.requestPermission();
      if (!permission) {
        return { ok: false, message: 'Notification permission was denied.' };
      }

      const token = await this.generateToken();
      if (!token) {
        return { ok: false, message: 'Push registration is blocked in this browser mode. Please use a normal browser window instead of Incognito/Private mode.' };
      }

      const saved = await this.saveToken(token);
      if (!saved) {
        return { ok: false, message: 'FCM token was generated but could not be saved to the server.', token };
      }
      this.listenForMessages();
      return { ok: true, token };
    } catch (error) {
      console.error('initializePushNotifications failed', error);
      const message = error instanceof Error ? error.message : 'Unknown Firebase initialization error.';
      if (message.toLowerCase().includes('permission denied') || message.toLowerCase().includes('incognito') || message.toLowerCase().includes('private mode')) {
        return { ok: false, message: 'Push notifications are blocked in this browser mode. Please open the app in a normal Chrome window to enable web notifications.' };
      }
      return { ok: false, message };
    }
  }

  private async initializeNativePushNotifications(): Promise<{ ok: boolean; message?: string; token?: string }> {
    if (!(environment as any).nativePushEnabled) {
      return { ok: false, message: 'Native push notifications are not configured for this build.' };
    }

    if (this.nativePushInitialized) {
      return { ok: true };
    }

    if (this.nativeInitializationPromise) {
      return this.nativeInitializationPromise;
    }

    this.nativeInitializationPromise = this.initializeNativePushNotificationsInternal();
    try {
      return await this.nativeInitializationPromise;
    } finally {
      this.nativeInitializationPromise = null;
    }
  }

  private async initializeNativePushNotificationsInternal(): Promise<{ ok: boolean; message?: string; token?: string }> {
    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') {
        return { ok: false, message: 'Notification permission was denied.' };
      }

      await LocalNotifications.requestPermissions();
      await LocalNotifications.createChannel({
        id: 'carshare-default',
        name: 'CarShare247 notifications',
        description: 'Ride and account notifications',
        importance: 5,
        sound: 'default',
        visibility: 1
      });

      await this.registerNativePushListeners();

      const registration = await new Promise<string>(async (resolve, reject) => {
        let registrationListener: { remove: () => Promise<void> } | null = null;
        try {
          registrationListener = await PushNotifications.addListener('registration', token => {
            void registrationListener?.remove();
            resolve(token.value);
          });
          await PushNotifications.addListener('registrationError', error => reject(error));
          await PushNotifications.register();
        } catch (error) {
          reject(error);
        }
      });
      const saved = await this.saveToken(registration, 'android');
      this.nativePushInitialized = true;
      return saved ? { ok: true, token: registration } : { ok: false, message: 'Push token could not be saved.', token: registration };
    } catch (error) {
      console.error('Native push initialization failed', error);
      return { ok: false, message: 'Native push notifications could not be initialized.' };
    }
  }

  private async registerNativePushListeners(): Promise<void> {
    if (this.nativeListenersInitialized) return;
    this.nativeListenersInitialized = true;
    await PushNotifications.addListener('pushNotificationReceived', notification => {
      const message = this.normalizePayload(notification as any);
      this.foregroundMessage$.next(message);
      this.updateNotificationBadge();
      void LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 2147483647,
          title: message.title,
          body: message.body,
          channelId: 'carshare-default',
          extra: { route: message.route || '/' }
        }]
      });
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const route = (action.notification as any)?.data?.route || '/';
      window.dispatchEvent(new CustomEvent('carshare-push-route', { detail: { route } }));
    });
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission', error);
      return false;
    }
  }

  async generateToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        await this.initializeMessaging();
      }
      if (!this.messaging) {
        return null;
      }

      const firebaseVapidKey = (environment as any)?.firebase?.vapidKey || environment.vapidPublic || undefined;
      console.log('FCM token request start. Vapid key configured:', !!firebaseVapidKey, 'permission:', Notification.permission);

      const swUrl = '/firebase-messaging-sw.js';
      const registration = await navigator.serviceWorker.getRegistration(swUrl)
        ?? await navigator.serviceWorker.register(swUrl, { scope: '/' });

      const token = await getToken(this.messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration: registration
      });

      if (!token) {
        console.warn('No FCM registration token available. Check Firebase Web Push certificate / service worker registration.');
        return null;
      }

      console.log('FCM token generated successfully:', token.substring(0, 40) + '...');
      const cached = localStorage.getItem(this.tokenKey);
      const tokenUser = localStorage.getItem(this.tokenUserKey);
      const currentUserId = this.currentUserId();
      if (cached === token && tokenUser === currentUserId) {
        console.log('FCM token already cached locally; skipping duplicate registration flow.');
        return token;
      }
      return token;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('FCM token generation error', error);
      if (message.toLowerCase().includes('permission denied') || message.toLowerCase().includes('incognito') || message.toLowerCase().includes('private mode')) {
        throw new Error('Push notifications are blocked in this browser mode. Please use a normal browser window instead of Incognito/Private mode.');
      }
      return null;
    }
  }

  async saveToken(token: string, deviceType = 'web'): Promise<boolean> {
    const trimmed = token?.trim();
    if (!trimmed) {
      return false;
    }

    const authToken = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) });

    try {
      const payload: UserTokenRegistration = {
        token: trimmed,
        deviceType
      };

      console.log('Sending FCM token to backend. tokenLength=', trimmed.length);
      await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/push/register-token`, payload, { headers }));
      localStorage.setItem(this.tokenKey, trimmed);
      localStorage.setItem(this.tokenUserKey, this.currentUserId());
      console.log('FCM token saved to backend successfully');
      return true;
    } catch (error) {
      console.error('Failed to save FCM token', error);
      return false;
    }
  }

  async refreshWebPushRegistration(): Promise<{ ok: boolean; message?: string }> {
    if (Capacitor.isNativePlatform()) return { ok: false, message: 'Web push is unavailable in the Android app.' };
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, message: 'Web push is not supported by this browser.' };
    }
    if (Notification.permission !== 'granted') {
      return { ok: false, message: 'Browser notification permission is not granted.' };
    }

    try {
      await this.registerServiceWorker();
      await this.initializeMessaging();
      const token = await this.generateToken();
      if (!token || !(await this.saveToken(token, 'web'))) {
        return { ok: false, message: 'Unable to register the browser push token.' };
      }
      this.listenForMessages();
      return { ok: true };
    } catch (error) {
      console.error('Web push registration refresh failed', error);
      return { ok: false, message: 'Unable to register browser push notifications.' };
    }
  }

  async removeToken(): Promise<boolean> {
    const stored = localStorage.getItem(this.tokenKey);
    if (!stored) {
      return true;
    }

    try {
      const authToken = localStorage.getItem('accessToken');
      const headers = new HttpHeaders({ ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) });
      await firstValueFrom(this.http.delete(`${environment.apiBaseUrl}/push/remove-token`, {
        headers,
        params: { token: stored }
      }));

      if (this.messaging) {
        await deleteToken(this.messaging);
      }
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.tokenUserKey);
      return true;
    } catch (error) {
      console.error('Failed to remove FCM token', error);
      return false;
    }
  }

  listenForMessages(): void {
    if (!this.messaging || this.webListenersInitialized) {
      return;
    }
    this.webListenersInitialized = true;

    onMessage(this.messaging, (payload: MessagePayload) => {
      const message = this.normalizePayload(payload);
      this.foregroundMessage$.next(message);
      this.showNotification(message);
      this.updateNotificationBadge();
    });

    navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
      const payload = event.data?.payload || event.data;
      if (!payload || event.data?.type !== 'PUSH_RECEIVED') {
        return;
      }
      const message = this.normalizePayload(payload as any);
      this.foregroundMessage$.next(message);
      this.updateNotificationBadge();
    });
  }

  showNotification(message: PushNotificationMessage): void {
    const title = message.title || 'carShare';
    const body = message.body || 'You have a new notification';

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options: NotificationOptions = {
      body,
      icon: message.icon || '/assets/carShare-logo.png',
      badge: '/assets/carShare-logo.png',
      tag: message.tag || 'carshare-notification',
      data: { url: message.route || '/' }
    };

    try {
      new Notification(title, options);
    } catch (error) {
      console.warn('Browser notification display failed', error);
    }
  }

  async showNativeNotification(message: PushNotificationMessage): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 2147483647,
          title: message.title || 'carShare',
          body: message.body || 'You have a new notification',
          channelId: 'carshare-default',
          smallIcon: 'ic_stat_carshare',
          extra: { route: message.route || '/' }
        }]
      });
    } catch (error) {
      console.warn('Native notification display failed', error);
    }
  }

  async sendNotification(payload: { userId?: string; title: string; body: string; route?: string; imageUrl?: string }): Promise<boolean> {
    const authToken = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) });

    try {
      const currentUser = JSON.parse(localStorage.getItem('demo_current_user') || 'null');
      const body = {
        userId: payload.userId || currentUser?.id,
        title: payload.title,
        body: payload.body,
        route: payload.route || '/',
        imageUrl: payload.imageUrl || ''
      };

      await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/push/send`, body, { headers }));
      return true;
    } catch (error) {
      console.error('Failed to send backend push notification', error);
      return false;
    }
  }

  handleNotificationClick(clickEvent?: any): void {
    const data = clickEvent?.notification?.data || clickEvent?.data || {};
    const route = data.route || '/';
    if (typeof window !== 'undefined') {
      const url = new URL(route, window.location.origin).toString();
      if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
        window.location.href = url;
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private async initializeMessaging(): Promise<void> {
    try {
      if (!firebaseApp) {
        return;
      }
      this.messaging = getMessaging(firebaseApp);
    } catch (error) {
      console.error('Firebase messaging initialization failed', error);
      this.messaging = null;
    }
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const swUrl = '/firebase-messaging-sw.js';
      const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      if (registration) {
        console.log('Firebase messaging service worker registered', registration.scope, swUrl);
      }
    } catch (error) {
      console.warn('Firebase messaging service worker registration failed', error);
    }
  }

  private normalizePayload(payload: any): PushNotificationMessage {
    const data = payload?.data || payload || {};
    const title = data.title || payload?.notification?.title || 'carShare';
    const body = data.body || payload?.notification?.body || 'You have a new notification';
    const route = data.route || payload?.notification?.route || '/';
    return {
      title,
      body,
      route,
      icon: data.icon || '/assets/carShare-logo.png',
      image: data.image || '',
      tag: data.tag || 'carshare-notification'
    };
  }

  private updateNotificationBadge(): void {
    const current = this.notificationCount$.value;
    this.notificationCount$.next(current + 1);
  }

  private currentUserId(): string {
    try {
      return String(JSON.parse(localStorage.getItem('demo_current_user') || '{}')?.id || '');
    } catch {
      return '';
    }
  }
}
