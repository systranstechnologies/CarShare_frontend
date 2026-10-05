import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MockDataService, Owner, Ride, Booking } from './mock-data.service';
import { AuthService } from './auth.service';
import { MobileVerificationService } from './services/mobile-verification.service';
import { DiditVerificationService, VerificationStatus } from './services/didit-verification.service';

@Component({
  selector: 'app-owner-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Profile</h1>
        <p class="page-sub">Manage your owner profile and see recent activity.</p>
      </div>
    </div>

    <section class="card profile-card">
      <div class="profile-top">
        <div *ngIf="displayPhoto; else ownerInitials" class="profile-avatar large" style="overflow:hidden;padding:0">
          <img [src]="displayPhoto" (error)="displayPhoto = null" alt="Owner profile" style="width:88px;height:88px;object-fit:cover;border-radius:12px;display:block" />
        </div>
        <ng-template #ownerInitials><div class="profile-avatar large">{{ displayInitial }}</div></ng-template>
        <div class="profile-main">
          <h2>{{ displayName }}</h2>
          <div class="muted-small">📱 {{ displayMobile }}</div>
          <div class="muted-small" *ngIf="age">🎂 {{ age }} years</div>
          <div class="muted-small">⭐ {{ displayRating.toFixed(1) }} ({{ displayCount }} ratings)</div>
        </div>
      </div>

      <div class="profile-stats">
        <div class="stat">
          <div class="stat-value">{{ totalRides }}</div>
          <div class="stat-label">Total rides</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ completedRides }}</div>
          <div class="stat-label">Completed rides</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ cancelledRides }}</div>
          <div class="stat-label">Cancelled rides</div>
        </div>
      </div>

      <div *ngIf="latestSubscription" class="subscription-summary">
        <strong>Subscription: {{ latestSubscription.planName || 'Subscription' }}</strong>
        <span *ngIf="latestSubscription.startsAt">{{ latestSubscription.startsAt | date:'mediumDate' }} - {{ latestSubscription.expiresAt | date:'mediumDate' }}</span>
        <span *ngIf="subscriptionDaysLeft !== null" [class.expired]="subscriptionDaysLeft <= 0">
          {{ subscriptionDaysLeft > 0 ? subscriptionDaysLeft + ' days left' : 'Expired' }}
        </span>
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
        <span *ngIf="mobileVerified" class="badge badge-success">✅ Mobile Verified</span>
        <span *ngIf="!mobileVerified && mobileVerificationStatus !== null" class="badge badge-error">❌ Mobile Not Verified</span>
        <span *ngIf="mobileVerificationStatus?.verifiedDate" class="muted-small">since {{ mobileVerificationStatus.verifiedDate | date:'mediumDate' }}</span>
        <span *ngIf="diditStatus === 'APPROVED'" class="badge badge-success">✅ Documents Verified</span>
        <!--<span *ngIf="!mobileVerified" class="muted-small badge badge-warning">⚠️ Please verify mobile to enable payments</span>-->
      </div>

      <div class="rewards-link"><div><strong>Referral & Rewards</strong><span>Use coins for subscriptions or redeem them to your bank.</span></div><a routerLink="/referrals" class="btn btn-primary">Open rewards</a></div>

      <hr />

      <h3>Recent rides</h3>
      <div *ngIf="recentRides.length === 0" class="muted">No recent rides</div>
      <div *ngFor="let ride of recentRides" class="booking-row">
        <div>
          <div style="font-weight:700">{{ ride.from }} → {{ ride.to }}</div>
          <div class="muted-small">📅 {{ ride.date }} • 🕐 {{ ride.startTime }}</div>
          <div class="muted-small">{{ ride.seatsAvailable }} seats • {{ ride.price | currency:'INR':'symbol':'1.0-0' }}</div>
        </div>
        <div style="text-align:right">
          <div class="muted-small">Status: <strong>{{ ride.status }}</strong></div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
    .profile-card { padding:20px; border-radius:12px; background:#fff; box-shadow: 0 6px 20px rgba(15,23,42,0.06); }
    .profile-top { display:flex; align-items:center; gap:20px; }
    .profile-avatar.large { width:88px; height:88px; border-radius:12px; font-size:28px; display:flex; align-items:center; justify-content:center; background:#f3f4ff; }
    .profile-main h2 { margin:0; font-size:1.2rem; }
    .profile-main .muted-small { margin-top:6px }
    .profile-actions button { background: linear-gradient(90deg,#7c3aed,#c084fc); border:none; color:#fff; padding:10px 18px; border-radius:12px; }
    .profile-stats { display:flex; gap:14px; margin-top:18px; flex-wrap:wrap; }
    .stat { background:#fff; padding:18px; border-radius:12px; flex:1 1 160px; text-align:center; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
    .stat-value { font-weight:700; font-size:1.4rem }
    .stat-label { margin-top:8px; color:#6b7280 }
    .booking-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eef2ff }
    .subscription-summary { display:flex; flex-wrap:wrap; gap:8px 18px; margin-top:16px; padding:12px 14px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; }
    .subscription-summary span { color:#475569; }
    .subscription-summary .expired { color:#b91c1c; font-weight:700; }
    .rewards-link { display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:16px;padding:14px;border:1px solid #b9e2d8;background:#f0fbf8;border-radius:8px }.rewards-link div{display:grid;gap:3px}.rewards-link span{color:#526577;font-size:.85rem}
    @media (max-width:600px) {
      .profile-top { flex-direction:column; align-items:flex-start }
      .profile-actions { width:100% }
      .profile-stats { gap:8px }
    }
    `
  ]
})
export class OwnerProfileComponent {
  displayName = 'Owner';
  displayMobile = '';
  displayInitial = 'O';
  age: number | null = null;
  displayPhoto: string | null = null;

  totalRides = 0;
  totalBookings = 0;
  completedRides = 0;
  cancelledRides = 0;
  confirmedBookings = 0;
  cancelledBookings = 0;

  recentRides: Ride[] = [];
  latestSubscription: any = null;
  subscriptionDaysLeft: number | null = null;

  displayRating = 0;
  displayCount = 0;
  
  // Mobile Verification Status
  mobileVerificationStatus: any = null;
  mobileVerified = false;
  diditStatus: VerificationStatus | null = null;

  constructor(
    private auth: AuthService,
    private data: MockDataService,
    private router: Router,
    private mobileVerificationService: MobileVerificationService,
    private diditVerificationService: DiditVerificationService
  ) {
    const s = this.auth.current as any;
    if (!s || s.role !== 'owner' || !s.ownerId) { this.router.navigateByUrl('/'); return; }
    this.mobileVerified = s.mobileVerified === true;
    this.loadOwner(s.ownerId);
    this.data.getMySubscriptions().subscribe({
      next: subscriptions => {
        this.latestSubscription = subscriptions?.[0] || null;
        this.subscriptionDaysLeft = this.getDaysLeft(this.latestSubscription?.expiresAt);
      }
    });
    
    // Load mobile verification status
    const userId = s?.id;
    if (userId) {
      this.mobileVerificationService.getVerificationStatus(userId).subscribe({
        next: (status) => {
          this.mobileVerificationStatus = status;
          this.mobileVerified = status?.verified || s.mobileVerified === true;
          if (this.mobileVerified) this.auth.save({ ...(this.auth.current || s), mobileVerified: true });
        },
        error: (error) => {
          console.error('Failed to load mobile verification status:', error);
          this.mobileVerified = s.mobileVerified === true;
        }
      });
      this.diditVerificationService.getStatus().subscribe({
        next: (status) => this.diditStatus = status?.status || null,
        error: (error) => console.error('Failed to load Didit verification status:', error)
      });
    }
  }

  async loadOwner(ownerId: string) {
    this.data.getOwnerById(ownerId).subscribe((o) => {
      if (!o) return;
      this.displayName = o.name || 'Owner';
      this.displayMobile = o.mobile || '';
      this.displayInitial = (this.displayName || 'O').charAt(0).toUpperCase();
      this.displayPhoto = o.profilePhoto || (this.auth.current as any)?.profilePhoto || null;
      this.age = o.age ?? null;
      this.displayRating = o.averageRating ?? o.rating ?? 0;
      this.displayCount = o.ratingsCount || 0;
    });

    this.data.getOwnerRides(ownerId).subscribe(async (rides) => {
      this.recentRides = rides.slice().sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`)).slice(0, 10);
      this.totalRides = rides.length;
      this.completedRides = rides.filter(r => String(r.status).toLowerCase() === 'completed').length;
      this.cancelledRides = rides.filter(r => String(r.status).toLowerCase() === 'cancelled').length;
    });
  }

  private getDaysLeft(expiresAt: string | undefined): number | null {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  }

  edit() { this.router.navigateByUrl('/owner/dashboard'); }
}
