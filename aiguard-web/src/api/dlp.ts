import { apiRequest } from './client';

export interface DetectionLocation {
  startIndex: number;
  endIndex: number;
  line: number;
  column: number;
}

export interface DetectionMatch {
  dataType: string;
  weight: number;
  count: number;
  sample: string;
  reason: string;
  locations: DetectionLocation[];
}

export interface DlpScanResponse {
  scanId?: string;
  receipt?: string;
  contentHash?: string;
  riskScore: number;
  riskLevel: string;
  decision: string;
  matches: DetectionMatch[];
  maskedContent?: string | null;
  policyVersion?: string | null;
  policyReason?: string | null;
  matchedRuleId?: string | null;
  matchedRuleName?: string | null;
}

export interface AiSecurityHealthResult {
  available: boolean;
  status: string;
  version?: string | null;
  error?: string | null;
}

export const dlpApi = {
  getAiHealth(): Promise<AiSecurityHealthResult> {
    return apiRequest<AiSecurityHealthResult>('/dlp/ai-health');
  },

  adminScan(data: {
    content: string;
    websiteAi?: string;
    departmentCode?: string;
  }): Promise<DlpScanResponse> {
    return apiRequest<DlpScanResponse>('/dlp/admin-scan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
