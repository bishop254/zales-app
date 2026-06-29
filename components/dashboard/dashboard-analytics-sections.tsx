import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { SegmentedDonutChart } from "@/components/charts/donut-chart";
import { palette, radius, spacing, typography } from "@/constants/app-theme";
import type {
  DashboardAnalyticsResponse,
  DashboardRecentActivity,
  DashboardSummaryCard,
  EntityBreakdown,
  TrendDirection,
} from "@/features/analytics/analytics-types";

type SummaryCardProps = {
  card: DashboardSummaryCard;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

type RecentActivityListProps = {
  items: DashboardRecentActivity[];
  onItemPress: (item: DashboardRecentActivity) => void;
  onViewAll?: () => void;
};

type TaskCompletionCardProps = {
  taskCompletion?: DashboardAnalyticsResponse["performanceOutlook"]["taskCompletion"];
};

type BreakdownAnalyticsCardProps = {
  breakdown?: EntityBreakdown;
  emptyBody: string;
  emptyLabel: string;
  segmentColors: Record<string, string>;
  subtitle: string;
  title: string;
};

type ActionNeededCardProps = {
  actionNeeded?: DashboardAnalyticsResponse["actionNeeded"];
  onRoutePress: (route?: string) => void;
};

type SubscriptionCardProps = {
  subscription?: DashboardAnalyticsResponse["subscription"];
};

type SupportHealthCardProps = {
  supportHealth?: DashboardAnalyticsResponse["supportHealth"];
};

type CombinedHealthCardProps = {
  subscription?: DashboardAnalyticsResponse["subscription"];
  supportHealth?: DashboardAnalyticsResponse["supportHealth"];
};

type EmptyAnalyticsStateProps = {
  body?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  label: string;
  size?: "compact" | "default" | "tall";
};

const summaryIconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  book: "menu-book",
  clipboard: "assignment",
  "contact-support": "contact-support",
  document: "description",
  people: "groups",
  shield: "shield",
  "verified-user": "verified-user",
};

const summaryIconTintMap: Record<string, { bg: string; color: string }> = {
  book: { bg: "rgba(147,51,234,0.12)", color: "#7C3AED" },
  clipboard: { bg: "rgba(0,92,171,0.1)", color: palette.primary },
  "contact-support": { bg: "rgba(249,115,22,0.12)", color: "#EA580C" },
  document: { bg: "rgba(100,116,139,0.12)", color: "#64748B" },
  shield: { bg: "rgba(0,92,171,0.1)", color: palette.primary },
};

const taskStatusChartColors: Record<string, string> = {
  Completed: "#16A34A",
  Overdue: "#BA1A1A",
  "Due Soon": "#F59E0B",
  Scheduled: "#2563EB",
  "Not Yet Due / Scheduled": "#2563EB",
};

const coverStatusChartColors: Record<string, string> = {
  Active: "#16A34A",
  Due: "#F59E0B",
  Lapsed: "#BA1A1A",
};

const contractStatusChartColors: Record<string, string> = {
  Active: "#16A34A",
  "Expiring Soon": "#F59E0B",
  Expired: "#BA1A1A",
  Upcoming: "#2563EB",
};

function trendStyles(direction?: TrendDirection) {
  if (direction === "up") {
    return {
      bg: "rgba(22,163,74,0.1)",
      color: "#16A34A",
      icon: "arrow-upward" as const,
    };
  }

  if (direction === "down") {
    return {
      bg: "rgba(239,68,68,0.1)",
      color: "#EF4444",
      icon: "arrow-downward" as const,
    };
  }

  return {
    bg: "rgba(100,116,139,0.12)",
    color: "#64748B",
    icon: "remove" as const,
  };
}

