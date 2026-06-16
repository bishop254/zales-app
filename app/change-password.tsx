import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { validateConfirmPassword, validatePassword } from '@/features/auth/validation';
import { UnauthorizedError } from '@/features/api/auth-session';
import { changeMyPassword } from '@/features/users/user-api';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export default function ChangePasswordScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const errors = useMemo(
    () => ({
      confirmPassword: confirmPassword ? validateConfirmPassword(newPassword, confirmPassword) : '',
      currentPassword: currentPassword ? '' : 'Current password is required.',
      newPassword: newPassword ? validatePassword(newPassword) : 'New password is required.',
      passwordMatch:
        currentPassword && newPassword && currentPassword === newPassword
          ? 'New password must be different from your current password.'
          : '',
    }),
    [confirmPassword, currentPassword, newPassword],
  );

  const canSubmit = useMemo(() => Object.values(errors).every((value) => !value), [errors]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  const accessToken = session.accessToken;
  const profileImageUrl = session.profileImageUrl;

  async function handleSubmit() {
    if (!accessToken || submitting || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const response = await changeMyPassword(accessToken, {
        currentPassword,
        newPassword,
      });
      showToast(response.message || 'Password changed successfully.');
      router.replace('/profile');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to change your password right now.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FloatingPageShell
      avatarLetter={avatarLetter}
      notificationCount={0}
      onBackPress={() => router.back()}
      onNotificationPress={() => showToast('You are all caught up right now.')}
      onProfilePress={() => router.push('/profile')}
      profileImageUrl={profileImageUrl}
      title="Change Password">
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <MaterialIcons color={palette.primary} name="lock-reset" size={26} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Keep your account secure</Text>
          <Text style={styles.heroBody}>
            Update your password with something strong and memorable. Your new password will be used the next time you sign in.
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Password update failed</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Security Details</Text>
        <View style={styles.formStack}>
          <AuthTextField
            error={currentPassword ? errors.currentPassword : ''}
            label="Current Password"
            placeholder="Enter your current password"
            secureTextEntry
            secureToggle
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <AuthTextField
            error={newPassword ? errors.newPassword || errors.passwordMatch : ''}
            label="New Password"
            placeholder="Create a new password"
            secureTextEntry
            secureToggle
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <AuthTextField
            error={confirmPassword ? errors.confirmPassword : ''}
            label="Confirm New Password"
            placeholder="Re-enter your new password"
            secureTextEntry
            secureToggle
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <View style={styles.helperCard}>
          <Text style={styles.helperTitle}>Password tips</Text>
          <Text style={styles.helperBody}>Use at least 8 characters and avoid reusing your previous password.</Text>
        </View>

        <Pressable
          disabled={!canSubmit || submitting}
          style={[styles.primaryButton, !canSubmit || submitting ? styles.primaryButtonDisabled : null]}
          onPress={handleSubmit}>
          {submitting ? <ActivityIndicator color={palette.onPrimary} size="small" /> : null}
          <Text style={styles.primaryButtonText}>{submitting ? 'Updating Password...' : 'Update Password'}</Text>
        </Pressable>
      </View>
    </FloatingPageShell>
  );
}

const styles = StyleSheet.create({
  errorBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: 'rgba(186, 26, 26, 0.12)',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginHorizontal: spacing.marginMobile,
    padding: spacing.md,
  },
  errorTitle: {
    color: palette.error,
    fontSize: typography.title,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: radius.xl,
    gap: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: spacing.marginMobile,
    padding: spacing.md,
    shadowColor: '#001B3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  formStack: {
    gap: spacing.sm,
  },
  helperBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  helperCard: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  helperTitle: {
    color: palette.primary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  heroBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: spacing.marginMobile,
    padding: spacing.md,
    shadowColor: '#001B3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  heroTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: palette.onPrimary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  sectionTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
});
