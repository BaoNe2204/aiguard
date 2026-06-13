export interface Device {
  id: string;
  hostname: string;
  userEmail: string;
  departmentName: string;
  agentVersion: string;
  extensionVersion: string;
  extensionActive: boolean;
  policyVersion: string;
  lastSeen: string;
  riskStatus: 'Safe' | 'Warning' | 'Critical';
}

export interface AiWebsiteRule {
  id: string;
  name: string;
  domainPattern: string;
  isActive: boolean;
  mode: 'Monitor' | 'Warn' | 'Mask' | 'RequireApproval' | 'Block';
  lastUpdated: string;
}

export interface EndpointEvent {
  id: string;
  userEmail: string;
  hostname: string;
  browser: string;
  websiteAi: string;
  eventType: string;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  decision: 'Allow' | 'Mask' | 'PendingApproval' | 'Block';
  dataTypeMatched: string;
  maskedContentPreview: string;
  originalHash: string;
  policyVersion: string;
  createdAt: string;
}

export interface AIAgent {
  id: string;
  name: string;
  code: string;
  description: string;
  departmentId?: string;
  isEnabled: boolean;
  createdAt: string;
  systemPrompt?: string;
  allowedDataScope?: string;
}

export interface ToolCallLog {
  id: string;
  agentName: string;
  toolName: string;
  actionType: string;
  targetResource: string;
  recipient?: string;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  decision: 'Allow' | 'Mask' | 'PendingApproval' | 'Block';
  reason?: string;
  createdAt: string;
}

export interface BlockchainBatch {
  id: string;
  logCount: number;
  batchHash: string;
  transactionHash?: string;
  blockNumber?: number;
  status: 'Pending' | 'Anchored' | 'Failed';
  createdAt: string;
  anchoredAt?: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  departmentName: string;
  sensitivityThreshold: number;
  enableEmailDetection: boolean;
  enablePhoneDetection: boolean;
  enableCccdDetection: boolean;
  enableApiKeyDetection: boolean;
  enableSourceCodeDetection: boolean;
  enableFinancialDetection: boolean;
  enableHrDetection: boolean;
  lowAction: string;
  mediumAction: string;
  highAction: string;
  criticalAction: string;
  isActive: boolean;
  updatedAt: string;
}
