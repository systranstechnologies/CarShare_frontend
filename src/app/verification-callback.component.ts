import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VerificationRole, VerificationStatus } from './services/didit-verification.service';
import { OnboardingStateService } from './services/onboarding-state.service';
import { RegistrationStateService } from './services/registration-state.service';
import { RegistrationUserType } from './services/registration-state.service';
import { MockDataService } from './mock-data.service';

@Component({
  selector: 'app-verification-callback',
  standalone: true,
  imports: [CommonModule],
  template: `<section class="card verification-status">
    <div class="status-icon" [ngClass]="statusClass">{{ status === 'APPROVED' ? '✓' : status === 'REJECTED' ? '!' : '⏳' }}</div>
    <h1>{{ title }}</h1>
    <p class="lead" [ngClass]="statusClass">{{ description }}</p>
    <p class="muted">Redirecting to registration...</p>
  </section>`,
  styles: [`.verification-status{max-width:560px;margin:40px auto;text-align:center;padding:32px 24px;border-radius:18px}.status-icon{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:2rem;font-weight:800}.status-icon.pending{background:#fef3c7;color:#92400e}.status-icon.success{background:#dcfce7;color:#166534}.status-icon.error{background:#fee2e2;color:#991b1b}.lead{font-size:1.02rem;line-height:1.6;margin:0}.lead.pending{color:#92400e}.lead.success{color:#166534}.lead.error{color:#991b1b}.actions{display:flex;justify-content:center;gap:12px;margin-top:20px}.muted{margin-top:18px;color:#64748b;font-size:0.9rem}`]
})
export class VerificationCallbackComponent implements OnInit, OnDestroy {
  status: VerificationStatus = 'NOT_STARTED';
  private role: VerificationRole = 'PASSENGER';

  get title(): string {
    if (this.status === 'APPROVED') return 'Identity verified';
    if (this.status === 'REJECTED') return 'Verification rejected';
    return 'Identity verification in progress';
  }

  get description(): string {
    if (this.status === 'APPROVED') return 'Your identity has been approved. You can continue to the next step.';
    if (this.status === 'REJECTED') return 'Your identity verification was declined. Please retry with a valid submission.';
    return 'We are checking your verification details. Please wait while your profile is reviewed.';
  }

  get statusClass(): 'pending' | 'success' | 'error' {
    if (this.status === 'APPROVED') return 'success';
    if (this.status === 'REJECTED') return 'error';
    return 'pending';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private onboarding: OnboardingStateService,
    private registrationState: RegistrationStateService,
    private data: MockDataService,
  ) {
    const params = this.route.snapshot.queryParamMap;
    this.role = (params.get('role') || (this.router.url.startsWith('/owner') ? 'OWNER' : 'PASSENGER')) as VerificationRole;
    const callbackStatus = params.get('status');
    const sessionId = params.get('sessionId');
    if (callbackStatus) this.status = this.mapStatus(callbackStatus);
    this.registrationState.setCallbackUserType(this.role as RegistrationUserType);
    this.onboarding.markDiditStatus(this.status);
    this.registrationState.markDiditStatus(this.status, sessionId);
  }

  ngOnInit(): void {
    // Sync verification status with backend and then redirect to registration
    this.data.syncDiditVerificationStatus().subscribe({
      next: () => {
        // Status synced successfully, now redirect
        this.router.navigateByUrl('/register');
      },
      error: () => {
        // Even if sync fails, still redirect (status might update via webhook)
        this.router.navigateByUrl('/register');
      }
    });
  }

  private mapStatus(status: string): VerificationStatus {
    const normalized = status.toLowerCase().replace(/[_-]/g, ' ');
    if (normalized === 'approved' || normalized === 'verified') return 'APPROVED';
    if (normalized === 'declined' || normalized === 'rejected') return 'REJECTED';
    return 'UNDER_REVIEW';
  }

  ngOnDestroy() {}
}
