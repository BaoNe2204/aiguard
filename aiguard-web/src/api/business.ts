import { apiRequest } from './client';
import type { OrderResponse, ProductPlanResponse, TenantResponse } from './platform';

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

  createOrder: (data: TenantOrderRequest) =>
    apiRequest<OrderResponse>('/business/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
