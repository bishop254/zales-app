import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { SummaryCard, type SummaryCardTone } from '@/components/dashboard/summary-card';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { singleLineShrinkProps } from '@/constants/responsive-text';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  getMyAuditLog,
  getMyProfile,
  type UserAuditLogRecord,
  type UserProfileRecord,
} from '@/features/users/user-api';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

type ProfileSummaryCard = {
  count: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  key: 'status' | 'roles' | 'activity' | 'referral';
  label: string;
  title: string;
};

function formatAuditDate(dateValue: string) {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown time';
  }

  return parsed.toLocaleString('en-KE', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function formatLabel(value?: string | null) {
  if (!value?.trim()) {
    return 'Not provided';
  }

  return value;
}

function buildFullName(profile?: UserProfileRecord | null) {
  if (!profile) {
    return '';
  }

  return [profile.firstName, profile.otherName, profile.lastName].filter(Boolean).join(' ');
}

function buildSummaryCards(
  profile: UserProfileRecord | null,
  sessionRoles: string[],
  auditCount: number,
  referralCode?: string | null,
): ProfileSummaryCard[] {
  const roles = profile?.roles?.length ? profile.roles : sessionRoles;

  return [
    {
      count: profile?.status ?? 'ACTIVE',
      icon: 'verified-user',
      iconTone: 'primary',
      key: 'status',
      label: 'Account Status',
      title: 'Status',
    },
    {
      count: String(Math.max(roles.length, 1)),
      icon: 'badge',
      iconTone: 'secondary',
      key: 'roles',
      label: 'Roles Assigned',
      title: 'Roles',
    },
    {
      count: String(auditCount),
      icon: 'history',
      iconTone: 'neutral',
      key: 'activity',
      label: 'Recent Actions',
      title: 'Audit',
    },
    {
      count: referralCode?.trim() ? 'Ready' : 'None',
      icon: 'card-giftcard',
      iconTone: 'tertiary',
      key: 'referral',
      label: 'Referral Code',
      title: 'Referral',
    },
  ];
}

export default function ProfileScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [auditEntries, setAuditEntries] = useState<UserAuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;

  const loadProfile = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!session?.accessToken) {
        return;
      }

      const setLoadingState = append ? setLoadingMore : pageToLoad === 1 && !refreshing ? setLoading : () => undefined;
      setLoadingState(true);
      if (!append) {
        setError('');
      }

      try {
        const [profileResponse, auditResponse] = await Promise.all([
          getMyProfile(session.accessToken),
          getMyAuditLog(session.accessToken, { page: pageToLoad, pageSize: 10 }),
        ]);

        setProfile(profileResponse);
        setAuditEntries((current) => (append ? [...current, ...auditResponse.data] : auditResponse.data));
        setPage(auditResponse.meta.page);
        setHasNextPage(auditResponse.meta.hasNextPage);
      } catch (loadError) {
        if (!(loadError instanceof UnauthorizedError)) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [refreshing, session?.accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile(1, false);
    }, [loadProfile]),
  );

  const fullName = useMemo(
    () => buildFullName(profile) || session?.name || session?.email || 'Account Holder',
    [profile, session?.email, session?.name],
  );
  const summaryCards = useMemo(
    () =>
      buildSummaryCards(
        profile,
        session?.roles ?? ['USER'],
        auditEntries.length,
        profile?.referralCode ?? session?.referralCode,
      ),
    [auditEntries.length, profile, session?.referralCode, session?.roles],
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  const referralCode = session.referralCode;
  const profileImageUrl = session.profileImageUrl;

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
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

    if (key === 'contracts') {
      router.push('/contracts');
      return;
    }

    if (key === 'covers') {
      router.push('/covers');
    }
  }

  async function handleCopyReferralCode() {
    const nextReferralCode = profile?.referralCode ?? referralCode;

    if (!nextReferralCode?.trim()) {
      showToast('No referral code available yet.', 'error');
      return;
    }

    try {
      await Clipboard.setStringAsync(nextReferralCode);
      showToast('Referral code copied.');
    } catch {
      showToast('Unable to copy referral code.', 'error');
    }
  }

  return (
    <FloatingPageShell
      avatarLetter={avatarLetter}
      bottomSlot={<FloatingBottomNav activeKey="more" onPress={handleBottomNavPress} />}
      notificationCount={0}
      onBackPress={() => router.back()}
      onNotificationPress={() => showToast('You are all caught up right now.')}
      onProfilePress={() => undefined}
      profileImageUrl={profile?.profileImageUrl ?? profileImageUrl}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            setRefreshing(true);
            loadProfile(1, false);
          }}
          progressBackgroundColor={palette.surfaceContainerLowest}
          refreshing={refreshing}
          tintColor={palette.primary}
        />
      }
      scrollViewProps={{ onScrollBeginDrag: () => undefined }}
      title="Profile">
      <View style={styles.heroSection}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>My Profile</Text>
            <Text style={styles.heroBody}>
              Review your account identity, referral details, security settings, and recent account activity from one place.
            </Text>
          </View>
          <Pressable style={styles.heroAction} onPress={() => router.push('/change-password')}>
            <MaterialIcons color={palette.white} name="lock-reset" size={18} />
            <Text style={styles.heroActionText}>Password</Text>
          </Pressable>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.identityRow}>
            <View style={styles.heroAvatarWrap}>
              {profile?.profileImageUrl || session.profileImageUrl ? (
                <Image source={{ uri: profile?.profileImageUrl ?? session.profileImageUrl ?? undefined }} style={styles.heroAvatarImage} />
              ) : (
                <Text style={styles.heroAvatarText}>{avatarLetter}</Text>
              )}
            </View>

            <View style={styles.identityCopy}>
              <Text {...singleLineShrinkProps} style={styles.identityName}>
                {fullName}
              </Text>
              <Text {...singleLineShrinkProps} style={styles.identityEmail}>
                {profile?.email ?? session.email}
              </Text>
              <View style={styles.identityPills}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{profile?.status ?? 'ACTIVE'}</Text>
                </View>
                <View style={styles.rolePill}>
                  <Text {...singleLineShrinkProps} style={styles.rolePillText}>
                    {(profile?.roles ?? session.roles ?? ['USER']).join(', ')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.referralStrip}>
            <Text style={styles.referralLabel}>Referral Code</Text>
            <Pressable style={styles.referralRow} onPress={handleCopyReferralCode}>
              <Text {...singleLineShrinkProps} style={styles.referralValue}>
                {profile?.referralCode ?? session.referralCode ?? 'Unavailable'}
              </Text>
              <MaterialIcons color={palette.white} name="content-copy" size={18} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        {summaryCards.map((item) => (
          <SummaryCard
            key={item.key}
            count={item.count}
            icon={item.icon}
            iconTone={item.iconTone}
            label={item.label}
            onPress={() => undefined}
            style={{ width: cardWidth }}
            title={item.title}
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.sectionBlock}>
          <View style={styles.listCard}>
            <View style={styles.loadingState}>
              <ActivityIndicator color={palette.primary} />
              <Text style={styles.loadingText}>Loading your profile details...</Text>
            </View>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.sectionBlock}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load profile</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadProfile(1, false)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Account Details</Text>
          <Text style={styles.sectionCount}>Identity</Text>
        </View>

        <View style={styles.listCard}>
          <View style={styles.detailGrid}>
            <DetailRow label="Phone" value={`${profile?.phoneCountryCode ?? ''} ${formatLabel(profile?.phoneNumber)}`.trim()} />
            <DetailRow label="Country" value={formatLabel(profile?.countryOfResidence)} />
            <DetailRow label="Gender" value={formatLabel(profile?.gender)} />
            <DetailRow label="Signed up" value={profile?.createdAt ? formatAuditDate(profile.createdAt) : 'Unknown time'} />
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Security</Text>
          <Text style={styles.sectionCount}>Access</Text>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>Keep your account secure</Text>
            <Text style={styles.securityBody}>
              Update your password whenever needed to keep your profile, activity history, and workspace access protected.
            </Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/change-password')}>
            <MaterialIcons color={palette.onPrimary} name="lock-reset" size={18} />
            <Text style={styles.primaryButtonText}>Change Password</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Audit Log</Text>
          <Text style={styles.sectionCount}>{auditEntries.length} records</Text>
        </View>

        <View style={styles.listCard}>
          {auditEntries.length ? (
            <View style={styles.auditList}>
              {auditEntries.map((entry, index) => (
                <View key={entry.id} style={[styles.auditRow, index < auditEntries.length - 1 ? styles.auditRowBorder : null]}>
                  <View style={styles.auditIconWrap}>
                    <MaterialIcons color={palette.primary} name="history" size={18} />
                  </View>
                  <View style={styles.auditCopy}>
                    <Text style={styles.auditAction}>{entry.action.replaceAll('_', ' ')}</Text>
                    <Text style={styles.auditMeta}>
                      {entry.entityType} | {formatAuditDate(entry.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons color={palette.primary} name="history" size={28} />
              <Text style={styles.emptyStateTitle}>No audit activity yet</Text>
              <Text style={styles.emptyStateBody}>Your recent account actions will appear here as you use the app.</Text>
            </View>
          )}

          {hasNextPage ? (
            <Pressable
              style={[styles.secondaryButton, loadingMore ? styles.secondaryButtonDisabled : null]}
              disabled={loadingMore}
              onPress={() => loadProfile(page + 1, true)}>
              {loadingMore ? <ActivityIndicator color={palette.primary} size="small" /> : null}
              <Text style={styles.secondaryButtonText}>{loadingMore ? 'Loading...' : 'Load More'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.promoCard}>
        <View style={styles.promoCopy}>
          <Text style={styles.promoTitle}>Account activity trail</Text>
          <Text style={styles.promoBody}>
            Your profile keeps identity details, access settings, and audit visibility aligned so you always know how your workspace account is evolving.
          </Text>
        </View>
        <MaterialIcons color="rgba(255,255,255,0.2)" name="manage-accounts" size={140} style={styles.promoIcon} />
      </View>
    </FloatingPageShell>
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
  auditAction: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  auditCopy: {
    flex: 1,
    gap: 2,
  },
  auditIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  auditList: {
    gap: 0,
  },
  auditMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
  },
  auditRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  auditRowBorder: {
    borderBottomColor: '#E7ECF3',
    borderBottomWidth: 1,
  },
  detailGrid: {
    gap: spacing.sm,
  },
  detailLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailRow: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  detailValue: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyStateBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyStateTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  errorBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(186, 26, 26, 0.12)',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorTitle: {
    color: palette.error,
    fontSize: typography.title,
    fontWeight: '700',
  },
  heroAction: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroActionText: {
    color: palette.onPrimary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  heroAvatarImage: {
    height: '100%',
    width: '100%',
  },
  heroAvatarText: {
    color: palette.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  heroAvatarWrap: {
    alignItems: 'center',
    backgroundColor: palette.primaryFixed,
    borderRadius: 30,
    height: 78,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 78,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  heroSection: {
    backgroundColor: palette.overlayPrimaryStrong,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: spacing.marginMobile,
    overflow: 'hidden',
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  heroTitle: {
    color: palette.white,
    fontSize: typography.headline,
    fontWeight: '800',
  },
  identityCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  identityEmail: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: typography.bodySmall,
  },
  identityName: {
    color: palette.white,
    fontSize: typography.title,
    fontWeight: '800',
  },
  identityPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  listCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 10,
    overflow: 'hidden',
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  loadingState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  loadingText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: palette.onPrimary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  promoBody: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  promoCard: {
    backgroundColor: 'rgba(6, 50, 93, 0.9)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    minHeight: 164,
    overflow: 'hidden',
    padding: spacing.md,
  },
  promoCopy: {
    maxWidth: '72%',
  },
  promoIcon: {
    bottom: -10,
    position: 'absolute',
    right: -18,
  },
  promoTitle: {
    color: palette.white,
    fontSize: typography.title,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  referralLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  referralStrip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    gap: 4,
    padding: spacing.sm,
  },
  referralRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  referralValue: {
    color: palette.white,
    flex: 1,
    fontSize: typography.title,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryButtonText: {
    color: palette.onPrimary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    maxWidth: '72%',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rolePillText: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: palette.primary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  sectionBlock: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
  },
  sectionCount: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.label,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: palette.white,
    fontSize: typography.title,
    fontWeight: '700',
  },
  securityBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  securityCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 10,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  securityCopy: {
    gap: spacing.xs,
  },
  securityTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    color: '#D8FFE2',
    fontSize: typography.label,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.marginMobile,
  },
});
