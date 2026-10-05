import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RewardDashboard {
  availableCoins: number;
  pendingCoins: number;
  redemptionPendingCoins: number;
  totalEarnedCoins: number;
  usedCoins: number;
  redeemedCoins: number;
  expiredCoins: number;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  minimumRedemption: number;
  maximumRedemption: number;
  subscriptionCoinPercentage: number;
  referrals: any[];
  transactions: any[];
  redemptions: any[];
}

@Injectable({ providedIn: 'root' })
export class RewardsService {
  private readonly api = `${environment.apiBaseUrl}/rewards`;
  constructor(private http: HttpClient) {}

  dashboard(): Observable<RewardDashboard> {
    return this.http.get<any>(`${this.api}/dashboard`).pipe(map(response => response.data));
  }

  redeem(request: any): Observable<any> {
    return this.http.post<any>(`${this.api}/redemptions`, request).pipe(map(response => response.data));
  }

  adminMetrics(): Observable<any> { return this.http.get<any>(`${environment.apiBaseUrl}/admin/rewards/metrics`).pipe(map(response => response.data)); }
  adminReferrals(): Observable<any[]> { return this.http.get<any>(`${environment.apiBaseUrl}/admin/rewards/referrals`).pipe(map(response => response.data || [])); }
  adminRedemptions(): Observable<any[]> { return this.http.get<any>(`${environment.apiBaseUrl}/admin/rewards/redemptions`).pipe(map(response => response.data || [])); }
  updateRedemption(id: string, status: string, note?: string, paymentReference?: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiBaseUrl}/admin/rewards/redemptions/${id}`, { status, note, paymentReference }).pipe(map(response => response.data));
  }
  adminSettings(): Observable<any> { return this.http.get<any>(`${environment.apiBaseUrl}/admin/rewards/settings`).pipe(map(response => response.data)); }
  updateSettings(settings: any): Observable<any> { return this.http.put<any>(`${environment.apiBaseUrl}/admin/rewards/settings`, settings).pipe(map(response => response.data)); }
  adjustWallet(userId: string, amount: number, reason: string): Observable<any> {
    return this.http.post<any>(`${environment.apiBaseUrl}/admin/rewards/wallets/${userId}/adjust`, { amount, reason }).pipe(map(response => response.data));
  }
  exportRedemptions(): Observable<Blob> { return this.http.get(`${environment.apiBaseUrl}/admin/rewards/export.csv`, { responseType: 'blob' }); }
}
