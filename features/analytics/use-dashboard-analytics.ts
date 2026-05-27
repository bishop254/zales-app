import { useCallback, useMemo, useState } from 'react';

import { UnauthorizedError } from '@/features/api/auth-session';
import {
  getAdminAnalyticsUsers,
  getAdminDashboardAnalytics,
  getAdminUserDashboardAnalytics,
  getDashboardAnalytics,
} from '@/features/analytics/analytics-api';
import type {
  AdminAnalyticsUserSummary,
  AdminDashboardAnalyticsResponse,
  DashboardAnalyticsResponse,
  DashboardRecentActivity,
  DashboardSummaryCard,
  TrendDirection,
} from '@/features/analytics/analytics-types';

type DashboardAudienceMode = 'all_users' | 'specific_user';

type UseDashboardAnalyticsParams = {
  accessToken?: string;
  isAdmin: boolean;
};

type UseDashboardAnalyticsResult = {
  analytics: DashboardAnalyticsResponse | null;
  adminMode: DashboardAudienceMode;
  adminUsers: AdminAnalyticsUserSummary[];
  adminUsersLoading: boolean;
  error: string;
  loadAdminUsers: () => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
  selectedAdminUser: AdminAnalyticsUserSummary | null;
  setAdminMode: (mode: DashboardAudienceMode) => void;
  setSelectedAdminUser: (user: AdminAnalyticsUserSummary | null) => void;
};

const EMPTY_ANALYTICS: DashboardAnalyticsResponse = {
  summaryCards: [],
  performanceOutlook: {
    weeklyActivity: [],
  },
  actionNeeded: {
    total: 0,
    items: [],
  },
  recentActivity: [],
};

function toTrendDirection(value?: number | null): TrendDirection {
  if (!value) {
    return 'neutral';
  }

  return value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
}

function normalizeRecentActivity(activity: DashboardRecentActivity[]): DashboardRecentActivity[] {
  return activity.map((item) => ({
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
    status: item.status ?? null,
    subtitle: item.subtitle ?? '',
    type: (item.type || 'SYSTEM') as DashboardRecentActivity['type'],
  }));
}

function normalizeUserAnalytics(analytics: DashboardAnalyticsResponse): DashboardAnalyticsResponse {
  return {
    ...analytics,
    summaryCards: analytics.summaryCards ?? [],
    performanceOutlook: {
      overallActivity: analytics.performanceOutlook?.overallActivity,
      weeklyActivity: analytics.performanceOutlook?.weeklyActivity ?? [],
      taskCompletion: analytics.performanceOutlook?.taskCompletion,
      expiringSoon: analytics.performanceOutlook?.expiringSoon,
      statusDistribution: analytics.performanceOutlook?.statusDistribution ?? [],
    },
    actionNeeded: analytics.actionNeeded ?? { total: 0, items: [] },
    recentActivity: normalizeRecentActivity(analytics.recentActivity ?? []),
    subscription: analytics.subscription,
    supportHealth: analytics.supportHealth,
  };
}

function buildAdminSummaryCards(admin: AdminDashboardAnalyticsResponse): DashboardSummaryCard[] {
  return [
    {
      key: 'users',
      label: 'Total Users',
      category: 'PLATFORM',
      value: admin.users.total,
      subtitle: `${admin.users.newThisMonth} new this month`,
      trendPercentage: admin.users.newThisMonth,
      trendDirection: toTrendDirection(admin.users.newThisMonth),
      icon: 'people',
    },
    {
      key: 'subscriptions',
      label: 'Active Subs',
      category: 'BILLING',
      value: admin.subscriptions.active,
      subtitle: `${admin.subscriptions.pending} pending`,
      trendPercentage: admin.subscriptions.pending,
      trendDirection: admin.subscriptions.pending > 0 ? 'up' : 'neutral',
      icon: 'verified-user',
    },
    {
      key: 'covers',
      label: 'Total Covers',
      category: 'PORTFOLIO',
      value: admin.entities.totalCovers,
      subtitle: `${admin.entities.totalContracts} contracts`,
      icon: 'shield',
      trendPercentage: 0,
      trendDirection: 'neutral',
    },
    {
      key: 'tickets',
      label: 'Support Tickets',
      category: 'SERVICE',
      value: admin.entities.totalSupportTickets,
      subtitle: `${admin.entities.totalRecycleBinItems} in recycle bin`,
      icon: 'contact-support',
      trendPercentage: admin.entities.totalRecycleBinItems,
      trendDirection: admin.entities.totalRecycleBinItems > 0 ? 'up' : 'neutral',
    },
  ];
}

