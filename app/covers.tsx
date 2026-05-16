import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  type GestureResponderEvent,
  type ViewStyle,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { AppModal } from '@/components/app/app-modal';
import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { SummaryCard, type SummaryCardTone } from '@/components/dashboard/summary-card';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import { type CoverRecord, type PaymentTimelineItem, deleteCover, getCoverById, getCovers, getPaymentTimeline, markCyclePaid, markExpiryComplete } from '@/features/covers/covers-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type CoverStatus = 'ACTIVE' | 'DUE' | 'LAPSED';
type CoverFilter = 'ALL' | CoverStatus;

type CoverSummaryCard = {
  count: string;
  filter: CoverFilter;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  label: string;
  title: string;
};

type CoverListItem = {
  dueDate: string;
  id: string;
  provider: string;
  status: CoverStatus;
  title: string;
  type: string;
};

type CoverNotificationItem = {
  dateLabel: string;
  daysLabel: string;
  id: string;
  provider: string;
  title: string;
  type: string;
};

type NotificationActionKind = 'cycle' | 'expiry';

type NotificationConfirmState = {
  coverId: string | null;
  kind: NotificationActionKind | null;
  visible: boolean;
};

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

type ActionMenuPosition = {
  top: number;
};

const ACTION_MENU_HEIGHT = 208;

const EXPIRY_NOTICE_DAYS = 14;
const MONTHLY_DUE_NOTICE_DAYS = 5;