export function DashboardSummaryAnalyticsCard({
  card,
  onPress,
  style,
}: SummaryCardProps) {
  const { width } = useWindowDimensions();
  const iconName = summaryIconMap[card.icon ?? ""] ?? "insights";
  const iconTint = summaryIconTintMap[card.icon ?? ""] ?? {
    bg: "rgba(0,92,171,0.1)",
    color: palette.primary,
  };
  const trend = trendStyles(card.trendDirection);
  const isCompactScreen = width < 390;
  const isSmallScreen = width < 350;

  const responsiveCardStyles = {
    card: isSmallScreen
      ? styles.summaryCardSmall
      : isCompactScreen
        ? styles.summaryCardCompact
        : null,
    iconWrap: isSmallScreen
      ? styles.summaryIconWrapSmall
      : isCompactScreen
        ? styles.summaryIconWrapCompact
        : null,
    value: isSmallScreen
      ? styles.summaryValueSmall
      : isCompactScreen
        ? styles.summaryValueCompact
        : null,
    title: isSmallScreen
      ? styles.summaryTitleSmall
      : isCompactScreen
        ? styles.summaryTitleCompact
        : null,
    subtitle: isSmallScreen
      ? styles.summarySubtitleSmall
      : isCompactScreen
        ? styles.summarySubtitleCompact
        : null,
    trendRow: isSmallScreen
      ? styles.summaryTrendRowSmall
      : isCompactScreen
        ? styles.summaryTrendRowCompact
        : null,
    trendText: isSmallScreen
      ? styles.summaryTrendTextSmall
      : isCompactScreen
        ? styles.summaryTrendTextCompact
        : null,
  };
  const iconSize = isSmallScreen ? 18 : isCompactScreen ? 20 : 22;
  const trendIconSize = isSmallScreen ? 11 : 13;

  return (
    <Pressable style={[styles.summaryCard, responsiveCardStyles.card, style]} onPress={onPress}>
      <View style={styles.summaryMetricRow}>
        <View
          style={[styles.summaryIconWrap, responsiveCardStyles.iconWrap, { backgroundColor: iconTint.bg }]}
        >
          <MaterialIcons color={iconTint.color} name={iconName} size={iconSize} />
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.summaryValue, responsiveCardStyles.value]}>
          {card.value}
        </Text>
      </View>

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={[styles.summaryTitle, responsiveCardStyles.title]}
      >
        {card.label}
      </Text>

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={[styles.summarySubtitle, responsiveCardStyles.subtitle]}
      >
        {card.subtitle ?? card.category}
      </Text>

      <View style={[styles.summaryTrendRow, responsiveCardStyles.trendRow, { backgroundColor: trend.bg }]}>
        <MaterialIcons color={trend.color} name={trend.icon} size={trendIconSize} />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={[styles.summaryTrendText, responsiveCardStyles.trendText, { color: trend.color }]}
        >
          {card.trendPercentage ? `${Math.abs(card.trendPercentage)}%` : "0%"}
          {card.trendDirection === "neutral" ? " stable" : " vs last week"}
        </Text>
      </View>
    </Pressable>
  );
}

export function TaskCompletionCard({
  taskCompletion,
}: TaskCompletionCardProps) {
  return (
    <BreakdownAnalyticsCard
      breakdown={
        taskCompletion
          ? {
              total: taskCompletion.total,
              items: taskCompletion.breakdown ?? [],
            }
          : undefined
      }
      emptyBody="As your schedule fills up, completed, overdue, due soon, and scheduled tasks will appear here."
      emptyLabel="No task completion insights yet"
      segmentColors={taskStatusChartColors}
      subtitle="Completed, overdue, due soon, and scheduled"
      title="Task Completion Rate"
    />
  );
}

export function ActiveCoversCard({
  breakdown,
}: {
  breakdown?: DashboardAnalyticsResponse["performanceOutlook"]["coverStatusBreakdown"];
}) {
  return (
    <BreakdownAnalyticsCard
      breakdown={breakdown}
      emptyBody="Once you add cover records, the dashboard will split them into active, due, and lapsed policies."
      emptyLabel="No cover status data yet"
      segmentColors={coverStatusChartColors}
      subtitle="Active, due, and lapsed covers"
      title="Percentage of Active Covers"
    />
  );
}

export function ActiveContractsCard({
  breakdown,
}: {
  breakdown?: DashboardAnalyticsResponse["performanceOutlook"]["contractStatusBreakdown"];
}) {
  return (
    <BreakdownAnalyticsCard
      breakdown={breakdown}
      emptyBody="Once you add contract records, the dashboard will split them into active, expiring, and expired agreements."
      emptyLabel="No contract status data yet"
      segmentColors={contractStatusChartColors}
      subtitle="Active, expiring soon, and expired contracts"
      title="Percentage of Active Contracts"
    />
  );
}

