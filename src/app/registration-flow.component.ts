import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, UserSession } from './auth.service';
import { ToastService } from './toast.service';
import { OtpVerificationService } from './services/otp-verification.service';
import { DiditVerificationService } from './services/didit-verification.service';
import { RegistrationApiService } from './services/registration-api.service';
import { RegistrationStateService, RegistrationStage, RegistrationUserType } from './services/registration-state.service';
import { MockDataService } from './mock-data.service';

@Component({
  selector: 'app-registration-flow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reg-shell">
      <div class="reg-card">
        <div id="recaptcha-container" aria-hidden="true"></div>
        <div class="reg-header">
          <div>
            <p class="eyebrow">CarShare247</p>
            <h1>Registration</h1>
          </div>
          <button class="btn btn-ghost back-button" type="button" (click)="goBack()" aria-label="Go back to previous screen" title="Back">
            <span class="back-icon" aria-hidden="true">←</span><span class="back-label">Back</span>
          </button>
        </div>

        <div class="progress-wrap" *ngIf="steps.length">
          <div class="progress-bar"><span [style.width.%]="progressPercent"></span></div>
          <div class="step-list">
            <div class="step-item" *ngFor="let step of steps; let i = index" [class.done]="i < currentStepIndex" [class.active]="i === currentStepIndex">
              <span>{{ i + 1 }}</span>
              <small>{{ step.label }}</small>
            </div>
          </div>
        </div>

        <div class="section" *ngIf="!selectedUserType">
          <h3>Select registration type</h3>
          <div class="choice-grid">
            <button class="choice-card" type="button" (click)="selectUserType('OWNER')">
              <span>🚗</span>
              <strong>Register as Owner</strong>
            </button>
            <button class="choice-card" type="button" (click)="selectUserType('PASSENGER')">
              <span>🧍</span>
              <strong>Register as Passenger</strong>
            </button>
          </div>
        </div>

        <div class="section" *ngIf="selectedUserType && currentStep === 'USER_TYPE_SELECTED'">
          <h3>Basic information</h3>
          <div class="field">
            <label>Mobile Number</label>
            <input [(ngModel)]="mobileNumber" type="tel" placeholder="+91 9876543210">
          </div>
          <div class="field">
            <label>Full Name</label>
            <input [(ngModel)]="fullName" type="text" placeholder="Enter full name">
          </div>
          <div class="field">
            <label>Date of Birth</label>
            <input [(ngModel)]="dateOfBirth" type="date">
          </div>
          <div class="field">
            <label>Gender</label>
            <select [(ngModel)]="gender">
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div class="field">
            <label>Referral code <span class="muted-small">(optional)</span></label>
            <input [(ngModel)]="referralCode" type="text" maxlength="20" placeholder="CAR247XXXXXX">
          </div>
          <div class="button-row">
            <button class="btn btn-primary" type="button" (click)="saveBasicDetails()">Save & continue</button>
            <button class="btn btn-ghost" type="button" (click)="backToRegistrationType()">Back</button>
          </div>
        </div>

        <div class="section" *ngIf="selectedUserType && currentStep === 'BASIC_DETAILS_COMPLETED'">
          <h3>Verify mobile number</h3>
          <div class="field">
            <label>Mobile</label>
            <div class="otp-mobile-row">
              <input [value]="mobileNumber" readonly>
              <button class="btn btn-secondary" type="button" (click)="sendOtp()" [disabled]="otpBusy">
                {{ otpSent ? 'Resend OTP' : 'Send OTP' }}
              </button>
            </div>
          </div>

          <div *ngIf="otpSent" class="field">
            <label>OTP</label>
            <input [(ngModel)]="otpCode" maxlength="6" placeholder="123456" inputmode="numeric">
            <div class="otp-meta">
              <span *ngIf="otpCountdown > 0">OTP expires in {{ otpCountdown }}s</span>
              <span *ngIf="otpCountdown === 0">OTP expired. Request a new one.</span>
            </div>
          </div>

          <button class="btn btn-primary" type="button" [disabled]="otpBusy || otpCode.length !== 6" (click)="verifyOtp()">
            {{ otpBusy ? 'Verifying...' : 'Verify OTP' }}
          </button>
        </div>

        <div class="section" *ngIf="selectedUserType && currentStep === 'OTP_VERIFIED'">
          <h3>DIDIT identity verification</h3>
          <div *ngIf="diditStatus === 'NOT_STARTED' || diditStatus === null">
            <p>Verify Identity</p>
            <button class="btn btn-primary" type="button" (click)="startDiditVerification()">Start Verification</button>
          </div>
          <div *ngIf="diditStatus === 'UNDER_REVIEW' || diditStatus === 'IN_REVIEW' || diditStatus === 'INITIATED'">
            <p>Document Verification Under Review</p>
            <div class="meta-box">
              <div><strong>Verification ID</strong><span>{{ diditSessionId || 'N/A' }}</span></div>
              <div><strong>Submitted Date</strong><span>{{ diditLastCheckedAt || '—' }}</span></div>
              <div><strong>Status</strong><span>{{ diditStatus }}</span></div>
            </div>
            <div class="button-row">
              <button class="btn btn-secondary" type="button" (click)="refreshDiditStatus()">Refresh</button>
            </div>
          </div>
          <div *ngIf="diditStatus === 'APPROVED'">
            <p>Verification Approved</p>
            <div class="meta-box">
              <div><strong>Verification ID</strong><span>{{ diditSessionId || 'N/A' }}</span></div>
              <div><strong>Status</strong><span>{{ diditStatus }}</span></div>
            </div>
            <div class="button-row">
              <button class="btn btn-secondary" type="button" (click)="refreshDiditStatus()">Refresh Status</button>
            </div>
          </div>
          <div *ngIf="diditStatus === 'REJECTED'">
            <p>Verification Rejected</p>
            <p class="error-text">{{ diditRejectReason || 'The document upload was rejected.' }}</p>
            <button class="btn btn-primary" type="button" (click)="startDiditVerification()">Re-Verify Documents</button>
          </div>
        </div>

        <div class="section" *ngIf="selectedUserType && currentStep === 'DOCUMENT_VERIFIED' && diditStatus === 'APPROVED'">
          <h3>Live profile photo</h3>
          <p>Open camera only. Gallery upload is disabled.</p>
          <video #video autoplay playsinline muted></video>
          <canvas #canvas width="320" height="240" style="display:none"></canvas>
          <div class="button-row">
            <button class="btn btn-primary" type="button" (click)="capturePhoto()">Capture Selfie</button>
            <button class="btn btn-ghost" type="button" (click)="retakePhoto()">Retake</button>
          </div>
          <img *ngIf="capturedPhotoUrl" [src]="capturedPhotoUrl" class="captured-photo">
        </div>

        <div class="section" *ngIf="currentStep === 'REGISTRATION_COMPLETED'">
          <h3>Registration complete</h3>
          <p>Your account is ready. Redirecting to dashboard...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .reg-shell { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f8fafc; padding:24px; }
    .reg-card { width:min(860px, 100%); background:#fff; border-radius:20px; box-shadow:0 20px 50px rgba(15,23,42,0.08); padding:28px; }
    .reg-header { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:20px; }
    .reg-header > div { min-width:0; }
    .back-button { flex:0 0 auto; min-width:88px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; }
    .back-icon { font-size:1.15rem; line-height:1; }
    .eyebrow { margin:0 0 6px; color:#6366f1; font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-size:12px; }
    h1 { margin:0; }
    .progress-wrap { margin-bottom:18px; }
    .progress-bar { height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
    .progress-bar span { display:block; height:100%; background:linear-gradient(90deg,#4f46e5,#8b5cf6); }
    .step-list { display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:8px; margin-top:10px; }
    .step-item { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 10px; display:flex; gap:8px; align-items:center; color:#475569; }
    .step-item span { width:20px; height:20px; border-radius:50%; background:#cbd5e1; color:#0f172a; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; }
    .step-item.active { background:#eef2ff; border-color:#c7d2fe; color:#312e81; }
    .step-item.done { background:#ecfdf5; border-color:#bbf7d0; color:#166534; }
    .step-item.done span { background:#16a34a; color:#fff; }
    .section { margin-top:18px; }
    .choice-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-top:12px; }
    .choice-card { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border:1px solid #e2e8f0; border-radius:16px; background:#f8fafc; padding:24px; cursor:pointer; }
    .choice-card strong { font-size:1rem; }
    .choice-card span { font-size:2rem; }
    .field { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
    .field input, .field select { padding:12px 14px; border-radius:10px; border:1px solid #dbe2ea; }
    .btn { border:none; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; }
    .btn-primary { background:linear-gradient(90deg,#4f46e5,#8b5cf6); color:#fff; }
    .btn-secondary { background:#e2e8f0; color:#0f172a; }
    .btn-ghost { background:transparent; border:1px solid #dbe2ea; }
    .otp-mobile-row { display:flex; gap:10px; align-items:center; }
    .otp-mobile-row input { flex:1; }
    .otp-meta { color:#64748b; font-size:12px; }
    .meta-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px; display:grid; gap:8px; }
    .meta-box div { display:flex; justify-content:space-between; gap:16px; }
    .button-row { display:flex; gap:10px; margin-top:12px; }
    video { width:100%; max-width:420px; border-radius:16px; background:#111827; min-height:220px; }
    .captured-photo { margin-top:12px; max-width:180px; border-radius:12px; }
    .plans-list { display:grid; gap:12px; margin:12px 0; }
    .plan-item { border:1px solid #e2e8f0; border-radius:12px; padding:14px; display:flex; justify-content:space-between; cursor:pointer; }
    .plan-item.selected { border-color:#6366f1; background:#eef2ff; }
    .error-text { color:#b91c1c; }
    @media (max-width: 600px) {
      .reg-shell { min-height:100dvh; align-items:flex-start; padding:12px 8px 24px; }
      .reg-card { width:100%; padding:18px 14px 22px; border-radius:16px; }
      .reg-header { margin-bottom:16px; gap:8px; }
      .back-button { width:44px; min-width:44px; height:44px; padding:0; border-radius:50%; }
      .back-label { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
      h1 { font-size:1.75rem; }
      .progress-wrap { margin:0 -2px 14px; overflow:hidden; }
      .progress-bar { height:8px; }
      .step-list { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
      .step-list::-webkit-scrollbar { display:none; }
      .step-item { flex:0 0 104px; min-height:54px; padding:8px; align-items:flex-start; }
      .step-item small { line-height:1.25; }
      .section { margin-top:16px; }
      .section h3 { font-size:1.05rem; margin-bottom:12px; }
      .field { gap:6px; margin-bottom:14px; }
      .field input, .field select { width:100%; min-height:48px; padding:12px; }
      .otp-mobile-row { flex-direction:column; align-items:stretch; gap:8px; }
      .otp-mobile-row input, .otp-mobile-row button { width:100%; min-width:0; min-height:48px; }
      .button-row { flex-direction:column; gap:8px; }
      .button-row .btn, .section > .btn { width:100%; min-height:48px; }
      .choice-grid { grid-template-columns:1fr; }
      .choice-card { min-height:96px; padding:18px; }
      .meta-box div { align-items:flex-start; flex-direction:column; gap:2px; }
      video { width:100%; min-height:0; aspect-ratio:4 / 3; object-fit:cover; }
      .captured-photo { display:block; width:100%; max-width:220px; }
    }
  `]
})
export class RegistrationFlowComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  selectedUserType: RegistrationUserType | null = null;
  currentStep: string = RegistrationStage.USER_TYPE_SELECTED;
  userTypeText = 'Owner';
  mobileNumber = '';
  fullName = '';
  dateOfBirth = '';
  gender = '';
  referralCode = '';
  otpCode = '';
  otpSent = false;
  otpBusy = false;
  otpCountdown = 0;
  diditStatus: string | null = null;
  diditSessionId: string | null = null;
  diditLastCheckedAt: string | null = null;
  diditRejectReason: string | null = null;
  capturedPhotoUrl: string | null = null;
  plans: any[] = [];
  selectedPlanId: string | null = null;
  utrNumber = '';
  paymentFile: File | null = null;
  private cameraStream: MediaStream | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private toast: ToastService,
    private otpService: OtpVerificationService,
    private diditService: DiditVerificationService,
    private registrationApi: RegistrationApiService,
    private registrationState: RegistrationStateService,
    private data: MockDataService
  ) {}

  ngOnInit(): void {
    this.referralCode = (this.route.snapshot.queryParamMap.get('ref') || '').trim().toUpperCase();
    this.resumeRegistration();
  }

  ngOnDestroy(): void {
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/');
  }

  private resumeRegistration(): void {
    const session = this.auth.current;
    const savedState = this.registrationState.current;
    
    if (!session) {
      this.selectedUserType = savedState.userType;
      this.userTypeText = savedState.userType ? (savedState.userType === 'OWNER' ? 'Owner' : 'Passenger') : 'Registration';
      this.currentStep = savedState.stage;
      this.mobileNumber = savedState.mobileNumber || '';
      this.fullName = savedState.fullName || '';
      this.dateOfBirth = savedState.dateOfBirth || '';
      this.gender = savedState.gender || '';
      this.diditStatus = savedState.diditStatus;
      this.diditSessionId = savedState.diditSessionId;
      this.diditLastCheckedAt = savedState.diditLastCheckedAt;
      return;
    }

    this.registrationApi.resume().subscribe({
      next: (response) => {
        if (response.userType) {
          this.selectedUserType = response.userType as RegistrationUserType;
          this.userTypeText = this.selectedUserType === 'OWNER' ? 'Owner' : 'Passenger';
        }
        this.mobileNumber = response.mobileNumber || session.mobile || savedState.mobileNumber || this.mobileNumber;
        this.fullName = response.fullName || savedState.fullName || this.fullName;
        this.dateOfBirth = response.dateOfBirth || savedState.dateOfBirth || this.dateOfBirth;
        this.gender = response.gender || savedState.gender || this.gender;
        
        // Prioritize saved DiDit status if it exists (from callback redirect)
        const hasLocalDiditStatus = savedState.diditStatus && savedState.diditStatus !== 'NOT_STARTED';
        this.diditStatus = hasLocalDiditStatus ? savedState.diditStatus : (response.diditStatus || this.diditStatus);
        this.diditSessionId = savedState.diditSessionId || this.diditSessionId;
        this.diditLastCheckedAt = response.diditLastCheckedAt || savedState.diditLastCheckedAt || null;
        
        // Determine stage based on DiDit status if it was just set
        if (hasLocalDiditStatus) {
          this.currentStep = (this.diditStatus === 'APPROVED') ? RegistrationStage.DOCUMENT_VERIFIED : RegistrationStage.OTP_VERIFIED;
        } else if (response.stage) {
          this.currentStep = response.stage;
        }
        
        if (response.mobileVerified) this.otpSent = true;
        this.diditRejectReason = response.diditRejectReason || null;
        this.capturedPhotoUrl = response.profilePhotoUrl || null;
        this.selectedPlanId = response.subscriptionPlanId || null;
        this.utrNumber = response.paymentUTR || '';
        if (this.selectedUserType === RegistrationUserType.OWNER) {
          if (this.currentStep === RegistrationStage.PROFILE_PHOTO_COMPLETED) {
            const ownerId = this.auth.current?.ownerId;
            if (ownerId) {
              void this.router.navigate(['/owner/plans'], { queryParams: { registration: 'true' } });
              return;
            }
            this.currentStep = RegistrationStage.DOCUMENT_VERIFIED;
            this.diditStatus = 'APPROVED';
            void this.startCamera();
          }
          if (this.currentStep === RegistrationStage.SUBSCRIPTION_SELECTED) {
            void this.router.navigateByUrl('/owner/payment');
            return;
          }
        }
        if (this.currentStep === RegistrationStage.DOCUMENT_VERIFIED && this.diditStatus === 'APPROVED') {
          void this.startCamera();
        }
        if (!this.selectedUserType && this.registrationState.current.userType) {
          this.selectedUserType = this.registrationState.current.userType;
        }
      },
      error: () => this.toast.show('Unable to restore your saved registration progress.', 'warning')
    });
  }

  selectUserType(type: 'OWNER' | 'PASSENGER'): void {
    this.selectedUserType = type as RegistrationUserType;
    this.userTypeText = type === 'OWNER' ? 'Owner' : 'Passenger';
    this.registrationState.selectUserType(this.selectedUserType);
    this.currentStep = RegistrationStage.USER_TYPE_SELECTED;
  }

  backToRegistrationType(): void {
    this.selectedUserType = null;
    this.userTypeText = 'Registration';
    this.currentStep = RegistrationStage.USER_TYPE_SELECTED;
    this.registrationState.reset();
  }

  saveBasicDetails(): void {
    if (!this.selectedUserType) return;
    if (!this.mobileNumber || !this.fullName || !this.dateOfBirth || !this.gender) {
      this.toast.show('Please complete all basic information fields.', 'warning');
      return;
    }

    const age = this.calculateAge(this.dateOfBirth);
    if (age < 18) {
      this.toast.show('Users must be at least 18 years old.', 'warning');
      return;
    }

    const payload = {
      userType: this.selectedUserType,
      mobileNumber: this.mobileNumber,
      fullName: this.fullName,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender
    };

    if (!this.auth.current) {
      this.registrationState.markBasicDetailsCompleted(payload);
      this.currentStep = RegistrationStage.BASIC_DETAILS_COMPLETED;
      this.toast.show('Details saved. Verify your mobile number to continue.', 'success');
      return;
    }

    this.registrationApi.saveBasicDetails(payload).subscribe({
      next: (response) => {
        this.currentStep = response.stage;
        this.registrationState.markBasicDetailsCompleted({
          mobileNumber: this.mobileNumber,
          fullName: this.fullName,
          dateOfBirth: this.dateOfBirth,
          gender: this.gender
        });
        this.toast.show('Basic details saved successfully.', 'success');
      },
      error: () => this.toast.show('Unable to save your details.', 'error')
    });
  }

  sendOtp(): void {
    if (!this.mobileNumber) {
      this.toast.show('Enter your mobile number first.', 'warning');
      return;
    }
    this.otpBusy = true;
    this.otpService.sendOtp(this.mobileNumber.replace(/\D/g, '')).then(() => {
      this.otpBusy = false;
      this.otpSent = true;
      this.otpCountdown = 180;
      const interval = setInterval(() => {
        this.otpCountdown = Math.max(0, this.otpCountdown - 1);
        if (this.otpCountdown === 0) clearInterval(interval);
      }, 1000);
      this.toast.show('OTP sent successfully.', 'success');
    }).catch((error: any) => {
      this.otpBusy = false;
      this.toast.show(error?.message || 'Unable to send OTP. Please try again.', 'error');
    });
  }

  verifyOtp(): void {
    if (this.otpCode.length !== 6) {
      this.toast.show('Please enter a valid 6-digit OTP.', 'warning');
      return;
    }

    this.otpBusy = true;
    this.otpService.verifyOtp(this.otpCode).then(({ firebaseUid }) => {
      if (!this.auth.current) {
        this.createAccountAndAdvance(firebaseUid);
        return;
      }
      this.registrationApi.markOtpVerified(firebaseUid).subscribe({
        next: (response) => {
          this.currentStep = response.stage;
          this.registrationState.markOtpVerified();
          this.toast.show('Mobile number verified.', 'success');
        },
        error: () => this.toast.show('OTP verification could not be completed on the server.', 'error')
      });
    }).catch(() => {
      this.toast.show('OTP verification failed. Please try again.', 'error');
    }).finally(() => {
      this.otpBusy = false;
    });
  }

  private createAccountAndAdvance(firebaseUid: string): void {
    this.auth.authenticate(
      'register',
      this.selectedUserType === 'OWNER' ? 'owner' : 'passenger',
      this.mobileNumber,
      '',
      this.dateOfBirth,
      this.fullName,
      this.gender,
      undefined,
      firebaseUid,
      undefined,
      this.referralCode || undefined,
      this.deviceFingerprint()
    ).subscribe({
      next: () => this.registrationApi.saveBasicDetails({
        userType: this.selectedUserType!,
        mobileNumber: this.mobileNumber,
        fullName: this.fullName,
        dateOfBirth: this.dateOfBirth,
        gender: this.gender
      }).subscribe({
        next: () => this.registrationApi.markOtpVerified(firebaseUid).subscribe({
          next: (response) => {
            this.currentStep = response.stage;
            this.registrationState.markOtpVerified();
            this.toast.show('Mobile number verified.', 'success');
          },
          error: () => this.toast.show('OTP verification could not be completed on the server.', 'error')
        }),
        error: () => this.toast.show('Unable to save your registration details.', 'error')
      }),
      error: (error) => this.toast.show(error?.error?.error?.message || 'Unable to create your account.', 'error')
    });
  }

  private deviceFingerprint(): string {
    const key = 'carshare_device_id';
    let value = localStorage.getItem(key);
    if (!value) {
      value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, value);
    }
    return value;
  }

  startDiditVerification(): void {
    const role = this.selectedUserType === 'OWNER' ? 'OWNER' : 'PASSENGER';
    this.diditService.createSession(role).subscribe({
      next: (data) => {
        this.diditSessionId = data.sessionId;
        this.diditStatus = 'INITIATED';
        this.registrationApi.markDiditStatus('INITIATED', data.sessionId).subscribe({ error: () => {} });
        this.registrationState.markDiditStatus('INITIATED', data.sessionId);
        this.diditService.openVerification(data.verificationUrl);
      },
      error: () => this.toast.show('Unable to start DIDIT verification.', 'error')
    });
  }

  refreshDiditStatus(): void {
    this.diditService.getStatus().subscribe({
      next: (data) => {
        this.diditStatus = data.status;
        this.diditSessionId = data.sessionId || this.diditSessionId;
        this.diditLastCheckedAt = new Date().toISOString();
        this.diditRejectReason = data.status === 'REJECTED' ? 'Didit rejected the submitted documents.' : null;
        this.registrationApi.markDiditStatus(data.status, data.sessionId || this.diditSessionId || undefined).subscribe({ error: () => {} });
        this.registrationState.markDiditStatus(data.status, data.sessionId || this.diditSessionId);
        if (data.status === 'APPROVED') {
          this.currentStep = RegistrationStage.DOCUMENT_VERIFIED;
          void this.startCamera();
          this.toast.show('Identity verified successfully.', 'success');
        }
      },
      error: () => this.toast.show('Unable to refresh DIDIT status.', 'warning')
    });
  }

  continueAfterDidit(): void {
    this.currentStep = RegistrationStage.DOCUMENT_VERIFIED;
    this.registrationState.markDiditApproved();
    void this.startCamera();
    this.toast.show('Identity verification approved.', 'success');
  }

  private async startCamera(): Promise<void> {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setTimeout(() => {
        const video = document.querySelector('video') as HTMLVideoElement | null;
        if (video) video.srcObject = this.cameraStream;
      });
    } catch {
      this.toast.show('Camera access is required for a live profile photo.', 'warning');
    }
  }

  capturePhoto(): void {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!video || !canvas) {
      this.toast.show('Camera is not ready yet.', 'warning');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      this.toast.show('Unable to access camera.', 'error');
      return;
    }

    const sourceWidth = video.videoWidth || 320;
    const sourceHeight = video.videoHeight || 240;
    const scale = Math.min(1, 640 / sourceWidth, 480 / sourceHeight);
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedPhotoUrl = canvas.toDataURL('image/jpeg', 0.8);
    const photoFile = this.dataUrlToFile(this.capturedPhotoUrl, 'profile-photo.jpg');
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = null;
    this.registrationApi.markProfilePhoto(photoFile).subscribe({
      next: (response) => {
        this.currentStep = response.stage;
        this.capturedPhotoUrl = response.profilePhotoUrl;
        this.registrationState.markProfilePhotoCompleted(response.profilePhotoUrl);
        this.updateProfileSession(response.profilePhotoUrl);
        this.toast.show('Profile photo saved.', 'success');
        if (this.selectedUserType === 'PASSENGER') {
          this.currentStep = RegistrationStage.REGISTRATION_COMPLETED;
          this.registrationState.markRegistrationCompleted();
          this.navigateAfterRegistration('/home');
        } else {
          this.ensureOwnerProfile(photoFile);
        }
      },
      error: () => this.toast.show('Unable to save the photo.', 'error')
    });
  }

  private dataUrlToFile(dataUrl: string, fileName: string): File {
    const [header, encoded] = dataUrl.split(',');
    const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    const bytes = atob(encoded);
    const buffer = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index++) buffer[index] = bytes.charCodeAt(index);
    return new File([buffer], fileName, { type: mimeType });
  }

  private updateProfileSession(profilePhotoUrl: string | null | undefined): void {
    const session = this.auth.current;
    if (!session) return;
    const base = this.data['apiUrl'].replace(/\/api\/?$/, '');
    const profilePhoto = profilePhotoUrl
      ? (/^https?:\/\//i.test(profilePhotoUrl) ? profilePhotoUrl : `${base}/files/${profilePhotoUrl.replace(/^\/?files\//i, '')}`)
      : session.profilePhoto;
    this.auth.save({ ...session, profilePhoto, mobileVerified: true });
  }

  private ensureOwnerProfile(profilePhoto: File): void {
    const session = this.auth.current;
    if (session?.ownerId) {
      void this.router.navigate(['/owner/plans'], { queryParams: { registration: 'true' } });
      return;
    }

    this.data.getMe().subscribe({
      next: me => {
        const ownerId = me?.ownerId || me?.owner?.id;
        if (ownerId) {
          if (session) this.auth.save({ ...session, ownerId: String(ownerId) });
          void this.router.navigate(['/owner/plans'], { queryParams: { registration: 'true' } });
          return;
        }
        this.createOwnerProfile(profilePhoto, session);
      },
      error: () => this.createOwnerProfile(profilePhoto, session)
    });
  }

  private createOwnerProfile(profilePhoto: File, session: UserSession | null): void {

    const form = new FormData();
    const mobileNumber = this.mobileNumber.replace(/\D/g, '');
    if (!mobileNumber) {
      this.toast.show('Enter a valid mobile number before creating your owner profile.', 'warning');
      return;
    }
    form.append('name', this.fullName || this.mobileNumber);
    form.append('mobile', mobileNumber);
    form.append('mobileNumber', mobileNumber);
    form.append('profilePhoto', profilePhoto, profilePhoto.name);
    this.data.createOwner(form).subscribe({
      next: owner => {
        if (session) this.auth.save({ ...session, ownerId: owner.id });
        void this.router.navigate(['/owner/plans'], { queryParams: { registration: 'true' } });
      },
      error: error => this.toast.show(error?.error?.message || error?.error?.data || 'Unable to create owner profile. Please try again.', 'error')
    });
  }

  retakePhoto(): void {
    this.capturedPhotoUrl = null;
    void this.startCamera();
  }

  selectSubscriptionPlan(): void {
    if (!this.selectedPlanId) {
      this.toast.show('Please select a subscription plan.', 'warning');
      return;
    }
    this.registrationApi.selectSubscriptionPlan(this.selectedPlanId).subscribe({
      next: (response) => {
        this.currentStep = response.stage;
        this.registrationState.markSubscriptionSelected(this.selectedPlanId || '');
        this.toast.show('Subscription selected.', 'success');
      },
      error: () => this.toast.show('Unable to save the subscription selection.', 'error')
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentFile = input.files?.[0] || null;
  }

  submitPayment(): void {
    if (!this.utrNumber || !this.paymentFile) {
      this.toast.show('UTR and payment screenshot are required.', 'warning');
      return;
    }

    const screenshotUrl = `uploads/${Date.now()}_${this.paymentFile.name}`;
    this.registrationApi.submitPayment(this.utrNumber, screenshotUrl).subscribe({
      next: (response) => {
        this.currentStep = response.stage;
        this.registrationState.markPaymentSubmitted(this.utrNumber, screenshotUrl);
        this.toast.show('Payment submitted. Pending verification.', 'success');
        if (response.registrationCompleted) {
          this.currentStep = RegistrationStage.REGISTRATION_COMPLETED;
          this.navigateAfterRegistration('/owner/dashboard');
        }
      },
      error: () => this.toast.show('Unable to submit payment details.', 'error')
    });
  }

  private navigateAfterRegistration(url: string): void {
    void this.router.navigateByUrl(url).then(navigated => {
      if (navigated) this.clearRegistrationForm();
    }).catch(() => {
      this.toast.show('Registration is complete, but the dashboard could not be opened.', 'warning');
    });
  }

  private clearRegistrationForm(): void {
    this.registrationState.reset();
    this.selectedUserType = null;
    this.currentStep = RegistrationStage.USER_TYPE_SELECTED;
    this.userTypeText = 'Registration';
    this.mobileNumber = '';
    this.fullName = '';
    this.dateOfBirth = '';
    this.gender = '';
    this.otpCode = '';
    this.otpSent = false;
    this.diditStatus = null;
    this.diditSessionId = null;
    this.diditLastCheckedAt = null;
    this.diditRejectReason = null;
    this.capturedPhotoUrl = null;
    this.selectedPlanId = null;
    this.utrNumber = '';
    this.paymentFile = null;
  }

  private calculateAge(dateOfBirth: string): number {
    const value = new Date(dateOfBirth);
    const diff = Date.now() - value.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  get steps(): { label: string }[] {
    const commonSteps = [
      { label: 'Basic Details' },
      { label: 'OTP' },
      { label: 'Document' },
      { label: 'Photo' }
    ];
    return this.selectedUserType === RegistrationUserType.OWNER
      ? [...commonSteps, { label: 'Subscription' }, { label: 'Payment' }, { label: 'Dashboard' }]
      : [...commonSteps, { label: 'Dashboard' }];
  }

  get progressPercent(): number {
    const ownerMap: Record<string, number> = {
      USER_TYPE_SELECTED: 10,
      BASIC_DETAILS_COMPLETED: 25,
      OTP_VERIFIED: 45,
      DOCUMENT_VERIFIED: 60,
      PROFILE_PHOTO_COMPLETED: 75,
      SUBSCRIPTION_SELECTED: 85,
      PAYMENT_SUBMITTED: 92,
      REGISTRATION_COMPLETED: 100
    };
    const passengerMap: Record<string, number> = {
      USER_TYPE_SELECTED: 10,
      BASIC_DETAILS_COMPLETED: 25,
      OTP_VERIFIED: 45,
      DOCUMENT_VERIFIED: 65,
      PROFILE_PHOTO_COMPLETED: 85,
      REGISTRATION_COMPLETED: 100
    };
    const progressMap = this.selectedUserType === RegistrationUserType.OWNER ? ownerMap : passengerMap;
    return progressMap[this.currentStep] || 10;
  }

  get currentStepIndex(): number {
    const ownerOrder = [
      RegistrationStage.USER_TYPE_SELECTED,
      RegistrationStage.BASIC_DETAILS_COMPLETED,
      RegistrationStage.OTP_VERIFIED,
      RegistrationStage.DOCUMENT_VERIFIED,
      RegistrationStage.PROFILE_PHOTO_COMPLETED,
      RegistrationStage.SUBSCRIPTION_SELECTED,
      RegistrationStage.PAYMENT_SUBMITTED,
      RegistrationStage.REGISTRATION_COMPLETED
    ];
    const passengerOrder = [
      RegistrationStage.USER_TYPE_SELECTED,
      RegistrationStage.BASIC_DETAILS_COMPLETED,
      RegistrationStage.OTP_VERIFIED,
      RegistrationStage.DOCUMENT_VERIFIED,
      RegistrationStage.PROFILE_PHOTO_COMPLETED,
      RegistrationStage.REGISTRATION_COMPLETED
    ];
    const order = this.selectedUserType === RegistrationUserType.OWNER ? ownerOrder : passengerOrder;
    const idx = order.indexOf(this.currentStep as RegistrationStage);
    return idx >= 0 ? idx : 0;
  }
}
