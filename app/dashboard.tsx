import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/app/screen-container';
import { MetricCard } from '@/components/dashboard/metric-card';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { dashboardMetrics, priorityActions } from '@/features/dashboard/data';
import { useAuth } from '@/providers/auth-provider';

export default function DashboardScreen() {
  const { logout, session } = useAuth();

  if (!session) {
    return <Redirect href="/login" />;
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const displayName = session.email.split('@')[0];

  return (
    <ScreenContainer>
      <View style={styles.wrapper}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <MaterialIcons color={palette.primary} name="logout" size={18} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          <Text style={styles.greeting}>Good to see you, {displayName}.</Text>
          <Text style={styles.subheading}>
            Signed in as {session.email}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance snapshot</Text>
          <View style={styles.metricsGrid}>
            {dashboardMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next best actions</Text>
          <View style={styles.actionList}>
            {priorityActions.map((action, index) => (
              <View key={action} style={styles.actionCard}>
                <View style={styles.actionNumber}>
                  <Text style={styles.actionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.banner}>
          <MaterialIcons color={palette.white} name="security" size={20} />
          <Text style={styles.bannerText}>
            Login now uses the Nest backend. The access token still stays in memory only until we add
            secure device storage.
          </Text>
        </View>
        {session.isFirstLogin ? (
          <View style={styles.firstLoginCard}>
            <MaterialIcons color={palette.accent} name="lock-reset" size={20} />
            <Text style={styles.firstLoginText}>
              This account is marked as first login. The backend expects a password change flow next.
            </Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xl,
  },
  headerCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: palette.primary,
    fontSize: typography.title,
    fontWeight: '800',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    color: palette.primary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  greeting: {
    color: palette.primary,
    fontSize: typography.headline,
    fontWeight: '800',
  },
  subheading: {
    color: palette.textMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  metricsGrid: {
    gap: spacing.md,
  },
  actionList: {
    gap: spacing.md,
  },
  actionCard: {
    alignItems: 'flex-start',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  actionNumber: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  actionNumberText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  actionText: {
    color: palette.text,
    flex: 1,
    fontSize: typography.body,
    lineHeight: 22,
  },
  banner: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  bannerText: {
    color: palette.white,
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  firstLoginCard: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  firstLoginText: {
    color: palette.primary,
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
});
