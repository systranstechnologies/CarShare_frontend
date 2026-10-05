export type VerificationStatus = 'NOT_STARTED' | 'INITIATED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface VerificationUIState {
  status: VerificationStatus;
  canStart: boolean;
  showProgress: boolean;
  showRefresh: boolean;
  showRetry: boolean;
  isApproved: boolean;
  label: string;
}

export function normalizeVerificationStatus(status: string | null | undefined): VerificationStatus {
  switch (String(status || '').toUpperCase()) {
    case 'VERIFIED': case 'APPROVED': return 'APPROVED';
    case 'INITIATED': return 'INITIATED';
    case 'IN_REVIEW': case 'UNDER_REVIEW': return 'UNDER_REVIEW';
    case 'REJECTED': case 'DECLINED': return 'REJECTED';
    default: return 'NOT_STARTED';
  }
}

export function getVerificationUIState(status: string | null | undefined): VerificationUIState {
  const normalized = normalizeVerificationStatus(status);
  return {
    status: normalized,
    canStart: normalized === 'NOT_STARTED',
    showProgress: normalized === 'INITIATED' || normalized === 'UNDER_REVIEW',
    showRefresh: normalized === 'INITIATED' || normalized === 'UNDER_REVIEW',
    showRetry: normalized === 'REJECTED',
    isApproved: normalized === 'APPROVED',
    label: normalized === 'NOT_STARTED' ? 'Not started' : normalized === 'INITIATED' ? 'Verification started' : normalized === 'UNDER_REVIEW' ? 'Under review' : normalized === 'APPROVED' ? 'Approved' : 'Rejected'
  };
}
