import { apiConfig } from '@/constants/api';
import { parseApiEnvelope } from '@/features/api/api-client';

export type UserProfileRecord = {
  authProvider: 'LOCAL' | 'GOOGLE';
  countryOfResidence: string | null;
  createdAt: string;
  email: string;
  firstName: string;
  gender: string | null;
  id: string;
  isAgentApproved: boolean;
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  lastName: string;
  metadata?: Record<string, unknown> | null;
  otherName: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  referralCode: string | null;
  referredByCode?: string | null;
  referredByUserId?: string | null;
  roles: string[];
  status: string;
  updatedAt: string;
};

export type UserAuditLogRecord = {
  action: string;
  createdAt: string;
  entityId: string;
  entityType: string;
  id: string;
  payload: Record<string, unknown> | null;
  userEmail: string;
  userId: string;
};

export type UserAuditLogResponse = {
  data: UserAuditLogRecord[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type GetMyAuditLogParams = {
  action?: string;
  entityType?: string;
  fromDate?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  toDate?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

function authHeaders(accessToken: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function jsonHeaders(accessToken: string) {
  return {
    ...authHeaders(accessToken),
    'Content-Type': 'application/json',
  };
}

function buildAuditLogQuery(params?: GetMyAuditLogParams) {
  const searchParams = new URLSearchParams();

  if (!params) {
    return '';
  }

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize !== undefined) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  if (params.action) {
    searchParams.set('action', params.action);
  }

  if (params.entityType?.trim()) {
    searchParams.set('entityType', params.entityType.trim());
  }

  if (params.fromDate) {
    searchParams.set('fromDate', params.fromDate);
  }

  if (params.toDate) {
    searchParams.set('toDate', params.toDate);
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getMyProfile(accessToken: string): Promise<UserProfileRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/users/me`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<UserProfileRecord>(response);
}

export async function getMyAuditLog(
  accessToken: string,
  params?: GetMyAuditLogParams,
): Promise<UserAuditLogResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/users/me/audit-log${buildAuditLogQuery(params)}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<UserAuditLogResponse>(response);
}

export async function changeMyPassword(
  accessToken: string,
  payload: ChangePasswordPayload,
): Promise<{ message: string }> {
  const response = await fetch(`${apiConfig.baseUrl}/users/me/change-password`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<{ message: string }>(response);
}
