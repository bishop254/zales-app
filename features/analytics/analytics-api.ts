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
  const response = await fetch(`${apiConfig.baseUrl}/analytics/dashboard`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<DashboardAnalyticsResponse>(response);
}

export async function getAdminDashboardAnalytics(accessToken: string): Promise<AdminDashboardAnalyticsResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/admin/analytics/dashboard`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<AdminDashboardAnalyticsResponse>(response);
}

export async function getAdminUserDashboardAnalytics(
  accessToken: string,
  userId: string,
): Promise<DashboardAnalyticsResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/admin/analytics/users/${userId}/dashboard`, {
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
