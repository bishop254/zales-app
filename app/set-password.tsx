import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { AuthBackground, AuthButton, AuthCard, AuthHeader, AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { validateConfirmPassword, validatePassword } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export default function SetPasswordScreen() {
  const { pendingChallenge, submitFirstPassword } = useAuth();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const errors = useMemo(
    () => ({
      confirmPassword: validateConfirmPassword(newPassword, confirmPassword),
      newPassword: validatePassword(newPassword),
    }),
    [confirmPassword, newPassword]
  );

  const canSubmit = !errors.newPassword && !errors.confirmPassword;

  if (!pendingChallenge || pendingChallenge.type !== 'first_login') {
    return <Redirect href="/login" />;
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await submitFirstPassword(newPassword);
      showToast('Password set successfully. You are now signed in.');
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to set password.';
      showToast(message, 'error');
      setFeedbackMessage(message);
      setFeedbackModalVisible(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground scroll={false}>
        <AuthCard scrollable styleVariant="compact">
          <AuthHeader
            subtitle={`Set a new password for ${pendingChallenge.email}. This completes your first login.`}
            title="Set your password"
          />
          <View style={styles.formStack}>
            <AuthTextField
              error={newPassword ? errors.newPassword : ''}
              label="New Password"
              placeholder="Create a strong password"
              secureTextEntry
              secureToggle
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <AuthTextField
              error={confirmPassword ? errors.confirmPassword : ''}
              label="Confirm Password"
              placeholder="Re-enter your password"
              secureTextEntry
              secureToggle
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <View style={styles.helperCard}>
              <Text style={styles.helperText}>
                On future logins, you will sign in with this password first and then verify an emailed OTP before receiving final tokens.
              </Text>
            </View>
            <AuthButton
              disabled={!canSubmit || submitting}
              loading={submitting}
              title={submitting ? 'Saving password...' : 'Set Password'}
              onPress={handleSubmit}
            />
          </View>
        </AuthCard>
      </AuthBackground>
      <AppMessageModal
        eyebrow="Password setup"
        message={feedbackMessage}
        title="Set password failed"
        tone="error"
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: spacing.md,
  },
  helperCard: {
    backgroundColor: palette.surfaceContainerLow,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  helperText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
});
