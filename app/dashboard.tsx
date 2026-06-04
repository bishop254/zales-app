import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppModal } from '@/components/app/app-modal';
import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import {
  ActionNeededCard,
  ActiveContractsCard,
  ActiveCoversCard,
  CombinedHealthCard,
  DashboardSummaryAnalyticsCard,
  EmptyAnalyticsState,
  RecentActivityList,
  TaskCompletionCard,
} from '@/components/dashboard/dashboard-analytics-sections';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ReferralCodePill } from '@/components/dashboard/referral-code-pill';
import { imagery, palette, radius, spacing, typography } from '@/constants/app-theme';
import type { DashboardRecentActivity } from '@/features/analytics/analytics-types';
import { useDashboardAnalytics } from '@/features/analytics/use-dashboard-analytics';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type AdminAudienceMode = 'all_users' | 'specific_user';

const SUMMARY_CARD_KEYS = ['tasks', 'contracts', 'covers', 'journals'];
export default function DashboardScreen() {
  const { logout, session } = useAuth();
  const { showToast } = useToast();
  const { hasActiveSubscription, reloadSubscription, subscriptionLoading } = useSubscription();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('home');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [adminPickerOpen, setAdminPickerOpen] = useState(false);
  const [summaryPage, setSummaryPage] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const isAdmin = session?.roles?.includes('ADMIN') ?? false;

  const {
    adminMode,
    adminUsers,
    adminUsersLoading,
    analytics,
    error,
    loadAdminUsers,
    loading,
    refresh,
    selectedAdminUser,
    setAdminMode,
    setSelectedAdminUser,
  } = useDashboardAnalytics({
    accessToken: session?.accessToken,
    isAdmin,
  });

  useFocusEffect(
    useCallback(() => {
      reloadSubscription(true);
    }, [reloadSubscription]),
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (isAdmin && adminMode === 'specific_user') {
      loadAdminUsers();
    }
  }, [adminMode, isAdmin, loadAdminUsers]);

  const displayName = session?.name?.trim() || session?.email.split('@')[0] || 'Agent';
  const firstName = session?.firstName?.trim() || displayName.split(' ')[0] || 'Alex';
  const referralCode = session?.referralCode?.trim() || 'AGENT2024';
  const avatarLetter = displayName.slice(0, 1).toUpperCase();
  const summaryCardWidth = Math.min(176, width * 0.42);
  const cardsLocked = !isAdmin && (subscriptionLoading || !hasActiveSubscription);
  const hasNotification = (analytics?.actionNeeded?.total ?? 0) > 0;

  const summaryCards = useMemo(() => {
    const baseCards = analytics?.summaryCards ?? [];
    const sortedCards = [...baseCards].sort((left, right) => {
      const leftIndex = SUMMARY_CARD_KEYS.indexOf(left.key);
      const rightIndex = SUMMARY_CARD_KEYS.indexOf(right.key);
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    });

    if (!isAdmin && analytics?.supportHealth?.openTickets !== undefined) {
      return [
        ...sortedCards,
        {
          category: 'SUPPORT',
          icon: 'contact-support',
          key: 'support',
          label: 'Open Tickets',
          subtitle: analytics.supportHealth.openTickets === 1 ? 'Open ticket' : 'Open tickets',
          trendDirection: analytics.supportHealth.openTickets > 0 ? 'down' : 'neutral',
          trendPercentage: analytics.actionNeeded?.total ?? 0,
          value: analytics.supportHealth.openTickets,
        },
      ];
    }

    return sortedCards;
  }, [analytics?.actionNeeded?.total, analytics?.summaryCards, analytics?.supportHealth?.openTickets, isAdmin]);

  const summaryPages = Math.max(1, Math.ceil(summaryCards.length / 2));
  const recentActivityPreview = useMemo(() => (analytics?.recentActivity ?? []).slice(0, 4), [analytics?.recentActivity]);

  const welcomeTitle = useMemo(() => {
    if (!isAdmin) {
      return `Welcome back, ${firstName}!`;
    }

    if (adminMode === 'specific_user' && selectedAdminUser) {
      return `User view: ${selectedAdminUser.email}`;
    }

    return 'Platform Overview';
  }, [adminMode, firstName, isAdmin, selectedAdminUser]);

  const adminModeLabel =
    adminMode === 'all_users' ? 'All Users' : selectedAdminUser ? selectedAdminUser.email : 'Specific User';
  const hasDashboardContent =
    summaryCards.length > 0 ||
    recentActivityPreview.length > 0 ||
    Boolean(analytics?.performanceOutlook.taskCompletion) ||
    Boolean(analytics?.performanceOutlook.coverStatusBreakdown?.items.length) ||
    Boolean(analytics?.performanceOutlook.contractStatusBreakdown?.items.length) ||
    Boolean(analytics?.subscription) ||
    Boolean(analytics?.supportHealth);
  const friendlyErrorBody = error.includes('Cannot GET')
    ? 'We could not reach your analytics workspace right now. Please retry in a moment.'
    : error;
  const loadingMessages = useMemo(
    () =>
      isAdmin
        ? ['Preparing your platform overview...', 'Pulling the latest workspace analytics...', 'Almost ready for your review...']
        : [
            `Welcome back, ${firstName}!`,
            'Preparing your dashboard...',
            'Pulling your latest analytics...',
            'Almost ready. We are mapping your activity now...',
          ],
    [firstName, isAdmin],
  );
  const showInitialLoadingState = loading && !hasDashboardContent && !error;
  useEffect(() => {
    if (!showInitialLoadingState) {
      setLoadingMessageIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1600);

    return () => clearInterval(timer);
  }, [loadingMessages.length, showInitialLoadingState]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!isAdmin && !subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  function closeMenus() {
    setMoreMenuOpen(false);
  }

  function handleLogout() {
    closeMenus();
    logout({ animated: true, redirectToLogin: true });
  }

  function goToBilling() {
    closeMenus();
    router.push('/billing');
  }

  function handleBottomNavPress(key: string) {
    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
      return;
    }

    closeMenus();

    if (key === 'contracts') {
      router.push('/contracts');
      return;
    }

    if (key === 'journals') {
      router.push('/journals');
      return;
    }

    if (key === 'tasks') {
      router.push('/tasks');
      return;
    }

    if (key === 'covers') {
      router.push('/covers');
      return;
    }

    setActiveTab(key);
  }

  async function handleCopyReferralCode() {
    try {
      await Clipboard.setStringAsync(referralCode);
      showToast('Referral code copied.', 'success');
    } catch {
      showToast('Unable to copy referral code.', 'error');
    }
  }

  function handleNotificationPress() {
    const actionCount = analytics?.actionNeeded?.total ?? 0;

    if (actionCount > 0) {
      showToast(`${actionCount} dashboard alerts need your attention.`, 'success');
      return;
    }

    showToast('You are all caught up right now.');
  }

  function handleSummaryCardPress(key: string) {
    if (cardsLocked) {
      goToBilling();
      return;
    }

    if (key.includes('task')) {
      router.push('/tasks');
      return;
    }

    if (key.includes('contract')) {
      router.push('/contracts');
      return;
    }

    if (key.includes('cover') || key.includes('insurance')) {
      router.push('/covers');
      return;
    }

    if (key.includes('journal')) {
      router.push('/journals');
      return;
    }

    if (key.includes('subscription') || key.includes('billing')) {
      router.push('/billing');
      return;
    }

    if (key.includes('ticket') || key.includes('support')) {
      router.push('/support-tickets');
      return;
    }
  }

  function handleSummaryScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const pageWidth = (summaryCardWidth + spacing.md) * 2;
    const nextPage = Math.max(0, Math.min(summaryPages - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth)));
    setSummaryPage(nextPage);
  }

  function routeToModule(route?: string, entityType?: DashboardRecentActivity['type']) {
    const normalizedRoute = route?.toLowerCase() ?? '';

    if (normalizedRoute.includes('task') || entityType === 'TASK') {
      router.push('/tasks');
      return;
    }

    if (normalizedRoute.includes('contract') || entityType === 'CONTRACT') {
      router.push('/contracts');
      return;
    }

    if (normalizedRoute.includes('cover') || entityType === 'COVER') {
      router.push('/covers');
      return;
    }

    if (normalizedRoute.includes('journal') || entityType === 'JOURNAL') {
      router.push('/journals');
      return;
    }

    if (normalizedRoute.includes('support') || entityType === 'SUPPORT_TICKET') {
      router.push('/support-tickets');
      return;
    }

    if (normalizedRoute.includes('billing') || entityType === 'BILLING') {
      router.push('/billing');
      return;
    }

    router.push('/dashboard');
  }

  function handleRecentActivityPress(item: DashboardRecentActivity) {
    if (cardsLocked) {
      goToBilling();
      return;
    }

    routeToModule(item.route, item.type);
  }

  function handleActionRoutePress(route?: string) {
    if (cardsLocked) {
      goToBilling();
      return;
    }

    routeToModule(route);
  }

  function handleProfilePress() {
    router.push('/profile');
  }

  function handleAdminModeChange(mode: AdminAudienceMode) {
    if (mode === 'all_users') {
      setSelectedAdminUser(null);
      setAdminMode('all_users');
      setAdminPickerOpen(false);
      return;
    }

    setAdminMode('specific_user');
    setAdminPickerOpen(true);
  }

  async function openAdminPicker() {
    setAdminPickerOpen(true);
    await loadAdminUsers();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ImageBackground source={{ uri: imagery.pipeline }} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.backgroundOverlay} />
      </ImageBackground>

      <View style={styles.screen}>
        <DashboardHeader
          avatarLetter={avatarLetter}
          hasNotification={hasNotification}
          onNotificationPress={handleNotificationPress}
          onProfilePress={handleProfilePress}
          profileImageUrl={session.profileImageUrl}
        />

        {showInitialLoadingState ? (
          <View style={styles.loadingScreen}>
            <View style={styles.loadingCard}>
              <View style={styles.loadingSpinnerWrap}>
                <ActivityIndicator color={palette.primary} size="large" />
              </View>
              <Text style={styles.loadingTitle}>{loadingMessages[loadingMessageIndex]}</Text>
              <Text style={styles.loadingBody}>
                {isAdmin
                  ? 'We are building a fresh snapshot of users, subscriptions, and activity across the platform.'
                  : 'We are pulling your latest tasks, covers, contracts, journals, and support insights.'}
              </Text>
            </View>
          </View>
        ) : null}

        {!showInitialLoadingState ? (
          <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={closeMenus}
          refreshControl={
            <RefreshControl
              onRefresh={refresh}
              progressBackgroundColor={palette.surfaceContainerLowest}
              refreshing={loading}
              tintColor={palette.white}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <Text style={styles.welcomeTitle}>{welcomeTitle}</Text>
            <Text style={styles.heroSubtitle}>
              {isAdmin
                ? 'Track platform activity, account health, and the latest movement across the workspace.'
                : 'Here is the latest view of your pipeline, activity, and what needs attention next.'}
            </Text>
            {!isAdmin ? <ReferralCodePill code={referralCode} onCopy={handleCopyReferralCode} /> : null}

            {isAdmin ? (
              <View style={styles.filterRow}>
                <Pressable
                  style={[styles.filterChip, adminMode === 'all_users' ? styles.filterChipActive : null]}
                  onPress={() => handleAdminModeChange('all_users')}>
                  <Text style={[styles.filterChipText, adminMode === 'all_users' ? styles.filterChipTextActive : null]}>
                    All Users
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, adminMode === 'specific_user' ? styles.filterChipActive : null]}
                  onPress={() => handleAdminModeChange('specific_user')}>
                  <Text
                    style={[styles.filterChipText, adminMode === 'specific_user' ? styles.filterChipTextActive : null]}>
                    Specific User
                  </Text>
                </Pressable>
                {adminMode === 'specific_user' ? (
                  <Pressable style={styles.selectedUserPill} onPress={openAdminPicker}>
                    <MaterialIcons color={palette.primary} name="person-search" size={16} />
                    <Text style={styles.selectedUserText} numberOfLines={1}>
                      {adminModeLabel}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          {subscriptionLoading && !isAdmin ? (
            <View style={styles.statusBanner}>
              <ActivityIndicator color={palette.primary} />
              <View style={styles.statusBannerCopy}>
                <Text style={styles.statusBannerTitle}>Checking your subscription access</Text>
                <Text style={styles.statusBannerBody}>We are confirming your active plan before loading the full workspace.</Text>
              </View>
            </View>
          ) : null}

          {error && !loading ? (
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackIconWrap}>
                  <MaterialIcons color={palette.white} name="cloud-off" size={22} />
                </View>
                <View style={styles.feedbackCopy}>
                  <Text style={styles.feedbackTitle}>Dashboard insights are unavailable right now</Text>
                  <Text style={styles.feedbackBody}>{friendlyErrorBody}</Text>
                </View>
              </View>
              <Pressable style={styles.feedbackButton} onPress={refresh}>
                <Text style={styles.feedbackButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.summaryRow}
            horizontal
            onMomentumScrollEnd={handleSummaryScroll}
            onScrollEndDrag={handleSummaryScroll}
            showsHorizontalScrollIndicator={false}>
            {loading && !(analytics?.summaryCards?.length ?? 0)
              ? Array.from({ length: 5 }).map((_, index) => (
                  <View key={`summary-skeleton-${index}`} style={[styles.skeletonCard, { width: summaryCardWidth }]} />
                ))
              : summaryCards.map((card) => (
                  <DashboardSummaryAnalyticsCard
                    key={`${card.key}-${card.label}`}
                    card={card}
                    onPress={() => handleSummaryCardPress(card.key)}
                    style={{ width: summaryCardWidth }}
                  />
                ))}
          </ScrollView>

              {summaryPages > 1 ? (
            <View style={styles.summaryDots}>
              {Array.from({ length: summaryPages }).map((_, index) => (
                <View key={`summary-dot-${index}`} style={[styles.summaryDot, index === summaryPage ? styles.summaryDotActive : null]} />
              ))}
            </View>
          ) : null}

          <View style={styles.analyticsGrid}>
            {loading && !(analytics?.summaryCards?.length ?? 0) ? (
              <>
                <View style={styles.analyticsSkeleton} />
              </>
            ) : (
              <>
                <TaskCompletionCard taskCompletion={analytics?.performanceOutlook.taskCompletion} />
                <ActiveCoversCard breakdown={analytics?.performanceOutlook.coverStatusBreakdown} />
                <ActiveContractsCard breakdown={analytics?.performanceOutlook.contractStatusBreakdown} />
              </>
            )}
          </View>

          <View style={styles.sectionWrap}>
            <ActionNeededCard actionNeeded={analytics?.actionNeeded} onRoutePress={handleActionRoutePress} />
          </View>

          <View style={styles.analyticsGrid}>
            {loading && !(analytics?.summaryCards?.length ?? 0) ? (
              <View style={styles.analyticsSkeleton} />
            ) : (
              <CombinedHealthCard subscription={analytics?.subscription} supportHealth={analytics?.supportHealth} />
            )}
          </View>

          <View style={styles.sectionWrap}>
            {loading && !(analytics?.summaryCards?.length ?? 0) ? (
              <View style={[styles.sectionSkeleton, styles.recentActivitySkeleton]} />
            ) : (
              <RecentActivityList
                items={recentActivityPreview}
                onItemPress={handleRecentActivityPress}
                onViewAll={() => router.push('/profile')}
              />
            )}
          </View>

          {!loading && !error && !hasDashboardContent ? (
            <View style={styles.dashboardEmptyWrap}>
              <EmptyAnalyticsState
                body="Create a few tasks, covers, contracts, or journal entries and this dashboard will start turning into a live performance view."
                icon="dashboard"
                label="Your dashboard is ready for activity"
                size="tall"
              />
            </View>
          ) : null}
          </ScrollView>
        ) : null}

        {moreMenuOpen ? (
          <>
            <Pressable style={styles.moreMenuBackdrop} onPress={closeMenus} />
            <View style={styles.moreMenu}>
              <Pressable
                style={styles.moreMenuItem}
                onPress={() => {
                  closeMenus();
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

              <Pressable style={styles.moreMenuItem} onPress={goToBilling}>
                <View style={styles.moreMenuIconWrap}>
                  <MaterialIcons color={palette.primary} name="verified-user" size={20} />
                </View>
                <View style={styles.moreMenuCopy}>
                  <Text style={styles.moreMenuTitle}>Billing</Text>
                  <Text style={styles.moreMenuSubtitle}>Manage subscription and payments</Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.moreMenuItem}
                onPress={() => {
                  closeMenus();
                  router.push('/recycle-bin');
                }}>
                <View style={styles.moreMenuIconWrap}>
                  <MaterialIcons color={palette.primary} name="delete-sweep" size={20} />
                </View>
                <View style={styles.moreMenuCopy}>
                  <Text style={styles.moreMenuTitle}>Recycle Bin</Text>
                  <Text style={styles.moreMenuSubtitle}>Restore or clear deleted records</Text>
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

        <AppModal
          eyebrow="Analytics Scope"
          onClose={() => setAdminPickerOpen(false)}
          title="Select a user"
          visible={adminPickerOpen}>
          <View style={styles.modalBody}>
            <Text style={styles.modalIntro}>Choose a user to load their personal dashboard analytics in the same dashboard layout.</Text>
            {adminUsersLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={palette.primary} />
                <Text style={styles.modalLoadingText}>Loading users...</Text>
              </View>
            ) : adminUsers.length ? (
              adminUsers.map((user) => {
                const selected = selectedAdminUser?.id === user.id;

                return (
                  <Pressable
                    key={user.id}
                    style={[styles.userRow, selected ? styles.userRowSelected : null]}
                    onPress={() => {
                      setSelectedAdminUser(user);
                      setAdminMode('specific_user');
                      setAdminPickerOpen(false);
                    }}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{user.email.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userCopy}>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <Text style={styles.userMeta}>
                        {user.status} • {user.roles.join(', ') || 'User'}
                      </Text>
                    </View>
                    {selected ? <MaterialIcons color={palette.primary} name="check-circle" size={20} /> : null}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No users available for analytics selection right now.</Text>
              </View>
            )}
          </View>
        </AppModal>

        <FloatingBottomNav activeKey={moreMenuOpen ? 'more' : activeTab} onPress={handleBottomNavPress} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  analyticsGrid: {
    flexDirection: 'column',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.marginMobile,
  },
  analyticsSkeleton: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 248,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 51, 102, 0.22)',
  },
  feedbackBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  feedbackButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  feedbackButtonText: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  feedbackCard: {
    backgroundColor: 'rgba(10, 35, 79, 0.52)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  feedbackCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  feedbackHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  feedbackIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  feedbackTitle: {
    color: palette.white,
    fontSize: typography.title,
    fontWeight: '700',
  },
  dashboardEmptyWrap: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.marginMobile,
  },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: palette.white,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  filterChipText: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: palette.primary,
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroSection: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.bodySmall,
    lineHeight: 20,
    maxWidth: '92%',
  },
  loadingBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 300,
    textAlign: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(10, 35, 79, 0.48)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.marginMobile,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  loadingScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 92,
  },
  loadingSpinnerWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  loadingTitle: {
    color: palette.white,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBody: {
    gap: spacing.sm,
  },
  modalEmpty: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modalEmptyText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  modalIntro: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  modalLoading: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  modalLoadingText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
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
  modalBodyPadding: {
    paddingBottom: spacing.sm,
  },
  performanceSkeleton: {
    minHeight: 286,
  },
  safeArea: {
    backgroundColor: palette.deepNavy,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 164,
    paddingTop: 92,
  },
  sectionSkeleton: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: radius.lg,
    minHeight: 180,
  },
  sectionWrap: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.marginMobile,
  },
  selectedUserPill: {
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  selectedUserText: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
    maxWidth: 180,
  },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: radius.xl,
    height: 136,
  },
  statusBanner: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.marginMobile,
    marginBottom: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  statusBannerBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  statusBannerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  statusBannerTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  summaryDot: {
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  summaryDotActive: {
    backgroundColor: palette.white,
    width: 18,
  },
  summaryDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  summaryRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.marginMobile,
  },
  userAvatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,92,171,0.1)',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  userAvatarText: {
    color: palette.primary,
    fontSize: typography.bodySmall,
    fontWeight: '800',
  },
  userCopy: {
    flex: 1,
    gap: 2,
  },
  userEmail: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  userMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
  },
  userRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  userRowSelected: {
    borderColor: 'rgba(0,92,171,0.24)',
    backgroundColor: 'rgba(212,227,255,0.4)',
  },
  welcomeTitle: {
    color: palette.white,
    fontSize: typography.display,
    fontWeight: '700',
  },
  recentActivitySkeleton: {
    minHeight: 232,
  },
});
