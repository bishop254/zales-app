import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppModal } from '@/components/app/app-modal';
import { AuthBackground, AuthButton, AuthCard, AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { validateEmail, validatePassword } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

type FeedbackModalState = {
  eyebrow: string;
  message: string;
  tone: 'error' | 'info';
  title: string;
  visible: boolean;
};

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    eyebrow: '',
    message: '',
    tone: 'info',
    title: '',
    visible: false,
  });
  const hasHandledRegistrationToast = useRef(false);

  const errors = useMemo(
    () => ({
      email: validateEmail(email),
      password: validatePassword(password),
    }),
    [email, password]
  );

  const canSubmit = !errors.email && !errors.password;

  useEffect(() => {
    if (registered === '1' && !hasHandledRegistrationToast.current) {
      hasHandledRegistrationToast.current = true;
      showToast('Account created. Check your email for your temporary password.');
      router.setParams({ registered: undefined });
    }
  }, [registered, showToast]);

  function openFeedbackModal({
    eyebrow,
    message,
    tone,
    title,
  }: Omit<FeedbackModalState, 'visible'>) {
    setFeedbackModal({
      eyebrow,
      message,
      tone,
      title,
      visible: true,
    });
  }

  function closeFeedbackModal() {
    setFeedbackModal((current) => ({
      ...current,
      visible: false,
    }));
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await login({ email, password });

      if ('requiresPasswordChange' in response) {
        showToast('Temporary password accepted. Set your new password.');
        router.replace('/set-password');
      } else {
        showToast('OTP sent to your email.');
        router.replace('/verify');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Please check the backend connection and try again.';
      showToast(message, 'error');
      openFeedbackModal({
        eyebrow: 'Sign-in error',
        message,
        title: 'Login failed',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (googleSubmitting || submitting) {
      return;
    }

    try {
      setGoogleSubmitting(true);
      await loginWithGoogle();
      showToast('Signed in with Google.');
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start Google sign-in.';
      showToast(message, 'error');
      openFeedbackModal({
        eyebrow: 'Google sign-in',
        message,
        title: 'Google sign-in failed',
        tone: 'error',
      });
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground scroll={false}>
        <AuthCard scrollable styleVariant="compact">
          <View style={styles.brandWrap}>
            <View style={styles.brandIcon}>
              <MaterialIcons color={palette.onPrimary} name="rocket-launch" size={28} />
            </View>
            <Text style={styles.brandName}>ManagePro</Text>
            <Text style={styles.brandCaption}>Sign in to manage your pipeline.</Text>
          </View>

          <AuthTextField
            autoCapitalize="none"
            error={email ? errors.email : ''}
            icon="mail"
            keyboardType="email-address"
            label="Email Address"
            placeholder="agent@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <AuthTextField
            actionLabel="Forgot Password?"
            error={password ? errors.password : ''}
            icon="lock"
            label="Password"
            placeholder="........"
            secureTextEntry
            secureToggle
            value={password}
            onActionPress={() =>
              openFeedbackModal({
                eyebrow: 'Coming soon',
                message: 'Password recovery is not wired yet.',
                title: 'Forgot password',
                tone: 'info',
              })
            }
            onChangeText={setPassword}
          />

          <View style={styles.actions}>
            <AuthButton
              disabled={!canSubmit || submitting}
              loading={submitting}
              title={submitting ? 'Checking account...' : 'Login'}
              onPress={handleSubmit}
            />
            <AuthButton
              disabled={googleSubmitting || submitting}
              loading={googleSubmitting}
              title={googleSubmitting ? 'Opening Google...' : 'Continue with Google'}
              variant="secondary"
              onPress={handleGoogleLogin}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={styles.footerLink}>
                Sign Up
              </Link>
            </Text>
          </View>
        </AuthCard>
      </AuthBackground>

      <AppModal
        eyebrow={feedbackModal.eyebrow}
        footer={
          <Pressable
            style={[
              styles.modalButton,
              feedbackModal.tone === 'error' ? styles.modalButtonError : null,
            ]}
            onPress={closeFeedbackModal}>
            <Text style={styles.modalButtonText}>Okay</Text>
          </Pressable>
        }
        title={feedbackModal.title}
        visible={feedbackModal.visible}
        onClose={closeFeedbackModal}>
        <View style={styles.modalNotice}>
          <View
            style={[
              styles.modalIconWrap,
              feedbackModal.tone === 'error' ? styles.modalIconWrapError : styles.modalIconWrapInfo,
            ]}>
            <MaterialIcons
              color={feedbackModal.tone === 'error' ? palette.error : palette.primary}
              name={feedbackModal.tone === 'error' ? 'error-outline' : 'info-outline'}
              size={24}
            />
          </View>
          <View style={styles.modalCopy}>
            <Text style={styles.modalHeading}>
              {feedbackModal.tone === 'error' ? "We couldn't complete that sign-in." : 'A quick update for you'}
            </Text>
            <Text style={styles.modalMessage}>{feedbackModal.message}</Text>
          </View>
        </View>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  brandCaption: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 48,
  },
  brandName: {
    color: palette.primary,
    fontSize: typography.display,
    fontWeight: '700',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  footer: {
    borderTopColor: palette.surfaceContainerHighest,
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  footerLink: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  footerText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  modalButtonError: {
    backgroundColor: palette.error,
  },
  modalButtonText: {
    color: palette.onPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  modalCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  modalHeading: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  modalIconWrap: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  modalIconWrapError: {
    backgroundColor: palette.errorContainer,
  },
  modalIconWrapInfo: {
    backgroundColor: palette.primaryFixed,
  },
  modalMessage: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    lineHeight: 22,
  },
  modalNotice: {
    alignItems: 'flex-start',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: palette.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
});
