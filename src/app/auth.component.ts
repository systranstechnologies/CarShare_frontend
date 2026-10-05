import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MockDataService } from './mock-data.service';
import { ToastService } from './toast.service';
import { OtpVerificationService } from './services/otp-verification.service';
import { OtpLoginService } from './services/otp-login.service';
import { MobileVerificationService } from './services/mobile-verification.service';
import { MessageService } from './message.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LogoComponent } from './logo.component';
import { DiditVerificationService } from './services/didit-verification.service';
import { OnboardingStateService } from './services/onboarding-state.service';
import { RegistrationApiService } from './services/registration-api.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  template: `
    <div class="auth-shell">
      <div class="auth-grid">
        <!-- Hero panel -->
        <aside class="auth-hero">
          <div class="hero-inner">
            <div class="hero-brand">
              <app-logo [size]="56" class="auth-brand-logo"></app-logo>
              <span class="brand-name">CarShare247</span>
            </div>
            <h1 class="hero-title">Share the ride.<br/><span class="accent">Share the joy.</span></h1>
            <p class="hero-sub">Book verified rides across your city, save money, and travel together with people you can trust.</p>
            <ul class="hero-features">
              <li><span class="hf-ic">✓</span> Verified owners & live-photo KYC</li>
              <li><span class="hf-ic">⭐</span> Ratings you can rely on</li>
              <li><span class="hf-ic">🔒</span> Secure bookings and cancellations</li>
              <li><span class="hf-ic">💸</span> Affordable, transparent pricing</li>
            </ul>
            <div class="hero-stats">
              <div><strong>Verified</strong><span>Owner onboarding</span></div>
              <div><strong>Flexible</strong><span>Multi-stop journeys</span></div>
              <div><strong>Direct</strong><span>Booking coordination</span></div>
            </div>
          </div>
          <div class="hero-orb orb-a"></div>
          <div class="hero-orb orb-b"></div>
          <div class="hero-orb orb-c"></div>
        </aside>

        <!-- Form panel -->
        <section class="auth-panel">
          <div class="auth-card">
            <div class="ap-head">
              <h2 class="ap-title">Welcome back</h2>
              <p class="ap-sub">Sign in or create your account to continue.</p>
            </div>

            <ng-container *ngIf="!showForm">
              <div class="actions">
                <button class="btn btn-primary btn-lg" (click)="router.navigateByUrl('/register')">Register</button>
                <button class="btn btn-secondary btn-lg" (click)="openForm('login')">Login</button>
              </div>
            </ng-container>

            <div id="recaptcha-container" aria-hidden="true"></div>

            <ng-container *ngIf="showForm">
              <div class="registration-progress" *ngIf="isRegistering">
                <div class="progress-bar"><span [style.width.%]="registrationProgress"></span></div>
                <div class="step-list">
                  <div class="step-item" *ngFor="let step of registrationSteps; let i = index" [class.active]="currentRegistrationStepIndex === i" [class.done]="currentRegistrationStepIndex > i">
                    <span class="step-index">{{ i + 1 }}</span>
                    <span>{{ step }}</span>
                  </div>
                </div>
              </div>

              <div class="role-toggle" role="tablist" aria-label="Select role">
                <button type="button" role="tab" [class.active]="role==='passenger'" (click)="role='passenger'">
                  <span class="rt-ic">🧍</span> Passenger
                </button>
                <button type="button" role="tab" [class.active]="role==='owner'" (click)="role='owner'">
                  <span class="rt-ic">🚗</span> Car Owner
                </button>
              </div>
              <p *ngIf="showMode === 'login'" class="role-login-hint">
                {{ role === 'owner'
                  ? 'Owner login is available only after owner registration.'
                  : 'Registered owners can also log in as passengers with the same mobile number.' }}
              </p>

              <div class="field">
                <label for="mobileInput">Step 1: Mobile number</label>
                <div class="input-wrap">
                  <span class="input-ic">📱</span>
                  <input id="mobileInput" [(ngModel)]="mobile" placeholder="+91 9xxxxxxxxx" inputmode="tel" autocomplete="tel" [readonly]="mobileVerified" />
                </div>
              </div>

              <div class="field">
                <div style="display:flex;gap:8px;align-items:flex-end;">
                  <button *ngIf="!mobileVerified" type="button" class="btn btn-secondary" (click)="handleSendOtp()" [disabled]="otpLoading">
                    {{ otpLoading ? '⏳ Sending...' : (otpSent ? 'Resend OTP' : 'Send OTP') }}
                  </button>
                  <span *ngIf="mobileVerified" class="badge badge-success" style="margin-bottom:2px;">✅ Verified</span>
                </div>
                <div *ngIf="otpError" class="badge badge-error" style="margin-top:6px;">{{ otpError }}</div>
              </div>

              <div class="field" *ngIf="otpSent && !mobileVerified">
                <label for="otpInput">6-digit OTP</label>
                <div class="input-wrap">
                  <span class="input-ic">🔐</span>
                  <input id="otpInput" [(ngModel)]="otpCode" placeholder="123456" inputmode="numeric" maxlength="6" />
                </div>
                <button type="button" class="btn btn-primary" (click)="handleVerifyOtp()" [disabled]="otpLoading || otpCode.length !== 6" style="margin-top:8px;">
                  {{ otpLoading ? '⏳ Verifying...' : 'Verify OTP' }}
                </button>
              </div>

              <div class="field" *ngIf="isRegistering">
                <label for="nameInput">Step 2: Full name</label>
                <div class="input-wrap"><span class="input-ic">👤</span><input id="nameInput" [(ngModel)]="name" placeholder="Your full name" autocomplete="name" /></div>
              </div>

              <div class="field" *ngIf="isRegistering">
                <label for="dobInput">Step 3: Date of birth</label>
                <div class="input-wrap"><span class="input-ic">🎂</span><input id="dobInput" type="date" [(ngModel)]="dateOfBirth" [max]="maxDob" /></div>
              </div>
              <div class="field" *ngIf="isRegistering">
                <label for="genderSelect">Step 4: Gender</label>
                <select id="genderSelect" [(ngModel)]="gender">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div class="field" *ngIf="isRegistering">
                <label for="referralCode">Referral code (optional)</label>
                <input id="referralCode" [(ngModel)]="referralCode" maxlength="20" placeholder="CAR247XXXXXX" />
              </div>
              <p *ngIf="role==='owner'" class="muted-small mt-1">Owners need verification: government proof, live photo, and an active subscription.</p>

              <div class="actions">
                <button class="btn btn-primary btn-lg" (click)="submit()" [disabled]="isRegistering && !mobileVerified">
                  {{ showMode === 'register' ? (role === 'owner' ? 'Register as Owner' : 'Register') : 'Login' }}
                </button>
                <button class="btn btn-secondary btn-lg" (click)="closeForm()">Cancel</button>
              </div>
            </ng-container>

            <p class="fine-print">By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>
          </div>

          <div class="ap-footer">
            <!-- support link removed; moved to top-bar after login -->
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .auth-shell { min-height: calc(100vh - 56px); background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 60%); padding: 12px 0 24px; }
    .auth-grid { max-width: 1180px; margin: 0 auto; padding: 0 16px; display: grid; grid-template-columns: 1fr; gap: 14px; }

    /* Hero (compact on mobile) */
    .auth-hero { position: relative; overflow: hidden; border-radius: 18px; padding: 16px 18px; color: #fff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
      box-shadow: 0 12px 28px rgba(79,70,229,0.22); }
    .hero-inner { position: relative; z-index: 2; }
    .hero-brand { display:flex; align-items:center; gap:10px; font-weight:800; font-size:1rem; }
      .auth-brand-logo { width:56px; height:56px; object-fit:contain; filter: drop-shadow(0 6px 16px rgba(15,23,42,0.36)); }
    .logo-badge.lg { width:36px; height:36px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.18); font-weight:800; font-size:0.9rem; }
    .hero-title { font-size: 1.25rem; line-height: 1.2; margin: 8px 0 0; letter-spacing:-0.01em; }
    .hero-title br { display:none; }
    .hero-title .accent { background: linear-gradient(90deg,#fde68a,#fca5a5); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .hero-sub, .hero-features, .hero-stats { display:none; }
    .hf-ic { width:24px; height:24px; border-radius: 8px; background: rgba(255,255,255,0.18); display:inline-flex; align-items:center; justify-content:center; font-size: 0.8rem; }

    .hero-orb { position:absolute; border-radius:50%; filter: blur(30px); opacity:0.5; z-index:1; }
    .orb-a { width:140px; height:140px; background:#fca5a5; top:-40px; right:-40px; }
    .orb-b { width:120px; height:120px; background:#a5b4fc; bottom:-40px; left:-30px; }
    .orb-c { display:none; }

    /* Panel */
    .auth-panel { display:flex; flex-direction:column; gap:10px; align-items:stretch; }
    .auth-card { background:#fff; border-radius: 20px; padding: 20px; box-shadow: 0 12px 30px rgba(15,23,42,0.08); border:1px solid rgba(15,23,42,0.05); }
    .ap-head { margin-bottom: 12px; }
    .ap-title { font-size:1.35rem; margin:0 0 4px; }
    .ap-sub { color:#64748b; margin:0; font-size:0.9rem; }

    .registration-progress { margin: 0 0 14px; }
    .progress-bar { height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-bottom: 10px; }
    .progress-bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#4f46e5,#8b5cf6); }
    .step-list { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; }
    .step-item { display:flex; align-items:center; gap:6px; font-size:0.72rem; color:#64748b; padding:6px 8px; border-radius:10px; background:#f8fafc; border:1px solid transparent; }
    .step-item.active { background:#eef2ff; border-color:#c7d2fe; color:#3730a3; }
    .step-item.done { background:#ecfdf5; border-color:#a7f3d0; color:#166534; }
    .step-index { width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; background:#cbd5e1; color:#0f172a; }
    .step-item.active .step-index, .step-item.done .step-index { background:#4f46e5; color:#fff; }
    .step-item.done .step-index { background:#16a34a; }

    .role-toggle { display:flex; background:#f1f5f9; border-radius: 12px; padding: 4px; margin: 12px 0 14px; gap:4px; }
    .role-toggle button { flex:1; padding: 10px 12px; border:0; background: transparent; border-radius: 10px; font-weight:700; color:#334155; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition: all .15s ease; }
    .role-toggle button:hover { color:#1e293b; }
    .role-toggle button.active { background:#fff; color:#4f46e5; box-shadow: 0 4px 12px rgba(79,70,229,0.15); }
    .rt-ic { font-size:1.05rem; }
    .role-login-hint { margin:-6px 0 14px; padding:8px 10px; border-radius:10px; background:#f8fafc; border:1px solid #e2e8f0; color:#475569; font-size:0.82rem; line-height:1.35; }

    .field { margin-bottom: 12px; }
    .field label { display:block; font-weight:600; color:#334155; margin-bottom:6px; font-size:0.9rem; }
    .input-wrap { position:relative; }
    .input-wrap .input-ic { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; }
    .input-wrap input { width:100%; padding: 12px 14px 12px 40px; border-radius:12px; border:1px solid #e2e8f0; font-size:1rem; background:#fff; transition: border-color .15s ease, box-shadow .15s ease; }
    .input-wrap input:focus { outline:none; border-color:#818cf8; box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }

    .actions { display:grid; grid-template-columns: 1fr; gap: 10px; margin-top: 6px; }
    .btn-lg { padding: 12px 16px; font-size: 1rem; border-radius: 12px; }
    .fine-print { color:#94a3b8; font-size:0.8rem; margin-top:12px; text-align:center; }
    .fine-print a { color:#4f46e5; text-decoration:none; }

    .ap-footer { text-align:center; color:#64748b; font-size:0.9rem; }
    .ap-footer a { color:#4f46e5; font-weight:600; text-decoration:none; }

    /* Tablet + — full hero */
    @media (min-width: 720px) {
      .auth-shell { padding: 24px 0; }
      .auth-grid { grid-template-columns: 1.1fr 1fr; gap: 28px; padding: 0 20px; }
      .auth-hero { padding: 40px; border-radius: 22px; }
      .hero-brand { font-size: 1.1rem; }
        .auth-brand-logo { width:80px; height:80px; filter: drop-shadow(0 10px 28px rgba(15,23,42,0.4)); }
      .logo-badge.lg { width:44px; height:44px; border-radius:12px; font-size:1rem; }
      .hero-title { font-size: 2.4rem; margin: 18px 0 10px; }
      .hero-title br { display:inline; }
      .hero-sub { display:block; color: rgba(255,255,255,0.9); margin: 0 0 16px; font-size: 0.98rem; max-width: 46ch; }
      .hero-features { display:grid; list-style:none; padding:0; margin: 0 0 18px; gap: 8px; }
      .hero-features li { display:flex; align-items:center; gap:10px; color: rgba(255,255,255,0.95); font-weight:500; }
      .hero-stats { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
      .hero-stats > div { background: rgba(255,255,255,0.12); border-radius: 12px; padding: 10px; text-align:center; backdrop-filter: blur(4px); }
      .hero-stats strong { display:block; font-size:1.1rem; }
      .hero-stats span { font-size:0.8rem; opacity:0.9; }
      .orb-a { width:220px; height:220px; top:-60px; right:-60px; }
      .orb-b { width:180px; height:180px; bottom:-40px; left:-40px; }
      .orb-c { display:block; width:120px; height:120px; background:#f0abfc; top:40%; right:30%; }
      .auth-card { padding: 28px; }
      .actions { grid-template-columns: 1fr 1fr; }
    }
    /* Desktop */
    @media (min-width: 1024px) {
      .auth-shell { padding: 40px 0; }
      .hero-title { font-size: 2.8rem; }
      .auth-hero { padding: 48px; }
    }
  `]
})
export class AuthComponent {
  role: 'passenger' | 'owner' = 'passenger';
  mobile = '';
  name = '';
  dateOfBirth = '';
  gender: 'male' | 'female' = 'male';
  referralCode = '';
  // UI state: whether the inline form is visible and which mode is active
  showForm = false;
  showMode: 'login' | 'register' | null = null;
  isRegistering = false;
  readonly registrationSteps = ['Mobile', 'Profile', 'Verification'];
  maxDob = new Date().toISOString().slice(0, 10);
  photoData: string | null = null;
  governmentIdProof: File | null = null;
  
  // OTP Verification state
  mobileVerified = false;
  otpSent = false;
  otpCode = '';
  otpLoading = false;
  otpError: string | null = null;
  firebaseUid: string | null = null;
  
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  private stream: MediaStream | null = null;
  get registrationProgress(): number {
    if (!this.isRegistering) return 0;
    const stepIndex = this.currentRegistrationStepIndex;
    return ((stepIndex + 1) / this.registrationSteps.length) * 100;
  }

  get currentRegistrationStepIndex(): number {
    if (!this.isRegistering) return 0;
    if (!this.mobileVerified) return 0;
    if (!this.name.trim() && this.role === 'passenger') return 1;
    if (!this.dateOfBirth) return 1;
    return 2;
  }

  constructor(
    private auth: AuthService,
    public router: Router,
    private route: ActivatedRoute,
    private data: MockDataService,
    private toast: ToastService,
    private otpService: OtpVerificationService,
    private otpLoginService: OtpLoginService,
    private mobileVerificationService: MobileVerificationService,
    private messageService: MessageService,
    private didit: DiditVerificationService,
    private onboarding: OnboardingStateService,
    private registrationApi: RegistrationApiService
  ) {
    this.referralCode = (this.route.snapshot.queryParamMap.get('ref') || '').trim().toUpperCase();
    const s = this.auth.current;
    if (s) {
      if (s.role === 'admin') this.router.navigateByUrl('/Kumaresh/dashboard');
      else if (s.role === 'owner') this.router.navigateByUrl('/owner/dashboard');
      else this.router.navigateByUrl('/home');
    }
  }

  async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast.show('Camera capture is unavailable in this browser. Open CarShare247 in a supported browser and allow camera access.', 'warning');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => {
        if (this.videoEl && this.videoEl.nativeElement) this.videoEl.nativeElement.srcObject = this.stream;
      }, 100);
    } catch (e: any) {
      console.warn('Camera not available', e);
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      this.toast.show(
        denied
          ? 'Camera permission was denied. Enable camera access in your browser settings, then retry the live-photo step.'
          : 'Camera could not be started. Check that no other app is using it, then retry the live-photo step.',
        'warning'
      );
    }
  }

  capture() {
    if (!this.videoEl?.nativeElement || !this.canvasEl?.nativeElement) {
      this.toast.show('Camera is unavailable. You can continue without a profile photo.', 'warning');
      return;
    }
    const video = this.videoEl.nativeElement;
    const canvas = this.canvasEl.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.photoData = canvas.toDataURL('image/png');
    this.stopCamera();
  }

  private stopCamera() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    if (this.videoEl?.nativeElement) this.videoEl.nativeElement.srcObject = null;
  }

  primary() {
    this.isRegistering = true;
    if (this.role === 'owner') this.goToOwnerRegister(); else this.registerPassenger();
  }

  secondary() {
    this.isRegistering = false;
    if (this.role === 'owner') this.loginOwner(); else this.loginPassenger();
  }

  registerPassenger() {
    if (!this.validateCredentials(true)) return;
    if (!this.mobileVerified) { this.toast.show('Please verify your mobile number before registration.', 'warning'); return; }
    if (!this.firebaseUid) { this.toast.show('Mobile verification failed. Try again.', 'error'); return; }
    this.onboarding.setUserType('PASSENGER');
    this.onboarding.markOtpVerified();
    this.onboarding.markProfileCompleted();
    this.onboarding.markProfilePhotoCaptured();
    this.onboarding.markDiditStatus('PENDING');
    
    this.auth.authenticate('register', 'passenger', this.mobile, '', this.dateOfBirth, this.name, this.gender, this.photoData || undefined, this.firebaseUid, undefined, this.referralCode || undefined, this.deviceFingerprint()).subscribe({
      next: (session) => {
        this.mobileVerificationService.verifyMobileOnBackend(session.id, this.firebaseUid!, this.mobile).subscribe({
          next: () => {
            this.auth.save({ ...session, mobileVerified: true, verificationStatus: 'NOT_STARTED' });
            this.initializeSessionServices();
            this.openStagedRegistration(this.firebaseUid!);
          },
          error: () => {
            this.initializeSessionServices();
            this.router.navigateByUrl('/home');
          }
        });
      },
      error: (error) => this.showAuthError(error, 'Unable to register.')
    });
  }

  loginPassenger() {
    if (!this.validateCredentials(false)) return;
    this.handleOtpLogin('passenger');
  }

  goToOwnerRegister() {
    if (!this.validateCredentials(true)) return;
    if (!this.mobileVerified) { this.toast.show('Please verify your mobile number before registration.', 'warning'); return; }
    if (!this.firebaseUid) { this.toast.show('Mobile verification failed. Try again.', 'error'); return; }
    this.onboarding.setUserType('OWNER');
    this.onboarding.markOtpVerified();
    this.onboarding.markProfileCompleted();
    this.onboarding.markDiditStatus('PENDING');
    
    this.auth.authenticate('register', 'owner', this.mobile, '', this.dateOfBirth, this.name, this.gender, undefined, this.firebaseUid, undefined, this.referralCode || undefined, this.deviceFingerprint()).subscribe({
      next: (session) => {
        this.mobileVerificationService.verifyMobileOnBackend(session.id, this.firebaseUid!, this.mobile).subscribe({
          next: () => {
            this.auth.save({ ...session, mobileVerified: true, verificationStatus: 'NOT_STARTED' });
            this.initializeSessionServices();
            this.openStagedRegistration(this.firebaseUid!);
          },
          error: () => {
            this.initializeSessionServices();
            this.router.navigate(['/owner/register']);
          }
        });
      },
      error: (error) => this.showAuthError(error, 'Unable to register owner.')
    });
  }

  loginOwner() {
    if (!this.validateCredentials(false)) return;
    this.handleOtpLogin('owner');
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

  private openStagedRegistration(firebaseUid: string): void {
    this.registrationApi.saveBasicDetails({
      userType: this.role === 'owner' ? 'OWNER' : 'PASSENGER',
      mobileNumber: this.mobile,
      fullName: this.name,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender.toUpperCase()
    }).subscribe({
      next: () => this.registrationApi.markOtpVerified(firebaseUid).subscribe({
        next: () => this.router.navigateByUrl('/register'),
        error: () => this.toast.show('Mobile verification could not be linked to registration.', 'error')
      }),
      error: () => this.toast.show('Unable to save your registration details.', 'error')
    });
  }

  onGovernmentIdSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.governmentIdProof = input.files?.[0] || null;
  }

  openForm(mode: 'login' | 'register') {
    this.resetOtpState();
    this.showMode = mode;
    this.showForm = true;
    this.isRegistering = mode === 'register';
    setTimeout(() => {
      this.otpService.initializeRecaptcha('recaptcha-container');
      this.otpService.verified$.subscribe(verified => {
        this.mobileVerified = verified;
      });
      this.otpService.otpSent$.subscribe(sent => {
        this.otpSent = sent;
      });
      this.otpService.loading$.subscribe(loading => {
        this.otpLoading = loading;
      });
      this.otpService.error$.subscribe(error => {
        this.otpError = error;
      });
      this.otpService.firebaseUid$.subscribe(uid => {
        this.firebaseUid = uid;
      });
    }, 100);
  }

  closeForm() {
    this.showForm = false;
    this.showMode = null;
    this.resetOtpState();
  }

  private async handleOtpLogin(role: 'passenger' | 'owner') {
    if (!this.mobile) {
      this.toast.show('Enter mobile number', 'warning');
      return;
    }

    if (!this.otpService.validatePhoneNumber(this.mobile)) {
      this.toast.show('Phone number must be 10 digits, starting with 6-9', 'warning');
      return;
    }

    try {
      const check = await this.otpLoginService.checkMobile(this.mobile).toPromise();
      if (!check?.data?.exists) {
        this.toast.show('Mobile number is not registered. Please create an account.', 'warning');
        return;
      }

      if (!this.canLoginWithSelectedRole(check.data, role)) {
        return;
      }

      await this.otpService.sendOtp(this.mobile);
      this.otpSent = true;
      this.toast.show('OTP sent to your mobile number', 'success');
    } catch (error: any) {
      const message = error?.message || error?.error?.message || 'Unable to send OTP. Please try again.';
      this.toast.show(message, 'error');
      console.error('OTP send error:', error);
    }
  }
  
  async handleSendOtp() {
    if (!this.mobile) {
      this.toast.show('Enter mobile number', 'warning');
      return;
    }
    if (!this.otpService.validatePhoneNumber(this.mobile)) {
      this.toast.show('Phone number must be 10 digits, starting with 6-9', 'warning');
      return;
    }

    if (!this.isRegistering) {
      const check = await this.otpLoginService.checkMobile(this.mobile).toPromise();
      if (!check?.data?.exists) {
        this.toast.show('Mobile number is not registered. Please create an account.', 'warning');
        return;
      }
      if (!this.canLoginWithSelectedRole(check.data, this.role)) {
        return;
      }
    }
    
    try {
      await this.otpService.sendOtp(this.mobile);
      this.toast.show('OTP sent to your mobile number', 'success');
    } catch (error: any) {
      const message = error?.message || error?.error?.message || 'Failed to send OTP. Please try again.';
      this.toast.show(message, 'error');
      console.error('OTP send error:', error);
    }
  }

  async handleVerifyOtp() {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.toast.show('Enter 6-digit OTP', 'warning');
      return;
    }

    try {
      const result = await this.otpService.verifyOtp(this.otpCode);
      this.firebaseUid = result.firebaseUid;
      this.mobileVerified = true;

      if (!this.isRegistering) {
        this.toast.show('OTP verified successfully. Please click Login to continue.', 'success');
        return;
      }

      this.toast.show('Mobile verified successfully', 'success');
    } catch (error: any) {
      this.toast.show('Invalid OTP. Please try again.', 'error');
      console.error('OTP verification error:', error);
    }
  }

  private completeOtpLogin() {
    this.auth.authenticate('login', this.role, this.mobile, '', undefined, undefined, undefined, undefined, this.firebaseUid || undefined).subscribe({
      next: (session) => {
        const otpVerifiedSession = { ...session, mobileVerified: true };
        this.auth.save(otpVerifiedSession);

        void this.initializeSessionServices().catch(() => {});
        void this.router.navigateByUrl(this.role === 'owner' ? '/owner/dashboard' : '/home');

        if (this.firebaseUid) {
          this.mobileVerificationService.verifyMobileOnBackend(session.id, this.firebaseUid, this.mobile).subscribe({
            error: (error) => console.error('Backend mobile verification update failed:', error)
          });
        }
      },
      error: (error) => {
        const msg = error?.error?.data?.message || error?.error?.message || 'Unable to login.';
        this.toast.show(msg, 'error');
      }
    });
  }
  
  resetOtpState() {
    this.mobileVerified = false;
    this.otpSent = false;
    this.otpCode = '';
    this.otpLoading = false;
    this.otpError = null;
    this.firebaseUid = null;
    this.otpService.reset();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  submit() {
    if (this.showMode === 'register') {
      if (this.role === 'owner') this.goToOwnerRegister(); else this.registerPassenger();
      return;
    }

    if (this.mobileVerified && this.otpCode.trim().length === 6) {
      this.completeOtpLogin();
      return;
    }

    if (this.otpSent && !this.mobileVerified) {
      this.toast.show('Please verify the OTP before logging in.', 'warning');
      return;
    }

    if (this.role === 'owner') this.loginOwner(); else this.loginPassenger();
  }

  private async initializeSessionServices() {
    await this.messageService.initializePushNotifications();
  }

  private validateCredentials(register: boolean): boolean {
    if (!this.mobile) { this.toast.show('Enter mobile', 'warning'); return false; }
    if (register && this.role === 'passenger' && !this.name.trim()) { this.toast.show('Enter your full name', 'warning'); return false; }
    if (register && !this.dateOfBirth) { this.toast.show('Enter your date of birth', 'warning'); return false; }
    return true;
  }

  private canLoginWithSelectedRole(check: { registeredRole?: string; canLoginAsOwner?: boolean }, role: 'passenger' | 'owner'): boolean {
    if (role !== 'owner') {
      return true;
    }

    const isPassengerOnly = check?.canLoginAsOwner === false || (check?.registeredRole || '').toUpperCase() === 'PASSENGER';
    if (isPassengerOnly) {
      this.toast.show('This mobile number is registered as passenger. Owner login requires owner registration.', 'warning');
      return false;
    }

    return true;
  }

  private showAuthError(error: unknown, fallback: string) {
    const httpError = error instanceof HttpErrorResponse ? error : null;
    const code = httpError?.error?.error?.code;
    if (httpError?.status === 409 || code === 'DUPLICATE_USER') {
      this.toast.show('This mobile number is already registered. Please log in with OTP.', 'warning');
      this.isRegistering = false;
      return;
    }
    const message = httpError?.error?.error?.message || httpError?.error?.message || (error as any)?.message;
    this.toast.show(message || `${fallback} Check the backend connection.`, 'error');
  }
}
