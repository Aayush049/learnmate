import { apiClient } from './client';

export interface Plan {
  id: number;
  name: string;
  code: string;
  description?: string;
  price_inr: number;
  original_price_inr?: number;
  billing_interval: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  badge?: string;
}

export interface Entitlement {
  has_active_entitlement: boolean;
  plan_code: string;
  plan_name: string;
  status: string;
  is_lifetime: boolean;
  is_admin: boolean;
  starts_at?: string;
  expires_at?: string;
  days_remaining?: number;
  features: string[];
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id?: string;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  provider: string;
  is_mock: boolean;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  payment_id: string;
  order_id: string;
  plan_code: string;
  entitlement: Entitlement;
}

export interface PaymentHistoryItem {
  id: number;
  order_id?: string;
  payment_id?: string;
  plan_name?: string;
  plan_code?: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  created_at: string;
}

export interface AdminTransactionItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  plan_name: string;
  plan_code: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_order_id?: string;
  provider_payment_id?: string;
  created_at: string;
  refunded: boolean;
}

export interface AdminTransactionsSummary {
  total_revenue_inr: number;
  total_transactions_count: number;
  active_subscribers_count: number;
  refunds_count: number;
  transactions: AdminTransactionItem[];
}

export const paymentsAPI = {
  // Get active subscription plans
  getPlans: async (): Promise<Plan[]> => {
    const response = await apiClient.get<Plan[]>('/payments/plans');
    return response.data;
  },

  // Get current user's active entitlement
  getMyEntitlement: async (): Promise<Entitlement> => {
    const response = await apiClient.get<Entitlement>('/payments/my-entitlement');
    return response.data;
  },

  // Create payment order
  createOrder: async (planCode: string, consentTerms: boolean = true): Promise<CreateOrderResponse> => {
    const response = await apiClient.post<CreateOrderResponse>('/payments/create-order', {
      plan_code: planCode,
      consent_terms: consentTerms,
    });
    return response.data;
  },

  // Verify payment
  verifyPayment: async (
    orderId: string,
    paymentId: string,
    signature?: string
  ): Promise<VerifyPaymentResponse> => {
    const response = await apiClient.post<VerifyPaymentResponse>('/payments/verify-payment', {
      order_id: orderId,
      payment_id: paymentId,
      signature: signature,
      provider: 'razorpay',
    });
    return response.data;
  },

  // User payment invoice history
  getPaymentHistory: async (): Promise<PaymentHistoryItem[]> => {
    const response = await apiClient.get<{ payments: PaymentHistoryItem[] }>('/payments/history');
    return response.data.payments;
  },

  // Admin: Get all transactions summary
  adminGetTransactions: async (): Promise<AdminTransactionsSummary> => {
    const response = await apiClient.get<AdminTransactionsSummary>('/payments/admin/transactions');
    return response.data;
  },

  // Admin: Process statutory refund
  adminProcessRefund: async (
    paymentId: number,
    reason: string,
    amount?: number,
    adminNotes?: string
  ) => {
    const response = await apiClient.post('/payments/admin/refund', {
      payment_id: paymentId,
      reason,
      amount,
      admin_notes: adminNotes,
    });
    return response.data;
  },

  // Admin: Grant or extend student entitlement
  adminGrantEntitlement: async (data: {
    user_id: number;
    plan_code: string;
    duration_days?: number;
    is_lifetime?: boolean;
    notes?: string;
  }): Promise<Entitlement> => {
    const response = await apiClient.post<Entitlement>('/payments/admin/grant-entitlement', data);
    return response.data;
  },
};
