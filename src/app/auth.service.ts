import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { sanitizeMobile } from './phone.util';
import { environment } from '../environments/environment';
import { OtpVerificationService } from './services/otp-verification.service';
import { RegistrationStateService } from './services/registration-state.service';

export interface UserSession {
  id: string;
  role: 'passenger' | 'owner' | 'admin';
  gender?: 'male' | 'female';
  mobile?: string;
  ownerId?: string;
  name?: string;
  profilePhoto?: string;
  mobileVerified?: boolean;
  verificationStatus?: 'NOT_STARTED' | 'INITIATED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private key = 'demo_current_user';
  private apiUrl = `${environment.apiBaseUrl}/auth`;

  constructor(private router: Router, private http: HttpClient, private otpService: OtpVerificationService, private registrationState: RegistrationStateService) {}

  get current(): UserSession | null {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : null;
  }

  save(user: UserSession) {
    localStorage.setItem(this.key, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('carshare-auth-changed', { detail: { user } }));
  }

  saveOtpSession(token: string, userId: string, role: 'passenger' | 'owner' | 'admin', mobile: string): UserSession {
    localStorage.setItem('accessToken', token);
    const session: UserSession = {
      id: userId,
      role,
      mobile: sanitizeMobile(mobile),
    };
    this.save(session);
    return session;
  }

  authenticate(mode: 'login' | 'register', role: 'passenger' | 'owner' | 'admin', mobile: string, password: string = '', dateOfBirth?: string, name?: string, gender?: string, photoDataUrl?: string, firebaseUid?: string, governmentIdProof?: File, referralCode?: string, deviceFingerprint?: string): Observable<UserSession> {
    const payload: any = { role: role.toUpperCase(), mobile };
    if (password && password.trim()) payload.password = password;
    if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
    if (name) payload.name = name;
    if (gender) payload.gender = gender;
    if (firebaseUid) payload.firebaseUid = firebaseUid;
    if (referralCode) payload.referralCode = referralCode.trim();
    if (deviceFingerprint) payload.deviceFingerprint = deviceFingerprint;

    if (mode === 'register' && role === 'passenger') {
      const form = new FormData();
      form.append('role', payload.role);
      form.append('mobile', payload.mobile);
      if (payload.password) form.append('password', payload.password);
      if (payload.dateOfBirth) form.append('dateOfBirth', payload.dateOfBirth);
      if (payload.name) form.append('name', payload.name);
      if (payload.gender) form.append('gender', payload.gender);
      if (payload.firebaseUid) form.append('firebaseUid', payload.firebaseUid);
      if (payload.referralCode) form.append('referralCode', payload.referralCode);
      if (payload.deviceFingerprint) form.append('deviceFingerprint', payload.deviceFingerprint);
      if (photoDataUrl) form.append('profilePhoto', this.dataUrlToFile(photoDataUrl, 'profile-photo.png'));
      if (governmentIdProof) form.append('governmentIdProof', governmentIdProof);
      return this.http.post<{ data: any }>(`${this.apiUrl}/${mode}`, form).pipe(
        tap((response) => this.handleAuthResponse(response.data, role)),
        map((response) => this.buildSession(response.data, role))
      );
    }

    return this.http.post<{ data: any }>(`${this.apiUrl}/${mode}`, payload).pipe(
      tap((response) => this.handleAuthResponse(response.data, role)),
      map((response) => this.buildSession(response.data, role))
    );
  }

  private handleAuthResponse(token: any, role: string) {
    if (token?.accessToken) localStorage.setItem('accessToken', token.accessToken);
    if (token?.refreshToken) localStorage.setItem('refreshToken', token.refreshToken);
  }

  private buildSession(token: any, role: string): UserSession {
    const base = environment.apiBaseUrl.replace(/\/api\/?$/, '');
    const rawProfilePhoto = String(token.profilePhotoUrl || '').trim();
    const profilePhoto = rawProfilePhoto
      ? (/^(https?:|data:image)\/\//i.test(rawProfilePhoto) || rawProfilePhoto.startsWith('data:image/')
        ? rawProfilePhoto
        : `${base}/files/${rawProfilePhoto.replace(/^\/?(files\/)?/i, '')}`)
      : undefined;
    const session: UserSession = { id: token.userId, role: role as any, mobile: sanitizeMobile(token.mobile), ownerId: token.ownerId || undefined, name: token.name || undefined, profilePhoto, mobileVerified: token.mobileVerified === true, verificationStatus: token.verificationStatus || 'NOT_STARTED' };
    if (token.gender) session.gender = String(token.gender).toLowerCase() as UserSession['gender'];
    this.save(session);
    return session;
  }

  private dataUrlToFile(dataUrl: string, name: string): File {
    const [header, encoded] = dataUrl.split(',');
    const mime = header?.match(/:(.*?);/)?.[1] || 'image/png';
    const bytes = atob(encoded || '');
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], name, { type: mime });
  }

  clear() {
    this.otpService.reset();
    this.registrationState.reset();
    localStorage.removeItem(this.key);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new CustomEvent('carshare-auth-changed', { detail: { user: null } }));
  }

  logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    const finish = () => { this.clear(); this.router.navigateByUrl('/'); };
    if (!refreshToken) { finish(); return; }
    this.http.post<void>(`${this.apiUrl}/logout`, { refreshToken }).subscribe({ complete: finish, error: finish });
  }
}
