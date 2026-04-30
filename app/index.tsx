import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppLogo } from '@/components/app/app-logo';
import { ScreenContainer } from '@/components/app/screen-container';
import { palette, radius, spacing, typography } from '@/constants/app-theme';

const highlights = [
  {
    icon: 'shield',
    title: 'Role-ready foundation',
    body: 'A simple auth-first shell that keeps route transitions predictable and easier to secure.',
  },
  {
    icon: 'stacked-line-chart',
    title: 'Actionable dashboard',
    body: 'Daily targets, pipeline signals, and next actions sit in one focused workspace.',
  },
  {
    icon: 'account-tree',
    title: 'Maintainable flow',
    body: 'Shared components and separated logic keep landing, login, register, and dashboard easy to extend.',
  },
];

export default function LandingScreen() {
  return (
    <ScreenContainer>
      <View style={styles.wrapper}>
        <View style={styles.hero}>
          <AppLogo />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Sales agent workspace</Text>
            <Text style={styles.title}>Turn high-intent traffic into consistent in-store wins.</Text>
            <Text style={styles.subtitle}>
              Start with a clear landing experience, secure authentication patterns, and a dashboard
              that helps agents focus on next best action.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Link asChild href="/login">
              <Pressable style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Login</Text>
                <MaterialIcons color={palette.white} name="arrow-forward" size={20} />
              </Pressable>
            </Link>
            <Link asChild href="/register">
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Create account</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>Today&apos;s focus</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live pipeline</Text>
            </View>
          </View>
          <Text style={styles.previewTitle}>Priority follow-up queue is up 18% from yesterday.</Text>
          <Text style={styles.previewBody}>
            Surface the warmest leads first, keep appointment handling visible, and reduce time
            between outreach and close.
          </Text>
        </View>

        <View style={styles.highlights}>
          {highlights.map((item) => (
            <View key={item.title} style={styles.highlightCard}>
              <View style={styles.highlightIcon}>
                <MaterialIcons color={palette.primary} name={item.icon as never} size={20} />
              </View>
              <Text style={styles.highlightTitle}>{item.title}</Text>
              <Text style={styles.highlightBody}>{item.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.securityNote}>
          <MaterialIcons color={palette.borderStrong} name="verified-user" size={16} />
          <Text style={styles.securityText}>
            Designed with secure auth boundaries and future API integration in mind.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xl,
  },
  hero: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xl,
    padding: spacing.xl,
  },
  heroCopy: {
    gap: spacing.md,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.primary,
    fontSize: typography.display,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 140,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 160,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    color: palette.primary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  preview: {
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.xl,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewLabel: {
    color: '#A2CDE2',
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  liveDot: {
    backgroundColor: '#54FDC4',
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  liveText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  previewTitle: {
    color: palette.white,
    fontSize: typography.headline,
    fontWeight: '800',
    lineHeight: 32,
  },
  previewBody: {
    color: '#D9E8EF',
    fontSize: typography.body,
    lineHeight: 24,
  },
  highlights: {
    gap: spacing.md,
  },
  highlightCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  highlightIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  highlightTitle: {
    color: palette.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  highlightBody: {
    color: palette.textMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  securityNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  securityText: {
    color: palette.borderStrong,
    flex: 1,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
});
