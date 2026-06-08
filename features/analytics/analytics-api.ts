import { apiConfig } from '@/constants/api';
import { parseApiEnvelope } from '@/features/api/api-client';
import type {
  AdminAnalyticsUserSummary,
  AdminDashboardAnalyticsResponse,
  DashboardAnalyticsResponse,
} from '@/features/analytics/analytics-types';

function authHeaders(accessToken: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getDashboardAnalytics(accessToken: string): Promise<DashboardAnalyticsResponse> {
  const url = `${apiConfig.baseUrl}/analytics/dashboard`;
  const response = await fetch(url, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<DashboardAnalyticsResponse>(response);
}

export async function getAdminDashboardAnalytics(accessToken: string): Promise<AdminDashboardAnalyticsResponse> {
  const url = `${apiConfig.baseUrl}/admin/analytics/dashboard`;
  const response = await fetch(url, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<AdminDashboardAnalyticsResponse>(response);
}

export async function getAdminUserDashboardAnalytics(
  accessToken: string,
  userId: string,
): Promise<DashboardAnalyticsResponse> {
  const url = `${apiConfig.baseUrl}/admin/analytics/users/${userId}/dashboard`;
  const response = await fetch(url, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<DashboardAnalyticsResponse>(response);
}

export async function getAdminAnalyticsUsers(accessToken: string): Promise<AdminAnalyticsUserSummary[]> {
  const response = await fetch(`${apiConfig.baseUrl}/admin/analytics/users`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<AdminAnalyticsUserSummary[]>(response);
}
