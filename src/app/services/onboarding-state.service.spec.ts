import { TestBed } from '@angular/core/testing';
import { OnboardingStateService, OnboardingUserType } from './onboarding-state.service';

describe('OnboardingStateService', () => {
  let service: OnboardingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnboardingStateService);
    localStorage.clear();
  });

  it('should persist passenger onboarding state and allow booking only after DIDIT approval', () => {
    service.setUserType('PASSENGER');
    service.markOtpVerified();
    service.markProfileCompleted();
    service.markDiditStatus('UNDER_REVIEW');

    expect(service.current.userType).toBe('PASSENGER');
    expect(service.current.otpVerified).toBeTrue();
    expect(service.canPassengerSearchAndBook()).toBeFalse();

    service.markDiditStatus('APPROVED');
    expect(service.current.diditStatus).toBe('APPROVED');
    expect(service.canPassengerSearchAndBook()).toBeTrue();
  });

  it('should block owner ride posting until payment approval is complete', () => {
    service.setUserType('OWNER');
    service.markOtpVerified();
    service.markProfileCompleted();
    service.markDiditStatus('APPROVED');
    service.markSubscriptionSelected();
    service.markSubscriptionApprovalStatus('PENDING');

    expect(service.canOwnerPostRide()).toBeFalse();

    service.markSubscriptionApprovalStatus('APPROVED');
    expect(service.canOwnerPostRide()).toBeTrue();
  });
});
