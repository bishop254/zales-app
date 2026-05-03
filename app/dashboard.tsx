import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
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

import { imagery, palette, radius, spacing, typography } from '@/constants/app-theme';
import { bottomNavItems, dashboardShortcuts, recentActivity } from '@/features/dashboard/data';
import { useAuth } from '@/providers/auth-provider';

export default function DashboardScreen() {
  const { logout, session } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const { width } = useWindowDimensions();

  if (!session) {
    return <Redirect href="/login" />;
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const displayName = session.name?.trim() || session.email.split('@')[0];
  const firstName = session.firstName?.trim() || displayName.split(' ')[0] || 'Alex';
  const referralCode = 'AGENT2024';
  const shortcutCardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;

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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.heroSection}>
            <Text style={styles.welcomeTitle}>Welcome back, {firstName}!</Text>
            <View style={styles.referralPill}>
              <Text style={styles.referralLabel}>Your Referral Code:</Text>
              <Text style={styles.referralValue}>{referralCode}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => Alert.alert('Copied', `${referralCode} copied to clipboard placeholder.`)}>
                <MaterialIcons color="rgba(255,255,255,0.7)" name="content-copy" size={16} />
              </Pressable>
            </View>
          </View>

          <View style={styles.shortcutsGrid}>
            {dashboardShortcuts.map((item) => (
              <Pressable
                key={item.title}
                style={[styles.shortcutCard, { width: shortcutCardWidth }]}
                onPress={() => Alert.alert(item.title, `${item.title} workspace can be wired next.`)}>
                <View style={styles.shortcutHeader}>
                  <View style={[styles.shortcutIconWrap, shortcutIconToneStyles[item.iconTone]]}>
                    <MaterialIcons color={shortcutIconColor[item.iconTone]} name={item.icon} size={28} />
                  </View>
                  <View style={[styles.shortcutBadge, shortcutBadgeToneStyles[item.badgeTone]]}>
                    <Text style={[styles.shortcutBadgeText, shortcutBadgeTextToneStyles[item.badgeTone]]}>
                      {item.badge}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={[styles.shortcutEyebrow, shortcutEyebrowToneStyles[item.badgeTone]]}>
                    {item.eyebrow}
                  </Text>
                  <Text style={styles.shortcutTitle}>{item.title}</Text>
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

          <View style={styles.activityCard}>
            {recentActivity.map((item, index) => (
              <Pressable
                key={item.id}
                style={[styles.activityRow, index < recentActivity.length - 1 ? styles.activityRowBorder : null]}
                onPress={() => Alert.alert(item.title, item.meta)}>
                <View style={[styles.activityIconWrap, activityIconToneStyles[item.type]]}>
                  <MaterialIcons color={activityIconColor[item.type]} name={activityIcons[item.type]} size={24} />
                </View>
                <View style={styles.activityCopy}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
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
                onPress={() => Alert.alert('Analytics', 'Detailed analytics screen can be wired next.')}>
                <Text style={styles.promoButtonText}>Check Analytics</Text>
              </Pressable>
            </View>
            <MaterialIcons color="rgba(255,255,255,0.2)" name="trending-up" size={160} style={styles.promoIcon} />
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          {bottomNavItems.map((item) => {
            const active = item.key === activeTab;

            return (
              <Pressable
                key={item.key}
                style={[styles.bottomNavItem, active ? styles.bottomNavItemActive : null]}
                onPress={() => {
                  if (item.key === 'more') {
                    handleLogout();
                    return;
                  }

                  setActiveTab(item.key);
                }}>
                <MaterialIcons color={active ? palette.primary : '#94A3B8'} name={item.icon} size={22} />
                <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  bottomNav: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    bottom: 0,
    elevation: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 68,
    marginBottom: 16,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    position: 'absolute',
    width: '84%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
  },
  bottomNavItem: {
    alignItems: 'center',
    borderRadius: radius.lg,
    justifyContent: 'center',
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bottomNavItemActive: {
    backgroundColor: 'rgba(0, 92, 171, 0.08)',
  },
  bottomNavLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  bottomNavLabelActive: {
    color: palette.primary,
    fontWeight: '700',
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
  heroSection: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
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
  safeArea: {
    backgroundColor: palette.deepNavy,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 64,
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
  shortcutBadgeText: {
    fontSize: 14,
    fontWeight: '700',
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
  shortcutEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
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
  shortcutTitle: {
    color: palette.onSurface,
    fontSize: 20,
    fontWeight: '600',
  },
  shortcutsGrid: {
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -16,
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
  topBar: {
    alignItems: 'center',
    backgroundColor: palette.white,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    top: 0,
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
