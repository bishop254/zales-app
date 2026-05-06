import { apiConfig } from '@/constants/api';
import { parseApiEnvelope, parseApiEnvelopeNullable } from '@/features/api/api-client';

export type CoverCycle = 'MONTHLY' | 'ANNUAL';

export type CoverRecord = {
  allowPushNotif: boolean;
  createdAt: string;
  currency: string;
  customerIdentifier: string;
  cycle: CoverCycle;
  deletedAt: string | null;
  email: string | null;
  expiryDate: string;
  id: string;
  insurancePremium: number;
  insuranceProduct: string;
  insuranceProvider: string;
  nextDueDate: string | null;
  notificationsSent: {
    annualDue: boolean;
    dueKeys: string[];
    expiryDays: number[];
  } | null;
  phone: string | null;
  policyNumber: string | null;
  renewedAt: string | null;
  updatedAt: string;
  userId: string;
  vehicleReg: string | null;
};

export type CreateCoverPayload = {
  allowPushNotif?: boolean;
  currency?: string;
  customerIdentifier: string;
  cycle: CoverCycle;
  email?: string;
  expiryDate: string;
  insurancePremium: number;
  insuranceProduct: string;
  insuranceProvider: string;
  phone?: string;
  policyNumber?: string;
  vehicleReg?: string;
};

export type UpdateCoverPayload = Partial<CreateCoverPayload>;

function authHeaders(accessToken: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function getCovers(accessToken: string): Promise<CoverRecord[]> {
  const response = await fetch(`${apiConfig.baseUrl}/covers`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<CoverRecord[]>(response);
}

export async function createCover(
  accessToken: string,
  payload: CreateCoverPayload
): Promise<CoverRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/covers`, {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<CoverRecord>(response);
}

export async function getCoverById(accessToken: string, coverId: string): Promise<CoverRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/covers/${coverId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<CoverRecord>(response);
}

export async function updateCover(
  accessToken: string,
  coverId: string,
  payload: UpdateCoverPayload
): Promise<CoverRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/covers/${coverId}`, {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'PATCH',
  });

  return parseApiEnvelope<CoverRecord>(response);
}

export type PaymentTimelineItem = {
  amount: number;
  currency: string;
  cycle: string;
  dueDate: string;
  paidAt: string;
};

export async function getPaymentTimeline(accessToken: string, coverId: string): Promise<PaymentTimelineItem[]> {
  const response = await fetch(`${apiConfig.baseUrl}/covers/${coverId}/payment-timeline`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<PaymentTimelineItem[]>(response);
}

export async function markCyclePaid(accessToken: string, coverId: string): Promise<CoverRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/covers/${coverId}/mark-cycle-paid`, {
    headers: authHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<CoverRecord>(response);
}

export async function markExpiryComplete(accessToken: string, coverId: string): Promise<CoverRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/covers/${coverId}/mark-expiry-complete`, {
    headers: authHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<CoverRecord>(response);
}

export async function deleteCover(accessToken: string, coverId: string): Promise<void> {
  const response = await fetch(`${apiConfig.baseUrl}/covers/${coverId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'DELETE',
  });

  await parseApiEnvelopeNullable(response);
}
