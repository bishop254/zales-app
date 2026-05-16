import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { imagery, palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import { getContracts } from '@/features/contracts/contracts-api';
import { getCovers } from '@/features/covers/covers-api';
import { dashboardShortcuts, recentActivity } from '@/features/dashboard/data';
import { getSupportTickets } from '@/features/support-tickets/support-tickets-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

export default function DashboardScreen() {
  const { logout, session } = useAuth();
  const { showToast } = useToast();
  const { hasActiveSubscription, subscriptionLoading, reloadSubscription } = useSubscription();
  const [activeTab, setActiveTab] = useState('home');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [contractsCount, setContractsCount] = useState(0);
  const [coversCount, setCoversCount] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);
  const { width } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      reloadSubscription(true);
    }, [reloadSubscription])
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken || subscriptionLoading || !hasActiveSubscription) {
        setContractsCount(0);
        setCoversCount(0);
        setTicketsCount(0);
        return;
      }

      let active = true;

      async function loadDashboardCounts() {
        try {
          const [contracts, covers, tickets] = await Promise.all([
            getContracts(session.accessToken),
            getCovers(session.accessToken),
            getSupportTickets(session.accessToken),
          ]);

          if (!active) {
            return;
          }

          setContractsCount(contracts.length);
          setCoversCount(covers.length);
          setTicketsCount(tickets.length);
        } catch (error) {
          if (!active || error instanceof UnauthorizedError) {
            return;
          }

          showToast(error instanceof Error ? error.message : 'Unable to load dashboard totals.', 'error');
        }
      }

      loadDashboardCounts();

      return () => {
        active = false;
      };
    }, [hasActiveSubscription, session?.accessToken, showToast, subscriptionLoading])
  );

  const displayName = session?.name?.trim() || session?.email.split('@')[0] || 'Agent';
  const firstName = session?.firstName?.trim() || displayName.split(' ')[0] || 'Alex';
  const referralCode = session?.referralCode?.trim() || 'AGENT2024';
  const shortcutCardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;
  const cardsLocked = subscriptionLoading || !hasActiveSubscription;
  const dashboardCards = dashboardShortcuts.map((item) => {
    if (item.title === 'Contracts' || item.icon === 'description') {
      return { ...item, badge: String(contractsCount) };
    }

    if (item.title === 'Insurance' || item.icon === 'shield') {
      return { ...item, badge: String(coversCount) };
    }

    if (item.title === 'Support' || item.icon === 'contact-support') {
      return { ...item, badge: String(ticketsCount) };
    }

    return item;
  });

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  function goToBilling() {
    setMoreMenuOpen(false);
    router.push('/billing');
  }

  function handleBottomNavPress(key: string) {
    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
      return;
    }

    setMoreMenuOpen(false);
    if (key === 'contracts') {
      router.push('/contracts');
      return;
    }

    if (key === 'covers') {
      router.push('/covers');
      return;
    }

    setActiveTab(key);
  }

  function handleShortcutPress(item: (typeof dashboardShortcuts)[number]) {
    if (cardsLocked) {
      goToBilling();
      return;
    }

    if (item.title === 'Insurance' || item.icon === 'shield') {
      router.push('/covers');
      return;
    }

    if (item.title === 'Contracts' || item.icon === 'description') {
      router.push('/contracts');
      return;
    }

    if (item.title === 'Support' || item.icon === 'contact-support') {
      router.push('/support-tickets');
      return;
    }

    Alert.alert(item.title, `${item.title} workspace can be wired next.`);
  }

  async function handleCopyReferralCode() {
    try {
      await Clipboard.setStringAsync(referralCode);
      showToast('Referral code copied.', 'success');
    } catch {
      showToast('Unable to copy referral code.', 'error');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ImageBackground source={{ uri: imagery.pipeline }} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.backgroundOverlay} />
      </ImageBackground>

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.topBarBrand}>
            <View style={styles.brandBadge}>
              <MaterialIcons color={palette.onPrimary} name="leaderboard" size={20} />
            </View>
            <Text style={styles.brandText}>ManagePro</Text>
          </View>

          <View style={styles.topBarActions}>
            <Pressable
              style={styles.notificationButton}
              onPress={() => Alert.alert('Notifications', 'Notification center can be connected next.')}>
              <MaterialIcons color="#64748B" name="notifications-none" size={24} />
              <View style={styles.notificationDot} />
            </Pressable>
            <Pressable
              style={styles.avatarWrap}
              onPress={() => Alert.alert('Account', `Signed in as ${session.email}`)}
              onLongPress={handleLogout}>
              {session.profileImageUrl ? (
                <Image source={{ uri: session.profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{displayName.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          onScrollBeginDrag={() => setMoreMenuOpen(false)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.heroSection}>
            <Text style={styles.welcomeTitle}>Welcome back, {firstName}!</Text>
            <View style={styles.referralPill}>
              <Text style={styles.referralLabel}>Your Referral Code:</Text>
              <Text style={styles.referralValue}>{referralCode}</Text>
              <Pressable hitSlop={8} onPress={handleCopyReferralCode}>
                <MaterialIcons color="rgba(255,255,255,0.7)" name="content-copy" size={16} />
              </Pressable>
            </View>
          </View>

          {subscriptionLoading ? (
            <View style={styles.subscriptionBanner}>
              <ActivityIndicator color={palette.primary} />
              <View style={styles.subscriptionBannerCopy}>
                <Text style={styles.subscriptionBannerTitle}>Checking your billing access</Text>
                <Text style={styles.subscriptionBannerBody}>
                  We are confirming whether your account has an active subscription.
                </Text>
              </View>
            </View>
          ) : !hasActiveSubscription ? (
            <View style={[styles.subscriptionBanner, styles.subscriptionBannerWarning]}>
              <View style={[styles.subscriptionStatusIcon, styles.subscriptionStatusIconWarning]}>
                <MaterialIcons color={palette.error} name="warning" size={28} />
              </View>
              <View style={styles.subscriptionBannerCopy}>
                <Text style={styles.subscriptionBannerTitle}>Subscription required</Text>
                <Text style={styles.subscriptionBannerBody}>
                  Your workspace modules are locked until you activate a plan from billing.
                </Text>
                <Pressable style={styles.subscriptionBannerButton} onPress={goToBilling}>
                  <Text style={styles.subscriptionBannerButtonText}>Proceed to Billing</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.shortcutsGrid}>
            {dashboardCards.map((item) => (
              <Pressable
                key={item.title}
                style={[
                  styles.shortcutCard,
                  { width: shortcutCardWidth },
                  cardsLocked ? styles.shortcutCardLocked : null,
                ]}
                onPress={() => handleShortcutPress(item)}>
                <View style={styles.shortcutHeader}>
                  <View
                    style={[
                      styles.shortcutIconWrap,
                      shortcutIconToneStyles[item.iconTone],
                      cardsLocked ? styles.shortcutIconWrapLocked : null,
                    ]}>
                    <MaterialIcons
                      color={cardsLocked ? '#94A3B8' : shortcutIconColor[item.iconTone]}
                      name={item.icon}
                      size={28}
                    />
                  </View>
                  <View
                    style={[
                      styles.shortcutBadge,
                      shortcutBadgeToneStyles[item.badgeTone],
                      cardsLocked ? styles.shortcutBadgeLocked : null,
                    ]}>
                    <Text
                      style={[
                        styles.shortcutBadgeText,
                        shortcutBadgeTextToneStyles[item.badgeTone],
                        cardsLocked ? styles.shortcutBadgeTextLocked : null,
                      ]}>
                      {cardsLocked ? 'Locked' : item.badge}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text
                    style={[
                      styles.shortcutEyebrow,
                      shortcutEyebrowToneStyles[item.badgeTone],
                      cardsLocked ? styles.shortcutEyebrowLocked : null,
                    ]}>
                    {cardsLocked ? 'Billing Required' : item.eyebrow}
                  </Text>
                  <Text style={[styles.shortcutTitle, cardsLocked ? styles.shortcutTitleLocked : null]}>
                    {item.title}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable
              style={styles.sectionButton}
              onPress={() => Alert.alert('Recent Activity', 'Full activity history can be added next.')}>
              <Text style={styles.sectionButtonText}>View All</Text>
            </Pressable>
          </View>

          <View style={[styles.activityCard, cardsLocked ? styles.activityCardLocked : null]}>
            {recentActivity.map((item, index) => (
              <Pressable
                key={item.id}
                style={[styles.activityRow, index < recentActivity.length - 1 ? styles.activityRowBorder : null]}
                onPress={() => {
                  if (cardsLocked) {
                    goToBilling();
                    return;
                  }

                  Alert.alert(item.title, item.meta);
                }}>
                <View style={[styles.activityIconWrap, activityIconToneStyles[item.type]]}>
                  <MaterialIcons color={activityIconColor[item.type]} name={activityIcons[item.type]} size={24} />
                </View>
                <View style={styles.activityCopy}>
                  <Text style={[styles.activityTitle, cardsLocked ? styles.dimmedText : null]}>{item.title}</Text>
                  <Text style={styles.activityMeta}>{item.meta}</Text>
                </View>
                {item.statusLabel ? (
                  <View style={styles.statusPill}>
                    <MaterialIcons color="#15803D" name="check-circle" size={14} />
                    <Text style={styles.statusText}>{item.statusLabel}</Text>
                  </View>
                ) : (
                  <MaterialIcons color={palette.outline} name="chevron-right" size={20} />
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.promoCard}>
            <View style={styles.promoCopy}>
              <Text style={styles.promoTitle}>Performance Outlook</Text>
              <Text style={styles.promoBody}>
                Your sales efficiency has increased by 14% this month. Keep it up!
              </Text>
              <Pressable
                style={styles.promoButton}
                onPress={() => {
                  if (cardsLocked) {
                    goToBilling();
                    return;
                  }

                  Alert.alert('Analytics', 'Detailed analytics screen can be wired next.');
                }}>
                <Text style={styles.promoButtonText}>Check Analytics</Text>
              </Pressable>
            </View>
            <MaterialIcons color="rgba(255,255,255,0.2)" name="trending-up" size={160} style={styles.promoIcon} />
          </View>
        </ScrollView>

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
              <Pressable style={styles.moreMenuItem} onPress={goToBilling}>
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

        <FloatingBottomNav activeKey={moreMenuOpen ? 'more' : activeTab} onPress={handleBottomNavPress} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.marginMobile,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  activityCardLocked: {
    opacity: 0.72,
  },
  activityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  activityIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  activityMeta: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
  },
  activityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  activityRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  activityTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: palette.primaryFixed,
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: palette.primary,
    fontSize: typography.title,
    fontWeight: '800',
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarWrap: {
    borderColor: palette.primaryFixed,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 40,
    overflow: 'hidden',
    width: 40,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 51, 102, 0.22)',
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  brandText: {
    color: palette.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dimmedText: {
    color: '#5B6471',
  },
  heroSection: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  notificationButton: {
    padding: 2,
  },
  notificationDot: {
    backgroundColor: palette.tertiary,
    borderColor: palette.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 10,
  },
  promoBody: {
    color: 'rgba(254,252,255,0.9)',
    fontSize: typography.bodySmall,
    maxWidth: '70%',
  },
  promoButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  promoButtonText: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  promoCard: {
    backgroundColor: palette.primaryContainer,
    borderRadius: radius.lg,
    marginBottom: 108,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  promoCopy: {
    gap: spacing.xs,
    zIndex: 1,
  },
  promoIcon: {
    bottom: -32,
    position: 'absolute',
    right: -24,
    transform: [{ rotate: '12deg' }],
  },
  promoTitle: {
    color: palette.onPrimaryContainer,
    fontSize: typography.title,
    fontWeight: '700',
  },
  referralLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.labelCaps,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  referralPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  referralValue: {
    color: palette.white,
    fontSize: typography.label,
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
  safeArea: {
    backgroundColor: palette.deepNavy,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 92,
  },
  sectionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sectionButtonText: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: palette.white,
    fontSize: typography.headline,
    fontWeight: '600',
  },
  shortcutBadge: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  shortcutBadgeLocked: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  shortcutBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  shortcutBadgeTextLocked: {
    color: '#64748B',
  },
  shortcutCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 8,
    height: 144,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  shortcutCardLocked: {
    backgroundColor: '#E5E7EB',
    borderColor: '#CBD5E1',
  },
  shortcutEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  shortcutEyebrowLocked: {
    color: '#64748B',
  },
  shortcutHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shortcutIconWrap: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  shortcutIconWrapLocked: {
    backgroundColor: '#CBD5E1',
  },
  shortcutTitle: {
    color: palette.onSurface,
    fontSize: 20,
    fontWeight: '600',
  },
  shortcutTitleLocked: {
    color: '#475569',
  },
  shortcutsGrid: {
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    paddingHorizontal: spacing.marginMobile,
    rowGap: spacing.md,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  subscriptionBanner: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.marginMobile,
    marginBottom: spacing.lg,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  subscriptionBannerActive: {
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  subscriptionBannerBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  subscriptionBannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  subscriptionBannerButtonText: {
    color: palette.onPrimary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  subscriptionBannerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  subscriptionBannerTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  subscriptionBannerWarning: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  subscriptionStatusIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.xl,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  subscriptionStatusIconWarning: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },
  topBar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 18,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    top: 0,
    width: '90%',
    zIndex: 20,
  },
  topBarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  topBarBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  welcomeTitle: {
    color: palette.white,
    fontSize: typography.display,
    fontWeight: '700',
  },
});

const shortcutIconToneStyles = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(230, 232, 234, 0.5)' },
  primary: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
  secondary: { backgroundColor: 'rgba(207, 225, 248, 0.3)' },
  tertiary: { backgroundColor: 'rgba(181, 28, 0, 0.1)' },
});

const shortcutIconColor = {
  neutral: palette.outline,
  primary: palette.primary,
  secondary: palette.onSecondaryContainer,
  tertiary: palette.tertiary,
};

const shortcutBadgeToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: 'rgba(224, 227, 229, 0.6)',
    borderColor: 'rgba(112, 119, 133, 0.1)',
  },
  primary: {
    backgroundColor: 'rgba(212, 227, 255, 0.3)',
    borderColor: 'rgba(0, 92, 171, 0.1)',
  },
  secondary: {
    backgroundColor: 'rgba(210, 228, 251, 0.4)',
    borderColor: 'rgba(79, 96, 115, 0.1)',
  },
  tertiary: {
    backgroundColor: 'rgba(255, 218, 211, 0.4)',
    borderColor: 'rgba(181, 28, 0, 0.1)',
  },
});

const shortcutBadgeTextToneStyles = StyleSheet.create({
  neutral: { color: palette.onSurface },
  primary: { color: palette.onPrimaryFixed },
  secondary: { color: palette.onSecondaryFixed },
  tertiary: { color: palette.onTertiaryFixed },
});

const shortcutEyebrowToneStyles = StyleSheet.create({
  neutral: { color: 'rgba(112, 119, 133, 0.6)' },
  primary: { color: 'rgba(0, 92, 171, 0.6)' },
  secondary: { color: 'rgba(79, 96, 115, 0.6)' },
  tertiary: { color: 'rgba(181, 28, 0, 0.6)' },
});

const activityIcons = {
  contracts: 'description' as const,
  support: 'contact-support' as const,
  tasks: 'assignment' as const,
};

const activityIconToneStyles = StyleSheet.create({
  contracts: { backgroundColor: palette.secondaryContainer },
  support: { backgroundColor: palette.surfaceContainerHigh },
  tasks: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
});

const activityIconColor = {
  contracts: palette.onSecondaryContainer,
  support: palette.outline,
  tasks: palette.primary,
};
