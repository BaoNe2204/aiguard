import { apiRequest, buildQuery } from './client';
import type { ApiResponse, PagedResult } from './client';

export interface BusinessDashboardResponse {
  totalTenants: number;
  trialTenants: number;
  paidTenants: number;
  pendingOrders: number;
  pendingPayments: number;
  activeSubscriptions: number;
  expiringLicenses: number;
  openTickets: number;
  recognizedRevenue: number;
  currency: string;
}

export interface TenantRequest {
  code: string;
  companyName: string;
  legalName?: string;
  taxCode?: string;
  emailDomain?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  industry?: string;
  companySize?: string;
  salesNotes?: string;
  status?: string;
}

export interface TenantResponse extends TenantRequest {
  id: string;
  ownerUserId?: string;
  trialStartsAt?: string;
  trialEndsAt?: string;
  activeUsers: number;
  activeDevices: number;
  currentPlan?: string;
  subscriptionStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrialRequest extends TenantRequest {
  ownerPassword?: string;
  trialDays?: number;
  productPlanId?: string;
}

export interface ProductPlanRequest {
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  includedUsers: number;
  includedDevices: number;
  maxAgents: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
}

export interface ProductPlanResponse extends ProductPlanRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRequest {
  tenantId: string;
  productPlanId: string;
  billingCycle: string;
  userQuantity: number;
  deviceQuantity: number;
  discountAmount: number;
  taxPercent: number;
  notes?: string;
  quotationId?: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  tenantId: string;
  tenantCode: string;
  companyName: string;
  productPlanId: string;
  planName: string;
  billingCycle: string;
  userQuantity: number;
  deviceQuantity: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  receiptUrl?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
}

export interface LicenseResponse {
  id: string;
  tenantId: string;
  tenantCode: string;
  subscriptionId?: string;
  planName: string;
  status: string;
  userLimit: number;
  deviceLimit: number;
  agentLimit: number;
  usedUsers: number;
  usedDevices: number;
  usedAgents: number;
  startsAt: string;
  expiresAt: string;
  lastValidatedAt?: string;
}

export interface LicenseCreatedResponse extends LicenseResponse {
  licenseKey: string;
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  companyName: string;
  orderId?: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  vatNumber?: string;
  billingAddress?: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

export interface TicketResponse {
  id: string;
  ticketNumber: string;
  tenantId: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  attachmentUrl?: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export const platformApi = {
  getDashboard: () => 
    apiRequest<BusinessDashboardResponse>('/platform/dashboard'),
    
  getTenants: (params?: { page?: number; pageSize?: number; status?: string }) => 
    apiRequest<PagedResult<TenantResponse>>(`/platform/tenants${buildQuery(params || {})}`),

  createTrialTenant: (data: CreateTrialRequest) => 
    apiRequest<any>('/platform/tenants/trial', { method: 'POST', body: JSON.stringify(data) }),

  updateTenantStatus: (id: string, status: string) => 
    apiRequest<TenantResponse>(`/platform/tenants/${id}/status/${status}`, { method: 'POST' }),

  getPlans: (activeOnly: boolean = false) => 
    apiRequest<ProductPlanResponse[]>(`/platform/plans${buildQuery({ activeOnly })}`),

  createPlan: (data: ProductPlanRequest) => 
    apiRequest<ProductPlanResponse>('/platform/plans', { method: 'POST', body: JSON.stringify(data) }),

  updatePlan: (id: string, data: ProductPlanRequest) => 
    apiRequest<ProductPlanResponse>(`/platform/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getOrders: (params?: { page?: number; pageSize?: number; status?: string; tenantId?: string }) => 
    apiRequest<PagedResult<OrderResponse>>(`/platform/orders${buildQuery(params || {})}`),

  provisionOrder: (id: string) => 
    apiRequest<LicenseCreatedResponse>(`/platform/orders/${id}/provision`, { method: 'POST' }),

  cancelOrder: (id: string, notes?: string) => 
    apiRequest<OrderResponse>(`/platform/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ note: notes }) }),

  getLicenses: (tenantId?: string) => 
    apiRequest<LicenseResponse[]>(`/platform/licenses${tenantId ? `?tenantId=${tenantId}` : ''}`),

  updateLicenseStatus: (id: string, status: string, notes?: string) => 
    apiRequest<LicenseResponse>(`/platform/licenses/${id}/status/${status}`, { method: 'POST', body: JSON.stringify({ note: notes }) }),

  renewLicense: (id: string, data: { months: number; userLimit?: number; deviceLimit?: number; agentLimit?: number }) => 
    apiRequest<LicenseCreatedResponse>(`/platform/licenses/${id}/renew`, { method: 'POST', body: JSON.stringify(data) }),

  getInvoices: (params?: { page?: number; pageSize?: number; status?: string; tenantId?: string }) => 
    apiRequest<PagedResult<InvoiceResponse>>(`/platform/invoices${buildQuery(params || {})}`),

  updateInvoiceStatus: (id: string, status: string) => 
    apiRequest<InvoiceResponse>(`/platform/invoices/${id}/status/${status}`, { method: 'POST' }),

  getTickets: (params?: { page?: number; pageSize?: number; status?: string; tenantId?: string }) => 
    apiRequest<PagedResult<TicketResponse>>(`/platform/tickets${buildQuery(params || {})}`),
    
  updateTicket: (id: string, data: { status?: string; priority?: string; assignedTo?: string }) => 
    apiRequest<TicketResponse>(`/platform/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
