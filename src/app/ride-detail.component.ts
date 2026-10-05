import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MockDataService, Ride, Owner } from './mock-data.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
// Leaflet loaded via CDN in index.html — declare global L for TypeScript
declare const L: any;
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';


interface Booking {
  id: string;
  rideId: string;
  userMobile?: string;
  seats: number;
  status: string;
  needsRating?: boolean;
  rated?: boolean;
  passengerName?: string;
  passengerAge?: number;
  createdAt?: string;
}

@Component({
  selector: 'app-ride-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-shell" *ngIf="ride">
      <button class="btn btn-secondary mb-2" (click)="back()">← Back to results</button>

      <div class="ride-card">
        <div class="ride-header">
          <div class="ride-main">
            <div class="route-info">
              <div class="location from">{{ displayFrom }}</div>
              <div class="arrow">→</div>
              <div class="location to">{{ displayTo }}</div>
            </div>
            <div class="time-info">
              <span class="time">{{ ride.startTime }}</span>
              <span class="duration">{{ ride.date }}</span>
              <span class="time">{{ ride.endTime }}</span>
            </div>
          </div>
          <div class="ride-price"><div class="price-pill">₹{{ displayPrice }}</div></div>
        </div>

        <div class="ride-details">
          <div class="detail-row">
            <div class="detail"><span class="label">Driver</span><span class="value">{{ owner?.name || 'Ride owner' }}</span></div>
            <div class="detail"><span class="label">Vehicle</span><span class="value">{{ ride.carModel || 'Not specified' }}</span></div>
            <div class="detail"><span class="label">Booked seats</span><span class="value">{{ hasBooking?.seats || 0 }}</span></div>
          </div>
          <div class="ride-badges">
            <span class="badge badge-info">📅 {{ ride.date }}</span>
            <span class="badge badge-info">💺 {{ ride.totalSeats || 0 }} total seats</span>
            <span *ngIf="owner?.verified" class="badge badge-verified">✓ Verified Owner</span>
          </div>
        </div>
      </div>

      <div class="card mt-2">
        <button class="btn btn-secondary btn-sm" (click)="togglePassengers()">{{ showPassengers ? 'Hide' : 'View' }} confirmed co-passengers</button>
        <div *ngIf="showPassengers" class="card mt-2" style="background:#f8fafc;">
          <h3 style="margin-top:0;">Confirmed co-passengers</h3>
          <div *ngIf="confirmedPassengers.length === 0" class="muted">No passengers have been confirmed yet.</div>
          <div *ngFor="let passenger of confirmedPassengers" class="row" style="justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:8px 0;">
            <span>{{ passenger.passengerName || 'Passenger' }}<span *ngIf="passenger.passengerAge">, {{ passenger.passengerAge }} years</span></span>
            <span class="muted-small">{{ passenger.seats }} seat{{ passenger.seats === 1 ? '' : 's' }}</span>
          </div>
        </div>
      </div>

      <div *ngIf="owner" class="card owner-card mt-2">
        <div>
          <div *ngIf="owner.profilePhoto; else smallAvatar" class="profile-avatar" style="width:52px;height:52px;border-radius:6px;overflow:hidden;">
            <img [src]="owner.profilePhoto" style="width:52px;height:52px;object-fit:cover;display:block" />
          </div>
          <ng-template #smallAvatar>
            <div class="profile-avatar" style="width:52px;height:52px;font-size:1.2rem;">{{ owner.name.charAt(0) }}</div>
          </ng-template>
        </div>
        <div>
          <div style="font-weight:700;">{{ owner.name }}</div>
          <div *ngIf="owner.age" class="muted-small">{{ owner.age }} years old</div>
          <div class="muted-small">⭐ {{ ownerRating.toFixed(1) }} ({{ owner.ratingsCount || 0 }} ratings)</div>
          <div *ngIf="ownerPreferences.length" class="pref-grid" style="margin-top:6px;">
            <span *ngFor="let p of ownerPreferences" class="pref-chip" style="cursor:default;">{{ p }}</span>
          </div>
          <div style="margin-top:6px;"><a [routerLink]="['/owner', owner.id]" class="btn btn-ghost btn-sm">View owner profile</a></div>
        </div>
      </div>

      <div *ngIf="!hasBooking || hasBooking.status === 'rejected'" class="card booking-card mt-2">
        <h3>📝 Book this ride</h3>
        <div class="booking-grid">
          <div class="field">
            <label>Your mobile</label>
            <input [(ngModel)]="userMobile" placeholder="+91 98xxxxxxxx" />
          </div>
          <div class="field" *ngIf="!seatsFromSearch">
            <label>Seats</label>
            <input type="number" [(ngModel)]="seats" min="1" />
          </div>
          <div class="field" *ngIf="seatsFromSearch">
            <label>Seats</label>
            <div class="muted">{{ seats }} seat{{ seats === 1 ? '' : 's' }} (from your search)</div>
          </div>
          <button class="btn btn-primary booking-action" (click)="book()">🎫 Book Now</button>
        </div>
      </div>

      <div *ngIf="hasBooking" class="card mt-2">
        <h3>Booking status
          <span class="badge"
            [class.badge-warning]="hasBooking.status==='pending'"
            [class.badge-success]="hasBooking.status==='accepted'"
            [class.badge-danger]="hasBooking.status==='rejected'">
            {{ hasBooking.status | titlecase }}
          </span>
        </h3>
        <div *ngIf="hasBooking.status === 'pending'" class="muted">
          Waiting for the owner to accept your booking...
        </div>
          <div *ngIf="hasBooking.status === 'accepted' && ride?.status !== 'cancelled'" class="card" style="background:#d1fae5;border-color:#10b981;">
          <h4 style="color:#065f46;margin:0 0 8px 0;">🎉 Booking Confirmed!</h4>
          <div>Owner: <strong>{{ owner?.name }}</strong></div>
          <div *ngIf="owner?.mobile">Contact: <strong>📱 {{ owner?.mobile }}</strong></div>
          <div class="booking-actions">
            <div class="trip-actions">
              <button *ngIf="ride?.status !== 'completed' && ride?.status !== 'cancelled'" class="btn btn-primary btn-sm" (click)="showShareLocation = !showShareLocation">Share live location</button>
              <button *ngIf="ride?.status !== 'completed' && ride?.status !== 'cancelled'" class="btn btn-secondary btn-sm" (click)="openCancel()">Cancel booking</button>
            </div>
            <section class="safety-actions" aria-label="Safety options">
              <div class="safety-heading">Safety options</div>
              <a class="emergency-action" href="tel:112">Emergency: call 112</a>
              <a class="safety-link" [routerLink]="['/support']" [queryParams]="{ safety: '1', rideId: ride.id, owner: owner?.name }">Report a safety concern</a>
              <button *ngIf="owner && !ownerBlocked" class="safety-link safety-button" (click)="blockOwner()">Block this owner</button>
              <span *ngIf="ownerBlocked" class="blocked-note">Owner blocked. Future bookings between you are unavailable.</span>
            </section>
            <div *ngIf="showShareLocation" class="share-panel">
              <label>WhatsApp number (with country code)</label>
              <div class="share-form">
                <input [(ngModel)]="shareNumber" placeholder="e.g. 918765432100" />
                <button class="btn btn-primary btn-sm" (click)="shareLiveLocation()">Send</button>
                <button class="btn btn-secondary btn-sm" (click)="cancelShare()">Close</button>
              </div>
              <div *ngIf="shareError" class="muted-small share-error">{{ shareError }}</div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="hasBooking?.status === 'accepted' && ride?.status === 'active'" class="mt-3">
        <h3>Live tracking</h3>
        <div class="muted-small">Track owner's location during the ride.</div>
              <div class="tracking-actions" style="margin-top:8px;display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" (click)="startTracking()" [disabled]="tracking || ride.status === 'completed'">Start tracking</button>
          <button class="btn btn-secondary btn-sm" (click)="trackCar()" [disabled]="tracking || ride.status === 'completed'">Track car</button>
          <button class="btn btn-secondary btn-sm" (click)="stopTracking()" [disabled]="!tracking">Stop tracking</button>
          <div *ngIf="lastUpdated" class="muted-small">Last updated: {{ lastUpdated }}</div>
        </div>
        <div *ngIf="trackingError" class="muted-small" style="color:#b91c1c;margin-top:6px">{{ trackingError }}</div>
        <div *ngIf="tracking" style="margin-top:12px">
          <div id="live-map" style="width:100%;height:360px;border:1px solid #e6eef2;border-radius:6px;overflow:hidden"></div>
        </div>
      </div>

      <div *ngIf="canRate" class="mt-3">
        <h3>⭐ Rate the owner</h3>
        <div class="row">
          <select [(ngModel)]="givenRating">
            <option *ngFor="let s of [1,2,3,4,5]" [value]="s">{{ s }} ★</option>
          </select>
          <button class="btn btn-primary" (click)="submitRating()">Submit Rating</button>
        </div>
      </div>

      <div class="modal-backdrop" *ngIf="cancellingBooking">
        <div class="modal-card">
          <h3>Cancel booking</h3>
          <p class="muted-small">Please select a reason for cancellation (required).</p>
          <select [(ngModel)]="cancelReason">
            <option value="">-- select reason --</option>
            <option *ngFor="let reason of cancelReasons" [value]="reason">{{ reason }}</option>
          </select>
          <div class="row mt-3">
            <button class="btn btn-secondary" (click)="closeCancel()">Close</button>
            <button class="btn btn-danger" [disabled]="!cancelReason" (click)="cancelBooking()">Confirm Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-shell {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }

    .ride-card,
    .booking-card,
    .owner-card {
      display: block;
      width: 100%;
      overflow: hidden;
    }

    .ride-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .ride-main { min-width: 0; flex: 1; }
    .route-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .location { font-size: 18px; font-weight: 700; }
    .location.from { color: #16a34a; }
    .location.to { color: #ef4444; }
    .arrow { color: #4f46e5; font-size: 20px; }
    .time-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: #64748b; }
    .time { color: #1f2937; font-weight: 700; }
    .duration { padding: 3px 8px; border-radius: 4px; background: #f1f5f9; font-size: 12px; }
    .ride-price { flex: 0 0 auto; }
    .price-pill { white-space: nowrap; }

    .ride-details { padding: 20px; }
    .detail-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .detail { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .detail .label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .detail .value { color: #1f2937; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
    .ride-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .booking-card { padding: 20px; }
    .booking-card h3 { margin-top: 0; }
    .booking-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 16px; align-items: end; }
    .booking-grid .field { min-width: 0; }
    .booking-action { min-height: 44px; white-space: nowrap; }

    @media (max-width: 700px) {
      .page-shell { padding: 10px; }
      .ride-header { flex-direction: column; padding: 16px; }
      .ride-price { width: 100%; }
      .detail-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .booking-grid { grid-template-columns: 1fr; gap: 12px; }
      .booking-action { width: 100%; }
    }

    @media (max-width: 420px) {
      .ride-header, .ride-details, .booking-card { padding: 14px; }
      .detail-row { grid-template-columns: 1fr; gap: 12px; }
      .location { font-size: 16px; }
      .ride-price, .ride-price .price-pill { width:100%; }
      .ride-price .price-pill { display:block; padding:10px 14px; text-align:center; }
      .owner-card { display:grid; grid-template-columns:52px minmax(0, 1fr); gap:12px; align-items:start; }
    }

    .tracking-actions { flex-wrap: wrap; align-items: center; }
    .tracking-actions .muted-small { flex: 1 1 100%; }
    .booking-actions { display:grid; gap:12px; margin-top:12px; }
    .trip-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .trip-actions .btn { width:100%; }
    .safety-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:12px; border:1px solid #fecaca; border-radius:8px; background:#fff7f7; }
    .safety-heading { grid-column:1 / -1; color:#991b1b; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
    .emergency-action, .safety-link { display:flex; align-items:center; justify-content:center; min-height:40px; padding:8px 10px; border-radius:6px; font-size:13px; font-weight:700; text-align:center; text-decoration:none; }
    .emergency-action { background:#b91c1c; color:#fff; }
    .safety-link { border:1px solid #fca5a5; background:#fff; color:#991b1b; }
    .safety-button { font-family:inherit; cursor:pointer; }
    .blocked-note { grid-column:1 / -1; color:#991b1b; font-size:12px; }
    .share-panel { display:grid; gap:6px; padding:12px; border:1px solid #dbe2ea; border-radius:8px; background:#f8fafc; }
    .share-form { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:8px; }
    .share-form .btn { width:auto; min-height:42px; padding:8px 12px; }
    .share-error { color:#b91c1c; }
    @media (max-width:420px) { .trip-actions, .safety-actions, .share-form { grid-template-columns:1fr; } .safety-heading, .blocked-note { grid-column:auto; } .share-form .btn { width:100%; } }
  `]
})
export class RideDetailComponent implements OnDestroy {
  ride: Ride | undefined;
  owner: Owner | undefined;
  userMobile = '';
  seats = 1;
  seatsFromSearch = false;
  displayFrom = '';
  displayTo = '';
  displayPrice = 0;
  hasBooking: Booking | null = null;
  givenRating = 5;
  canRate = false;
  ownerPreferences: string[] = [];
  confirmedPassengers: Booking[] = [];
  showPassengers = false;
  cancellingBooking = false;
  cancelReason = '';
  cancelReasons = [
    'Change of plans',
    'Found alternate transport',
    'Emergency',
    'Driver canceled earlier',
    'Other'
  ];
  showShareLocation = false;
  shareNumber = '';
  shareError = '';
  sharing = false;
  ownerBlocked = false;
  // tracking state
  tracking = false;
  trackLat: number | null = null;
  trackLon: number | null = null;
  trackTimer: any = null;
  lastUpdated: string | null = null;
  trackingError: string | null = null;
  trackingCar = false;
  map: any = null;
  marker: any = null;
  passengerMarker: any = null;
  routeLine: any = null;

  get ownerRating(): number {
    return Number(this.owner?.averageRating ?? this.owner?.rating ?? 0);
  }

  constructor(private route: ActivatedRoute, private data: MockDataService, private toast: ToastService, private auth: AuthService, private sanitizer: DomSanitizer, private http: HttpClient) {
    const id = this.route.snapshot.paramMap.get('id') || '';
    const params = this.route.snapshot.queryParamMap;
    const bookingId = params.get('bookingId') || '';
    this.displayFrom = params.get('fromLocation') || '';
    this.displayTo = params.get('toLocation') || '';
    const bookingTotal = Number(params.get('bookingTotal'));
    this.displayPrice = Number.isFinite(bookingTotal) && bookingTotal > 0 ? bookingTotal : 0;
    const querySeats = Number(params.get('seats'));
    if (querySeats > 0) { this.seats = querySeats; this.seatsFromSearch = true; }
    this.data.getRideById(id).subscribe((r) => {
      this.ride = r;
      this.displayFrom = this.displayFrom || r?.from || '';
      this.displayTo = this.displayTo || r?.to || '';
      this.displayPrice = this.displayPrice || Number(r?.price || 0);
      this.updateRatingAvailability();
      if (r) {
        this.data.getOwnerById(r.ownerId).subscribe((o) => {
          this.owner = o;
          this.computePreferences();
          if (o) this.data.getOwnerBlockStatus(o.id).subscribe({ next: status => this.ownerBlocked = status.blocked, error: () => {} });
        });
      }
    });
    this.loadBooking(id, bookingId);
    // reuse passenger count from last search if available
    const sp = localStorage.getItem('search_passengers');
    if (!this.seatsFromSearch && sp) {
      const n = Number(sp);
      if (!isNaN(n) && n > 0) { this.seats = n; this.seatsFromSearch = true; }
    }
  }

  private computePreferences() {
    if (!this.owner) { this.ownerPreferences = []; return; }
    if (Array.isArray(this.owner.preferences) && this.owner.preferences.length) {
      this.ownerPreferences = [...this.owner.preferences];
      return;
    }
    const legacy: string[] = [];
    if (this.owner.allowPets) legacy.push('Pets allowed');
    if (this.owner.stopsForBreak) legacy.push('Stops for breaks');
    if (this.owner.jovial) legacy.push('Friendly / Jovial');
    this.ownerPreferences = legacy;
  }

  back() { history.back(); }

  blockOwner() {
    if (!this.owner || this.ownerBlocked) return;
    this.data.blockOwner(this.owner.id).subscribe({
      next: () => {
        this.ownerBlocked = true;
        this.toast.show('Owner blocked. Future bookings between you are unavailable.', 'success');
      },
      error: () => this.toast.show('Unable to block this owner. Please try again.', 'error')
    });
  }

  loadBooking(rideId: string, bookingId = '') {
    this.data.getMyBookings().subscribe((bookings) => {
      if (bookingId) {
        this.hasBooking = (bookings.find((booking) => booking.id === bookingId) as Booking) || null;
        this.updateRatingAvailability();
        return;
      }
      const rideBookings = bookings
        .filter((booking) => booking.rideId === rideId)
        .sort((left, right) => {
          const statusRank = (status: string) => status === 'accepted' ? 2 : status === 'pending' ? 1 : 0;
          const rankDifference = statusRank(right.status) - statusRank(left.status);
          if (rankDifference !== 0) return rankDifference;
          return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
        });
      this.hasBooking = (rideBookings[0] as Booking) || null;
      this.updateRatingAvailability();
    });
  }

  private updateRatingAvailability() {
    this.canRate = !!this.hasBooking &&
      this.hasBooking.status === 'accepted' &&
      !this.hasBooking.rated &&
      (!!this.hasBooking.needsRating || this.ride?.status === 'completed');
  }

  togglePassengers() {
    this.showPassengers = !this.showPassengers;
    if (this.showPassengers && this.ride) {
      this.data.getConfirmedPassengers(this.ride.id).subscribe({ next: (passengers) => this.confirmedPassengers = passengers, error: () => this.toast.show('Unable to load confirmed passengers', 'error') });
    }
  }

  book() {
    if (!this.ride) return;
    const mobile = this.auth.current?.mobile || this.userMobile;
    if (!mobile) { this.toast.show('Enter your mobile', 'warning'); return; }
    this.data.createBooking(this.ride.id, this.seats).subscribe({
      next: (booking) => { this.hasBooking = booking as Booking; this.toast.show('Booking requested. Owner will accept to confirm.', 'success'); },
      error: (err) => this.toast.show(err.error?.message || 'Unable to create booking. Complete any required rating before booking another ride.', 'error')
    });
  }

  openCancel() {
    this.cancelReason = '';
    this.cancellingBooking = true;
  }

  closeCancel() {
    this.cancellingBooking = false;
    this.cancelReason = '';
  }

  cancelBooking() {
    if (!this.hasBooking || !this.cancelReason) return;
    this.data.cancelBooking(this.hasBooking.id, this.cancelReason, '').subscribe({
      next: () => { this.closeCancel(); this.hasBooking = null; this.canRate = false; this.toast.show('Booking cancelled', 'success'); },
      error: () => this.toast.show('Unable to cancel booking', 'error')
    });
  }

  cancelShare() {
    this.showShareLocation = false;
    this.shareNumber = '';
    this.shareError = '';
  }

  shareLiveLocation() {
    this.shareError = '';
    if (!this.shareNumber || !/^[0-9]{8,15}$/.test(this.shareNumber)) { this.shareError = 'Enter a valid phone number with country code'; return; }
    if (!navigator.geolocation) { this.shareError = 'Geolocation not supported in this browser'; return; }
    this.sharing = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      const text = encodeURIComponent(`I'm sharing my live location: ${mapUrl}`);
      const phone = this.shareNumber.replace(/^\+/, '');
      const waUrl = `https://wa.me/${phone}?text=${text}`;
      window.open(waUrl, '_blank');
      this.sharing = false;
      this.showShareLocation = false;
      this.shareNumber = '';
    }, (err) => {
      this.sharing = false;
      this.shareError = 'Unable to get location: ' + (err?.message || 'permission denied');
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  startTracking() {
    if (!this.ride) return;
    if (this.ride.status === 'completed' || this.ride.status === 'cancelled') return;
    if (this.tracking) return;
    this.trackingError = null;
    this.tracking = true;
    requestAnimationFrame(() => this.pollLocation());
    this.trackTimer = setInterval(() => this.pollLocation(), 60000);
  }

  trackCar() {
    if (!this.ride || this.ride.status === 'completed' || this.ride.status === 'cancelled') return;
    this.trackingCar = true;
    const passengerId = this.auth.current?.id;
    if (navigator.geolocation && passengerId) {
      navigator.geolocation.getCurrentPosition(pos => {
        this.data.postPassengerLocation(passengerId, pos.coords.latitude, pos.coords.longitude).subscribe({
          next: () => this.startTracking(),
          error: () => this.startTracking()
        });
      }, () => this.startTracking(), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    } else {
      this.startTracking();
    }
  }

  stopTracking() {
    this.tracking = false;
    this.trackingError = null;
    if (this.trackTimer) { clearInterval(this.trackTimer); this.trackTimer = null; }
    if (this.map) { this.map.remove(); this.map = null; }
    this.marker = null;
    this.passengerMarker = null;
    this.routeLine = null;
    this.trackLat = null;
    this.trackLon = null;
    this.lastUpdated = null;
    this.trackingCar = false;
  }

  private pollLocation() {
    if (!this.ride) return;
    if (this.ride.status === 'completed' || this.ride.status === 'cancelled') {
      this.stopTracking();
      return;
    }
    this.data.getRideLocation(this.ride.id).subscribe({ next: (loc) => {
        if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
          this.trackLat = loc.lat; this.trackLon = loc.lon; this.lastUpdated = new Date().toLocaleTimeString(); this.trackingError = null;
          setTimeout(() => this.updateMap(), 0);
        } else {
          this.trackingError = 'No location available';
        }
      }, error: (e) => { this.trackingError = 'Unable to fetch location'; }
    });
  }

  private updateMap() {
    if (this.trackLat === null || this.trackLon === null) return;
    try {
      if (typeof L === 'undefined') {
        this.trackingError = 'Map library is still loading. Please try again.';
        return;
      }
      if (!this.map) {
        const el = document.getElementById('live-map');
        if (!el) {
          requestAnimationFrame(() => this.updateMap());
          return;
        }
        delete (el as any)._leaflet_id;
        this.map = L.map(el).setView([this.trackLat, this.trackLon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);
        this.marker = L.marker([this.trackLat, this.trackLon], { icon: this.trackingMarkerIcon('CAR', '#2563eb') })
          .addTo(this.map)
          .bindTooltip('Owner car', { permanent: true, direction: 'top', offset: [0, -22] });
        requestAnimationFrame(() => this.map?.invalidateSize());
        // if passenger location exists in localStorage, draw it
        this.loadPassengerLocation();
        if (this.passengerMarker) this.passengerMarker.addTo(this.map);
        this.updateRouteLine();
      } else {
        this.marker.setLatLng([this.trackLat, this.trackLon]);
        this.map.setView([this.trackLat, this.trackLon]);
        this.loadPassengerLocation();
        if (this.passengerMarker) this.passengerMarker.addTo(this.map);
        this.updateRouteLine();
      }
    } catch (error) {
      this.map = null;
      this.marker = null;
      this.trackingError = 'Unable to initialize the map. Please try again.';
    }
  }

  private loadPassengerLocation() {
    try {
      const raw = localStorage.getItem('passenger_location');
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.lat !== 'number' || typeof obj.lon !== 'number') return;
      if (!this.passengerMarker) {
        this.passengerMarker = L.marker([obj.lat, obj.lon], { icon: this.trackingMarkerIcon('YOU', '#16a34a') })
          .bindTooltip('Your location', { permanent: true, direction: 'top', offset: [0, -22] });
      } else {
        this.passengerMarker.setLatLng([obj.lat, obj.lon]);
      }
    } catch {
      // ignore
    }
  }

  private trackingMarkerIcon(label: string, color: string) {
    return L.divIcon({
      className: 'tracking-marker',
      html: `<span style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:3px solid #fff;border-radius:50%;background:${color};color:#fff;font:700 10px Arial,sans-serif;box-shadow:0 2px 7px rgba(15,23,42,.35)">${label}</span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  private updateRouteLine() {
    if (!this.passengerMarker || this.trackLat === null || this.trackLon === null) return;
    const pLatLng = this.passengerMarker.getLatLng();
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${pLatLng.lng},${pLatLng.lat};${this.trackLon},${this.trackLat}?overview=full&geometries=geojson`;
    this.http.get<any>(routeUrl).subscribe({
      next: (response) => {
        const geometry = response?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(geometry) || !geometry.length || !this.map) return;
        const coords = geometry.map(([lon, lat]: [number, number]) => [lat, lon]);
        if (!this.routeLine) {
          this.routeLine = L.polyline(coords, { color: '#2563eb', weight: 4, opacity: 0.78 }).addTo(this.map);
        } else {
          this.routeLine.setLatLngs(coords);
        }
      },
      error: () => { this.trackingError = 'Unable to load road route'; }
    });
  }

  get mapEmbedUrl(): SafeResourceUrl {
    const lat = this.trackLat as number;
    const lon = this.trackLon as number;
    const url = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  submitRating() {
    if (!this.owner) return;
    if (!this.hasBooking) return;
    this.data.rateBooking(this.hasBooking.id, Number(this.givenRating), '').subscribe({
      next: () => { this.toast.show('Rating submitted', 'success'); this.canRate = false; },
      error: () => this.toast.show('Unable to submit rating', 'error')
    });
  }

  ngOnDestroy(): void {
    if (this.trackTimer) { clearInterval(this.trackTimer); this.trackTimer = null; }
    try { if (this.map) { this.map.remove(); this.map = null; } } catch {}
  }
}
