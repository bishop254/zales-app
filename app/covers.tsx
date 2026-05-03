import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { coverList, coverSummaryCards } from '@/features/covers/data';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';

const iconToneStyles = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(230, 232, 234, 0.6)' },
  primary: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
  secondary: { backgroundColor: 'rgba(207, 225, 248, 0.35)' },
  tertiary: { backgroundColor: 'rgba(181, 28, 0, 0.1)' },
});

const iconToneColors = {
  neutral: palette.outline,
  primary: palette.primary,
  secondary: palette.onSecondaryContainer,
  tertiary: palette.tertiary,
};

export default function CoversScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { width } = useWindowDimensions();

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  const avatarLetter = (session.name?.trim() || session.email).slice(0, 1).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
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
    Alert.alert(key === 'tasks' ? 'Tasks' : 'Contracts', 'This workspace can be connected next.');
  }

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'covers'} onPress={handleBottomNavPress} />}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() =>
          Alert.alert('Notifications', 'Notification center can be connected next.')
        }
        onProfilePress={() => Alert.alert('Account', `Signed in as ${session.email}`)}
        profileImageUrl={session.profileImageUrl}
        title="Covers"
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Covers Overview</Text>
          <Text style={styles.heroBody}>
            Track active policies, renewals due soon, and covers that need follow-up.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          {coverSummaryCards.map((card) => (
            <Pressable
              key={card.title}
              style={[styles.summaryCard, { width: cardWidth }]}
              onPress={() => Alert.alert(card.title, `${card.title} covers detail can be connected next.`)}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIconWrap, iconToneStyles[card.iconTone]]}>
                  <MaterialIcons color={iconToneColors[card.iconTone]} name={card.icon} size={26} />
                </View>
                <Text style={styles.summaryCount}>{card.count}</Text>
              </View>
              <Text style={styles.summaryLabel}>{card.label}</Text>
              <Text style={styles.summaryTitle}>{card.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Covers List</Text>
          <View style={styles.listCard}>
            {coverList.map((cover, index) => (
              <Pressable
                key={cover.id}
                style={[styles.coverRow, index < coverList.length - 1 ? styles.coverRowBorder : null]}
                onPress={() => Alert.alert(cover.title, `${cover.provider} • ${cover.type}`)}>
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
            ))}
          </View>
        </View>

        <View style={styles.promoCard}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoTitle}>Renewal Readiness</Text>
            <Text style={styles.promoBody}>
              You have 6 covers due soon. Reach out early to improve renewal conversion.
            </Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name="shield" size={120} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      {moreMenuOpen ? (
        <>
          <Pressable style={styles.moreMenuBackdrop} onPress={() => setMoreMenuOpen(false)} />
          <View style={styles.moreMenu}>
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setMoreMenuOpen(false);
                Alert.alert('Support', 'Support workspace can be connected next.');
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
    </>
  );
}

const styles = StyleSheet.create({
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
  heroBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
    maxWidth: '82%',
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
  sectionBlock: {
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
  },
  sectionLabel: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryCard: {
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
  summaryCount: {
    color: palette.onSurface,
    fontSize: 20,
    fontWeight: '700',
  },
  summaryGrid: {
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    paddingHorizontal: spacing.marginMobile,
    rowGap: spacing.md,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryIconWrap: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  summaryLabel: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: palette.onSurface,
    fontSize: 20,
    fontWeight: '600',
  },
});
