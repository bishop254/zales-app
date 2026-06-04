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

type LegacyEntityStats = {
  active?: number;
  expired?: number;
  expiringSoon?: number;
};

type LegacyTaskStats = {
  activeTasks?: number;
  almostDueOccurrences?: number;
  completedOccurrences?: number;
  overdueOccurrences?: number;
  totalOccurrences?: number;
};

type LegacyJournalStats = {
  thisWeek?: number;
  weeklyConsistencyRate?: number;
};

type RawDashboardAnalyticsResponse = DashboardAnalyticsResponse & {
  contractStats?: LegacyEntityStats;
  coverStats?: LegacyEntityStats & {
    expiring0to7?: number;
    expiring8to30?: number;
    expiring31plus?: number;
  };
  journalStats?: LegacyJournalStats;
  taskStats?: LegacyTaskStats;
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

function normalizeActivityType(
  rawType?: string | null,
  route?: string | null,
): DashboardRecentActivity['type'] {
  const compactType = (rawType ?? '')
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  const compactRoute = (route ?? '')
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();

  if (compactType === 'TASK' || compactRoute.includes('TASK')) {
    return 'TASK';
  }

  if (compactType === 'CONTRACT' || compactRoute.includes('CONTRACT')) {
    return 'CONTRACT';
  }

  if (compactType === 'COVER' || compactRoute.includes('COVER')) {
    return 'COVER';
  }

  if (compactType === 'JOURNAL' || compactRoute.includes('JOURNAL')) {
    return 'JOURNAL';
  }

  if (compactType === 'SUPPORTTICKET' || compactType === 'TICKET' || compactRoute.includes('SUPPORT')) {
    return 'SUPPORT_TICKET';
  }

  if (compactType === 'BILLING' || compactType === 'SUBSCRIPTION' || compactRoute.includes('BILLING')) {
    return 'BILLING';
  }

  return 'SYSTEM';
}

function normalizeRecentActivity(activity: DashboardRecentActivity[]): DashboardRecentActivity[] {
  return activity.map((item) => ({
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
    status: item.status ?? null,
    subtitle: item.subtitle ?? '',
    type: normalizeActivityType(item.type, item.route),
  }));
}

function buildBreakdown(
  items: Array<{ count?: number | null; status: string }>,
): { count: number; percentage: number; status: string }[] {
  const safeItems = items.map((item) => ({
    count: Math.max(0, item.count ?? 0),
    status: item.status,
  }));
  const total = safeItems.reduce((sum, item) => sum + item.count, 0);

  if (total <= 0) {
    return safeItems.map((item) => ({ ...item, percentage: 0 }));
  }

  return safeItems.map((item) => ({
    ...item,
    percentage: Math.round((item.count / total) * 100),
  }));
}

function buildEntityBreakdown(items: Array<{ count?: number | null; status: string }>) {
  const normalizedItems = buildBreakdown(items);
  return {
    items: normalizedItems,
    total: normalizedItems.reduce((sum, item) => sum + item.count, 0),
  };
}

function buildLegacySummaryCards(analytics: RawDashboardAnalyticsResponse): DashboardSummaryCard[] {
  const taskStats = analytics.taskStats;
  const contractStats = analytics.contractStats;
  const coverStats = analytics.coverStats;
  const journalStats = analytics.journalStats;

  if (!taskStats && !contractStats && !coverStats && !journalStats) {
    return [];
  }

  return [
    {
      key: 'tasks',
      label: 'Tasks',
      category: 'OVERVIEW',
      value: taskStats?.activeTasks ?? 0,
      subtitle: 'Open tasks',
      trendPercentage: 0,
      trendDirection: 'neutral',
      icon: 'clipboard',
    },
    {
      key: 'contracts',
      label: 'Contracts',
      category: 'ACTIVE',
      value: contractStats?.active ?? 0,
      subtitle: 'Active contracts',
      trendPercentage: 0,
      trendDirection: 'neutral',
      icon: 'document',
    },
    {
      key: 'covers',
      label: 'Insurance',
      category: 'POLICIES',
      value: coverStats?.active ?? 0,
      subtitle: 'Active covers',
      trendPercentage: 0,
      trendDirection: 'neutral',
      icon: 'shield',
    },
    {
      key: 'journals',
      label: 'Journal Entries',
      category: 'DAILY LOG',
      value: journalStats?.thisWeek ?? 0,
      subtitle: 'This week',
      trendPercentage: Math.round(journalStats?.weeklyConsistencyRate ?? 0),
      trendDirection: toTrendDirection(journalStats?.weeklyConsistencyRate ?? 0),
      icon: 'book',
    },
  ];
}

function buildLegacyTaskCompletion(analytics: RawDashboardAnalyticsResponse) {
  const taskCompletion = analytics.performanceOutlook?.taskCompletion;
  if (taskCompletion) {
    return {
      ...taskCompletion,
      breakdown:
        taskCompletion.breakdown ??
        buildBreakdown([
          { status: 'Completed', count: taskCompletion.completed },
          { status: 'Overdue', count: taskCompletion.overdue },
          { status: 'Due Soon', count: taskCompletion.dueSoon },
          { status: 'Not Yet Due / Scheduled', count: taskCompletion.scheduled },
        ]),
    };
  }

  const taskStats = analytics.taskStats;
  if (!taskStats) {
    return undefined;
  }

  const total = taskStats.totalOccurrences ?? 0;
  const completed = taskStats.completedOccurrences ?? 0;
  const overdue = taskStats.overdueOccurrences ?? 0;
  const dueSoon = taskStats.almostDueOccurrences ?? 0;
  const scheduled = Math.max(total - completed - overdue - dueSoon, 0);

  return {
    breakdown: buildBreakdown([
      { status: 'Completed', count: completed },
      { status: 'Overdue', count: overdue },
      { status: 'Due Soon', count: dueSoon },
      { status: 'Not Yet Due / Scheduled', count: scheduled },
    ]),
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    dueSoon,
    inProgress: taskStats.activeTasks ?? 0,
    overdue,
    scheduled,
    total,
  };
}

function normalizeUserAnalytics(analytics: RawDashboardAnalyticsResponse): DashboardAnalyticsResponse {
  const legacyCoverBreakdown =
    analytics.coverStats &&
    buildEntityBreakdown([
      { status: 'Active', count: (analytics.coverStats.active ?? 0) - (analytics.coverStats.expiringSoon ?? 0) },
      { status: 'Due', count: analytics.coverStats.expiringSoon },
      { status: 'Lapsed', count: analytics.coverStats.expired },
    ]);

  const legacyContractBreakdown =
    analytics.contractStats &&
    buildEntityBreakdown([
      { status: 'Active', count: (analytics.contractStats.active ?? 0) - (analytics.contractStats.expiringSoon ?? 0) },
      { status: 'Expiring Soon', count: analytics.contractStats.expiringSoon },
      { status: 'Expired', count: analytics.contractStats.expired },
    ]);

  return {
    ...analytics,
    summaryCards: analytics.summaryCards?.length ? analytics.summaryCards : buildLegacySummaryCards(analytics),
    performanceOutlook: {
      overallActivity: analytics.performanceOutlook?.overallActivity,
      weeklyActivity: analytics.performanceOutlook?.weeklyActivity ?? [],
      taskCompletion: buildLegacyTaskCompletion(analytics),
      expiringSoon: analytics.performanceOutlook?.expiringSoon,
      statusDistribution: analytics.performanceOutlook?.statusDistribution ?? [],
      coverStatusBreakdown: analytics.performanceOutlook?.coverStatusBreakdown ?? legacyCoverBreakdown,
      contractStatusBreakdown: analytics.performanceOutlook?.contractStatusBreakdown ?? legacyContractBreakdown,
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
        dueSoon: 0,
        scheduled: 0,
        breakdown: [],
      },
      coverStatusBreakdown: {
        total: 0,
        items: [],
      },
      contractStatusBreakdown: {
        total: 0,
        items: [],
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
