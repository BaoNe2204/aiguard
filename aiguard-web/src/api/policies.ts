import { apiRequest } from './client';

export interface SecurityPolicyResponse {
  id: string;
  name: string;
  departmentName: string | null;
  departmentId: string | null;
  sensitivityThreshold: number;
  enableEmailDetection: boolean;
  enablePhoneDetection: boolean;
  enableCccdDetection: boolean;
  enableApiKeyDetection: boolean;
  enablePasswordDetection: boolean;
  enableTokenDetection: boolean;
  enableDbUrlDetection: boolean;
  enablePrivateKeyDetection: boolean;
  enableSourceCodeDetection: boolean;
  enableFinancialDetection: boolean;
  enableHrDetection: boolean;
  lowAction: string;
  mediumAction: string;
  highAction: string;
  criticalAction: string;
  isActive: boolean;
  scanOnPaste: boolean;
  scanOnSubmit: boolean;
  scanFileUpload: boolean;
  clipboardWarning: boolean;
  offlineCriticalBlock: boolean;
  blockedCodeApps: string;
  version: string;
  updatedAt: string;
}

export interface UpdatePolicyRequest {
  sensitivityThreshold?: number;
  enableEmailDetection?: boolean;
  enablePhoneDetection?: boolean;
  enableCccdDetection?: boolean;
  enableApiKeyDetection?: boolean;
  enablePasswordDetection?: boolean;
  enableTokenDetection?: boolean;
  enableDbUrlDetection?: boolean;
  enablePrivateKeyDetection?: boolean;
  enableSourceCodeDetection?: boolean;
  enableFinancialDetection?: boolean;
  enableHrDetection?: boolean;
  lowAction?: string;
  mediumAction?: string;
  highAction?: string;
  criticalAction?: string;
  isActive?: boolean;
  scanOnPaste?: boolean;
  scanOnSubmit?: boolean;
  scanFileUpload?: boolean;
  clipboardWarning?: boolean;
  offlineCriticalBlock?: boolean;
}

export interface PolicyVersionResponse {
  id: string;
  version: string;
  updatedBy: string;
  updatedAt: string;
  reason: string;
}

export interface WhitelistBlacklistResponse {
  whitelist: string[];
  blacklist: string[];
}

export const policiesApi = {
  getDepartmentPolicies(): Promise<SecurityPolicyResponse[]> {
    return apiRequest<SecurityPolicyResponse[]>('/policies/departments');
  },

  updatePolicy(id: string, data: UpdatePolicyRequest): Promise<SecurityPolicyResponse> {
    return apiRequest<SecurityPolicyResponse>(`/policies/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getVersions(): Promise<PolicyVersionResponse[]> {
    return apiRequest<PolicyVersionResponse[]>('/policies/versions');
  },

  rollback(id: string): Promise<void> {
    return apiRequest<void>(`/policies/versions/${id}/rollback`, { method: 'POST' });
  },

  getWhitelistBlacklist(): Promise<WhitelistBlacklistResponse> {
    return apiRequest<WhitelistBlacklistResponse>('/policies/whitelist-blacklist');
  },

  updateWhitelistBlacklist(data: { whitelist?: string[]; blacklist?: string[] }): Promise<WhitelistBlacklistResponse> {
    return apiRequest<WhitelistBlacklistResponse>('/policies/whitelist-blacklist', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
