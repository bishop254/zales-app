import { apiConfig } from '@/constants/api';
import { parseApiEnvelope } from '@/features/api/api-client';

export type BillingPlan = {
  billingCycle: 'MONTHLY' | 'YEARLY';
  currency: string;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  priceKes: number;
  priceUsd: number;
  sortOrder: number;
};

export type BillingSubscription = {
  autoRenew: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  id: string;
  plan?: BillingPlan;
  planId: string;
  startsAt: string | null;
  status: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED';
  updatedAt: string;
  userId: string;
};

export type BillingOverview = {
  availablePlans?: BillingPlan[];
  currentPayment?: BillingPaymentStatus | null;
  hasActiveSubscription: boolean;
  subscription: BillingSubscription | null;
  subscriptionHistory?: BillingSubscription[];
};

export type MpesaCheckoutPayload = {
  phoneNumber: string;
  planId: string;
};

export type MpesaCheckoutResult = {
  message: string;
  paymentId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  subscriptionId: string;
};

export type BillingPaymentStatus = {
  amount: number;
  checkoutRequestId: string | null;
  createdAt: string;
  currency: string;
  merchantRequestId: string | null;
  paidAt: string | null;
  paymentId: string;
  phoneNumber: string | null;
  providerReceipt: string | null;
  providerResultCode: string | null;
  providerResultDescription: string | null;
  providerState: 'COMPLETE' | 'FAILED' | 'PENDING' | 'PROCESSING' | 'UNKNOWN' | null;
  providerStateDescription: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  updatedAt: string;
};

export type BillingBillItem = {
  amount: number;
  createdAt: string;
  currency: string;
  paymentId: string;
  phoneNumber: string | null;
  providerReceipt: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  subscriptionStatus: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED' | null;
  updatedAt: string;
};

export type BillingBillsResult = {
  active: BillingBillItem[];
  past: BillingBillItem[];
};

function authHeaders(accessToken: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function getBillingOverview(accessToken: string): Promise<BillingOverview> {
  const response = await fetch(`${apiConfig.baseUrl}/billing/me/subscription`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<BillingOverview>(response);
}

export async function getBillingPlans(): Promise<BillingPlan[]> {
  const response = await fetch(`${apiConfig.baseUrl}/billing/plans`, {
    headers: {
      Accept: 'application/json',
    },
  });

  return parseApiEnvelope<BillingPlan[]>(response);
}

export async function initiateMpesaCheckout(
  accessToken: string,
  payload: MpesaCheckoutPayload
): Promise<MpesaCheckoutResult> {
  const response = await fetch(`${apiConfig.baseUrl}/billing/checkout/mpesa`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseApiEnvelope<MpesaCheckoutResult>(response);
}

export async function getBillingPaymentStatus(
  accessToken: string,
  paymentId: string
): Promise<BillingPaymentStatus> {
  const response = await fetch(`${apiConfig.baseUrl}/billing/payments/${paymentId}/status`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<BillingPaymentStatus>(response);
}

export async function getBillingBills(accessToken: string): Promise<BillingBillsResult> {
  const response = await fetch(`${apiConfig.baseUrl}/billing/me/bills`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<BillingBillsResult>(response);
}
