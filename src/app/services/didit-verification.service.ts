import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { VerificationStatus, normalizeVerificationStatus } from './verification-state';

export type VerificationRole = 'PASSENGER' | 'OWNER';
export { VerificationStatus } from './verification-state';

@Injectable({ providedIn: 'root' })
export class DiditVerificationService {
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/didit`;
  constructor(private http: HttpClient) {}

  createSession(role: VerificationRole): Observable<{ sessionId: string; verificationUrl: string; status: string }> {
    return this.http.post<any>(`${this.apiUrl}/session`, null, {
      params: { role, nativeApp: Capacitor.isNativePlatform() }
    }).pipe(map(response => ({ ...response.data, status: normalizeVerificationStatus(response.data?.status) })));
  }

  async openVerification(verificationUrl: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: verificationUrl });
      return;
    }
    window.location.assign(verificationUrl);
  }

  getStatus(): Observable<{ status: VerificationStatus; sessionId: string }> {
    return this.http.get<any>(`${this.apiUrl}/status`).pipe(map(response => ({ ...response.data, status: normalizeVerificationStatus(response.data?.status) })));
  }
}
