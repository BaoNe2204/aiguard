import { apiRequest } from './client';

export interface PublicTrialSignupRequest {
  preferredTenantCode?: string;
  companyName: string;
  legalName?: string;
  taxCode?: string;
  emailDomain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone?: string;
  industry?: string;
  companySize?: string;
  salesNotes?: string;
  productPlanCode?: string;
  trialDays?: number;
}

export interface PublicTrialSignupResponse {
  tenantCode: string;
  companyName: string;
  ownerEmail: string;
  status: string;
  trialEndsAt: string;
  verificationToken?: string;
  message: string;
}

export interface VerifyTrialSignupResponse {
  tenantCode: string;
  ownerEmail: string;
  emailVerified: boolean;
  requiresMfaSetup: boolean;
  nextStep: string;
}

export const signupApi = {
  registerTrial(payload: PublicTrialSignupRequest) {
    return apiRequest<PublicTrialSignupResponse>('/signup/trial', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verify(verificationToken: string, newPassword: string) {
    return apiRequest<VerifyTrialSignupResponse>('/signup/verify', {
      method: 'POST',
      body: JSON.stringify({ verificationToken, newPassword }),
    });
  },
};