export function ActionNeededCard({
  actionNeeded,
  onRoutePress,
}: ActionNeededCardProps) {
  if (!actionNeeded || actionNeeded.total <= 0) {
    return null;
  }

  return (
    <View style={[styles.sectionCard, styles.warningCard]}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionCardTitle}>Action Needed</Text>
        <View style={styles.warningPill}>
          <Text style={styles.warningPillText}>{actionNeeded.total}</Text>
        </View>
      </View>

      <View style={styles.actionList}>
        {actionNeeded.items.map((item) => (
          <Pressable
            key={`${item.type}-${item.title}`}
            style={styles.actionRow}
            onPress={() => onRoutePress(item.route)}
          >
            <View style={styles.actionIconWrap}>
              <MaterialIcons
                color={palette.error}
                name="priority-high"
                size={18}
              />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{item.title}</Text>
              <Text style={styles.actionSubtitle}>
                {item.subtitle ?? "Needs attention"}
              </Text>
            </View>
            <MaterialIcons
              color={palette.error}
              name="chevron-right"
              size={20}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  if (!subscription) {
    return null;
  }

  const normalizedPlanName = (subscription.planName ?? '').toLowerCase();
  const isMonthlyPlan =
    normalizedPlanName.includes('monthly') || normalizedPlanName.includes('month');
  const isAnnualPlan =
    normalizedPlanName.includes('annual') || normalizedPlanName.includes('year');
  const planDurationDays = isMonthlyPlan ? 30 : 365;
  const planHint = isMonthlyPlan
    ? "You're on the monthly plan."
    : isAnnualPlan
      ? "You're on the annual plan."
      : "You're on an active plan.";
  const daysRemaining = subscription.daysRemaining ?? 0;
  const progress = Math.max(
    0,
    Math.min(
      100,
      Math.round((daysRemaining / Math.max(daysRemaining, planDurationDays)) * 100),
    ),
  );

  return (
    <View style={styles.featureCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.featureTitle}>Subscription</Text>
        <View style={styles.planPill}>
          <Text style={styles.planPillText}>
            {subscription.planName ?? subscription.status}
          </Text>
        </View>
      </View>

      <View style={styles.featureBodyRow}>
        <View style={styles.featureIconWrap}>
          <MaterialIcons
            color={palette.primary}
            name="workspace-premium"
            size={24}
          />
        </View>

        <View style={styles.featureBodyCopy}>
          <Text style={styles.featureMetaLabel}>Plan valid until</Text>
          <Text numberOfLines={1} style={styles.featureMetaValue}>
            {subscription.validUntil ?? subscription.status}
          </Text>
          <Text numberOfLines={1} style={styles.featureMetaHint}>
            {planHint}
          </Text>
        </View>
      </View>

      <View style={styles.featureBadgeRow}>
        <View style={styles.statusBadge}>
          <MaterialIcons color="#16A34A" name="check-circle" size={15} />
          <Text style={styles.statusBadgeText}>{subscription.status}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <Text numberOfLines={1} style={styles.progressText}>
          {daysRemaining} days remaining
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    </View>
  );
}

export function SupportHealthCard({ supportHealth }: SupportHealthCardProps) {
  if (!supportHealth) {
    return null;
  }

  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>Support Health</Text>
      <View style={styles.supportHeader}>
        <View style={styles.supportIconWrap}>
          <MaterialIcons color="#16A34A" name="favorite" size={20} />
        </View>
        <View style={styles.supportCopy}>
          <Text numberOfLines={1} style={styles.supportStatus}>
            {supportHealth.status}
          </Text>
          <Text style={styles.featureMetaLabel}>Average response time</Text>
          <Text numberOfLines={2} style={styles.supportTime}>
            {supportHealth.averageResponseTime ?? "Not available"}
          </Text>
        </View>
      </View>

      <View style={styles.supportPill}>
        <MaterialIcons color="#16A34A" name="check-circle" size={15} />
        <Text numberOfLines={1} style={styles.supportPillText}>
          {supportHealth.openTickets ?? 0} open tickets
        </Text>
      </View>
    </View>
  );
}

export function CombinedHealthCard({
  subscription,
  supportHealth,
}: CombinedHealthCardProps) {
  if (!subscription && !supportHealth) {
    return null;
  }

  return (
    <View style={styles.combinedHealthCard}>
      {subscription ? (
        <View style={styles.combinedSection}>
          <SubscriptionCard subscription={subscription} />
        </View>
      ) : null}
      {supportHealth ? (
        <View style={styles.combinedSection}>
          <SupportHealthCard supportHealth={supportHealth} />
        </View>
      ) : null}
    </View>
  );
}

export function RecentActivityList({
  items,
  onItemPress,
  onViewAll,
}: RecentActivityListProps) {
  return (
    <View>
      <View style={styles.recentHeader}>
        <Text style={styles.recentHeaderTitle}>Recent Activity</Text>
        {onViewAll && items.length ? (
          <Pressable style={styles.viewAllPill} onPress={onViewAll}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.recentCard}>
        {items.length ? (
          items.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.activityRow,
                index < items.length - 1 ? styles.activityRowBorder : null,
              ]}
              onPress={() => onItemPress(item)}
            >
              <View
                style={[
                  styles.activityIconWrap,
                  { backgroundColor: activityIconTone(item.type) },
                ]}
              >
                <MaterialIcons
                  color={activityIconColor(item.type)}
                  name={activityIconForType(item.type)}
                  size={18}
                />
              </View>

              <View style={styles.activityCopy}>
                <Text numberOfLines={1} style={styles.activityTitle}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.activitySubtitle}>
                  {item.subtitle || "Recent update"}
                </Text>
              </View>

              <View style={styles.activityTrail}>
                <View style={styles.activityTag}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.activityTagText,
                      { color: activityIconColor(item.type) },
                    ]}
                  >
                    {activityTagText(item)}
                  </Text>
                </View>
                <MaterialIcons
                  color={palette.outline}
                  name="chevron-right"
                  size={18}
                />
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyAnalyticsState
            body="Your latest tasks, journals, contracts, and support updates will appear here as activity picks up."
            icon="history"
            label="No recent activity yet"
            size="compact"
          />
        )}
      </View>
    </View>
  );
}

