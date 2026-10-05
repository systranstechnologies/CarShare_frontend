import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MockDataService } from './mock-data.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-owner-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-shell">
      <div class="payment-hero">
        <span class="payment-kicker">CARSHARE247 OWNER VERIFICATION</span>
        <h1>One small step<br><span>to shared journeys.</span></h1>
        <p>Your monthly owner subscription helps us keep profiles verified and rides trustworthy.</p>
      </div>
      <section class="payment-card">
        <div class="payment-breakdown" *ngIf="grossAmount">
          <div><span>Subscription fee</span><strong>₹{{ grossAmount / 100 | number:'1.0-2' }}</strong></div>
          <div><span>Available coins</span><strong>{{ availableCoins }}</strong></div>
          <div><span>Maximum allowed coin usage</span><strong>{{ maximumAllowedCoins }}</strong></div>
          <div><span>Coins applied</span><strong>-₹{{ coinsApplied }}</strong></div>
          <div class="total"><span>Amount payable online</span><strong>₹{{ amount / 100 | number:'1.0-2' }}</strong></div>
          <p>You can use only up to {{ subscriptionCoinPercentage }}% of the subscription amount through referral coins. Remaining amount must be paid through online payment.</p>
        </div>
        <div class="payment-step"><span>01</span><div><strong>Pay securely by UPI</strong><small>Use any UPI app to send {{ amount / 100 | number:'1.0-2' }} {{ currency }}</small></div></div>
        <div class="upi-box"><span class="muted-small">UPI ID</span><strong>{{ upiId }}</strong><button class="btn btn-secondary btn-sm" (click)="copyUpi()">Copy</button></div>
        <div class="payment-step"><span>02</span><div><strong>Confirm your transfer</strong><small>Enter the UTR shown in your UPI app</small></div></div>
        <div class="field"><label for="utr">UTR / transaction reference</label><input id="utr" [(ngModel)]="utrNumber" placeholder="e.g. 324567890123" [disabled]="submitted" /></div>
        <div class="payment-actions">
          <button *ngIf="!submitted" class="btn btn-primary btn-lg" (click)="submit()">Confirm payment</button>
          <button *ngIf="submitted" class="btn btn-secondary btn-lg" (click)="refreshSubscription()" [disabled]="refreshing">{{ refreshing ? 'Refreshing...' : 'Refresh approval status' }}</button>
          <button class="btn btn-ghost" (click)="router.navigateByUrl('/owner/dashboard')">Return to dashboard</button>
        </div>
        <div *ngIf="submitted" class="verification-note"><strong>Payment details submitted for admin review</strong><span>Payment details submitted, will be reviewed by the admin for approval. Once approved, you can proceed with posting rides and receive bookings.</span></div>
      </section>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .payment-shell { min-height:calc(100vh - 56px); padding:32px 16px 60px; display:grid; grid-template-columns:minmax(0,1fr) minmax(320px,480px); gap:28px; align-items:center; background:radial-gradient(circle at 12% 10%,#dbeafe 0,transparent 32%),linear-gradient(135deg,#f8fafc,#ecfeff); }
    .payment-hero { padding:24px; }
    .payment-kicker { color:#0f766e; font-size:.75rem; font-weight:800; letter-spacing:.14em; }
    .payment-hero h1 { color:#0f172a; font-size:clamp(2.4rem,6vw,5.6rem); line-height:.96; margin:18px 0; letter-spacing:-.03em; }
    .payment-hero h1 span { color:#0f766e; }
    .payment-hero p { max-width:38ch; color:#475569; font-size:1.05rem; line-height:1.6; }
    .payment-card { background:#fff; border:1px solid #dbe4ea; border-radius:18px; padding:28px; box-shadow:0 20px 50px rgba(15,23,42,.1); }
    .payment-breakdown{display:grid;gap:8px;margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid #dbe4ea}.payment-breakdown div{display:flex;justify-content:space-between;gap:12px}.payment-breakdown .total{padding-top:8px;border-top:1px solid #dbe4ea;color:#0f766e}.payment-breakdown p{margin:4px 0 0;color:#64748b;font-size:.8rem;line-height:1.4}
    .payment-step { display:flex; gap:14px; align-items:center; margin-bottom:18px; }
    .payment-step > span { color:#0f766e; font-weight:900; font-size:1.15rem; }
    .payment-step strong,.payment-step small { display:block; }
    .payment-step small { color:#64748b; margin-top:3px; }
    .upi-box { display:flex; align-items:center; gap:12px; padding:16px; margin:0 0 24px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:12px; }
    .upi-box strong { flex:1; color:#115e59; font-size:1.05rem; user-select:all; }
    .verification-note { display:grid; gap:5px; margin-top:16px; padding:14px; border-radius:12px; background:#ecfdf5; border:1px solid #86efac; color:#166534; }
    .verification-note span { font-size:.9rem; color:#3f6212; }
    .payment-actions { display:grid; gap:10px; margin-top:20px; }
    .payment-actions .btn { width:100%; min-height:46px; }
    @media (max-width:760px) { .payment-shell { grid-template-columns:1fr; padding-top:16px; } .payment-hero { padding:8px 4px; } .payment-hero h1 { font-size:3.2rem; } .payment-card { padding:20px; } .upi-box { align-items:flex-start; flex-wrap:wrap; } .upi-box strong { min-width:0; overflow-wrap:anywhere; } }
  `]
})
export class OwnerPaymentComponent {
  readonly upiId = 'akkumaresh@ybl';
  subscriptionId = '';
  utrNumber = '';
  submitted = false;
  refreshing = false;
  amount = 0;
  grossAmount = 0;
  availableCoins = 0;
  maximumAllowedCoins = 0;
  coinsApplied = 0;
  subscriptionCoinPercentage = 50;
  currency = 'INR';

  constructor(private route: ActivatedRoute, private data: MockDataService, private toast: ToastService, public router: Router) {
    this.subscriptionId = this.route.snapshot.queryParamMap.get('subscriptionId') || '';
    this.amount = Number(this.route.snapshot.queryParamMap.get('amount') || 0);
    this.grossAmount = Number(this.route.snapshot.queryParamMap.get('grossAmount') || this.amount);
    this.availableCoins = Number(this.route.snapshot.queryParamMap.get('availableCoins') || 0);
    this.maximumAllowedCoins = Number(this.route.snapshot.queryParamMap.get('maximumAllowedCoins') || 0);
    this.coinsApplied = Number(this.route.snapshot.queryParamMap.get('coinsApplied') || 0);
    this.subscriptionCoinPercentage = Number(this.route.snapshot.queryParamMap.get('subscriptionCoinPercentage') || 50);
    this.currency = this.route.snapshot.queryParamMap.get('currency') || 'INR';
    this.data.getMySubscriptions().subscribe({ next: (subscriptions) => {
      const current = subscriptions[0];
      if (!this.subscriptionId && current) this.subscriptionId = current.id;
      if (current?.status === 'VERIFICATION_IN_PROGRESS') { this.submitted = true; this.utrNumber = current.utrNumber || ''; }
      if (current?.status === 'REJECTED') { this.submitted = false; this.utrNumber = ''; }
    }, error: () => {
      this.submitted = false;
    }});
  }

  copyUpi() {
    navigator.clipboard?.writeText(this.upiId).then(() => this.toast.show('UPI ID copied', 'success'));
  }

  refreshSubscription(): void {
    this.refreshing = true;
    this.data.getMySubscriptions().subscribe({
      next: subscriptions => {
        const current = subscriptions?.find(subscription => subscription.id === this.subscriptionId) || subscriptions?.[0];
        const status = String(current?.status || '').toUpperCase();
        this.refreshing = false;
        if (status === 'PAID') {
          this.toast.show('Subscription approved. You can now post rides and receive bookings.', 'success');
          void this.router.navigateByUrl('/owner/dashboard');
          return;
        }
        if (status === 'REJECTED') {
          this.submitted = false;
          this.utrNumber = '';
          this.toast.show('Payment was rejected. Submit a new UTR for review.', 'warning');
          return;
        }
        this.submitted = status === 'VERIFICATION_IN_PROGRESS';
        this.toast.show('Payment is still waiting for admin approval.', 'info');
      },
      error: () => {
        this.refreshing = false;
        this.toast.show('Unable to refresh approval status.', 'error');
      }
    });
  }

  submit() {
    if (!this.subscriptionId) { this.toast.show('Payment session not found. Start again from owner registration.', 'error'); return; }
    if (!this.utrNumber.trim()) { this.toast.show('Enter the UTR number', 'warning'); return; }
    this.data.submitUtr(this.subscriptionId, this.utrNumber).subscribe({
      next: () => {
        this.submitted = true;
        this.toast.show('Payment submitted for verification', 'success');
        setTimeout(() => this.router.navigateByUrl('/owner/dashboard'), 800);
      },
      error: () => this.toast.show('Unable to submit UTR. Please try again.', 'error')
    });
  }
}