function formatLongDate(dateValue: string | null) {
  if (!dateValue) {
    return 'No due date';
  }

  const parsed = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function daysUntil(dateValue: string | null) {
  if (!dateValue) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${dateValue}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isMonthlyCover(cover: CoverRecord) {
  return cover.cycle === 'MONTHLY';
}

function getCoverTrackingDate(cover: CoverRecord) {
  return isMonthlyCover(cover) ? cover.nextDueDate ?? cover.expiryDate : cover.expiryDate;
}

function sortBySoonestDate<T>(items: T[], getDate: (item: T) => string | null) {
  return [...items].sort((left, right) => daysUntil(getDate(left)) - daysUntil(getDate(right)));
}

function getCoverStatus(cover: CoverRecord): CoverStatus {
  if (daysUntil(cover.expiryDate) < 0) {
    return 'LAPSED';
  }

  return daysUntil(getCoverTrackingDate(cover)) <= 7 ? 'DUE' : 'ACTIVE';
}

function mapCoverToListItem(cover: CoverRecord): CoverListItem {
  return {
    dueDate: formatLongDate(getCoverTrackingDate(cover)),
    id: cover.id,
    provider: cover.insuranceProvider,
    status: getCoverStatus(cover),
    title: cover.customerIdentifier,
    type: cover.insuranceProduct,
  };
}

function buildCoverSearchValue(cover: CoverRecord, listItem: CoverListItem) {
  return [
    cover.customerIdentifier,
    cover.insuranceProvider,
    cover.insuranceProduct,
    cover.policyNumber ?? '',
    cover.vehicleReg ?? '',
    cover.currency,
    cover.cycle,
    listItem.dueDate,
    listItem.status,
  ]
    .join(' ')
    .toLowerCase();
}

function buildSummaryCards(covers: CoverRecord[]): CoverSummaryCard[] {
  const counts = covers.reduce(
    (summary, cover) => {
      const status = getCoverStatus(cover);
      summary.total += 1;
      summary[status] += 1;
      return summary;
    },
    { ACTIVE: 0, DUE: 0, LAPSED: 0, total: 0 }
  );

  return [
    {
      count: String(counts.total),
      filter: 'ALL',
      icon: 'shield',
      iconTone: 'primary',
      label: 'All Policies',
      title: 'Total',
    },
    {
      count: String(counts.ACTIVE),
      filter: 'ACTIVE',
      icon: 'verified-user',
      iconTone: 'secondary',
      label: 'Protected',
      title: 'Active',
    },
    {
      count: String(counts.DUE),
      filter: 'DUE',
      icon: 'event',
      iconTone: 'tertiary',
      label: 'Renewals',
      title: 'Due',
    },
    {
      count: String(counts.LAPSED),
      filter: 'LAPSED',
      icon: 'gpp-bad',
      iconTone: 'neutral',
      label: 'Needs Attention',
      title: 'Lapsed',
    },
  ];
}

function buildCoverNotificationItem(
  cover: CoverRecord,
  targetDate: string,
  kind: 'cycle' | 'expiry'
): CoverNotificationItem {
  const remainingDays = daysUntil(targetDate);

  return {
    dateLabel: formatLongDate(targetDate),
    daysLabel:
      remainingDays === 0
        ? kind === 'cycle'
          ? 'Due today'
          : 'Expires today'
        : remainingDays === 1
          ? kind === 'cycle'
            ? 'Due in 1 day'
            : 'Expires in 1 day'
          : kind === 'cycle'
            ? `Due in ${remainingDays} days`
            : `Expires in ${remainingDays} days`,
    id: cover.id,
    provider: cover.insuranceProvider,
    title: cover.customerIdentifier,
    type: cover.insuranceProduct,
  };
}

export default function CoversScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [covers, setCovers] = useState<CoverRecord[]>([]);
  const [coverSearch, setCoverSearch] = useState('');
  const [coverFilter, setCoverFilter] = useState<CoverFilter>('ALL');
  const [coversLoading, setCoversLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [coverActionMenuOpen, setCoverActionMenuOpen] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition>({ top: 0 });
  const [coverViewOpen, setCoverViewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [coverDetailLoading, setCoverDetailLoading] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [markingExpiryCompleteId, setMarkingExpiryCompleteId] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timeline, setTimeline] = useState<PaymentTimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [notificationConfirm, setNotificationConfirm] = useState<NotificationConfirmState>({
    coverId: null,
    kind: null,
    visible: false,
  });
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [selectedCoverDetail, setSelectedCoverDetail] = useState<CoverRecord | null>(null);
  const [infoModal, setInfoModal] = useState<InfoModalState>({
    eyebrow: '',
    message: '',
    title: '',
    visible: false,
  });
  const { height, width } = useWindowDimensions();
  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;
  const listItems = useMemo(() => covers.map(mapCoverToListItem), [covers]);
  const filteredListItems = useMemo(() => {
    const query = coverSearch.trim().toLowerCase();
    return covers
      .map((cover, index) => {
        const listItem = listItems[index];
        if (!listItem) {
          return null;
        }

        if (coverFilter !== 'ALL' && listItem.status !== coverFilter) {
          return null;
        }

        if (query && !buildCoverSearchValue(cover, listItem).includes(query)) {
          return null;
        }

        return listItem;
      })
      .filter((item): item is CoverListItem => item !== null);
  }, [coverFilter, coverSearch, covers, listItems]);
  const coverSummaryCards = useMemo(() => buildSummaryCards(covers), [covers]);
  const dueSoonCount = useMemo(() => covers.filter((cover) => getCoverStatus(cover) === 'DUE').length, [covers]);
  const lapsedCount = useMemo(() => covers.filter((cover) => getCoverStatus(cover) === 'LAPSED').length, [covers]);
  const activeCount = useMemo(() => covers.filter((cover) => getCoverStatus(cover) === 'ACTIVE').length, [covers]);
  const cycleDueNotifications = useMemo(
    () =>
      sortBySoonestDate(
        covers.filter((cover) => {
          if (!isMonthlyCover(cover) || !cover.nextDueDate) {
            return false;
          }

          const days = daysUntil(cover.nextDueDate);
          return days >= 0 && days <= MONTHLY_DUE_NOTICE_DAYS;
        }),
        (cover) => cover.nextDueDate,
      )
        .map((cover) => buildCoverNotificationItem(cover, cover.nextDueDate as string, 'cycle')),
    [covers]
  );
  const expiryNotifications = useMemo(
    () =>
      sortBySoonestDate(
        covers.filter((cover) => {
          if (isMonthlyCover(cover)) {
            return false;
          }

          const days = daysUntil(cover.expiryDate);
          return days >= 0 && days <= EXPIRY_NOTICE_DAYS;
        }),
        (cover) => cover.expiryDate,
      )
        .map((cover) => buildCoverNotificationItem(cover, cover.expiryDate, 'expiry')),
    [covers]
  );
  const totalNotificationCount = cycleDueNotifications.length + expiryNotifications.length;
  const notificationConfirmCover = useMemo(
    () => covers.find((cover) => cover.id === notificationConfirm.coverId) ?? null,
    [covers, notificationConfirm.coverId]
  );
  const notificationConfirmBusy =
    (notificationConfirm.kind === 'cycle' && markingPaidId === notificationConfirm.coverId) ||
    (notificationConfirm.kind === 'expiry' && markingExpiryCompleteId === notificationConfirm.coverId);
  const readinessInsight = useMemo(() => {
    if (!covers.length) {
      return {
        body: 'Create your first cover record to start tracking renewals, due dates, and lapses from one place.',
        icon: 'shield' as const,
        toneStyle: styles.promoCardIdle,
      };
    }

    if (lapsedCount) {
      return {
        body: `${lapsedCount} cover${lapsedCount === 1 ? '' : 's'} ${lapsedCount === 1 ? 'has' : 'have'} lapsed. Prioritize recovery, then follow up on ${dueSoonCount} due-soon cover${dueSoonCount === 1 ? '' : 's'}.`,
        icon: 'gpp-bad' as const,
        toneStyle: styles.promoCardAlert,
      };
    }

    if (dueSoonCount) {
      return {
        body: `${dueSoonCount} cover${dueSoonCount === 1 ? '' : 's'} ${dueSoonCount === 1 ? 'is' : 'are'} due soon and ${activeCount} ${activeCount === 1 ? 'is' : 'are'} active. Reach out early to improve renewal conversion.`,
        icon: 'event-available' as const,
        toneStyle: styles.promoCardWarm,
      };
    }

    return {
      body: `All ${activeCount} cover${activeCount === 1 ? '' : 's'} ${activeCount === 1 ? 'is' : 'are'} currently active with no urgent renewals. Your book looks healthy right now.`,
      icon: 'verified-user' as const,
      toneStyle: styles.promoCardHealthy,
    };
  }, [activeCount, covers.length, dueSoonCount, lapsedCount]);

  const loadCovers = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.accessToken) {
        return;
      }

      const silent = options?.silent ?? false;
      if (!silent) {
        setCoversLoading(true);
      }

      try {
        const records = await getCovers(session.accessToken);
        setCovers(records);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load covers.', 'error');
        }
      } finally {
        if (!silent) {
          setCoversLoading(false);
        }
      }
    },
    [session?.accessToken, showToast]
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken) {
        setCovers([]);
        setCoversLoading(false);
        return;
      }

      loadCovers();
    }, [loadCovers, session?.accessToken])
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  async function fetchCoverDetail(coverId: string) {
    if (!session?.accessToken) {
      return null;
    }

    setCoverDetailLoading(true);

    try {
      const cover = await getCoverById(session.accessToken, coverId);
      setSelectedCoverDetail(cover);
      return cover;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load cover details.', 'error');
      }
      return null;
    } finally {
      setCoverDetailLoading(false);
    }
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
      return;
    }

    if (key === 'contracts') {
      router.push('/contracts');
      return;
    }

    if (key === 'covers') {
      return;
    }

    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
      return;
    }

    setMoreMenuOpen(false);
    setInfoModal({
      eyebrow: 'Workspace',
      message: 'This workspace can be connected next.',
      title: 'Tasks',
      visible: true,
    });
  }

  function closeInfoModal() {
    setInfoModal((current) => ({
      ...current,
      visible: false,
    }));
  }

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  function handleOpenCreate() {
    router.push('/cover-form');
  }

  function handleCoverPress(coverId: string, event: GestureResponderEvent) {
    const maxTop = Math.max(112, height - ACTION_MENU_HEIGHT - 112);
    setSelectedCoverId(coverId);
    setActionMenuPosition({
      top: Math.min(maxTop, Math.max(112, event.nativeEvent.pageY - 6)),
    });
    setCoverActionMenuOpen(true);
  }

  async function handleViewCover() {
    if (!selectedCoverId) {
      return;
    }

    setCoverActionMenuOpen(false);
    const cover = await fetchCoverDetail(selectedCoverId);

    if (cover) {
      setCoverViewOpen(true);
    }
  }

  async function handleEditCover() {
    if (!selectedCoverId) {
      return;
    }

    setCoverActionMenuOpen(false);
    router.push({
      params: { id: selectedCoverId, mode: 'edit' },
      pathname: '/cover-form',
    });
  }

  function handleDeletePrompt() {
    setCoverActionMenuOpen(false);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteCover() {
    if (!selectedCoverId || !session?.accessToken) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await deleteCover(session.accessToken, selectedCoverId);
      setDeleteConfirmOpen(false);
      setSelectedCoverId(null);
      setSelectedCoverDetail(null);
      showToast('Cover deleted successfully.');
      await loadCovers({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to delete cover.', 'error');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleViewTimeline() {
    if (!selectedCoverId || !session?.accessToken) {
      return;
    }

    setCoverActionMenuOpen(false);
    setTimelineLoading(true);
    setTimelineOpen(true);

    try {
      const items = await getPaymentTimeline(session.accessToken, selectedCoverId);
      setTimeline(items);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load payment timeline.', 'error');
      }
      setTimelineOpen(false);
    } finally {
      setTimelineLoading(false);
    }
  }

  async function handleMarkCyclePaid(coverId: string) {
    if (!session?.accessToken || markingPaidId) {
      return;
    }

    setMarkingPaidId(coverId);

    try {
      await markCyclePaid(session.accessToken, coverId);
      setNotificationConfirm({ coverId: null, kind: null, visible: false });
      showToast('Cycle marked as paid.');
      await loadCovers({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to mark cycle as paid.', 'error');
      }
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function handleMarkExpiryComplete(coverId: string) {
    if (!session?.accessToken || markingExpiryCompleteId) {
      return;
    }

    setMarkingExpiryCompleteId(coverId);

    try {
      await markExpiryComplete(session.accessToken, coverId);
      setNotificationConfirm({ coverId: null, kind: null, visible: false });
      showToast('Cover expiry marked as complete.');
      await loadCovers({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to complete cover expiry.', 'error');
      }
    } finally {
      setMarkingExpiryCompleteId(null);
    }
  }

  function openNotificationConfirm(coverId: string, kind: NotificationActionKind) {
    setNotificationConfirm({
      coverId,
      kind,
      visible: true,
    });
  }

  function closeNotificationConfirm() {
    if (notificationConfirmBusy) {
      return;
    }

    setNotificationConfirm({
      coverId: null,
      kind: null,
      visible: false,
    });
  }

  async function handleConfirmNotificationAction() {
    if (!notificationConfirm.coverId || !notificationConfirm.kind) {
      return;
    }

    if (notificationConfirm.kind === 'cycle') {
      await handleMarkCyclePaid(notificationConfirm.coverId);
      return;
    }

    await handleMarkExpiryComplete(notificationConfirm.coverId);
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'covers'} onPress={handleBottomNavPress} />}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() => setNotificationsOpen(true)}
        onProfilePress={() =>
          setInfoModal({
            eyebrow: 'Account',
            message: `Signed in as ${session.email}`,
            title: 'Account',
            visible: true,
          })
        }
        profileImageUrl={session.profileImageUrl}
        refreshControl={
          <RefreshControl
            refreshing={coversLoading}
            onRefresh={() => loadCovers()}
          />
        }
        scrollViewProps={{
          onScrollBeginDrag: () => {
            setMoreMenuOpen(false);
            setCoverActionMenuOpen(false);
          },
        }}
        title="Covers">
        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Covers Overview</Text>
              <Text style={styles.heroBody}>
                Track live policies, renewal dates, and new customer covers from the backend.
              </Text>
            </View>
            <Pressable style={styles.addButton} onPress={handleOpenCreate}>
              <MaterialIcons color={palette.white} name="add" size={18} />
              <Text style={styles.addButtonText}>Add cover</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {coverSummaryCards.map((card) => (
            <SummaryCard
              active={coverFilter === card.filter}
              key={card.title}
              count={card.count}
              icon={card.icon}
              iconTone={card.iconTone}
              label={card.label}
              style={{ width: cardWidth }}
              title={card.title}
              onPress={() => setCoverFilter(card.filter)}
            />
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Covers List</Text>
            <Text style={styles.sectionCount}>
              {filteredListItems.length} {coverFilter === 'ALL' ? 'records' : `${coverFilter.toLowerCase()} records`}
            </Text>
          </View>
          <View style={styles.searchBar}>
            <MaterialIcons color={palette.onSurfaceVariant} name="search" size={18} />
            <TextInput
              placeholder="Search customer, provider, product, policy..."
              placeholderTextColor={palette.onSurfaceVariant}
              returnKeyType="search"
              selectionColor={palette.primary}
              style={styles.searchInput}
              value={coverSearch}
              onChangeText={setCoverSearch}
            />
            {coverSearch.trim() ? (
              <Pressable hitSlop={8} onPress={() => setCoverSearch('')}>
                <MaterialIcons color={palette.onSurfaceVariant} name="close" size={18} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.listCard}>
            {filteredListItems.length ? (
              filteredListItems.map((cover, index) => (
                <Pressable
                  key={cover.id}
                  style={[styles.coverRow, index < filteredListItems.length - 1 ? styles.coverRowBorder : null]}
                  onPress={(event) => handleCoverPress(cover.id, event)}>
                  <View style={styles.coverRowLeft}>
                    <View
                      style={[
                        styles.coverStatusDot,
                        cover.status === 'ACTIVE'
                          ? styles.coverStatusDotActive
                          : cover.status === 'DUE'
                            ? styles.coverStatusDotDue
                            : styles.coverStatusDotLapsed,
                      ]}
                    />
                    <View style={styles.coverCopy}>
                      <Text style={styles.coverTitle}>{cover.title}</Text>
                      <Text style={styles.coverMeta}>
                        {cover.provider} • {cover.type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.coverRight}>
                    <Text style={styles.coverDueDate}>{cover.dueDate}</Text>
                    <View
                      style={[
                        styles.coverStatusPill,
                        cover.status === 'ACTIVE'
                          ? styles.coverStatusPillActive
                          : cover.status === 'DUE'
                            ? styles.coverStatusPillDue
                            : styles.coverStatusPillLapsed,
                      ]}>
                      <Text style={styles.coverStatusText}>{cover.status}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : coversLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Text style={styles.emptyStateTitle}>Loading covers...</Text>
              </View>
            ) : covers.length ? (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.outline} name="search-off" size={28} />
                <Text style={styles.emptyStateTitle}>No matching covers</Text>
                <Text style={styles.emptyStateBody}>Try a different customer name, provider, product, or policy number.</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.outline} name="shield" size={28} />
                <Text style={styles.emptyStateTitle}>No covers yet</Text>
                <Text style={styles.emptyStateBody}>Create your first cover record to start tracking renewals.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.promoCard, readinessInsight.toneStyle]}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoTitle}>Renewal Readiness</Text>
            <Text style={styles.promoBody}>{readinessInsight.body}</Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name={readinessInsight.icon} size={120} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      {coverActionMenuOpen ? (
        <>
          <Pressable style={styles.actionMenuBackdrop} onPress={() => setCoverActionMenuOpen(false)} />
          <View style={[styles.actionMenu, { top: actionMenuPosition.top }]}>
            <Pressable style={styles.actionMenuItem} onPress={handleViewCover}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="visibility" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>View</Text>
            </Pressable>
            <Pressable style={styles.actionMenuItem} onPress={handleViewTimeline}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="history" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Timeline</Text>
            </Pressable>
            <Pressable style={styles.actionMenuItem} onPress={handleEditCover}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="edit" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Edit</Text>
            </Pressable>
            <Pressable style={styles.actionMenuItem} onPress={handleDeletePrompt}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconDanger]}>
                <MaterialIcons color={palette.error} name="delete-outline" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Delete</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setCoverViewOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.viewModalFrame}
        title="Cover details"
        visible={coverViewOpen}
        onClose={() => setCoverViewOpen(false)}>
        {coverDetailLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.modalLoadingText}>Loading cover details...</Text>
          </View>
        ) : selectedCoverDetail ? (
          <View style={styles.detailList}>
            <View style={styles.detailHeaderCard}>
              <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                <MaterialIcons color={palette.primary} name="shield" size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{selectedCoverDetail.customerIdentifier}</Text>
                <Text style={styles.detailHeaderMeta}>
                  {selectedCoverDetail.insuranceProvider} • {selectedCoverDetail.insuranceProduct}
                </Text>
              </View>
              <View
                style={[
                  styles.coverStatusPill,
                  getCoverStatus(selectedCoverDetail) === 'ACTIVE'
                    ? styles.coverStatusPillActive
                    : getCoverStatus(selectedCoverDetail) === 'DUE'
                      ? styles.coverStatusPillDue
                      : styles.coverStatusPillLapsed,
                ]}>
                <Text style={styles.coverStatusText}>{getCoverStatus(selectedCoverDetail)}</Text>
              </View>
            </View>
            <DetailRow label="Customer identifier" value={selectedCoverDetail.customerIdentifier} />
            <DetailRow label="Email" value={selectedCoverDetail.email ?? 'Not provided'} />
            <DetailRow label="Phone" value={selectedCoverDetail.phone ?? 'Not provided'} />
            <DetailRow label="Provider" value={selectedCoverDetail.insuranceProvider} />
            <DetailRow label="Product" value={selectedCoverDetail.insuranceProduct} />
            <DetailRow label="Premium" value={`${selectedCoverDetail.currency} ${Number(selectedCoverDetail.insurancePremium).toLocaleString()}`} />
            <DetailRow label="Cycle" value={selectedCoverDetail.cycle} />
            <DetailRow label="Expiry date" value={formatLongDate(selectedCoverDetail.expiryDate)} />
            <DetailRow label="Next due date" value={formatLongDate(selectedCoverDetail.nextDueDate)} />
            <DetailRow label="Vehicle reg" value={selectedCoverDetail.vehicleReg ?? 'Not provided'} />
            <DetailRow label="Policy number" value={selectedCoverDetail.policyNumber ?? 'Not provided'} />
            <DetailRow label="Notifications" value={selectedCoverDetail.allowPushNotif ? 'Enabled' : 'Disabled'} />
            <DetailRow label="Created" value={new Date(selectedCoverDetail.createdAt).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(selectedCoverDetail.updatedAt).toLocaleString()} />
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>No cover details available.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setTimelineOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.viewModalFrame}
        title="Payment timeline"
        visible={timelineOpen}
        onClose={() => setTimelineOpen(false)}>
        {timelineLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.modalLoadingText}>Loading timeline...</Text>
          </View>
        ) : timeline.length ? (
          <View style={styles.notificationList}>
            {timeline.map((item, index) => (
              <View
                key={`${item.dueDate}-${index}`}
                style={[styles.notificationRow, index < timeline.length - 1 ? styles.notificationRowBorder : null]}>
                <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                  <MaterialIcons color={palette.primary} name="payments" size={18} />
                </View>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>
                    {item.currency} {Number(item.amount).toLocaleString()}
                  </Text>
                  <Text style={styles.notificationMeta}>Due: {formatLongDate(item.dueDate)} • {item.cycle}</Text>
                  <Text style={styles.notificationBody}>
                    Paid: {new Date(item.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <MaterialIcons color={palette.outline} name="history" size={28} />
            <Text style={styles.modalLoadingText}>No payment history yet.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline, deleteSubmitting ? styles.modalButtonDisabled : null]}
              disabled={deleteSubmitting}
              onPress={() => setDeleteConfirmOpen(false)}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.deleteButton, deleteSubmitting ? styles.modalButtonDisabled : null]}
              disabled={deleteSubmitting}
              onPress={handleDeleteCover}>
              {deleteSubmitting ? (
                <ActivityIndicator color={palette.onError} size="small" />
              ) : (
                <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Delete cover</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title="Delete cover"
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}>
        <Text style={styles.modalIntro}>
          This will permanently delete the selected cover record. You can’t undo this action.
        </Text>
      </AppModal>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setNotificationsOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.notificationsModalFrame}
        title="Cover notifications"
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}>
        <Text style={styles.modalIntro}>
          {totalNotificationCount
            ? `${totalNotificationCount} cover notification${totalNotificationCount === 1 ? '' : 's'} need attention.`
            : 'No cycle-due or expiry alerts right now.'}
        </Text>

        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>Cycle Due</Text>
          {cycleDueNotifications.length ? (
            <View style={styles.notificationList}>
              {cycleDueNotifications.map((item, index) => (
                <View
                  key={`cycle-${item.id}`}
                  style={[styles.notificationRow, index < cycleDueNotifications.length - 1 ? styles.notificationRowBorder : null]}>
                  <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                    <MaterialIcons color={palette.primary} name="autorenew" size={18} />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMeta}>{item.provider} • {item.type}</Text>
                    <Text style={styles.notificationBody}>{item.daysLabel} • {item.dateLabel}</Text>
                  </View>
                  <Pressable
                    disabled={markingPaidId === item.id}
                    hitSlop={8}
                    style={[styles.markPaidButton, markingPaidId === item.id ? styles.markPaidButtonDisabled : null]}
                    onPress={() => openNotificationConfirm(item.id, 'cycle')}>
                    {markingPaidId === item.id ? (
                      <ActivityIndicator color={palette.primary} size="small" />
                    ) : (
                      <MaterialIcons color={palette.primary} name="check-circle-outline" size={24} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notificationEmpty}>
              <Text style={styles.notificationEmptyText}>No monthly cycle dues in the next 5 days.</Text>
            </View>
          )}
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>Expiry Due</Text>
          {expiryNotifications.length ? (
            <View style={styles.notificationList}>
              {expiryNotifications.map((item, index) => (
                <View
                  key={`expiry-${item.id}`}
                  style={[styles.notificationRow, index < expiryNotifications.length - 1 ? styles.notificationRowBorder : null]}>
                  <View style={[styles.notificationIconWrap, styles.notificationIconWrapTertiary]}>
                    <MaterialIcons color={palette.tertiary} name="event" size={18} />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMeta}>{item.provider} • {item.type}</Text>
                    <Text style={styles.notificationBody}>{item.daysLabel} • {item.dateLabel}</Text>
                  </View>
                  <Pressable
                    disabled={markingExpiryCompleteId === item.id}
                    hitSlop={8}
                    style={[styles.markPaidButton, markingExpiryCompleteId === item.id ? styles.markPaidButtonDisabled : null]}
                    onPress={() => openNotificationConfirm(item.id, 'expiry')}>
                    {markingExpiryCompleteId === item.id ? (
                      <ActivityIndicator color={palette.tertiary} size="small" />
                    ) : (
                      <MaterialIcons color={palette.tertiary} name="check-circle-outline" size={24} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notificationEmpty}>
              <Text style={styles.notificationEmptyText}>No covers expiring in the next 14 days.</Text>
            </View>
          )}
        </View>
      </AppModal>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline, notificationConfirmBusy ? styles.modalButtonDisabled : null]}
              disabled={notificationConfirmBusy}
              onPress={closeNotificationConfirm}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, notificationConfirmBusy ? styles.modalButtonDisabled : null]}
              disabled={notificationConfirmBusy || !notificationConfirmCover}
              onPress={handleConfirmNotificationAction}>
              {notificationConfirmBusy ? (
                <ActivityIndicator
                  color={notificationConfirm.kind === 'expiry' ? palette.onPrimary : palette.onPrimary}
                  size="small"
                />
              ) : (
                <Text style={styles.modalButtonText}>
                  {notificationConfirm.kind === 'cycle' ? 'Mark as paid' : 'Mark as complete'}
                </Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title={notificationConfirm.kind === 'cycle' ? 'Confirm cycle payment' : 'Confirm expiry completion'}
        visible={notificationConfirm.visible}
        onClose={closeNotificationConfirm}>
        {notificationConfirmCover ? (
          <View style={styles.detailList}>
            <Text style={styles.modalIntro}>
              {notificationConfirm.kind === 'cycle'
                ? 'Confirm that this monthly cycle has been paid before we update the cover record.'
                : 'Confirm that this cover expiry has been completed before we update the notification status.'}
            </Text>
            <View style={styles.detailHeaderCard}>
              <View
                style={[
                  styles.notificationIconWrap,
                  notificationConfirm.kind === 'cycle' ? styles.notificationIconWrapPrimary : styles.notificationIconWrapTertiary,
                ]}>
                <MaterialIcons
                  color={notificationConfirm.kind === 'cycle' ? palette.primary : palette.tertiary}
                  name={notificationConfirm.kind === 'cycle' ? 'autorenew' : 'event'}
                  size={20}
                />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{notificationConfirmCover.customerIdentifier}</Text>
                <Text style={styles.detailHeaderMeta}>
                  {notificationConfirmCover.insuranceProvider} • {notificationConfirmCover.insuranceProduct}
                </Text>
              </View>
              <View
                style={[
                  styles.coverStatusPill,
                  getCoverStatus(notificationConfirmCover) === 'ACTIVE'
                    ? styles.coverStatusPillActive
                    : getCoverStatus(notificationConfirmCover) === 'DUE'
                      ? styles.coverStatusPillDue
                      : styles.coverStatusPillLapsed,
                ]}>
                <Text style={styles.coverStatusText}>{getCoverStatus(notificationConfirmCover)}</Text>
              </View>
            </View>
            <DetailRow
              label={notificationConfirm.kind === 'cycle' ? 'Next due date' : 'Expiry date'}
              value={formatLongDate(
                notificationConfirm.kind === 'cycle'
                  ? notificationConfirmCover.nextDueDate ?? notificationConfirmCover.expiryDate
                  : notificationConfirmCover.expiryDate
              )}
            />
            <DetailRow label="Cycle" value={notificationConfirmCover.cycle} />
            <DetailRow
              label="Premium"
              value={`${notificationConfirmCover.currency} ${Number(notificationConfirmCover.insurancePremium).toLocaleString()}`}
            />
            <DetailRow label="Policy number" value={notificationConfirmCover.policyNumber ?? 'Not provided'} />
            <DetailRow label="Vehicle reg" value={notificationConfirmCover.vehicleReg ?? 'Not provided'} />
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>No cover details available.</Text>
          </View>
        )}
      </AppModal>

      {moreMenuOpen ? (
        <>
          <Pressable style={styles.moreMenuBackdrop} onPress={() => setMoreMenuOpen(false)} />
          <View style={styles.moreMenu}>
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setMoreMenuOpen(false);
                router.push('/support-tickets');
              }}>
              <View style={styles.moreMenuIconWrap}>
                <MaterialIcons color={palette.primary} name="contact-support" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Support</Text>
                <Text style={styles.moreMenuSubtitle}>Open support tools and tickets</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setMoreMenuOpen(false);
                router.push('/billing');
              }}>
              <View style={styles.moreMenuIconWrap}>
                <MaterialIcons color={palette.primary} name="verified-user" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Billing</Text>
                <Text style={styles.moreMenuSubtitle}>Manage subscription and payments</Text>
              </View>
            </Pressable>
            <Pressable style={styles.moreMenuItem} onPress={handleLogout}>
              <View style={[styles.moreMenuIconWrap, styles.moreMenuIconWrapMuted]}>
                <MaterialIcons color={palette.onSurface} name="logout" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Logout</Text>
                <Text style={styles.moreMenuSubtitle}>Sign out of your account</Text>
              </View>
            </Pressable>
          </View>
        </>
      ) : null}
      <AppMessageModal
        eyebrow={infoModal.eyebrow}
        message={infoModal.message}
        title={infoModal.title}
        visible={infoModal.visible}
        onClose={closeInfoModal}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionMenu: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 156,
    padding: 6,
    position: 'absolute',
    right: spacing.marginMobile,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    zIndex: 50,
  },
  actionMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 40,
  },
  actionMenuIconDanger: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },
  actionMenuIconPrimary: {
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
  },
  actionMenuIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  actionMenuItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(192, 199, 214, 0.4)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionMenuTitle: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.label,
    fontWeight: '700',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  addButtonText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  coverCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  coverDueDate: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  coverMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  coverRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  coverRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  coverRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  coverRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coverStatusDot: {
    borderRadius: radius.pill,
    height: 12,
    width: 12,
  },
  coverStatusDotActive: {
    backgroundColor: '#16A34A',
  },
  coverStatusDotDue: {
    backgroundColor: '#F59E0B',
  },
  coverStatusDotLapsed: {
    backgroundColor: '#BA1A1A',
  },
  coverStatusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  coverStatusPillActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  coverStatusPillDue: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  coverStatusPillLapsed: {
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
  },
  coverStatusText: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
  },
  coverTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyStateBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  emptyStateTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  createModalFrame: {
    maxHeight: '75%',
  } as ViewStyle,
  cycleModalFrame: {
    maxWidth: 420,
    maxHeight: '42%',
  } as ViewStyle,
  dateModalFrame: {
    maxWidth: 420,
    maxHeight: '56%',
  } as ViewStyle,
  deleteButton: {
    backgroundColor: palette.error,
  },
  deleteButtonText: {
    color: palette.onError,
  },
  deleteModalFrame: {
    maxWidth: 380,
  } as ViewStyle,
  detailHeaderCard: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  detailHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  detailHeaderMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  detailHeaderTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  detailLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  detailList: {
    gap: spacing.md,
  },
  detailRow: {
    gap: spacing.xs,
  },
  detailValue: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
    lineHeight: 20,
  },
  notificationsModalFrame: {
    maxHeight: '70%',
  } as ViewStyle,
  viewModalFrame: {
    maxHeight: '75%',
  } as ViewStyle,
  cycleOption: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  cycleOptionActive: {
    backgroundColor: 'rgba(0, 92, 171, 0.05)',
    borderColor: palette.primary,
  },
  cycleOptionBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  cycleOptionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cycleOptionTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  cycleOptions: {
    gap: spacing.sm,
  },
  calendarDay: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.md,
    justifyContent: 'center',
    width: '13.3%',
  },
  calendarDayEmpty: {
    opacity: 0,
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: palette.primary,
  },
  calendarDayText: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  calendarDayTextEmpty: {
    color: 'transparent',
  },
  calendarDayTextPast: {
    color: palette.onSurfaceVariant,
  },
  calendarDayTextSelected: {
    color: palette.onPrimary,
  },
  calendarGrid: {
    columnGap: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarNavButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  calendarTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  calendarWeekday: {
    color: palette.onSurfaceVariant,
    flex: 1,
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  formStack: {
    gap: spacing.md,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  heroSection: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  heroTitle: {
    color: palette.white,
    fontSize: typography.display,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.body,
    paddingVertical: spacing.xs,
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonOutline: {
    backgroundColor: 'transparent',
    borderColor: palette.outlineVariant,
    borderWidth: 1,
  },
  modalButtonText: {
    color: palette.onPrimary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  modalButtonTextOutline: {
    color: palette.onSurface,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalIntro: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalLoadingState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  modalLoadingText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  modalSection: {
    gap: spacing.md,
  },
  modalSectionTitle: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  notificationBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  notificationCopy: {
    flex: 1,
    gap: 2,
  },
  notificationEmpty: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(192, 199, 214, 0.55)',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  notificationEmptyText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  notificationIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  notificationIconWrapPrimary: {
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
  },
  notificationIconWrapTertiary: {
    backgroundColor: 'rgba(181, 28, 0, 0.1)',
  },
  notificationList: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  notificationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  notificationRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  notificationTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  moreMenu: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: 94,
    padding: spacing.sm,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: '72%',
    zIndex: 40,
  },
  moreMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
    zIndex: 30,
  },
  moreMenuCopy: {
    flex: 1,
    gap: 2,
  },
  moreMenuIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  moreMenuIconWrapMuted: {
    backgroundColor: 'rgba(224, 227, 229, 0.85)',
  },
  moreMenuItem: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  moreMenuSubtitle: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
  },
  moreMenuTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  promoBody: {
    color: 'rgba(254,252,255,0.9)',
    fontSize: typography.bodySmall,
    maxWidth: '70%',
  },
  promoCard: {
    backgroundColor: palette.primaryContainer,
    borderRadius: radius.lg,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  promoCardAlert: {
    backgroundColor: palette.tertiaryContainer,
  },
  promoCardHealthy: {
    backgroundColor: '#0F766E',
  },
  promoCardIdle: {
    backgroundColor: palette.primaryContainer,
  },
  promoCardWarm: {
    backgroundColor: '#B45309',
  },
  promoCopy: {
    gap: spacing.xs,
    zIndex: 1,
  },
  promoIcon: {
    bottom: -24,
    position: 'absolute',
    right: -12,
    transform: [{ rotate: '12deg' }],
  },
  promoTitle: {
    color: palette.onPrimaryContainer,
    fontSize: typography.title,
    fontWeight: '700',
  },
  selectBlock: {
    gap: spacing.xs,
  },
  selectError: {
    color: palette.error,
    fontSize: typography.label,
    lineHeight: 16,
  },
  selectLabel: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.24,
  },
  selectLabelError: {
    color: palette.error,
  },
  selectShell: {
    alignItems: 'center',
    backgroundColor: palette.glassSoft,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  selectShellError: {
    borderColor: palette.error,
  },
  selectValue: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.body,
  },
  sectionBlock: {
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
  },
  sectionCount: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryGrid: {
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    paddingHorizontal: spacing.marginMobile,
    rowGap: spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchPill: {
    backgroundColor: palette.surfaceContainerHigh,
    borderRadius: radius.pill,
    height: 30,
    paddingHorizontal: 3,
    width: 52,
  },
  switchPillActive: {
    backgroundColor: 'rgba(0,92,171,0.18)',
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(192, 199, 214, 0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  switchSubtitle: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  switchThumb: {
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    height: 24,
    marginTop: 3,
    transform: [{ translateX: 0 }],
    width: 24,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  switchTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  markPaidButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  markPaidButtonDisabled: {
    opacity: 0.5,
  },
});