export function EmptyAnalyticsState({
  body,
  icon = "insert-chart-outlined",
  label,
  size = "default",
}: EmptyAnalyticsStateProps) {
  return (
    <View style={[styles.emptyAnalytics, emptySizeStyles[size]]}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons color={palette.primary} name={icon} size={20} />
      </View>
      <Text style={styles.emptyAnalyticsTitle}>{label}</Text>
      {body ? <Text style={styles.emptyAnalyticsText}>{body}</Text> : null}
    </View>
  );
}

function BreakdownRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLabelRow}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text numberOfLines={1} style={styles.breakdownLabel}>
          {label}
        </Text>
      </View>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function BreakdownAnalyticsCard({
  breakdown,
  emptyBody,
  emptyLabel,
  segmentColors,
  subtitle,
  title,
}: BreakdownAnalyticsCardProps) {
  const items = breakdown?.items ?? [];
  const total = breakdown?.total ?? 0;
  const colorForStatus = (status: string) =>
    segmentColors[status] ?? palette.primary;

  return (
    <View style={styles.analyticsCard}>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>

      {items.length && total > 0 ? (
        <View style={styles.completionRow}>
          <SegmentedDonutChart
            centerLabel={`${total} total`}
            centerValue="100%"
            segments={items.map((item, index) => ({
              color: colorForStatus(item.status),
              value: item.count,
            }))}
            size={120}
            strokeWidth={13}
          />

          <View style={styles.breakdownList}>
            {items.map((item, index) => (
              <BreakdownRow
                key={`${item.status}-${index}`}
                color={colorForStatus(item.status)}
                label={item.status}
                value={`${item.percentage}% (${item.count})`}
              />
            ))}
          </View>
        </View>
      ) : (
        <EmptyAnalyticsState
          body={emptyBody}
          icon="donut-large"
          label={emptyLabel}
        />
      )}
    </View>
  );
}

function activityTagText(item: DashboardRecentActivity) {
  if (item.status) {
    return item.status;
  }
  return item.type.replace("_", " ");
}

