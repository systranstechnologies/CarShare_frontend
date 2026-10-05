import { Injectable } from '@angular/core';

export type OnboardingUserType = 'PASSENGER' | 'OWNER';
export type OnboardingStatus = 'PENDING' | 'INITIATED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type SubscriptionApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OnboardingState {
  userType: OnboardingUserType | null;
  otpVerified: boolean;
  profileCompleted: boolean;
  diditStatus: OnboardingStatus;
  profilePhotoCaptured: boolean;
  subscriptionSelected: boolean;
  subscriptionApprovalStatus: SubscriptionApprovalStatus | null;
  onboardingCompleted: boolean;
}

@Injectable({ providedIn: 'root' })
export class OnboardingStateService {
  private readonly storageKey = 'carshare_onboarding_state';
  private state: OnboardingState = this.loadState();

  constructor() {}

  get current(): OnboardingState {
    return { ...this.state };
  }

  setUserType(userType: OnboardingUserType) {
    this.state = { ...this.state, userType };
    this.persist();
  }

  markOtpVerified() {
    this.state = { ...this.state, otpVerified: true };
    this.persist();
  }

  markProfileCompleted() {
    this.state = { ...this.state, profileCompleted: true };
    this.persist();
  }

  markDiditStatus(status: OnboardingStatus | string) {
    const normalized = this.normalizeDiditStatus(status);
    this.state = { ...this.state, diditStatus: normalized, onboardingCompleted: this.calculateOnboardingCompletion() };
    this.persist();
  }

  markProfilePhotoCaptured() {
    this.state = { ...this.state, profilePhotoCaptured: true };
    this.persist();
  }

  markSubscriptionSelected() {
    this.state = { ...this.state, subscriptionSelected: true };
    this.persist();
  }

  markSubscriptionApprovalStatus(status: SubscriptionApprovalStatus) {
    this.state = { ...this.state, subscriptionApprovalStatus: status };
    this.persist();
  }

  reset() {
    this.state = this.defaultState();
    localStorage.removeItem(this.storageKey);
  }

  canPassengerSearchAndBook(): boolean {
    return this.state.userType === 'PASSENGER' && this.state.diditStatus === 'APPROVED';
  }

  canOwnerPostRide(): boolean {
    return this.state.userType === 'OWNER'
      && this.state.diditStatus === 'APPROVED'
      && this.state.subscriptionApprovalStatus === 'APPROVED';
  }

  hasPendingVerification(): boolean {
    return this.state.diditStatus === 'PENDING' || this.state.diditStatus === 'UNDER_REVIEW';
  }

  private calculateOnboardingCompletion(): boolean {
    if (this.state.userType === 'PASSENGER') {
      return this.state.otpVerified && this.state.profileCompleted && this.state.diditStatus === 'APPROVED' && this.state.profilePhotoCaptured;
    }
    if (this.state.userType === 'OWNER') {
      return this.state.otpVerified
        && this.state.profileCompleted
        && this.state.diditStatus === 'APPROVED'
        && this.state.profilePhotoCaptured
        && this.state.subscriptionSelected
        && this.state.subscriptionApprovalStatus === 'APPROVED';
    }
    return false;
  }

  private normalizeDiditStatus(status: OnboardingStatus | string): OnboardingStatus {
    const value = String(status || '').toUpperCase();
    if (value === 'INITIATED' || value === 'PENDING' || value === 'NOT_STARTED') return 'PENDING';
    if (value === 'UNDER_REVIEW' || value === 'IN_REVIEW') return 'UNDER_REVIEW';
    if (value === 'APPROVED' || value === 'VERIFIED') return 'APPROVED';
    if (value === 'REJECTED' || value === 'DECLINED') return 'REJECTED';
    return 'PENDING';
  }

  private persist() {
    this.state = { ...this.state, onboardingCompleted: this.calculateOnboardingCompletion() };
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  private loadState(): OnboardingState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.defaultState();
      const parsed = JSON.parse(raw) as Partial<OnboardingState>;
      return { ...this.defaultState(), ...parsed };
    } catch {
      return this.defaultState();
    }
  }

  private defaultState(): OnboardingState {
    return {
      userType: null,
      otpVerified: false,
      profileCompleted: false,
      diditStatus: 'PENDING',
      profilePhotoCaptured: false,
      subscriptionSelected: false,
      subscriptionApprovalStatus: null,
      onboardingCompleted: false,
    };
  }
}
