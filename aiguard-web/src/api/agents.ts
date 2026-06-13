import { apiRequest, buildQuery } from './client';
import type { PagedResult, PagedQuery } from './client';

export interface AgentResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departmentName: string | null;
  departmentId: string | null;
  isEnabled: boolean;
  createdAt: string;
  toolCallsToday: number;
  riskScoreToday: number;
}

export interface ToolPermissionResponse {
  id: string;
  toolName: string;
  category: string;
  isAllowed: boolean;
  requiresApproval: boolean;
  maxRecords: number;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canSendExternal: boolean;
  canExport: boolean;
}

export interface ToolCallLogResponse {
  id: string;
  agentName: string;
  toolName: string;
  actionType: string;
  targetResource: string | null;
  recipient: string | null;
  riskScore: number;
  riskLevel: string;
  decision: string;
  reason: string | null;
  createdAt: string;
}

export interface SimulateRequest {
  agentId: string;
  toolName: string;
  recipient?: string;
  recordCount?: number;
  payloadJson?: string;
}

export interface SimulateResponse {
  decision: string;
  riskScore: number;
  ruleMatched: string;
  reason: string;
}

export const agentsApi = {
  getAgents(): Promise<AgentResponse[]> {
    return apiRequest<AgentResponse[]>('/agents');
  },

  createAgent(data: { name: string; code: string; description?: string; departmentId?: string }): Promise<AgentResponse> {
    return apiRequest<AgentResponse>('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAgent(id: string, data: { name?: string; description?: string; isEnabled?: boolean; departmentId?: string }): Promise<AgentResponse> {
    return apiRequest<AgentResponse>(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getToolPermissions(agentId: string): Promise<ToolPermissionResponse[]> {
    return apiRequest<ToolPermissionResponse[]>(`/agents/${agentId}/tool-permissions`);
  },

  upsertToolPermission(agentId: string, data: {
    toolName: string;
    isAllowed: boolean;
    requiresApproval: boolean;
    maxRecords: number;
    category?: string;
    canRead?: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
    canSendExternal?: boolean;
    canExport?: boolean;
  }): Promise<ToolPermissionResponse> {
    return apiRequest<ToolPermissionResponse>(`/agents/${agentId}/tool-permissions`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getToolCalls(query: PagedQuery = {}, agentId?: string): Promise<PagedResult<ToolCallLogResponse>> {
    return apiRequest<PagedResult<ToolCallLogResponse>>(
      `/agents/tool-calls${buildQuery({ ...query, agentId })}`
    );
  },

  simulate(data: SimulateRequest): Promise<SimulateResponse> {
    return apiRequest<SimulateResponse>('/agents/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