function activityIconForType(
  type: DashboardRecentActivity["type"],
): keyof typeof MaterialIcons.glyphMap {
  switch (type) {
    case "BILLING":
      return "receipt-long";
    case "CONTRACT":
      return "description";
    case "COVER":
      return "shield";
    case "JOURNAL":
      return "menu-book";
    case "SUPPORT_TICKET":
      return "contact-support";
    case "TASK":
      return "assignment";
    default:
      return "insights";
  }
}

function activityIconTone(type: DashboardRecentActivity["type"]) {
  switch (type) {
    case "CONTRACT":
      return "rgba(100,116,139,0.12)";
    case "JOURNAL":
      return "rgba(147,51,234,0.12)";
    case "SUPPORT_TICKET":
      return "rgba(249,115,22,0.12)";
    case "COVER":
      return "rgba(37,99,235,0.12)";
    default:
      return "rgba(0,92,171,0.1)";
  }
}

function activityIconColor(type: DashboardRecentActivity["type"]) {
  switch (type) {
    case "CONTRACT":
      return "#64748B";
    case "JOURNAL":
      return "#7C3AED";
    case "SUPPORT_TICKET":
      return "#EA580C";
    case "COVER":
      return "#2563EB";
    default:
      return palette.primary;
  }
}

const emptySizeStyles = StyleSheet.create({
  compact: {
    minHeight: 124,
  },
  default: {
    minHeight: 152,
  },
  tall: {
    minHeight: 188,
  },
});

