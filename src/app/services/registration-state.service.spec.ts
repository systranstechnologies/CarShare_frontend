import { RegistrationStateService, RegistrationStage, RegistrationUserType } from './registration-state.service';

describe('RegistrationStateService', () => {
  let service: RegistrationStateService;

  beforeEach(() => {
    localStorage.clear();
    service = new RegistrationStateService();
  });

  it('should persist user type and resume from the last incomplete stage', () => {
    service.selectUserType('OWNER');
    service.markBasicDetailsCompleted({
      mobileNumber: '+919876543210',
      fullName: 'Test Owner',
      dateOfBirth: '1995-05-05',
      gender: 'MALE'
    });
    service.markOtpVerified();

    expect(service.current.userType).toBe('OWNER');
    expect(service.current.stage).toBe(RegistrationStage.DOCUMENT_VERIFIED);
    expect(service.getNextStage()).toBe(RegistrationStage.DOCUMENT_VERIFIED);
  });

  it('should keep passenger registration in the final completed state after photo capture', () => {
    service.selectUserType('PASSENGER');
    service.markBasicDetailsCompleted({
      mobileNumber: '+919876543211',
      fullName: 'Test Passenger',
      dateOfBirth: '2000-01-15',
      gender: 'FEMALE'
    });
    service.markOtpVerified();
    service.markDiditApproved();
    service.markProfilePhotoCompleted('https://example.com/photo.jpg');

    expect(service.current.registrationCompleted).toBeTrue();
    expect(service.current.stage).toBe(RegistrationStage.REGISTRATION_COMPLETED);
    expect(service.current.userType).toBe(RegistrationUserType.PASSENGER);
  });
});
