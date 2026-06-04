export type TrendDirection = 'up' | 'down' | 'neutral';

export interface DashboardSummaryCard {
  key: string;
  label: string;
  category: string;
  value: number;
  subtitle?: string;
  trendPercentage?: number;
  trendDirection?: TrendDirection;
  icon?: string;
}

export interface WeeklyActivityPoint {
  label: string;
  created?: number;
  completed?: number;
  count?: number;
}

export interface TaskCompletionAnalytics {
  completionRate: number;
  completed: number;
  total: number;
  inProgress?: number;
  overdue?: number;
  dueSoon?: number;
  scheduled?: number;
  breakdown?: BreakdownItem[];
}

export interface ExpiringSoonBucket {
  label: string;
  count: number;
}

export interface BreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface EntityBreakdown {
  total: number;
  items: BreakdownItem[];
}

export interface DashboardRecentActivity {
  id: string;
  type: 'TASK' | 'CONTRACT' | 'COVER' | 'JOURNAL' | 'SUPPORT_TICKET' | 'BILLING' | 'SYSTEM';
  title: string;
  subtitle?: string;
  status?: string | null;
  entityId?: string;
  route?: string;
  createdAt?: string;
}

export interface DashboardAnalyticsResponse {
  summaryCards: DashboardSummaryCard[];
  performanceOutlook: {
    overallActivity?: {
      value: number;
      trendPercentage?: number;
      trendDirection?: TrendDirection;
      label?: string;
    };
    weeklyActivity: WeeklyActivityPoint[];
    taskCompletion?: TaskCompletionAnalytics;
    expiringSoon?: {
      total: number;
      buckets: ExpiringSoonBucket[];
    };
    statusDistribution?: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    coverStatusBreakdown?: EntityBreakdown;
    contractStatusBreakdown?: EntityBreakdown;
  };
  actionNeeded?: {
    total: number;
    items: Array<{
      type: string;
      title: string;
      subtitle?: string;
      count?: number;
      route?: string;
    }>;
  };
  recentActivity: DashboardRecentActivity[];
  subscription?: {
    status: string;
    planName?: string | null;
    validUntil?: string | null;
    daysRemaining?: number;
  };
  supportHealth?: {
    status: string;
    averageResponseTime?: string | null;
    openTickets?: number;
  };
}

export interface AdminDashboardAnalyticsResponse {
  snapshotDate: string;
  users: {
    total: number;
    active: number;
    suspended: number;
    newThisMonth: number;
  };
  subscriptions: {
    active: number;
    expired: number;
    pending: number;
  };
  revenue: {
    grossRevenue: number;
    netRevenue: number;
    totalCommissions: number;
  };
  entities: {
    totalCovers: number;
    totalContracts: number;
    totalTasks: number;
    totalJournals: number;
    totalSupportTickets: number;
    totalRecycleBinItems: number;
  };
  recentActivity: DashboardRecentActivity[];
}

export interface AdminAnalyticsUserSummary {
  id: string;
  email: string;
  status: string;
  roles: string[];
  createdAt: string;
  totals: {
    covers: number;
    contracts: number;
    tasks: number;
  };
}
