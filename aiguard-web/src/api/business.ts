import { apiRequest, buildQuery } from './client';
import type { PagedResult } from './client';
import type {
  OnboardingListResponse,
  OnboardingResponse,
  OrderResponse, ProductPlanResponse, TenantResponse, PaymentResponse,
  LicenseResponse, TicketResponse, EnrollmentTokenResponse,
  LicenseCreatedResponse
} from './platform';

export type { OnboardingListResponse, OnboardingResponse };

export interface CheckoutOrderRequest {
  amount: number;
  currency?: string;
  method?: string;
  transactionReference?: string;
  periodMonths: number;
}

export interface CheckoutOrderResponse {
  order: OrderResponse;
  payment: PaymentResponse;
  license: LicenseCreatedResponse;
}

export interface TenantSettingsRequest {
  logoUrl?: string;
  primaryDomain?: string;
  defaultRetentionDays: number;
  timeZone: string;
  locale: string;
  bankCode?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  paymentWebhookUrl?: string;
  billingAddress?: string;
  agentBlockedCodeApps?: string;
}

export interface TenantSettingsResponse extends TenantSettingsRequest {
  id: string;
  tenantId: string;
  updatedAt: string;
}

export interface ContactRequest {
  fullName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  isPrimary: boolean;
  isBillingContact: boolean;
}

export interface ContactResponse extends ContactRequest {
  id: string;
  tenantId: string;
  createdAt: string;
}

export interface TenantOrderRequest {
  tenantId: string;
  productPlanId: string;
  billingCycle: string;
  userQuantity: number;
  deviceQuantity: number;
  discountAmount: number;
  taxPercent: number;
  notes?: string;
}

export interface QuotationRequest {
  productPlanId: string;
  billingCycle: string;
  userQuantity: number;
  deviceQuantity: number;
  discountAmount: number;
  taxPercent: number;
  terms?: string;
  validUntil?: string;
}

export interface SubscriptionResponse {
  id: string;
  planName: string;
  status: string;
  billingCycle: string;
  userLimit: number;
  deviceLimit: number;
  agentLimit: number;
  autoRenew: boolean;
  startsAt: string;
  currentPeriodEndsAt: string;
}

export interface QuotationResponse {
  id: string;
  quotationNumber: string;
  planName: string;
  billingCycle: string;
  userQuantity: number;
  deviceQuantity: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  terms?: string;
  validUntil: string;
  createdAt: string;
}

export const businessApi = {
  getTenant: () =>
    apiRequest<TenantResponse>('/business/tenant'),

  getPlans: () =>
    apiRequest<ProductPlanResponse[]>('/business/plans'),

  getSettings: () =>
    apiRequest<TenantSettingsResponse>('/business/settings'),

  updateSettings: (data: TenantSettingsRequest) =>
    apiRequest<TenantSettingsResponse>('/business/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getContacts: () =>
    apiRequest<ContactResponse[]>('/business/contacts'),

  createContact: (data: ContactRequest) =>
    apiRequest<ContactResponse>('/business/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateContact: (id: string, data: ContactRequest) =>
    apiRequest<ContactResponse>(`/business/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteContact: (id: string) =>
    apiRequest<object>(`/business/contacts/${id}`, { method: 'DELETE' }),

  getSubscriptions: () =>
    apiRequest<SubscriptionResponse[]>('/business/subscriptions'),

  createOrder: (data: TenantOrderRequest) =>
    apiRequest<OrderResponse>('/business/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordPayment: (orderId: string, data: { amount: number; transactionReference?: string; receiptUrl?: string }) =>
    apiRequest<PaymentResponse>(`/business/orders/${orderId}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        currency: 'VND',
        method: 'BankTransfer',
        transactionReference: data.transactionReference,
        receiptUrl: data.receiptUrl,
        paidAt: new Date().toISOString()
      }),
    }),

  checkoutOrder: (orderId: string, data: CheckoutOrderRequest) =>
    apiRequest<CheckoutOrderResponse>(`/business/orders/${orderId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency || 'VND',
        method: data.method || 'InstantDemo',
        transactionReference: data.transactionReference,
        periodMonths: data.periodMonths
      }),
    }),

  getPayments: (params?: { page?: number; pageSize?: number; status?: string }) =>
    apiRequest<PagedResult<PaymentResponse>>(`/business/payments${buildQuery(params || {})}`),

  getLicenses: () =>
    apiRequest<LicenseResponse[]>('/business/licenses'),

  getOrders: (params?: { page?: number; pageSize?: number; status?: string }) =>
    apiRequest<PagedResult<OrderResponse>>(`/business/orders${buildQuery(params || {})}`),

  getQuotations: (params?: { page?: number; pageSize?: number; status?: string }) =>
    apiRequest<PagedResult<QuotationResponse>>(`/business/quotations${buildQuery(params || {})}`),

  createQuotation: (data: QuotationRequest) =>
    apiRequest<QuotationResponse>('/business/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  convertQuotation: (id: string) =>
    apiRequest<{ orderId: string; orderNumber: string }>(`/business/quotations/${id}/convert`, {
      method: 'POST',
    }),

  getTickets: (params?: { page?: number; pageSize?: number; status?: string }) =>
    apiRequest<PagedResult<TicketResponse>>(`/business/tickets${buildQuery(params || {})}`),

  createTicket: (data: { subject: string; message: string; priority?: string; category?: string }) =>
    apiRequest<TicketResponse>('/business/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addTicketMessage: (id: string, data: { message: string }) =>
    apiRequest<TicketResponse>(`/business/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOnboarding: () =>
    apiRequest<OnboardingResponse | OnboardingListResponse>('/business/onboarding'),

  updateOnboarding: (data: {
    extensionInstalled?: boolean;
    firstUserAdded?: boolean;
    policyEnabled?: boolean;
    testPromptCompleted?: boolean;
    notes?: string;
  }) =>
    apiRequest<OnboardingResponse>('/business/onboarding', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  regenerateEnrollmentToken: () =>
    apiRequest<EnrollmentTokenResponse>('/business/onboarding/enrollment-token', {
      method: 'POST',
    }),
};