function normalizeAdminAnalytics(admin: AdminDashboardAnalyticsResponse): DashboardAnalyticsResponse {
  const totalEntityActivity =
    admin.entities.totalCovers +
    admin.entities.totalContracts +
    admin.entities.totalTasks +
    admin.entities.totalJournals +
    admin.entities.totalSupportTickets;

  return {
    summaryCards: buildAdminSummaryCards(admin),
    performanceOutlook: {
      overallActivity: {
        value: totalEntityActivity,
        label: 'Platform Activity',
        trendPercentage: admin.users.newThisMonth,
        trendDirection: toTrendDirection(admin.users.newThisMonth),
      },
      weeklyActivity: [],
      expiringSoon: {
        total: admin.subscriptions.expired + admin.subscriptions.pending,
        buckets: [
          { label: 'Active subs', count: admin.subscriptions.active },
          { label: 'Pending', count: admin.subscriptions.pending },
          { label: 'Expired', count: admin.subscriptions.expired },
        ],
      },
      statusDistribution: [
        {
          status: 'Active Users',
          count: admin.users.active,
          percentage: admin.users.total ? Math.round((admin.users.active / admin.users.total) * 100) : 0,
        },
        {
          status: 'Suspended',
          count: admin.users.suspended,
          percentage: admin.users.total ? Math.round((admin.users.suspended / admin.users.total) * 100) : 0,
        },
        {
          status: 'Active Subs',
          count: admin.subscriptions.active,
          percentage:
            admin.subscriptions.active + admin.subscriptions.expired + admin.subscriptions.pending > 0
              ? Math.round(
                  (admin.subscriptions.active /
                    (admin.subscriptions.active + admin.subscriptions.expired + admin.subscriptions.pending)) *
                    100,
                )
              : 0,
        },
      ],
      taskCompletion: {
        completionRate:
          admin.entities.totalTasks + admin.entities.totalJournals > 0
            ? Math.round((admin.entities.totalJournals / (admin.entities.totalTasks + admin.entities.totalJournals)) * 100)
            : 0,
        completed: admin.entities.totalJournals,
        total: admin.entities.totalTasks + admin.entities.totalJournals,
        inProgress: admin.entities.totalTasks,
        overdue: admin.subscriptions.expired,
      },
    },
    actionNeeded: {
      total: Number(admin.subscriptions.pending > 0) + Number(admin.subscriptions.expired > 0) + Number(admin.users.suspended > 0),
      items: [
        ...(admin.subscriptions.pending > 0
          ? [{
              type: 'SUBSCRIPTION_PENDING',
              title: `${admin.subscriptions.pending} subscriptions pending`,
              subtitle: 'Follow up on accounts waiting for activation',
              count: admin.subscriptions.pending,
              route: 'Billing',
            }]
          : []),
        ...(admin.subscriptions.expired > 0
          ? [{
              type: 'SUBSCRIPTION_EXPIRED',
              title: `${admin.subscriptions.expired} subscriptions expired`,
              subtitle: 'Accounts may need renewal support',
              count: admin.subscriptions.expired,
              route: 'Billing',
            }]
          : []),
        ...(admin.users.suspended > 0
          ? [{
              type: 'SUSPENDED_USERS',
              title: `${admin.users.suspended} suspended users`,
              subtitle: 'Review platform access and account health',
              count: admin.users.suspended,
              route: 'Home',
            }]
          : []),
      ],
    },
    recentActivity: normalizeRecentActivity(admin.recentActivity ?? []),
    subscription: {
      status: 'ADMIN',
      planName: 'Platform Access',
      validUntil: admin.snapshotDate,
      daysRemaining: 0,
    },
    supportHealth: {
      status: admin.entities.totalSupportTickets <= 5 ? 'Stable' : 'Busy',
      averageResponseTime: 'Platform view',
      openTickets: admin.entities.totalSupportTickets,
    },
  };
}

export function useDashboardAnalytics({
  accessToken,
  isAdmin,
}: UseDashboardAnalyticsParams): UseDashboardAnalyticsResult {
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminMode, setAdminMode] = useState<DashboardAudienceMode>('all_users');
  const [adminUsers, setAdminUsers] = useState<AdminAnalyticsUserSummary[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<AdminAnalyticsUserSummary | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setAnalytics(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isAdmin && adminMode === 'all_users') {
        const data = await getAdminDashboardAnalytics(accessToken);
        setAnalytics(normalizeAdminAnalytics(data));
      } else if (isAdmin && selectedAdminUser) {
        const data = await getAdminUserDashboardAnalytics(accessToken, selectedAdminUser.id);
        setAnalytics(normalizeUserAnalytics(data));
      } else if (isAdmin && adminMode === 'specific_user' && !selectedAdminUser) {
        setAnalytics(EMPTY_ANALYTICS);
      } else {
        const data = await getDashboardAnalytics(accessToken);
        setAnalytics(normalizeUserAnalytics(data));
      }
    } catch (fetchError) {
      if (fetchError instanceof UnauthorizedError) {
        setAnalytics(null);
        setError('');
        return;
      }

      setError(fetchError instanceof Error ? fetchError.message : 'Could not load dashboard analytics.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, adminMode, isAdmin, selectedAdminUser]);

  const loadAdminUsers = useCallback(async () => {
    if (!accessToken || !isAdmin || adminUsers.length > 0 || adminUsersLoading) {
      return;
    }

    setAdminUsersLoading(true);
    try {
      const users = await getAdminAnalyticsUsers(accessToken);
      setAdminUsers(users);
    } catch (fetchError) {
      if (!(fetchError instanceof UnauthorizedError)) {
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load admin users.');
      }
    } finally {
      setAdminUsersLoading(false);
    }
  }, [accessToken, adminUsers.length, adminUsersLoading, isAdmin]);

  const safeAnalytics = useMemo(() => analytics ?? EMPTY_ANALYTICS, [analytics]);

  return {
    adminMode,
    adminUsers,
    adminUsersLoading,
    analytics: safeAnalytics,
    error,
    loadAdminUsers,
    loading,
    refresh,
    selectedAdminUser,
    setAdminMode,
    setSelectedAdminUser,
  };
}
