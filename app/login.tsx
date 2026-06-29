import { StatusBar } from 'expo-status-bar';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppLogo } from '@/components/app/app-logo';
import { AuthBackground, AuthButton, AuthCard, AuthTextField } from '@/components/auth/auth-primitives';
import { palette, spacing, typography } from '@/constants/app-theme';
import { validateEmail, validatePassword } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import { AppFeedbackModal } from '@/src/components/common/AppFeedbackModal';

type FeedbackModalState = {
  eyebrow: string;
  message: string;
  tone: 'error' | 'info';
  title: string;
  visible: boolean;
};

export default function LoginScreen() {
  const { forgotPassword, login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [recoverSubmitting, setRecoverSubmitting] = useState(false);
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
  const canRecoverPassword = !errors.email && !!email.trim();

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
    if (!canSubmit || submitting || recoverSubmitting) {
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
    if (googleSubmitting || submitting || recoverSubmitting) {
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

  async function handleForgotPassword() {
    if (recoverSubmitting) {
      return;
    }

    if (!canRecoverPassword) {
      openFeedbackModal({
        eyebrow: 'Email required',
        message: 'Enter the email address for your account, then try forgot password again.',
        title: 'Reset your password',
        tone: 'info',
      });
      return;
    }

    try {
      closeFeedbackModal();
      setRecoverSubmitting(true);
      const response = await forgotPassword(email);
      showToast(response.message);
      openFeedbackModal({
        eyebrow: 'Check your inbox',
        message:
          'If your account exists, we have sent a temporary password. Use it to sign in, then set a new password right away.',
        title: 'Password reset requested',
        tone: 'info',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to request a password reset right now.';
      showToast(message, 'error');
      openFeedbackModal({
        eyebrow: 'Reset failed',
        message,
        title: 'Password reset unavailable',
        tone: 'error',
      });
    } finally {
      setRecoverSubmitting(false);
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground scroll={false}>
        <AuthCard scrollable styleVariant="compact">
          <View style={styles.brandWrap}>
            <AppLogo compact />
            <Text style={styles.brandName}>ManageWizard</Text>
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
            onActionPress={() => void handleForgotPassword()}
            onChangeText={setPassword}
          />

          <View style={styles.actions}>
            <AuthButton
              disabled={!canSubmit || submitting || recoverSubmitting}
              loading={submitting}
              title={submitting ? 'Checking account...' : 'Login'}
              onPress={handleSubmit}
            />
            <AuthButton
              disabled={googleSubmitting || submitting || recoverSubmitting}
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

      <AppFeedbackModal
        visible={feedbackModal.visible}
        detailDescription={
          feedbackModal.tone === 'error'
            ? feedbackModal.message
            : feedbackModal.message
        }
        detailTitle={
          feedbackModal.tone === 'error'
            ? feedbackModal.eyebrow === 'Sign-in error'
              ? 'Invalid credentials'
              : 'Sign-in issue'
            : 'Update'
        }
        label={feedbackModal.eyebrow}
        message={
          feedbackModal.tone === 'error'
            ? feedbackModal.eyebrow === 'Sign-in error'
              ? 'Your email or password may be incorrect. Please check your details and try again.'
              : 'We hit a problem while trying to sign you in. Please review the details below and try again.'
            : feedbackModal.message
        }
        onClose={closeFeedbackModal}
        onPrimaryAction={closeFeedbackModal}
        primaryActionLabel={feedbackModal.tone === 'error' ? 'Try Again' : 'Okay'}
        secondaryActionLabel={feedbackModal.tone === 'error' ? 'Forgot Password?' : undefined}
        title={
          feedbackModal.tone === 'error' && feedbackModal.eyebrow === 'Sign-in error'
            ? "Couldn't sign you in"
            : feedbackModal.title
        }
        type={feedbackModal.tone}
        onSecondaryAction={
          feedbackModal.tone === 'error'
            ? () => void handleForgotPassword()
            : undefined
        }
      />
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
  brandName: {
    color: palette.primary,
    fontSize: typography.display,
    fontWeight: '700',
  },
  brandWrap: {
    alignItems: 'center',
    gap: spacing.xs,
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
});
