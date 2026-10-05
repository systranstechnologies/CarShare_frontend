import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RegistrationResumeResponse {
  userType?: 'OWNER' | 'PASSENGER' | null;
  mobileNumber?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  stage?: string;
  registrationCompleted?: boolean;
  mobileVerified?: boolean;
  diditStatus?: string | null;
  profilePhotoUrl?: string | null;
  subscriptionPlanId?: string | null;
  paymentUTR?: string | null;
  subscriptionStatus?: string | null;
  diditLastCheckedAt?: string | null;
  diditRejectReason?: string | null;
}

interface ApiResponse<T> { data: T; }

@Injectable({ providedIn: 'root' })
export class RegistrationApiService {
  private readonly apiUrl = `${environment.apiBaseUrl}/registration`;

  constructor(private http: HttpClient) {}

  resume(): Observable<RegistrationResumeResponse> {
    return this.http.get<ApiResponse<RegistrationResumeResponse>>(`${this.apiUrl}/resume`).pipe(map(response => response.data));
  }

  saveBasicDetails(payload: {
    userType: 'OWNER' | 'PASSENGER';
    mobileNumber: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
  }): Observable<{ stage: string; userType: string }> {
    return this.http.post<ApiResponse<{ stage: string; userType: string }>>(`${this.apiUrl}/basic`, payload).pipe(map(response => response.data));
  }

  markOtpVerified(firebaseUid: string): Observable<{ stage: string; mobileVerified: boolean }> {
    const params = new HttpParams().set('firebaseUid', firebaseUid);
    return this.http.post<ApiResponse<{ stage: string; mobileVerified: boolean }>>(`${this.apiUrl}/otp/verified`, null, { params }).pipe(map(response => response.data));
  }

  markDiditStatus(status: string, sessionId?: string): Observable<{ stage: string; diditStatus: string }> {
    let params = new HttpParams().set('status', status);
    if (sessionId) params = params.set('sessionId', sessionId);
    return this.http.post<ApiResponse<{ stage: string; diditStatus: string }>>(`${this.apiUrl}/didit/status`, null, { params }).pipe(map(response => response.data));
  }

  markProfilePhoto(profilePhoto: File): Observable<{ stage: string; profilePhotoUrl: string }> {
    const form = new FormData();
    form.append('profilePhoto', profilePhoto, profilePhoto.name || 'profile-photo.jpg');
    return this.http.post<ApiResponse<{ stage: string; profilePhotoUrl: string }>>(`${this.apiUrl}/profile-photo`, form).pipe(map(response => response.data));
  }

  selectSubscriptionPlan(planId: string): Observable<{ stage: string; subscriptionPlanId: string }> {
    const params = new HttpParams().set('planId', planId);
    return this.http.post<ApiResponse<{ stage: string; subscriptionPlanId: string }>>(`${this.apiUrl}/subscription`, null, { params }).pipe(map(response => response.data));
  }

  submitPayment(utrNumber: string, screenshotUrl: string): Observable<{ stage: string; registrationCompleted: boolean }> {
    const params = new HttpParams().set('utrNumber', utrNumber).set('screenshotUrl', screenshotUrl);
    return this.http.post<ApiResponse<{ stage: string; registrationCompleted: boolean }>>(`${this.apiUrl}/payment`, null, { params }).pipe(map(response => response.data));
  }

  getSubscriptionPlans(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiBaseUrl}/subscriptions/plans`).pipe(map(response => response.data || []));
  }
}