const styles = StyleSheet.create({
  actionCopy: { flex: 1, gap: 2 },
  actionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(186,26,26,0.1)",
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  actionList: { gap: spacing.sm },
  actionRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,211,211,0.65)",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  actionSubtitle: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  actionTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  activityCopy: { flex: 1, gap: 2 },
  activityIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityRowBorder: { borderBottomColor: "#EEF2F7", borderBottomWidth: 1 },
  activitySubtitle: { color: palette.onSurfaceVariant, fontSize: 13 },
  activityTag: {
    backgroundColor: "rgba(241,245,249,0.9)",
    borderRadius: radius.pill,
    maxWidth: 112,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activityTagText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  activityTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: "600",
  },
  activityTrail: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  analyticsCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 22,
    gap: spacing.sm,
    minHeight: 214,
    padding: spacing.sm + 2,
    shadowColor: "#001B3A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  breakdownLabel: {
    color: palette.onSurfaceVariant,
    flexShrink: 1,
    fontSize: 13,
  },
  breakdownLabelRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  breakdownList: { flex: 1, gap: spacing.sm, justifyContent: "center" },
  breakdownRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  breakdownValue: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMenuRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  combinedHealthCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 22,
    gap: spacing.sm,
    padding: spacing.sm + 2,
    shadowColor: "#001B3A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  combinedSection: {
    borderColor: "rgba(0,92,171,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.sm,
  },
  completionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  expiringSoonHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  expiringSoonHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  expiringSoonChartWrap: {
    marginTop: spacing.xs,
  },
  expiringSoonMeta: {
    color: palette.onSurface,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "700",
    paddingTop: 2,
    textAlign: "right",
  },
  emptyAnalytics: {
    alignItems: "center",
    backgroundColor: "rgba(246,249,255,0.96)",
    borderColor: "rgba(0,92,171,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyAnalyticsText: {
    color: palette.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  emptyAnalyticsTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  emptyIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(0,92,171,0.08)",
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  featureBadgeRow: {
    alignItems: "flex-start",
    marginTop: spacing.sm,
  },
  featureBodyCopy: { flex: 1, gap: 2 },
  featureBodyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  featureCard: {
    gap: spacing.xs,
  },
  featureIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(0,92,171,0.08)",
    borderRadius: 22,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  featureMetaHint: { color: palette.onSurfaceVariant, fontSize: 11 },
  featureMetaLabel: { color: palette.onSurfaceVariant, fontSize: 13 },
  featureMetaValue: {
    color: palette.onSurface,
    fontSize: 17,
    fontWeight: "700",
  },
  featureTitle: { color: palette.onSurface, fontSize: 16, fontWeight: "700" },
  legendDot: { borderRadius: 99, height: 10, width: 10 },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "48%",
  },
  legendLabel: {
    color: palette.onSurfaceVariant,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  performanceActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    justifyContent: "flex-end",
  },
  performanceFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  performanceHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  performanceHeading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  performanceHeadingCopy: { flex: 1, minWidth: 0 },
  performanceIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.08)",
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  performancePill: {
    alignItems: "center",
    backgroundColor: "rgba(248,250,252,1)",
    borderColor: "#D8E1EE",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 2,
    maxWidth: 128,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  performancePillText: {
    color: palette.onSurface,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  performanceTotal: {
    color: palette.primary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  planPill: {
    backgroundColor: "rgba(59,130,246,0.1)",
    borderRadius: radius.pill,
    maxWidth: 110,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planPillText: { color: "#2563EB", fontSize: 11, fontWeight: "700" },
  progressFill: {
    backgroundColor: palette.primaryContainer,
    borderRadius: radius.pill,
    height: "100%",
  },
  progressRow: { gap: spacing.xs, marginTop: spacing.sm },
  progressText: { color: palette.primary, fontSize: 13, fontWeight: "600" },
  progressTrack: {
    backgroundColor: "#DCE3EC",
    borderRadius: radius.pill,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },
  recentCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#001B3A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  recentHeaderTitle: { color: palette.white, fontSize: 18, fontWeight: "700" },
  sectionCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 22,
    gap: spacing.sm,
    padding: spacing.sm + 2,
    shadowColor: "#001B3A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  sectionCardBody: { color: palette.onSurfaceVariant, fontSize: 13 },
  sectionCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionCardTitle: {
    color: palette.onSurface,
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadge: {
    alignItems: "center",
    backgroundColor: "rgba(22,163,74,0.1)",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  successPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(22,163,74,0.1)",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  successPillText: { color: "#16A34A", fontSize: 13, fontWeight: "700" },
  summaryCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 20,
    minHeight: 142,
    padding: spacing.sm + 2,
    shadowColor: "#001B3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  summaryCardCompact: {
    minHeight: 132,
    padding: spacing.sm,
  },
  summaryCardSmall: {
    minHeight: 124,
    padding: spacing.xs + 6,
  },
  summaryIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  summaryIconWrapCompact: {
    borderRadius: 13,
    height: 34,
    width: 34,
  },
  summaryIconWrapSmall: {
    borderRadius: 12,
    height: 30,
    width: 30,
  },
  summaryMetricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  summarySubtitle: {
    color: palette.onSurfaceVariant,
    fontSize: 13,
    marginTop: 2,
  },
  summarySubtitleCompact: {
    fontSize: 12,
  },
  summarySubtitleSmall: {
    fontSize: 11,
  },
  summaryTitle: {
    color: palette.onSurface,
    fontSize: 15,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  summaryTitleCompact: {
    fontSize: 14,
    marginTop: 6,
  },
  summaryTitleSmall: {
    fontSize: 13,
    marginTop: 4,
  },
  summaryTrendRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.sm,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  summaryTrendRowCompact: {
    gap: 3,
    marginTop: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  summaryTrendRowSmall: {
    gap: 3,
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  summaryTrendText: { flexShrink: 1, fontSize: 10, fontWeight: "700" },
  summaryTrendTextCompact: { fontSize: 9.5 },
  summaryTrendTextSmall: { fontSize: 8.5 },
  summaryValue: { color: palette.onSurface, fontSize: 24, fontWeight: "700" },
  summaryValueCompact: { fontSize: 21 },
  summaryValueSmall: { fontSize: 18 },
  supportCopy: { flex: 1, gap: 2 },
  supportHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  supportIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(22,163,74,0.12)",
    borderRadius: 22,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  supportPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(22,163,74,0.1)",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.sm,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  supportPillText: {
    color: "#15803D",
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  supportStatus: { color: "#16A34A", fontSize: 16, fontWeight: "700" },
  supportTime: { color: palette.onSurface, fontSize: 16, fontWeight: "700" },
  tileSubtitle: { color: palette.onSurfaceVariant, fontSize: 13 },
  tileTitle: { color: palette.onSurface, fontSize: 16, fontWeight: "700" },
  viewAllPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  viewAllText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  warningCard: {
    backgroundColor: "rgba(255,248,248,0.98)",
    borderColor: "rgba(186,26,26,0.15)",
  },
  warningPill: {
    backgroundColor: "rgba(186,26,26,0.12)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  warningPillText: {
    color: palette.error,
    fontSize: typography.label,
    fontWeight: "800",
  },
});
