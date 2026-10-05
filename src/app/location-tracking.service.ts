import { Injectable } from '@angular/core';
import { MockDataService } from './mock-data.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private watchId: number | null = null;
  private activeKey = '';
  private latestPosition: GeolocationPosition | null = null;

  constructor(private data: MockDataService, private auth: AuthService) {}

  start(): void {
    const session = this.auth.current;
    const profileId = session?.role === 'owner' ? (session as any).ownerId : session?.id;
    const key = session && profileId ? `${session.role}:${profileId}` : '';
    if (!key) {
      this.stop();
      return;
    }
    if (this.activeKey === key) return;
    this.stop();
    if (!navigator.geolocation) return;

    this.activeKey = key;
    this.watchId = navigator.geolocation.watchPosition(
      position => this.latestPosition = position,
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    this.publish();
    this.timer = setInterval(() => this.publish(), 60000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(this.watchId);
    this.timer = null;
    this.watchId = null;
    this.activeKey = '';
    this.latestPosition = null;
  }

  private publish(): void {
    const session = this.auth.current;
    if (!session || !navigator.geolocation) {
      this.stop();
      return;
    }
    const publishPosition = (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lon } = position.coords;
      if (session.role === 'owner') {
        const ownerId = (session as any).ownerId;
        if (ownerId) this.data.postOwnerLocation(ownerId, lat, lon).subscribe({ error: () => {} });
      } else if (session.role === 'passenger' && session.id) {
        localStorage.setItem('passenger_location', JSON.stringify({ lat, lon, updatedAt: Date.now() }));
        this.data.postPassengerLocation(session.id, lat, lon).subscribe({ error: () => {} });
      }
    };

    if (this.latestPosition) {
      publishPosition(this.latestPosition);
      return;
    }
    navigator.geolocation.getCurrentPosition(publishPosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000
    });
  }
}