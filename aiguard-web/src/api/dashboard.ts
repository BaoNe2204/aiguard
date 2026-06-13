import { apiRequest, buildQuery } from './client';

export interface DashboardStats {
  totalPromptsChecked: number;
  blockedIncidents: number;
  maskedDetections: number;
  pendingApprovals: number;
  activeProtectedDevices: number;
  failedBlockchainBatches: number;
  extensionActiveCount: number;
  policySyncedCount: number;
  criticalLeaksPrevented: number;
  sensitivePasteDetected: number;
}

export interface DepartmentRisk {
  departmentName: string;
  userCount: number;
  totalPrompts: number;
  maskedCount: number;
  blockedCount: number;
  avgRiskScore: number;
  topDataType: string;
}

export interface TrendDataPoint {
  date: string;
  allowCount: number;
  maskCount: number;
  blockCount: number;
  pendingCount: number;
}

export interface AgentRiskItem {
  agentName: string;
  toolCallCount: number;
  blockedCount: number;
  avgRiskScore: number;
}

export interface AgentRiskResponse {
  totalAgents: number;
  totalToolCalls: number;
  blockedToolCalls: number;
  pendingToolCalls: number;
  topRiskyAgents: AgentRiskItem[];
}

export const dashboardApi = {
  getStats(): Promise<DashboardStats> {
    return apiRequest<DashboardStats>('/dashboard/stats');
  },

  getDepartmentRisk(): Promise<DepartmentRisk[]> {
    return apiRequest<DepartmentRisk[]>('/dashboard/department-risk');
  },

  getTrends(days: number = 7): Promise<TrendDataPoint[]> {
    return apiRequest<TrendDataPoint[]>(`/dashboard/trends${buildQuery({ days })}`);
  },

  getAgentRisk(): Promise<AgentRiskResponse> {
    return apiRequest<AgentRiskResponse>('/dashboard/agent-risk');
  },
};
