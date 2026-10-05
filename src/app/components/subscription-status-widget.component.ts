import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-subscription-status-widget',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="subscription-widget" [ngClass]="statusClass">
      <div class="top-row">
        <span class="pill">{{ title }}</span>
        <span class="badge">{{ statusText }}</span>
      </div>
      <div class="body">
        <strong>{{ subscription?.planName || 'Subscription' }}</strong>
        <p *ngIf="subscription?.status === 'VERIFICATION_IN_PROGRESS'">Your payment is under review and will be approved by the admin team.</p>
        <p *ngIf="subscription?.status === 'PAID'">Active through {{ subscription?.expiresAt | date:'mediumDate' }}.</p>
        <p *ngIf="subscription?.status === 'REJECTED'">Admin note: {{ subscription?.rejectionComment || 'Payment was rejected.' }}</p>
        <p *ngIf="!subscription">No active subscription found yet.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .subscription-widget { border: 1px solid #dbe4ea; border-radius: 14px; background: #fff; padding: 14px 16px; }
      .subscription-widget.pending { background: #fffaf0; border-color: #f3d58a; }
      .subscription-widget.success { background: #f0fdf4; border-color: #86efac; }
      .subscription-widget.error { background: #fef2f2; border-color: #fca5a5; }
      .subscription-widget.info { background: #eff6ff; border-color: #bfdbfe; }
      .top-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
      .pill { font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; font-weight: 700; }
      .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; font-size: 0.72rem; font-weight: 800; }
      .subscription-widget.pending .badge { background: #fef3c7; color: #92400e; }
      .subscription-widget.success .badge { background: #dcfce7; color: #166534; }
      .subscription-widget.error .badge { background: #fee2e2; color: #991b1b; }
      .subscription-widget.info .badge { background: #dbeafe; color: #1d4ed8; }
      .body { margin-top: 10px; }
      .body strong { display: block; font-size: 1.02rem; margin-bottom: 4px; }
      .body p { margin: 0; color: #475569; line-height: 1.5; }
    `
  ]
})
export class SubscriptionStatusWidgetComponent {
  @Input() subscription: any = null;
  @Input() title: string = 'Subscription status';

  get statusClass(): 'pending' | 'success' | 'error' | 'info' {
    const status = String(this.subscription?.status || '').toUpperCase();
    if (status === 'PAID') return 'success';
    if (status === 'REJECTED') return 'error';
    if (status === 'VERIFICATION_IN_PROGRESS') return 'pending';
    return 'info';
  }

  get statusText(): string {
    const status = String(this.subscription?.status || '').toUpperCase();
    if (status === 'PAID') return 'Approved';
    if (status === 'REJECTED') return 'Rejected';
    if (status === 'VERIFICATION_IN_PROGRESS') return 'Pending review';
    return 'Not started';
  }
}
