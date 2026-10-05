import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-verification-status-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-widget" [ngClass]="statusClass">
      <div class="status-header">
        <span class="status-dot"></span>
        <span class="status-label">{{ title }}</span>
        <button *ngIf="showRefresh" type="button" class="mini-btn" (click)="refresh.emit()">Refresh</button>
      </div>
      <div class="status-body">
        <strong>{{ statusText }}</strong>
        <p>{{ helperText }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .status-widget { border: 1px solid #dbe4ea; border-radius: 14px; background: #fff; padding: 14px 16px; }
      .status-widget.pending { background: #fffaf0; border-color: #f3d58a; }
      .status-widget.success { background: #f0fdf4; border-color: #86efac; }
      .status-widget.error { background: #fef2f2; border-color: #fca5a5; }
      .status-widget.info { background: #eff6ff; border-color: #bfdbfe; }
      .status-header { display: flex; align-items: center; gap: 8px; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
      .status-dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; display: inline-block; }
      .mini-btn { margin-left: auto; border: 1px solid rgba(15, 23, 42, 0.1); background: #fff; border-radius: 8px; padding: 6px 8px; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
      .status-body { margin-top: 10px; }
      .status-body strong { display: block; font-size: 1.05rem; margin-bottom: 4px; color: #0f172a; }
      .status-body p { margin: 0; color: #475569; font-size: 0.9rem; line-height: 1.5; }
      .status-widget.pending .status-dot, .status-widget.pending .status-label { color: #b45309; }
      .status-widget.success .status-dot, .status-widget.success .status-label { color: #166534; }
      .status-widget.error .status-dot, .status-widget.error .status-label { color: #991b1b; }
      .status-widget.info .status-dot, .status-widget.info .status-label { color: #1d4ed8; }
    `
  ]
})
export class VerificationStatusWidgetComponent {
  @Input() status: string = 'NOT_STARTED';
  @Input() title: string = 'Identity verification';
  @Input() showRefresh: boolean = false;
  @Output() refresh = new EventEmitter<void>();

  get statusClass(): 'pending' | 'success' | 'error' | 'info' {
    switch ((this.status || '').toUpperCase()) {
      case 'APPROVED':
      case 'VERIFIED':
        return 'success';
      case 'REJECTED':
      case 'DECLINED':
        return 'error';
      case 'INITIATED':
      case 'UNDER_REVIEW':
      case 'IN_REVIEW':
        return 'pending';
      default:
        return 'info';
    }
  }

  get statusText(): string {
    switch ((this.status || '').toUpperCase()) {
      case 'APPROVED':
      case 'VERIFIED':
        return 'Approved';
      case 'REJECTED':
      case 'DECLINED':
        return 'Rejected';
      case 'INITIATED':
      case 'UNDER_REVIEW':
      case 'IN_REVIEW':
        return 'In review';
      default:
        return 'Not started';
    }
  }

  get helperText(): string {
    switch ((this.status || '').toUpperCase()) {
      case 'APPROVED':
      case 'VERIFIED':
        return 'Identity is validated and the user can continue to the next onboarding step.';
      case 'REJECTED':
      case 'DECLINED':
        return 'The verification was rejected. The user must retry with valid identity documents.';
      case 'INITIATED':
      case 'UNDER_REVIEW':
      case 'IN_REVIEW':
        return 'The review is underway. Support or admins can approve or decline from the control room.';
      default:
        return 'Verification has not started yet. The user must complete the secure identity check.';
    }
  }
}
