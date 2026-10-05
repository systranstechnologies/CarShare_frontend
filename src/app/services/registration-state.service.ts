import { Injectable } from '@angular/core';

export enum RegistrationUserType {
  OWNER = 'OWNER',
  PASSENGER = 'PASSENGER'
}

export enum RegistrationStage {
  USER_TYPE_SELECTED = 'USER_TYPE_SELECTED',
  BASIC_DETAILS_COMPLETED = 'BASIC_DETAILS_COMPLETED',
  OTP_VERIFIED = 'OTP_VERIFIED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  PROFILE_PHOTO_COMPLETED = 'PROFILE_PHOTO_COMPLETED',
  SUBSCRIPTION_SELECTED = 'SUBSCRIPTION_SELECTED',
  PAYMENT_SUBMITTED = 'PAYMENT_SUBMITTED',
  REGISTRATION_COMPLETED = 'REGISTRATION_COMPLETED'
}

export interface RegistrationProfileState {
  userType: RegistrationUserType | null;
  stage: RegistrationStage;
  registrationCompleted: boolean;
  mobileNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  mobileVerified: boolean;
  diditStatus: string | null;
  diditSessionId: string | null;
  diditLastCheckedAt: string | null;
  profilePhotoUrl: string | null;
  subscriptionPlanId: string | null;
  subscriptionStatus: string | null;
  paymentUTR: string | null;
  paymentScreenshotUrl: string | null;
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class RegistrationStateService {
  private readonly storageKey = 'carshare_registration_state_v2';
  private state: RegistrationProfileState = this.load();

  get current(): RegistrationProfileState {
    return { ...this.state };
  }

  selectUserType(userType: RegistrationUserType): RegistrationProfileState {
    this.state = {
      ...this.state,
      userType,
      stage: RegistrationStage.USER_TYPE_SELECTED,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  setCallbackUserType(userType: RegistrationUserType): RegistrationProfileState {
    this.state = {
      ...this.state,
      userType,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markBasicDetailsCompleted(payload: { mobileNumber: string; fullName: string; dateOfBirth: string; gender: string }): RegistrationProfileState {
    this.state = {
      ...this.state,
      mobileNumber: payload.mobileNumber,
      fullName: payload.fullName,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      stage: RegistrationStage.BASIC_DETAILS_COMPLETED,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markOtpVerified(): RegistrationProfileState {
    this.state = {
      ...this.state,
      mobileVerified: true,
      stage: RegistrationStage.OTP_VERIFIED,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markDiditStatus(status: string | null, sessionId?: string | null): RegistrationProfileState {
    const normalized = (status || '').toUpperCase();
    // Ensure stage is at least OTP_VERIFIED when DiDit status is being set
    let newStage = this.state.stage;
    if (normalized === 'APPROVED') {
      newStage = RegistrationStage.DOCUMENT_VERIFIED;
    } else if (normalized && (normalized === 'INITIATED' || normalized === 'UNDER_REVIEW' || normalized === 'IN_REVIEW' || normalized === 'PENDING')) {
      // Keep stage at minimum OTP_VERIFIED for pending verifications
      if (newStage === RegistrationStage.BASIC_DETAILS_COMPLETED || newStage === RegistrationStage.USER_TYPE_SELECTED) {
        newStage = RegistrationStage.OTP_VERIFIED;
      }
    }
    this.state = {
      ...this.state,
      diditStatus: normalized,
      diditSessionId: sessionId ?? this.state.diditSessionId,
      diditLastCheckedAt: new Date().toISOString(),
      stage: newStage,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markDiditApproved(): RegistrationProfileState {
    this.state = {
      ...this.state,
      diditStatus: 'APPROVED',
      diditLastCheckedAt: new Date().toISOString(),
      stage: RegistrationStage.DOCUMENT_VERIFIED,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markProfilePhotoCompleted(photoUrl: string): RegistrationProfileState {
    this.state = {
      ...this.state,
      profilePhotoUrl: photoUrl,
      stage: this.state.userType === RegistrationUserType.OWNER ? RegistrationStage.PROFILE_PHOTO_COMPLETED : RegistrationStage.REGISTRATION_COMPLETED,
      registrationCompleted: this.state.userType === RegistrationUserType.PASSENGER,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markSubscriptionSelected(planId: string): RegistrationProfileState {
    this.state = {
      ...this.state,
      subscriptionPlanId: planId,
      stage: RegistrationStage.SUBSCRIPTION_SELECTED,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markPaymentSubmitted(utr: string, screenshotUrl: string): RegistrationProfileState {
    this.state = {
      ...this.state,
      paymentUTR: utr,
      paymentScreenshotUrl: screenshotUrl,
      subscriptionStatus: 'VERIFICATION_IN_PROGRESS',
      stage: RegistrationStage.PAYMENT_SUBMITTED,
      registrationCompleted: true,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  markRegistrationCompleted(): RegistrationProfileState {
    this.state = {
      ...this.state,
      stage: RegistrationStage.REGISTRATION_COMPLETED,
      registrationCompleted: true,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.current;
  }

  getNextStage(): RegistrationStage {
    const states = [
      RegistrationStage.USER_TYPE_SELECTED,
      RegistrationStage.BASIC_DETAILS_COMPLETED,
      RegistrationStage.OTP_VERIFIED,
      RegistrationStage.DOCUMENT_VERIFIED,
      RegistrationStage.PROFILE_PHOTO_COMPLETED,
      RegistrationStage.SUBSCRIPTION_SELECTED,
      RegistrationStage.PAYMENT_SUBMITTED,
      RegistrationStage.REGISTRATION_COMPLETED
    ];

    const currentIndex = states.indexOf(this.state.stage);
    if (this.state.userType === RegistrationUserType.PASSENGER && this.state.stage === RegistrationStage.PROFILE_PHOTO_COMPLETED) {
      return RegistrationStage.REGISTRATION_COMPLETED;
    }
    return states[Math.min(currentIndex + 1, states.length - 1)];
  }

  reset(): void {
    this.state = this.defaultState();
    localStorage.removeItem(this.storageKey);
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  private load(): RegistrationProfileState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.defaultState();
      return { ...this.defaultState(), ...JSON.parse(raw) } as RegistrationProfileState;
    } catch {
      return this.defaultState();
    }
  }

  private defaultState(): RegistrationProfileState {
    return {
      userType: null,
      stage: RegistrationStage.USER_TYPE_SELECTED,
      registrationCompleted: false,
      mobileNumber: null,
      fullName: null,
      dateOfBirth: null,
      gender: null,
      mobileVerified: false,
      diditStatus: null,
      diditSessionId: null,
      diditLastCheckedAt: null,
      profilePhotoUrl: null,
      subscriptionPlanId: null,
      subscriptionStatus: null,
      paymentUTR: null,
      paymentScreenshotUrl: null,
      updatedAt: null
    };
  }
}
